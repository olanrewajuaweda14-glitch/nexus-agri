import { describe, expect, it } from 'vitest';
import { CROPS, scaledCrop } from '../src/lib/crops';
import { addDays, daysBetween, hourLabel } from '../src/lib/dates';
import { kcForDap, stageFor } from '../src/lib/engine/stage';
import { interpretSoil, limeRequirement, textureClass, waterLimits } from '../src/lib/engine/soil';
import { waterBalance } from '../src/lib/engine/water';
import { sprayOutlook } from '../src/lib/engine/spray';
import { buildPlan, doseForFarm, key, seasonAhead } from '../src/lib/engine/plan';
import { economics, sensitivity } from '../src/lib/engine/economics';
import type { Farm } from '../src/lib/types';
import { makeWeather } from './fixtures';

const TODAY = '2026-11-21';
const farmAt = (dap: number, patch: Partial<Farm> = {}): Farm => ({
  id: 't', name: 'Test', lat: 7.43, lng: 3.93, crop: 'maize', plantingDate: addDays(TODAY, -dap), maturity: 'medium', sizeHa: 2, water: 'rainfed', createdAt: '', ...patch,
});
const LOAM = waterLimits({ sandPct: 45, clayPct: 20, socGKg: 10 });

function plan(farm: Farm, weather = makeWeather(TODAY), done = new Set<string>()) {
  const crop = scaledCrop(farm.crop, farm.maturity);
  const stage = stageFor(crop, farm.plantingDate, weather.today);
  const water = waterBalance(weather.daily, weather.today, crop, farm.plantingDate, LOAM);
  const spray = sprayOutlook(weather.hourly, `${weather.today}T06:00`);
  return buildPlan({ farm, crop, stage, today: weather.today, weather, water, spray, soilFindings: [], climate: null, done });
}

describe('dates', () => {
  it('counts days across months and years', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
  });
});

describe('crop stage', () => {
  const maize = CROPS.maize;
  it('follows the FAO-56 Kc curve', () => {
    expect(kcForDap(maize, 0)).toBe(0.3);
    expect(kcForDap(maize, 20)).toBe(0.3);
    expect(kcForDap(maize, 55)).toBeCloseTo(1.2);
    expect(kcForDap(maize, 37.5)).toBeCloseTo(0.75);
    expect(kcForDap(maize, 200)).toBe(0.35);
  });
  it('places the crop in the right stage', () => {
    expect(stageFor(maize, '2026-10-01', '2026-11-27').name).toBe('Tasseling & silking');
    expect(stageFor(maize, '2026-12-01', TODAY).status).toBe('not-planted');
    expect(stageFor(maize, '2026-01-01', TODAY).status).toBe('mature');
  });
  it('stage lengths sum to maturity for every crop', () => {
    for (const c of Object.values(CROPS)) expect(c.faoStages.reduce((a, b) => a + b, 0)).toBe(c.maturityDays);
  });
  it('scales late varieties but keeps early field operations on the calendar', () => {
    const late = scaledCrop('maize', 'late');
    expect(late.maturityDays).toBeGreaterThan(CROPS.maize.maturityDays);
    expect(late.tasks.find((t) => t.id === 'basal')!.fromDap).toBe(0);
    expect(late.tasks.find((t) => t.id === 'topdress')!.fromDap).toBe(Math.round(28 * 1.15));
  });
});

