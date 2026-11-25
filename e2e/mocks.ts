import type { Page, BrowserContext } from '@playwright/test';
import { makeWeather } from '../tests/fixtures';

/** Farm-local date in Lagos (UTC+1), matching the mocked forecast's offset. */
export const lagosToday = () => new Date(Date.now() + 3600_000).toISOString().slice(0, 10);

export function weatherBundle() {
  return makeWeather(lagosToday(), {
    soil: 0.24,
    day: (o) => {
      const past: Record<number, number> = { [-28]: 22, [-25]: 9, [-21]: 31, [-17]: 6, [-14]: 14, [-9]: 4, [-6]: 11 };
      if (o < 0) return { rain: past[o] ?? 0, et0: 4.1, tMax: 31 };
      const fc: Record<number, [number, number, number]> = { 0: [0, 10, 32], 1: [0.4, 25, 33], 2: [17.5, 75, 30], 3: [3.2, 45, 31], 4: [0, 15, 33], 5: [0, 10, 34], 6: [0, 10, 34], 7: [0.6, 20, 33] };
      const [rain, prob, tMax] = fc[o];
      return { rain, prob, tMax, tMin: 22, et0: rain > 5 ? 3.2 : 4.6 };
    },
    hour: (o, h) => {
      if (o === 2 && h >= 14 && h <= 18) return { precip: 3.5, precipProb: 75, rh: 92, wind: 14, gust: 30 };
      if (h >= 12 && h <= 16) return { wind: 17, gust: 28, rh: 48 };
      if (h < 7) return { wind: 1.5, rh: 94 };
      return { wind: 7 + (h % 3), rh: 72 };
    },
  });
}

export const climateBundle = () => ({
  fetchedAt: new Date().toISOString(),
  years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  monthlyNormalMm: [9, 27, 84, 132, 158, 189, 148, 116, 186, 158, 43, 11],
  last30Mm: 97,
  last30NormalMm: 121,
  windowEnd: lagosToday(),
});

export const soilBundle = () => ({
  fetchedAt: new Date().toISOString(), source: 'soilgrids', depth: '0-30cm',
  ph: 5.3, clayPct: 18, sandPct: 63, siltPct: 19, socGKg: 9.4, nitrogenGKg: 0.79, cecCmolKg: 6.8, bulkDensity: 1.42,
});

/** Raw upstream formats, for the no-server path where the browser calls the sources itself. */
export function rawSources() {
  const W = weatherBundle();
  const forecast = {
    latitude: W.lat, longitude: W.lng, timezone: W.timezone, utc_offset_seconds: W.utcOffsetSeconds,
    hourly: {
      time: W.hourly.time, temperature_2m: W.hourly.temp, relative_humidity_2m: W.hourly.rh, precipitation: W.hourly.precip,
      precipitation_probability: W.hourly.precipProb, wind_speed_10m: W.hourly.wind, wind_gusts_10m: W.hourly.gust, is_day: W.hourly.isDay,
      soil_moisture_9_to_27cm: W.hourly.time.map(() => 0.22), soil_moisture_27_to_81cm: W.hourly.time.map(() => 0.25),
    },
    daily: {
      time: W.daily.time, temperature_2m_max: W.daily.tMax, temperature_2m_min: W.daily.tMin, precipitation_sum: W.daily.precip,
      precipitation_probability_max: W.daily.precipProb, et0_fao_evapotranspiration: W.daily.et0, wind_speed_10m_max: W.daily.windMax, weather_code: W.daily.code,
    },
  };
  const archive = { daily: { time: [] as string[], precipitation_sum: [] as number[] } };
  for (let d = Date.UTC(2015, 0, 1); d < Date.now() - 6 * 864e5; d += 864e5) {
    archive.daily.time.push(new Date(d).toISOString().slice(0, 10));
    archive.daily.precipitation_sum.push(3);
  }
  const layer = (name: string, f: number, v: number) => ({ name, unit_measure: { d_factor: f }, depths: ['0-5cm', '5-15cm', '15-30cm'].map((label) => ({ label, values: { mean: v } })) });
  const soilgrids = { properties: { layers: [layer('phh2o', 10, 53), layer('clay', 10, 180), layer('sand', 10, 630), layer('soc', 10, 94), layer('nitrogen', 100, 79), layer('cec', 10, 68)] } };
  return { forecast, archive, soilgrids };
}

const month = (offset: number) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
};

