/** Writes realistic API responses for browser checks when the live APIs are unreachable. */
import { writeFileSync } from 'fs';
import { makeWeather } from './fixtures';

const today = new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
const weather = makeWeather(today, {
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
    if (o === 2 && h > 18) return { rh: 95 };
    if (h >= 12 && h <= 16) return { wind: 17, gust: 28, rh: 48 };
    if (h < 7) return { wind: 1.5, rh: 94 };
    return { wind: 7 + (h % 3), rh: 72 };
  },
});
const climate = { fetchedAt: new Date().toISOString(), years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], monthlyNormalMm: [9, 27, 84, 132, 158, 189, 148, 116, 186, 158, 43, 11], last30Mm: 97, last30NormalMm: 121, windowEnd: today };
const soil = { fetchedAt: new Date().toISOString(), source: 'soilgrids', depth: '0-30cm', ph: 5.3, clayPct: 18, sandPct: 63, siltPct: 19, socGKg: 9.4, nitrogenGKg: 0.79, cecCmolKg: 6.8, bulkDensity: 1.42 };
writeFileSync(process.argv[2], JSON.stringify({ weather, climate, soil }));