describe('soil', () => {
  it('classifies texture with the USDA triangle', () => {
    expect(textureClass(90, 5)).toBe('Sand');
    expect(textureClass(65, 10)).toBe('Sandy loam');
    expect(textureClass(40, 20)).toBe('Loam');
    expect(textureClass(55, 25)).toBe('Sandy clay loam');
    expect(textureClass(20, 55)).toBe('Clay');
    expect(textureClass(null, 20)).toBe('Unknown');
  });
  it('Saxton–Rawls gives realistic water limits', () => {
    const sandy = waterLimits({ sandPct: 80, clayPct: 8, socGKg: 5 });
    const clay = waterLimits({ sandPct: 20, clayPct: 50, socGKg: 15 });
    expect(sandy.fieldCapacity).toBeGreaterThan(0.08);
    expect(sandy.fieldCapacity).toBeLessThan(0.2);
    expect(clay.fieldCapacity).toBeGreaterThan(0.35);
    expect(clay.wiltingPoint).toBeGreaterThan(sandy.wiltingPoint);
    expect(waterLimits({ sandPct: null, clayPct: null, socGKg: null }).estimated).toBe(true);
  });
  it('recommends lime only below the crop range', () => {
    expect(limeRequirement(6.0, 5.5, 20)).toBe(0);
    expect(limeRequirement(4.8, 5.5, 20)).toBeCloseTo(1.3);
    const f = interpretSoil({ ph: 4.6, clayPct: 20, sandPct: 50, siltPct: 30, socGKg: 4, nitrogenGKg: 0.5, cecCmolKg: 4, bulkDensity: 1.4 }, CROPS.maize);
    expect(f.map((x) => x.id)).toEqual(expect.arrayContaining(['ph-low', 'soc-low', 'cec-low', 'n-low']));
  });
});

describe('water balance', () => {
  const maize = CROPS.maize;
  it('drains toward stress in a dry spell', () => {
    const w = makeWeather(TODAY, { day: () => ({ rain: 0, et0: 5.5 }) });
    const b = waterBalance(w.daily, TODAY, maize, addDays(TODAY, -50), LOAM);
    expect(b.stressedNow).toBe(true);
    expect(b.availableNow).toBeLessThan(1 - maize.p);
  });
  it('stays full when it rains often', () => {
    const w = makeWeather(TODAY, { day: (o) => ({ rain: o % 2 === 0 ? 15 : 0, prob: 90 }) });
    const b = waterBalance(w.daily, TODAY, maize, addDays(TODAY, -50), LOAM);
    expect(b.stressedNow).toBe(false);
    expect(b.stressDate).toBeNull();
    expect(b.availableNow).toBeGreaterThan(0.6);
  });
  it('weights forecast rain by its probability', () => {
    const w = makeWeather(TODAY, { day: (o) => (o === 2 ? { rain: 20, prob: 50 } : {}) });
    const b = waterBalance(w.daily, TODAY, maize, addDays(TODAY, -50), LOAM);
    expect(b.days.find((d) => d.date === addDays(TODAY, 2))!.rain).toBe(10);
  });
  it('ignores showers under 2 mm', () => {
    const dry = makeWeather(TODAY);
    const drizzle = makeWeather(TODAY, { day: () => ({ rain: 1.5, prob: 100 }) });
    const a = waterBalance(dry.daily, TODAY, maize, addDays(TODAY, -50), LOAM);
    const b = waterBalance(drizzle.daily, TODAY, maize, addDays(TODAY, -50), LOAM);
    expect(b.depletionNow).toBe(a.depletionNow);
  });
});

describe('spray windows', () => {
  it('finds calm daylight windows and blocks wind, heat, night and rain', () => {
    const w = makeWeather(TODAY, {
      hour: (o, h) => (o === 0 && h >= 12 ? { wind: 22 } : o === 1 && h === 15 ? { precip: 3, precipProb: 80 } : {}),
    });
    const s = sprayOutlook(w.hourly, `${TODAY}T06:00`);
    const first = s.windows[0];
    expect(first.start).toBe(`${TODAY}T07:00`);
    // Afternoon temps peak at 30 °C so the window must end before the wind picks up at noon.
    expect(first.end <= `${TODAY}T11:00`).toBe(true);
    // Rain at 15:00 tomorrow blocks the four hours before it (rain-fast period).
    const tomorrow11 = s.hours.find((h) => h.time === `${addDays(TODAY, 1)}T11:00`)!;
    expect(tomorrow11.status).toBe('no');
    expect(tomorrow11.reasons.some((r) => r.startsWith('rain in'))).toBe(true);
    expect(s.hours.find((h) => h.time === `${TODAY}T22:00`)!.reasons).toContain('dark');
  });
  it('reports no window when it is windy all week', () => {
    const w = makeWeather(TODAY, { hour: () => ({ wind: 25, gust: 40 }) });
    expect(sprayOutlook(w.hourly, `${TODAY}T06:00`).next).toBeNull();
  });
});