/** A nearest-market price summary in the shape /api/prices returns. */
export const priceSummary = () => ({
  crop: 'maize',
  commodity: 'Maize (white)',
  pricetype: 'Wholesale',
  market: 'Bodija',
  admin1: 'Oyo',
  distanceKm: 2,
  latest: { month: month(-1), perTon: 620_000 },
  history: Array.from({ length: 24 }, (_, i) => ({ month: month(i - 24), perTon: 450_000 + i * 7_000 })),
  seasonal: [1.0, 1.05, 1.1, 1.15, 1.2, 1.3, 1.3, 1.15, 1.0, 0.85, 0.8, 0.9],
  seasonalSource: 'market',
  nearby: [{ market: 'Dawanau', admin1: 'Kano', distanceKm: 690, perTon: 560_000, month: month(-1) }],
  ageMonths: 1,
});

export interface MockOptions {
  ai?: boolean;
  weatherFails?: boolean;
}

/** Mocks this app's /api plus all third-party hosts. */
export async function mockApi(target: Page | BrowserContext, opts: MockOptions = {}) {
  await target.route('**/server.arcgisonline.com/**', (r) => r.abort());
  await target.route('**/fonts.g*/**', (r) => r.abort());
  await target.route('**/api/weather**', (r) => (opts.weatherFails ? r.fulfill({ status: 502, json: { error: 'upstream', message: 'Could not reach Open-Meteo.' } }) : r.fulfill({ json: weatherBundle() })));
  await target.route('**/api.open-meteo.com/**', (r) => (opts.weatherFails ? r.abort() : r.fulfill({ json: rawSources().forecast, headers: { 'access-control-allow-origin': '*' } })));
  await target.route('**/api/climate**', (r) => r.fulfill({ json: climateBundle() }));
  await target.route('**/api/soil**', (r) => r.fulfill({ json: soilBundle() }));
  await target.route('**/api/place**', (r) => r.fulfill({ json: { name: 'Ibadan, Oyo State' } }));
  await target.route('**/nominatim.openstreetmap.org/**', (r) => r.fulfill({ json: { address: { city: 'Ibadan', state: 'Oyo State' } }, headers: { 'access-control-allow-origin': '*' } }));
  await target.route('**/api/prices**', (r) => r.fulfill({ json: { summary: priceSummary(), source: 'WFP' } }));
  await target.route('**/api/health', (r) => r.fulfill({ json: { ok: true, ai: !!opts.ai, model: opts.ai ? 'test-model' : null } }));
}

/** Opens the sample farm. It lands on Home; most tests start from the crop plan, so that is the default. */
export async function startSample(page: Page, land: 'Plan' | 'Home' = 'Plan') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample farm' }).click();
  await page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening)/ }).waitFor();
  if (land === 'Plan') {
    await nav(page, 'Plan');
    await page.getByRole('heading', { name: "This week's plan" }).waitFor();
  }
}

const CROP_TABS: Record<string, string> = { Plan: 'Plan', Weather: 'Weather', Field: 'Soil and water' };

/**
 * Goes to a screen the way a person would: the sidebar on a computer; the
 * bottom bar, or the menu for the rest, on a phone; the crop tabs for Plan,
 * Weather and Soil and water.
 */
export async function nav(page: Page, name: string) {
  const crop = CROP_TABS[name];
  const tabs = page.getByRole('tablist', { name: 'Crop screens' });
  if (crop && (await tabs.isVisible())) {
    await tabs.getByRole('tab', { name: crop }).click();
    return;
  }
  const target = crop ? 'Crops' : name === 'Ask' ? 'Ask the advisor' : name;
  const main = page.locator('nav[aria-label=Main]:visible');
  const direct = main.getByRole('button', { name: new RegExp(`^${target}`) });
  if (await direct.count()) await direct.first().click();
  else {
    await page.getByRole('button', { name: 'Open menu' }).filter({ visible: true }).click();
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: new RegExp(`^${target}`) }).click();
  }
  if (crop && crop !== 'Plan') await page.getByRole('tablist', { name: 'Crop screens' }).getByRole('tab', { name: crop }).click();
}

/** Opens the Record sheet: the gold button in the phone bar or at the top of the sidebar. */
export async function openRecord(page: Page) {
  await page.getByRole('button', { name: /^Record$/ }).filter({ visible: true }).first().click();
  await page.getByRole('dialog', { name: 'Record' }).waitFor();
}
