/**
 * Public data-source adapters shared by the server and the browser.
 *
 * The server normally fetches these (so phones download a small, trimmed
 * bundle and responses are cached per location). When the app is served
 * without its Node server — a static host, `vite preview` — the browser calls
 * the same APIs directly with the same normalisers. All four sources allow
 * cross-origin requests and need no key.
 */
import type { ClimateBundle, SoilBundle, WeatherBundle } from '../types.js';

export class UpstreamError extends Error {
  constructor(public source: string, message: string) {
    super(message);
  }
}

export async function getJson(url: string, source: string, timeoutMs: number, headers?: Record<string, string>) {
  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    const name = (e as Error).name;
    throw new UpstreamError(source, name === 'TimeoutError' ? `${source} took too long to answer.` : `Could not reach ${source}.`);
  }
  if (!res.ok) throw new UpstreamError(source, `${source} returned an error (HTTP ${res.status}).`);
  return res.json();
}

const r1 = (n: number | null | undefined) => (n == null ? null : Math.round(n * 10) / 10);
const r3 = (n: number | null | undefined) => (n == null ? null : Math.round(n * 1000) / 1000);

/* ------------------------------ Weather ------------------------------ */

export function weatherUrl(lat: number, lng: number) {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    timezone: 'auto',
    past_days: '30',
    forecast_days: '8',
    hourly: [
      'temperature_2m', 'relative_humidity_2m', 'precipitation', 'precipitation_probability',
      'wind_speed_10m', 'wind_gusts_10m', 'is_day', 'soil_moisture_9_to_27cm', 'soil_moisture_27_to_81cm',
    ].join(','),
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum',
      'precipitation_probability_max', 'et0_fao_evapotranspiration', 'wind_speed_10m_max',
    ].join(','),
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

export function normaliseWeather(raw: any): WeatherBundle {
  const offset: number = raw.utc_offset_seconds ?? 0;
  const localNow = new Date(Date.now() + offset * 1000).toISOString();
  const today = localNow.slice(0, 10);
  const H = raw.hourly;
  const D = raw.daily;
  if (!H?.time || !D?.time) throw new UpstreamError('Open-Meteo', 'Open-Meteo sent an unexpected response.');

  // Keep the last 24 h and everything ahead.
  const startHour = new Date(Date.now() + offset * 1000 - 24 * 3600_000).toISOString().slice(0, 13);
  const from = Math.max(0, (H.time as string[]).findIndex((t) => t >= startHour));
  const sl = <T,>(a: T[] | undefined) => (a ?? []).slice(from);

  // Daily mean root-zone soil moisture: 9–27 cm and 27–81 cm layers weighted by thickness (18 : 54 → 0.25 : 0.75).
  const soilByDay = new Map<string, { s: number; n: number }>();
  (H.time as string[]).forEach((t, i) => {
    const a = H.soil_moisture_9_to_27cm?.[i];
    const b = H.soil_moisture_27_to_81cm?.[i];
    if (a == null && b == null) return;
    const v = a != null && b != null ? 0.25 * a + 0.75 * b : (a ?? b);
    const d = t.slice(0, 10);
    const e = soilByDay.get(d) ?? { s: 0, n: 0 };
    e.s += v;
    e.n += 1;
    soilByDay.set(d, e);
  });

  return {
    fetchedAt: new Date().toISOString(),
    lat: raw.latitude,
    lng: raw.longitude,
    timezone: raw.timezone,
    utcOffsetSeconds: offset,
    today,
    hourly: {
      time: sl<string>(H.time),
      temp: sl<number>(H.temperature_2m).map(r1),
      rh: sl<number>(H.relative_humidity_2m),
      precip: sl<number>(H.precipitation).map(r1),
      precipProb: sl<number>(H.precipitation_probability),
      wind: sl<number>(H.wind_speed_10m).map(r1),
      gust: sl<number>(H.wind_gusts_10m).map(r1),
      isDay: sl<number>(H.is_day),
    },
    daily: {
      time: D.time,
      tMax: (D.temperature_2m_max as number[]).map(r1),
      tMin: (D.temperature_2m_min as number[]).map(r1),
      precip: (D.precipitation_sum as number[]).map(r1),
      precipProb: D.precipitation_probability_max,
      et0: (D.et0_fao_evapotranspiration as number[]).map(r1),
      windMax: (D.wind_speed_10m_max as number[]).map(r1),
      code: D.weather_code,
      soilMoisture: (D.time as string[]).map((d) => {
        const e = soilByDay.get(d);
        return e ? r3(e.s / e.n) : null;
      }),
    },
  };
}

/* ------------------------------ Climate ------------------------------ */

/** ERA5 reanalysis runs about 5 days behind real time. */
export function climateRequest(lat: number, lng: number) {
  const end = new Date(Date.now() - 6 * 86_400_000);
  const endStr = end.toISOString().slice(0, 10);
  const startYear = end.getUTCFullYear() - 10;
  const p = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lng.toFixed(3),
    start_date: `${startYear}-01-01`,
    end_date: endStr,
    daily: 'precipitation_sum',
    timezone: 'auto',
  });
  return { url: `https://archive-api.open-meteo.com/v1/archive?${p}`, endStr };
}

