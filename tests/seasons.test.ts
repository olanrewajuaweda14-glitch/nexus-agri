import { describe, expect, it } from 'vitest';
import { seasonOf, startNextSeason, summarizeSeason } from '../src/lib/seasons';
import { key } from '../src/lib/engine/plan';
import { recordsKey, type FarmRecord } from '../src/lib/records';
import type { Farm } from '../src/lib/types';

const farm: Farm = { id: 'f1', name: 'Back plot', lat: 7.4, lng: 3.9, crop: 'maize', plantingDate: '2026-04-10', maturity: 'medium', sizeHa: 2, water: 'rainfed', createdAt: '' };
const budget = { pricePerTon: 550_000, yieldTHa: 3, costs: [{ id: 'fert', label: 'Fertilizer', amount: 400_000 }] };

describe('seasons', () => {
  it('older farms keep using the planting date as their season id', () => {
    expect(seasonOf(farm)).toBe('2026-04-10');
    expect(recordsKey(farm)).toBe('na:records:f1:2026-04-10');
    expect(key(farm, 'topdress')).toBe('f1:2026-04-10:topdress');
  });
  it('a corrected planting date keeps records and ticked jobs in place once the season is pinned', () => {
    const corrected: Farm = { ...farm, plantingDate: '2026-04-14', seasonId: seasonOf(farm) };
    expect(recordsKey(corrected)).toBe(recordsKey(farm));
    expect(key(corrected, 'topdress')).toBe(key(farm, 'topdress'));
  });
  it('starting the next season files a summary and opens fresh keys', () => {
    const recs: FarmRecord[] = [
      { id: '1', date: '2026-04-12', kind: 'expense', category: 'fert', label: 'NPK', amount: 640_000 },
      { id: '2', date: '2026-08-20', kind: 'harvest', label: 'Maize', kg: 5_600 },
      { id: '3', date: '2026-09-01', kind: 'sale', label: 'Sold', kg: 5_000, amount: 2_750_000 },
    ];
    const summary = summarizeSeason(farm, recs, budget, '2026-09-05');
    expect(summary).toMatchObject({ seasonId: '2026-04-10', crop: 'maize', spent: 640_000, sales: 2_750_000, harvestedKg: 5_600, soldKg: 5_000, endedAt: '2026-09-05' });

    const next = startNextSeason(farm, { ...farm, crop: 'cowpea', plantingDate: '2026-09-10' }, summary, 's-new');
    expect(next.id).toBe('f1');
    expect(next.seasonId).toBe('s-new');
    expect(next.history).toEqual([summary]);
    expect(recordsKey(next)).toBe('na:records:f1:s-new');
    expect(recordsKey(next, summary.seasonId)).toBe(recordsKey(farm));
    expect(key(next, 'basal')).toBe('f1:s-new:basal');

    const third = startNextSeason(next, { ...next, crop: 'maize', plantingDate: '2027-04-01' }, summarizeSeason(next, [], budget, '2026-12-01'), 's-3');
    expect(third.history!.map((h) => h.crop)).toEqual(['maize', 'cowpea']);
  });
});
