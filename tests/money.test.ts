import { describe, expect, it } from 'vitest';
import { addDays } from '../src/lib/dates';
import { farmMoney, type LedgerEntry } from '../src/lib/ledger';
import { reportText, weekReport } from '../src/lib/report';
import type { FarmRecord } from '../src/lib/records';
import type { AnimalEvent, AnimalGroup } from '../src/lib/livestock';
import type { Farm } from '../src/lib/types';

const today = '2026-11-25';
const d = (n: number) => addDays(today, -n);
const farm: Farm = { id: 'f1', name: 'Back plot', lat: 7, lng: 3, crop: 'maize', plantingDate: d(40), maturity: 'medium', sizeHa: 1, water: 'rainfed', createdAt: '' };
const records: FarmRecord[] = [
  { id: 'r1', date: d(30), kind: 'expense', category: 'fert', label: 'NPK', amount: 320_000 },
  { id: 'r2', date: d(3), kind: 'expense', category: 'labour', label: 'Weeding', amount: 60_000 },
  { id: 'r3', date: d(2), kind: 'harvest', label: 'Green maize', kg: 300 },
  { id: 'r4', date: d(1), kind: 'sale', label: 'Green maize', amount: 150_000, kg: 300 },
  { id: 'r5', date: d(400), kind: 'expense', category: 'seed', label: 'Old season seed', amount: 99_000 },
];
const layers: AnimalGroup = { id: 'L', species: 'layer', name: 'Pen A', startDate: d(100), ageAtStart: 140, startCount: 100, createdAt: '' };
const ev = (e: Omit<AnimalEvent, 'id'>, i: number): AnimalEvent => ({ id: `e${i}`, ...e });
const events: Record<string, AnimalEvent[]> = {
  L: ([
    { date: d(100), kind: 'cost', amount: 400_000, category: 'animals', note: 'Bought 100 pullets' },
    { date: d(5), kind: 'cost', amount: 130_000, category: 'feed' },
    { date: d(4), kind: 'health', stepId: 'worms', amount: 6_000 },
    { date: d(2), kind: 'income', amount: 90_000, note: '20 crates' },
    { date: d(2), kind: 'died', count: 2 },
    ...Array.from({ length: 7 }, (_, k) => ({ date: d(k), kind: 'eggs' as const, count: 85 })),
    ...Array.from({ length: 7 }, (_, k) => ({ date: d(k + 7), kind: 'eggs' as const, count: 90 })),
  ] as Omit<AnimalEvent, 'id'>[]).map(ev),
};
const ledger: LedgerEntry[] = [
  { id: 'l1', date: d(6), kind: 'out', amount: 15_000, category: 'transport', note: 'Okada to market' },
  { id: 'l2', date: d(40), kind: 'out', amount: 50_000, category: 'tools' },
];

describe('whole-farm money', () => {
  const week = farmMoney({ farms: [farm], recordsOf: () => records, groups: [layers], events, ledger, from: d(6), to: today });

  it('adds up each part of the farm for the period only', () => {
    expect(week.parts.map((p) => [p.name, p.in, p.out])).toEqual([
      ['Back plot', 150_000, 60_000],
      ['Whole farm', 0, 15_000],
      ['Pen A', 90_000, 136_000],
    ]);
    expect(week).toMatchObject({ in: 240_000, out: 211_000, net: 29_000 });
  });

  it('says where the money went, biggest first, as a share of spending', () => {
    expect(week.costs.map((c) => [c.label, c.amount])).toEqual([
      ['Animal feed', 130_000],
      ['Labour', 60_000],
      ['Transport', 15_000],
      ['Vaccines and medicine', 6_000],
    ]);
    expect(week.costs[0].share).toBeCloseTo(130 / 211);
  });

  it('counts buying the animals and past seasons when the period covers them', () => {
    const all = farmMoney({ farms: [farm], recordsOf: () => records, groups: [layers], events, ledger, from: '2000-01-01', to: today });
    expect(all.costs.find((c) => c.id === 'animals')?.amount).toBe(400_000);
    expect(all.costs.find((c) => c.id === 'seed')?.amount).toBe(99_000);
    expect(all.out).toBe(320_000 + 60_000 + 99_000 + 400_000 + 130_000 + 6_000 + 15_000 + 50_000);
  });

  it('leaves out parts of the farm with nothing recorded', () => {
    const quiet = farmMoney({ farms: [farm, { ...farm, id: 'f2', name: 'River plot' }], recordsOf: (f) => (f.id === 'f1' ? records : []), groups: [], events: {}, ledger: [], from: d(6), to: today });
    expect(quiet.parts.map((p) => p.name)).toEqual(['Back plot']);
  });
});