export function summariseClimate(time: string[], precip: (number | null)[], windowEnd: string): ClimateBundle {
  const endYear = Number(windowEnd.slice(0, 4));
  const endMd = windowEnd.slice(5);
  const startD = new Date(Date.parse(windowEnd) - 29 * 86_400_000).toISOString().slice(0, 10);
  const startMd = startD.slice(5);
  const wraps = startMd > endMd; // window crosses new year

  const inWindow = (md: string) => (wraps ? md >= startMd || md <= endMd : md >= startMd && md <= endMd);
  const windowYear = (date: string) => {
    const y = Number(date.slice(0, 4));
    return wraps && date.slice(5) >= startMd ? y + 1 : y;
  };

  const monthly = new Map<string, number>();
  const windows = new Map<number, number>();
  time.forEach((d, i) => {
    const mm = precip[i];
    if (mm == null) return;
    const ym = d.slice(0, 7);
    monthly.set(ym, (monthly.get(ym) ?? 0) + mm);
    if (inWindow(d.slice(5))) {
      const wy = windowYear(d);
      windows.set(wy, (windows.get(wy) ?? 0) + mm);
    }
  });

  const years: number[] = [];
  for (let y = endYear - 10; y < endYear; y++) years.push(y);

  const monthlyNormalMm = Array.from({ length: 12 }, (_, m) => {
    const vals = years.map((y) => monthly.get(`${y}-${String(m + 1).padStart(2, '0')}`)).filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  });
  const normals = years.map((y) => windows.get(y)).filter((v): v is number => v != null);

  return {
    fetchedAt: new Date().toISOString(),
    years,
    monthlyNormalMm,
    last30Mm: Math.round(windows.get(endYear) ?? 0),
    last30NormalMm: normals.length ? Math.round(normals.reduce((a, b) => a + b, 0) / normals.length) : 0,
    windowEnd,
  };
}

/* -------------------------------- Soil -------------------------------- */

export function soilUrl(lat: number, lng: number) {
  const p = new URLSearchParams({ lon: lng.toFixed(4), lat: lat.toFixed(4), value: 'mean' });
  ['phh2o', 'soc', 'clay', 'sand', 'silt', 'nitrogen', 'cec', 'bdod'].forEach((x) => p.append('property', x));
  ['0-5cm', '5-15cm', '15-30cm'].forEach((d) => p.append('depth', d));
  return `https://rest.isric.org/soilgrids/v2.0/properties/query?${p}`;
}

/** Depth-weighted 0–30 cm mean of each SoilGrids property, converted to conventional units. */
export function normaliseSoil(raw: any): SoilBundle {
  const weights: Record<string, number> = { '0-5cm': 5, '5-15cm': 10, '15-30cm': 15 };
  const get = (name: string): number | null => {
    const layer = raw?.properties?.layers?.find((l: any) => l.name === name);
    if (!layer) return null;
    const d = layer.unit_measure?.d_factor || 1;
    let s = 0;
    let w = 0;
    for (const depth of layer.depths ?? []) {
      const v = depth.values?.mean;
      const wt = weights[depth.label];
      if (v == null || !wt) continue;
      s += (v / d) * wt;
      w += wt;
    }
    return w ? s / w : null;
  };
  const round = (n: number | null, dp: number) => (n == null ? null : Math.round(n * 10 ** dp) / 10 ** dp);
  const clay = get('clay');
  const sand = get('sand');
  if (clay == null && sand == null && get('phh2o') == null) {
    throw new UpstreamError('SoilGrids', 'SoilGrids has no data for this point (open water, built-up land or outside coverage).');
  }
  return {
    fetchedAt: new Date().toISOString(),
    source: 'soilgrids',
    depth: '0-30cm',
    ph: round(get('phh2o'), 1),
    clayPct: round(clay, 0),
    sandPct: round(sand, 0),
    siltPct: round(get('silt'), 0),
    socGKg: round(get('soc'), 1),
    nitrogenGKg: round(get('nitrogen'), 2),
    cecCmolKg: round(get('cec'), 1),
    bulkDensity: round(get('bdod'), 2),
  };
}

/* ------------------------------ Place name ------------------------------ */

export function placeUrl(lat: number, lng: number) {
  const p = new URLSearchParams({ lat: lat.toFixed(5), lon: lng.toFixed(5), format: 'jsonv2', zoom: '10' });
  return `https://nominatim.openstreetmap.org/reverse?${p}`;
}

export function placeName(j: any): string | null {
  const a = j?.address ?? {};
  const place = a.village || a.town || a.city || a.county || a.suburb;
  return [place, a.state].filter(Boolean).join(', ') || null;
}

/* ------------------------------ Direct fetch ------------------------------ */

export async function fetchWeatherDirect(lat: number, lng: number, headers?: Record<string, string>) {
  return normaliseWeather(await getJson(weatherUrl(lat, lng), 'Open-Meteo', 12_000, headers));
}

export async function fetchClimateDirect(lat: number, lng: number, headers?: Record<string, string>) {
  const { url, endStr } = climateRequest(lat, lng);
  const raw = await getJson(url, 'Open-Meteo archive', 25_000, headers);
  return summariseClimate(raw.daily?.time ?? [], raw.daily?.precipitation_sum ?? [], endStr);
}

export async function fetchSoilDirect(lat: number, lng: number, headers?: Record<string, string>) {
  return normaliseSoil(await getJson(soilUrl(lat, lng), 'SoilGrids', 30_000, headers));
}

export async function fetchPlaceDirect(lat: number, lng: number, headers?: Record<string, string>) {
  try {
    return placeName(await getJson(placeUrl(lat, lng), 'OpenStreetMap', 8000, headers));
  } catch {
    return null;
  }
}
