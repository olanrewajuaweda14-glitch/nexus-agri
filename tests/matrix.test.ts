import { describe, expect, it } from 'vitest';
import { CROP_LIST, scaledCrop } from '../src/lib/crops';
import { addDays } from '../src/lib/dates';
import { stageFor } from '../src/lib/engine/stage';
import { waterBalance } from '../src/lib/engine/water';
import { sprayOutlook } from '../src/lib/engine/spray';
import { buildPlan, seasonAhead } from '../src/lib/engine/plan';
import { interpretSoil, waterLimits } from '../src/lib/engine/soil';
import { shoppingList } from '../src/lib/engine/inputs';
import { economics } from '../src/lib/engine/economics';
import type { Farm, Maturity, WaterSource } from '../src/lib/types';
import { makeWeather } from './fixtures';

const TODAY = '2026-11-22';
const BAD = /NaN|undefined|Infinity|null|\[object/;

const weathers = {
  dry: makeWeather(TODAY, { day: () => ({ rain: 0, et0: 6, tMax: 38 }) }),
  wet: makeWeather(TODAY, { day: (o) => ({ rain: o % 2 ? 0 : 35, prob: 90, tMax: 29 }), hour: () => ({ rh: 95 }) }),
  normal: makeWeather(TODAY),
};

describe('every crop × variety × stage × water source × weather', () => {
  for (const base of CROP_LIST) {
    it(`${base.name}: plans are complete and readable all season`, () => {
      let checked = 0;
      for (const maturity of ['early', 'medium', 'late'] as Maturity[]) {
        const crop = scaledCrop(base.id, maturity);
        for (let dap = -40; dap <= crop.maturityDays + 30; dap += 3) {
          for (const water of ['rainfed', 'irrigated'] as WaterSource[]) {
            const farm: Farm = { id: 'm', name: 'M', lat: 7, lng: 4, crop: base.id, plantingDate: addDays(TODAY, -dap), maturity, sizeHa: 1.3, water, createdAt: '' };
            const stage = stageFor(crop, farm.plantingDate, TODAY);
            const soil = { ph: 4.9, clayPct: 22, sandPct: 60, siltPct: 18, socGKg: 5, nitrogenGKg: 0.6, cecCmolKg: 5, bulkDensity: 1.4 };
            const limits = waterLimits(soil);
            const findings = interpretSoil(soil, crop);
            for (const w of [...Object.values(weathers), null]) {
              const water_ = w ? waterBalance(w.daily, TODAY, crop, farm.plantingDate, limits) : null;
              const spray = w ? sprayOutlook(w.hourly, `${TODAY}T06:00`) : null;
              const plan = buildPlan({ farm, crop, stage, today: TODAY, weather: w, water: water_, spray, soilFindings: findings, climate: null, done: new Set() });
              const ids = plan.map((a) => a.id);
              expect(new Set(ids).size, `duplicate ids at day ${dap}`).toBe(ids.length);
              for (const a of plan) {
                const text = [a.title, a.when, a.how ?? '', ...a.why, ...a.sources].join(' | ');
                expect(text, `${base.id} ${maturity} day ${dap} ${water}`).not.toMatch(BAD);
                expect(['now', 'week', 'watch']).toContain(a.priority);
                expect(a.title.length).toBeGreaterThan(3);
              }
              if (water_) {
                expect(Number.isFinite(water_.availableNow)).toBe(true);
                expect(water_.availableNow).toBeGreaterThanOrEqual(0);
                expect(water_.availableNow).toBeLessThanOrEqual(1);
              }
              checked++;
            }
            expect(stage.name, `stage name day ${dap}`).not.toMatch(BAD);
            expect(seasonAhead(farm, crop, TODAY, new Set()).every((t) => t.start > TODAY)).toBe(true);
          }
        }
      }
      expect(checked).toBeGreaterThan(300);
    });
  }

  it('shopping list and economics stay sane at tiny and huge field sizes', () => {
    for (const base of CROP_LIST) {
      for (const size of [0.01, 0.4, 7, 250]) {
        const farm: Farm = { id: 's', name: 'S', lat: 7, lng: 4, crop: base.id, plantingDate: TODAY, maturity: 'medium', sizeHa: size, water: 'rainfed', createdAt: '' };
        for (const it of shoppingList(base, farm, 1.1)) {
          expect(it.need, `${base.id} ${it.id} @ ${size} ha`).toBeGreaterThan(0);
          expect(`${it.name} ${it.when} ${it.note}`).not.toMatch(BAD);
          if (it.bags != null) expect(it.bags).toBeGreaterThanOrEqual(1);
        }
        const e = economics(base.exampleBudget, size);
        expect(Number.isFinite(e.profit)).toBe(true);
        expect(e.breakEvenYield! * base.exampleBudget.pricePerTon).toBeCloseTo(e.costPerHa, 0);
      }
    }
  });
});