describe('weekly report', () => {
  const money = farmMoney({ farms: [farm], recordsOf: () => records, groups: [layers], events, ledger, from: d(6), to: today });
  const r = weekReport({ today, farmName: 'Adebayo Farms', groups: [layers], events, money, rainMm: 31.6, fields: [{ name: 'Back plot', line: 'Maize, day 40: rapid growth' }] });

  it('covers the seven days to today', () => {
    expect([r.from, r.to]).toEqual([d(6), today]);
  });

  it('works out the laying rate against the hens there on each day', () => {
    expect(r.eggs!.total).toBe(595);
    // 100 hens for four days, then 98 from the day of the two losses (days -2, -1 and today).
    expect(r.eggs!.rate).toBeCloseTo(595 / (100 * 4 + 98 * 3), 4);
    expect(r.eggs!.prevRate).toBeCloseTo(0.9, 4);
    expect([r.losses, r.healthDone]).toEqual([2, 1]);
    expect(r.animals).toEqual([{ name: 'Pen A', head: '98 birds' }]);
  });

  it('reads as a short WhatsApp message', () => {
    const text = reportText(r);
    expect(text.split('\n')[0]).toBe('*Adebayo Farms*: the week of 19 Nov to 25 Nov');
    expect(text).toContain('🥚 Eggs: 595 (86% laying, down from 90%)');
    expect(text).toContain('🐾 Animals: 98 birds (Pen A). This week: 2 lost');
    expect(text).toContain('💰 Money: in ₦240,000, out ₦211,000, ahead ₦29,000');
    expect(text).toContain('🌧️ Rain: 32 mm');
    expect(text).toContain('🌱 Back plot: Maize, day 40: rapid growth');
  });

  it('leaves out what was not recorded instead of showing zero', () => {
    const empty = weekReport({ today, groups: [], events: {}, money: { in: 0, out: 0, net: 0, parts: [], costs: [] }, rainMm: null, fields: [] });
    expect(empty.eggs).toBeNull();
    const text = reportText(empty);
    expect(text).not.toMatch(/Eggs|Money|Rain|Animals/);
    expect(text.startsWith('*My farm*')).toBe(true);
  });
});

describe('store purchases and periods', () => {
  it('counts a store purchase once: as a farm cost when not filed elsewhere, never twice', async () => {
    const { farmMoney: fm, farmEntries } = await import('../src/lib/ledger');
    const stock = [{ id: 'u', name: 'Urea', category: 'fertilizer' as const, unit: 'bag50' as const, createdAt: '' }];
    const moves = [
      { id: 'm1', itemId: 'u', date: d(2), kind: 'in' as const, qty: 4, amount: 168_000 },
      { id: 'm2', itemId: 'u', date: d(1), kind: 'in' as const, qty: 2, amount: 84_000, filed: true },
      { id: 'm3', itemId: 'u', date: d(1), kind: 'out' as const, qty: 1 },
    ];
    const m = fm({ farms: [], recordsOf: () => [], groups: [], events: {}, ledger: [], stock, moves, from: d(6), to: today });
    expect(m.out).toBe(168_000);
    expect(m.costs).toEqual([{ id: 'fert', label: 'Fertilizer', amount: 168_000, share: 1 }]);
    const lines = farmEntries({ farms: [], recordsOf: () => [], groups: [], events: {}, ledger: [], stock, moves, from: d(6), to: today });
    expect(lines.map((l) => l.label)).toEqual(['Urea for the store']);
  });

  it('starts each period on the right day', async () => {
    const { periodStart } = await import('../src/lib/ledger');
    expect(periodStart('month', '2026-11-25')).toBe('2026-11-01');
    expect(periodStart('quarter', '2026-11-25')).toBe('2026-09-01');
    expect(periodStart('quarter', '2026-02-10')).toBe('2025-12-01');
    expect(periodStart('year', '2026-11-25')).toBe('2026-01-01');
  });
});
