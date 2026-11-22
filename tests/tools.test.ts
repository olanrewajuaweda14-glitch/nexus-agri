import { describe, expect, it } from 'vitest';
import { CROPS, scaledCrop } from '../src/lib/crops';
import { shoppingList, shoppingTotal } from '../src/lib/engine/inputs';
import { sellOrStore } from '../src/lib/engine/store';
import { summarize, toCsv, type FarmRecord } from '../src/lib/records';
import type { Farm } from '../src/lib/types';

const farm = (patch: Partial<Farm> = {}): Farm => ({ id: 'f', name: 'Back plot', lat: 7.4, lng: 3.9, crop: 'maize', plantingDate: '2026-10-01', maturity: 'medium', sizeHa: 2, water: 'rainfed', createdAt: '', ...patch });

describe('shopping list', () => {
  it('scales seed and fertilizer to the field and rounds fertilizer up to whole bags', () => {
    const items = shoppingList(CROPS.maize, farm());
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(byId.seed.need).toBe(50); // 25 kg/ha × 2 ha
    expect(byId['fert:NPK 15-15-15']).toMatchObject({ need: 800, bags: 16, buyUnits: 16 });
    expect(byId['fert:urea']).toMatchObject({ need: 260, bags: 6 }); // 5.2 bags → buy 6
    expect(byId.lime).toBeUndefined();
  });
  it('adds up split doses of the same product', () => {
    const urea = shoppingList(CROPS.rice, farm({ crop: 'rice', sizeHa: 1 })).find((i) => i.id === 'fert:urea')!;
    expect(urea.need).toBe(130); // 65 + 65
    expect(urea.bags).toBe(3);
    expect(urea.note).toMatch(/65 kg\/ha at day 21–30; 65 kg\/ha at day 45–55/);
  });
  it('adds inoculant for legumes and lime when the soil needs it', () => {
    const items = shoppingList(CROPS.soybean, farm({ crop: 'soybean', sizeHa: 0.5 }), 1.2);
    expect(items.find((i) => i.id === 'inoculant')).toBeDefined();
    expect(items.find((i) => i.id === 'lime')).toMatchObject({ need: 600, bags: 12 });
  });
  it('handles grams and bundles', () => {
    expect(shoppingList(CROPS.tomato, farm({ crop: 'tomato', sizeHa: 0.3 }))[0]).toMatchObject({ need: 80, unit: 'g', buyUnits: 0.08 });
    expect(shoppingList(scaledCrop('cassava', 'medium'), farm({ crop: 'cassava', sizeHa: 1.5 }))[0]).toMatchObject({ need: 83, unit: 'bundles' });
  });
  it('totals only the items that have a price', () => {
    const items = shoppingList(CROPS.maize, farm());
    expect(shoppingTotal(items, { 'fert:urea': 40_000, seed: 3_000 })).toEqual({ total: 6 * 40_000 + 50 * 3_000, priced: 2, payable: 3 });
  });
});

describe('sell or store', () => {
  const base = { tonnes: 5, priceNow: 500_000, priceLater: 700_000, months: 5, lossPerMonth: 0.002, bagCost: 3_000, monthlyCostPerBag: 200, interestPerMonth: 0 };
  it('recommends storing when the price rise beats costs and losses', () => {
    const r = sellOrStore(base);
    expect(r.sellNow).toBe(2_500_000);
    expect(r.bags).toBe(50);
    expect(r.tonnesLeft).toBeCloseTo(4.95);
    expect(r.storageCost).toBe(50 * (3_000 + 200 * 5));
    expect(r.decision).toBe('store');
    expect(r.gain).toBeCloseTo(4.95 * 700_000 - 200_000 - 2_500_000);
  });
  it('recommends selling when untreated losses and interest eat the gain', () => {
    const r = sellOrStore({ ...base, priceLater: 560_000, lossPerMonth: 0.03, interestPerMonth: 0.03 });
    expect(r.decision).toBe('sell');
    expect(r.breakEvenPrice!).toBeGreaterThan(560_000);
  });
  it('break-even price leaves storing exactly level with selling', () => {
    const r = sellOrStore(base);
    const level = sellOrStore({ ...base, priceLater: r.breakEvenPrice! });
    expect(level.gain).toBeCloseTo(0, 0);
    expect(level.decision).toBe('even');
  });
});

describe('record book', () => {
  const budget = { pricePerTon: 550_000, yieldTHa: 3, costs: [{ id: 'fert', label: 'Fertilizer', amount: 400_000 }, { id: 'labour', label: 'Labour', amount: 150_000 }] };
  const recs: FarmRecord[] = [
    { id: '1', date: '2026-10-02', kind: 'expense', category: 'fert', label: '16 bags NPK', amount: 640_000 },
    { id: '2', date: '2026-10-20', kind: 'expense', category: 'labour', label: 'Weeding, 6 people', amount: 90_000 },
    { id: '3', date: '2026-10-21', kind: 'expense', label: 'Fuel', amount: 10_000 },
    { id: '4', date: '2027-02-01', kind: 'harvest', label: 'Shelled maize', kg: 5_400 },
    { id: '5', date: '2027-02-10', kind: 'sale', label: 'To aggregator', kg: 3_000, amount: 1_650_000 },
  ];
  it('summarises spending against plan, yield and sales', () => {
    const s = summarize(recs, budget, 2);
    expect(s.spent).toBe(740_000);
    expect(s.planned).toBe(1_100_000);
    expect(s.byCategory.find((c) => c.id === 'fert')).toMatchObject({ spent: 640_000, planned: 800_000 });
    expect(s.byCategory.find((c) => c.id === 'other')!.spent).toBe(10_000);
    expect(s.yieldTHa).toBeCloseTo(2.7);
    expect(s.avgPricePerTon).toBeCloseTo(550_000);
    expect(s.unsoldKg).toBe(2_400);
    expect(s.cashSoFar).toBe(910_000);
  });
  it('exports a spreadsheet with escaped text, oldest first', () => {
    const csv = toCsv([...recs].reverse().concat({ id: '6', date: '2026-10-03', kind: 'expense', label: 'Seed, "SAMMAZ 15"', amount: 150_000, category: 'fert' }), farm(), 'Maize', budget);
    const lines = csv.replace('﻿', '').split('\r\n');
    expect(lines[0]).toBe('Farm,Back plot');
    expect(lines[5]).toBe('Date,Type,Category,Description,Amount (NGN),Quantity (kg),Note');
    expect(lines[6]).toMatch(/^2026-10-02,Spent,Fertilizer,16 bags NPK,640000/);
    expect(lines[7]).toBe('2026-10-03,Spent,Fertilizer,"Seed, ""SAMMAZ 15""",150000,,');
    expect(lines.at(-1)).toMatch(/^2027-02-10,Sold,,To aggregator,1650000,3000,/);
  });
});
