import { describe, expect, it } from 'vitest';
import { normaliseSoil, normaliseWeather, summariseClimate } from '../server/sources';

describe('SoilGrids normaliser', () => {
  const layer = (name: string, d: number, vals: (number | null)[]) => ({
    name,
    unit_measure: { d_factor: d },
    depths: ['0-5cm', '5-15cm', '15-30cm'].map((label, i) => ({ label, values: { mean: vals[i] } })),
  });
  it('depth-weights 0–30 cm and applies d_factor', () => {
    const s = normaliseSoil({
      properties: {
        layers: [
          layer('phh2o', 10, [60, 58, 56]),
          layer('clay', 10, [150, 180, 220]),
          layer('sand', 10, [650, 620, 580]),
          layer('soc', 10, [120, 90, 60]),
          layer('nitrogen', 100, [120, 90, 70]),
        ],
      },
    });
    // (6.0×5 + 5.8×10 + 5.6×15) / 30
    expect(s.ph).toBe(5.7);
    expect(s.clayPct).toBe(20); // 19.5 rounds up
    expect(s.sandPct).toBe(61);
    expect(s.socGKg).toBe(8);
    expect(s.cecCmolKg).toBeNull();
  });
  it('rejects points with no data', () => {
    expect(() => normaliseSoil({ properties: { layers: [layer('clay', 10, [null, null, null])] } })).toThrow(/no data/);
  });
});

describe('climate summary', () => {
  it('compares the last 30 days with the same window in past years', () => {
    const time: string[] = [];
    const precip: number[] = [];
    for (let y = 2016; y <= 2026; y++) {
      for (let d = Date.UTC(y, 0, 1); d <= Date.UTC(y, 11, 31); d += 86_400_000) {
        const iso = new Date(d).toISOString().slice(0, 10);
        if (iso > '2026-11-15') break;
        time.push(iso);
        // 2 mm/day historically, 1 mm/day this year.
        precip.push(y === 2026 ? 1 : 2);
      }
    }
    const c = summariseClimate(time, precip, '2026-11-15');
    expect(c.years).toEqual([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]);
    expect(c.last30Mm).toBe(30);
    expect(c.last30NormalMm).toBe(60);
    expect(c.monthlyNormalMm[0]).toBe(62);
  });
  it('handles a window that crosses the new year', () => {
    const time: string[] = [];
    const precip: number[] = [];
    for (let d = Date.UTC(2015, 0, 1); d <= Date.UTC(2026, 0, 10); d += 86_400_000) {
      time.push(new Date(d).toISOString().slice(0, 10));
      precip.push(1);
    }
    const c = summariseClimate(time, precip, '2026-01-10');
    expect(c.last30Mm).toBe(30);
    expect(c.last30NormalMm).toBe(30);
  });
});

describe('weather normaliser', () => {
  it('builds daily root-zone soil moisture and trims old hours', () => {
    const now = new Date();
    const hours: string[] = [];
    for (let h = -48; h < 48; h++) hours.push(new Date(now.getTime() + 3600_000 + h * 3600_000).toISOString().slice(0, 13) + ':00');
    const n = hours.length;
    const raw = {
      latitude: 7.4, longitude: 3.9, timezone: 'Africa/Lagos', utc_offset_seconds: 3600,
      hourly: {
        time: hours,
        temperature_2m: Array(n).fill(27.33), relative_humidity_2m: Array(n).fill(70), precipitation: Array(n).fill(0),
        precipitation_probability: Array(n).fill(10), wind_speed_10m: Array(n).fill(8), wind_gusts_10m: Array(n).fill(15), is_day: Array(n).fill(1),
        soil_moisture_9_to_27cm: Array(n).fill(0.2), soil_moisture_27_to_81cm: Array(n).fill(0.3),
      },
      daily: {
        time: [hours[0].slice(0, 10)], temperature_2m_max: [31], temperature_2m_min: [22], precipitation_sum: [0], precipitation_probability_max: [10],
        et0_fao_evapotranspiration: [4.4], wind_speed_10m_max: [12], weather_code: [1],
      },
    };
    const w = normaliseWeather(raw);
    expect(w.hourly.time.length).toBeLessThan(n);
    expect(w.hourly.time.length).toBeGreaterThanOrEqual(70);
    expect(w.hourly.temp[0]).toBe(27.3);
    expect(w.daily.soilMoisture[0]).toBeCloseTo(0.275);
  });
});