describe('weekly plan', () => {
  it('schedules urea top-dressing in the window, timed after rain', () => {
    const w = makeWeather(TODAY, { day: (o) => (o === 1 ? { rain: 18, prob: 85 } : {}) });
    const p = plan(farmAt(32), w);
    const td = p.find((a) => a.id === 'topdress')!;
    expect(td).toBeDefined();
    expect(td.checkable).toBe(true);
    expect(td.why.join(' ')).toMatch(/Best day/);
  });
  it('avoids fertilizer on a heavy-rain day', () => {
    const w = makeWeather(TODAY, { day: (o) => (o === 0 || o === 1 ? { rain: 45, prob: 90 } : {}) });
    const td = plan(farmAt(32), w).find((a) => a.id === 'topdress')!;
    expect(td.when).not.toBe('today');
    expect(td.why.join(' ')).toMatch(/Avoid/);
  });
  it('marks a missed task overdue and drops it once ticked off', () => {
    const farm = farmAt(47);
    const overdue = plan(farm).find((a) => a.id === 'topdress')!;
    expect(overdue.overdue).toBe(true);
    expect(overdue.priority).toBe('now');
    expect(plan(farm, makeWeather(TODAY), new Set([key(farm, 'topdress')])).some((a) => a.id === 'topdress')).toBe(false);
  });
  it('resets weekly scouting each week', () => {
    const farm = farmAt(20);
    const a = plan(farm).find((x) => x.id.startsWith('faw@'))!;
    const nextWeek = plan(farmAt(27), makeWeather(TODAY), new Set([key(farm, a.id)])).find((x) => x.id.startsWith('faw@'))!;
    expect(nextWeek.id).not.toBe(a.id);
  });
  it('flags heavy rain and heat at flowering', () => {
    const w = makeWeather(TODAY, { day: (o) => (o === 3 ? { rain: 55, prob: 80, tMax: 37 } : o === 2 ? { tMax: 37 } : {}) });
    const p = plan(farmAt(56), w);
    expect(p.some((a) => a.kind === 'drainage')).toBe(true);
    expect(p.find((a) => a.id === 'heat')?.priority).toBe('now');
  });
  it('tells an irrigated farm how much water to apply when stressed', () => {
    const w = makeWeather(TODAY, { day: () => ({ rain: 0, et0: 6 }) });
    const irr = plan(farmAt(60, { water: 'irrigated' }), w).find((a) => a.id === 'irrigate')!;
    expect(irr.priority).toBe('now');
    expect(irr.how).toMatch(/m³ per hectare/);
  });
  it('says no irrigation is needed when the root zone is full', () => {
    const w = makeWeather(TODAY, { day: (o) => ({ rain: o % 2 === 0 ? 15 : 0, prob: 90 }) });
    expect(plan(farmAt(60, { water: 'irrigated' }), w).some((a) => a.id === 'no-irrigate')).toBe(true);
  });
  it('checks for rain onset before planting', () => {
    const dry = plan(farmAt(-5), makeWeather(TODAY));
    expect(dry[0].id).toBe('onset');
    expect(dry[0].title).toMatch(/hold planting/);
    const wet = plan(farmAt(-5), makeWeather(TODAY, { day: (o) => (o >= -2 && o <= 0 ? { rain: 12 } : o > 0 ? { rain: 6, prob: 80 } : {}) }));
    expect(wet[0].title).toMatch(/ready/);
  });
  it('orders actions now → week → watch', () => {
    const order = { now: 0, week: 1, watch: 2 } as const;
    const p = plan(farmAt(47), makeWeather(TODAY, { day: (o) => (o === 3 ? { rain: 55, prob: 80 } : {}) }));
    for (let i = 1; i < p.length; i++) expect(order[p[i].priority]).toBeGreaterThanOrEqual(order[p[i - 1].priority]);
  });
});

