import type { HourlySeries } from '../types';

export type HourStatus = 'good' | 'fair' | 'no';

export interface SprayHour {
  time: string;
  status: HourStatus;
  reasons: string[];
}

export interface SprayWindow {
  start: string;
  /** Last usable hour (inclusive). */
  end: string;
  hours: number;
  quality: 'good' | 'fair';
}

/**
 * Thresholds follow common label and extension guidance for ground spraying:
 *  - wind 3–15 km/h (below ~3 km/h, temperature inversions carry fine droplets off-target)
 *  - no rain during the hour and none expected for the next 4 hours (rain-fast period)
 *  - air temperature ≤ 30 °C; humidity above 40% to limit droplet evaporation
 *  - daylight only
 */
export const SPRAY_RULES = {
  windMin: 2,
  windIdealMin: 3,
  windMax: 15,
  gustMax: 25,
  tempMax: 30,
  tempWarm: 28,
  rhMin: 40,
  rainFastHours: 4,
};

export function sprayOutlook(h: HourlySeries, nowIso: string, horizonHours = 72) {
  const start = Math.max(0, h.time.findIndex((t) => t >= nowIso.slice(0, 13)));
  const end = Math.min(h.time.length, start + horizonHours);
  const hours: SprayHour[] = [];

  const wet = (i: number) => (h.precip[i] ?? 0) >= 0.2 || (h.precipProb[i] ?? 0) >= 50;

  for (let i = start; i < end; i++) {
    const hard: string[] = [];
    const soft: string[] = [];
    const wind = h.wind[i] ?? 0;
    const gust = h.gust[i] ?? 0;
    const temp = h.temp[i] ?? 25;
    const rh = h.rh[i] ?? 60;

    if (h.isDay[i] === 0) hard.push('dark');
    if (wet(i)) hard.push('rain');
    else {
      for (let k = 1; k <= SPRAY_RULES.rainFastHours && i + k < h.time.length; k++) {
        if (wet(i + k)) {
          hard.push(`rain in ${k}h`);
          break;
        }
      }
    }
    if (wind > SPRAY_RULES.windMax || gust > SPRAY_RULES.gustMax) hard.push(`wind ${Math.round(Math.max(wind, gust))} km/h`);
    else if (wind < SPRAY_RULES.windMin) hard.push('dead calm');
    else if (wind < SPRAY_RULES.windIdealMin) soft.push('very light wind');
    if (temp > SPRAY_RULES.tempMax) hard.push(`${Math.round(temp)} °C`);
    else if (temp > SPRAY_RULES.tempWarm) soft.push('warm');
    if (rh < SPRAY_RULES.rhMin) soft.push(`dry air ${Math.round(rh)}%`);

    hours.push({
      time: h.time[i],
      status: hard.length ? 'no' : soft.length ? 'fair' : 'good',
      reasons: hard.length ? hard : soft,
    });
  }

  const windows: SprayWindow[] = [];
  let run: SprayHour[] = [];
  const flush = () => {
    if (run.length >= 2) {
      const good = run.filter((x) => x.status === 'good').length;
      windows.push({ start: run[0].time, end: run[run.length - 1].time, hours: run.length, quality: good >= run.length / 2 ? 'good' : 'fair' });
    }
    run = [];
  };
  for (const hr of hours) {
    if (hr.status === 'no') flush();
    else run.push(hr);
  }
  flush();

  return { hours, windows, next: windows[0] ?? null };
}

export type SprayOutlook = ReturnType<typeof sprayOutlook>;

/** Most common blocking reason across hours — used to explain "no window". */
export function mainBlocker(hours: SprayHour[]): string | null {
  const counts = new Map<string, number>();
  for (const h of hours) {
    if (h.status !== 'no') continue;
    for (const r of h.reasons) {
      if (r === 'dark') continue;
      const key = r.startsWith('rain') ? 'rain' : r.startsWith('wind') ? 'wind' : r.endsWith('°C') ? 'heat' : r;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of counts) if (v > n) [best, n] = [k, v];
  return best;
}
