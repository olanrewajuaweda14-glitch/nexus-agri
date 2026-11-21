import type { WeatherBundle } from '../src/lib/types';
import { addDays } from '../src/lib/dates';

interface DayOpts {
  rain?: number;
  prob?: number;
  tMax?: number;
  tMin?: number;
  et0?: number;
}

/**
 * Builds a WeatherBundle shaped like the server's output: 30 past days, today,
 * 7 forecast days, and hourly data from yesterday to +7 days.
 */
export function makeWeather(today: string, opts: { day?: (offset: number) => DayOpts; hour?: (offset: number, hourOfDay: number) => Partial<Record<'temp' | 'rh' | 'precip' | 'precipProb' | 'wind' | 'gust', number>>; soil?: number | null } = {}): WeatherBundle {
  const daily: WeatherBundle['daily'] = { time: [], tMax: [], tMin: [], precip: [], precipProb: [], et0: [], windMax: [], code: [], soilMoisture: [] };
  for (let o = -30; o <= 7; o++) {
    const d = { rain: 0, prob: 10, tMax: 31, tMin: 22, et0: 4.5, ...(opts.day?.(o) ?? {}) };
    daily.time.push(addDays(today, o));
    daily.tMax.push(d.tMax);
    daily.tMin.push(d.tMin);
    daily.precip.push(d.rain);
    daily.precipProb.push(d.prob);
    daily.et0.push(d.et0);
    daily.windMax.push(12);
    daily.code.push(d.rain > 0 ? 61 : 1);
    daily.soilMoisture.push(o === -30 ? (opts.soil === undefined ? 0.18 : opts.soil) : null);
  }
  const hourly: WeatherBundle['hourly'] = { time: [], temp: [], rh: [], precip: [], precipProb: [], wind: [], gust: [], isDay: [] };
  for (let o = -1; o <= 7; o++) {
    for (let h = 0; h < 24; h++) {
      const base = { temp: 22 + Math.max(0, 8 - Math.abs(h - 14)), rh: 70, precip: 0, precipProb: 5, wind: 8, gust: 14, ...(opts.hour?.(o, h) ?? {}) };
      hourly.time.push(`${addDays(today, o)}T${String(h).padStart(2, '0')}:00`);
      hourly.temp.push(base.temp);
      hourly.rh.push(base.rh);
      hourly.precip.push(base.precip);
      hourly.precipProb.push(base.precipProb);
      hourly.wind.push(base.wind);
      hourly.gust.push(base.gust);
      hourly.isDay.push(h >= 7 && h < 19 ? 1 : 0);
    }
  }
  return { fetchedAt: new Date().toISOString(), lat: 7.43, lng: 3.93, timezone: 'Africa/Lagos', utcOffsetSeconds: 3600, today, hourly, daily };
}