describe('economics', () => {
  const b = { pricePerTon: 500_000, yieldTHa: 3, costs: [{ id: 'a', label: 'All', amount: 900_000 }] };
  it('computes margin and break-evens', () => {
    const e = economics(b, 2);
    expect(e.totalCost).toBe(1_800_000);
    expect(e.revenue).toBe(3_000_000);
    expect(e.profit).toBe(1_200_000);
    expect(e.marginPct).toBeCloseTo(40);
    expect(e.breakEvenYield).toBeCloseTo(1.8);
    expect(e.breakEvenPrice).toBeCloseTo(300_000);
  });
  it('never divides by zero', () => {
    const e = economics({ ...b, pricePerTon: 0, yieldTHa: 0 }, 0);
    expect(e.marginPct).toBeNull();
    expect(e.breakEvenYield).toBeNull();
    expect(e.returnPerNaira).toBeNull();
  });
  it('sensitivity centre equals the base case', () => {
    expect(sensitivity(b, 2)[2][2]).toBe(economics(b, 2).profit);
  });
});

describe('plan without a forecast', () => {
  it('still lists calendar jobs, with honest guidance instead of timing', () => {
    const farm = farmAt(32);
    const crop = scaledCrop('maize', 'medium');
    const stage = stageFor(crop, farm.plantingDate, TODAY);
    const p = buildPlan({ farm, crop, stage, today: TODAY, weather: null, water: null, spray: null, soilFindings: [], climate: null, done: new Set() });
    const td = p.find((a) => a.id === 'topdress')!;
    expect(td).toBeDefined();
    expect(td.why.join(' ')).toMatch(/No forecast loaded/);
    expect(p.some((a) => a.kind === 'water' || a.kind === 'drainage')).toBe(false);
  });
  it('gives an onset rule of thumb before planting', () => {
    const farm = farmAt(-3);
    const crop = scaledCrop('maize', 'medium');
    const p = buildPlan({ farm, crop, stage: stageFor(crop, farm.plantingDate, TODAY), today: TODAY, weather: null, water: null, spray: null, soilFindings: [], climate: null, done: new Set() });
    expect(p[0].id).toBe('onset');
    expect(p[0].why[0]).toMatch(/20 mm/);
  });
});

describe('fertilizer amounts for the farm', () => {
  it('converts kg/ha to the farm total in 50 kg bags, rounded up to a quarter', () => {
    expect(doseForFarm({ product: 'urea', kgPerHa: 130 }, 2)).toBe('For your 2 ha: 260 kg of urea — 5¼ bags (50 kg).');
    expect(doseForFarm({ product: 'NPK 15-15-15', kgPerHa: 400 }, 0.5)).toBe('For your 0.5 ha: 200 kg of NPK 15-15-15 — 4 bags (50 kg).');
    expect(doseForFarm({ product: 'urea', kgPerHa: 65 }, 0.3)).toBe('For your 0.3 ha: 20 kg of urea — ½ bag (50 kg).');
  });
  it('appends the farm amount to fertilizer jobs', () => {
    const td = plan(farmAt(32)).find((a) => a.id === 'topdress')!;
    expect(td.how).toMatch(/For your 2 ha: 260 kg of urea/);
  });
  it('every fertilizer task carries a dose', () => {
    for (const c of Object.values(CROPS)) for (const t of c.tasks) if (t.kind === 'fertilizer') expect(t.dose, `${c.id}/${t.id}`).toBeDefined();
  });
});

describe('season ahead', () => {
  it('lists later jobs in date order and skips done ones', () => {
    const farm = farmAt(10);
    const crop = scaledCrop('maize', 'medium');
    const ahead = seasonAhead(farm, crop, TODAY, new Set([key(farm, 'weed2')]));
    expect(ahead.map((t) => t.id)).toEqual(['topdress', 'harvest']);
    expect(ahead[0].start).toBe(addDays(farm.plantingDate, 28));
  });
});

describe('edge cases', () => {
  it('labels midnight correctly when a window ends at 23:00', () => {
    expect(hourLabel('2026-11-21T24:00')).toBe('midnight');
    expect(hourLabel('2026-11-21T00:00')).toBe('midnight');
    expect(hourLabel('2026-11-21T13:00')).toBe('1 pm');
  });
  it('returns no spray hours when the forecast is entirely in the past', () => {
    const w = makeWeather(TODAY);
    expect(sprayOutlook(w.hourly, `${addDays(TODAY, 30)}T08:00`).hours).toHaveLength(0);
  });
});
