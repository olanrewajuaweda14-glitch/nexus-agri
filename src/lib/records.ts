import type { Budget, Farm } from './types';
import { load, save } from './storage';

export type RecordKind = 'expense' | 'harvest' | 'sale';

export interface FarmRecord {
  id: string;
  date: string; // YYYY-MM-DD
  kind: RecordKind;
  /** Budget cost-line id for expenses. */
  category?: string;
  label: string;
  /** ₦ — spent (expense) or received (sale). */
  amount?: number;
  /** Quantity harvested or sold, kg. */
  kg?: number;
  note?: string;
}

/** Records are filed per farm and season. Pass a `seasonId` to read a past season. */
export const recordsKey = (farm: Farm, seasonId = farm.seasonId ?? farm.plantingDate) => `na:records:${farm.id}:${seasonId}`;

export const loadRecords = (farm: Farm, seasonId?: string) => load<FarmRecord[]>(recordsKey(farm, seasonId), []);

/** Removes one entry from this planting's record book (used to undo a quick entry). */
export function removeRecord(farm: Farm, id: string) {
  save(recordsKey(farm), loadRecords(farm).filter((r) => r.id !== id));
}

/** Every entry the field has, this season and past ones. */
export function allRecords(farm: Farm): FarmRecord[] {
  const seasons = [farm.seasonId ?? farm.plantingDate, ...(farm.history ?? []).map((h) => h.seasonId)];
  return [...new Set(seasons)].flatMap((id) => loadRecords(farm, id));
}

/** Appends one entry to this planting's record book. */
export function addRecord(farm: Farm, r: Omit<FarmRecord, 'id'>): FarmRecord {
  const entry: FarmRecord = { id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, ...r };
  save(recordsKey(farm), [...loadRecords(farm), entry]);
  return entry;
}

export interface RecordSummary {
  spent: number;
  planned: number;
  byCategory: { id: string; label: string; spent: number; planned: number }[];
  harvestedKg: number;
  soldKg: number;
  sales: number;
  avgPricePerTon: number | null;
  yieldTHa: number | null;
  expectedTonnes: number;
  unsoldKg: number;
  /** Money in minus money out so far. */
  cashSoFar: number;
}

export function summarize(records: FarmRecord[], budget: Budget, sizeHa: number): RecordSummary {
  const cat = new Map(budget.costs.map((c) => [c.id, { id: c.id, label: c.label, spent: 0, planned: c.amount * sizeHa }]));
  const other = { id: 'other', label: 'Other', spent: 0, planned: 0 };
  let spent = 0;
  let harvestedKg = 0;
  let soldKg = 0;
  let sales = 0;
  for (const r of records) {
    if (r.kind === 'expense') {
      const a = Math.max(0, r.amount ?? 0);
      spent += a;
      (cat.get(r.category ?? '') ?? other).spent += a;
    } else if (r.kind === 'harvest') {
      harvestedKg += Math.max(0, r.kg ?? 0);
    } else if (r.kind === 'sale') {
      soldKg += Math.max(0, r.kg ?? 0);
      sales += Math.max(0, r.amount ?? 0);
    }
  }
  const byCategory = [...cat.values(), ...(other.spent > 0 ? [other] : [])];
  return {
    spent,
    planned: budget.costs.reduce((s, c) => s + c.amount, 0) * sizeHa,
    byCategory,
    harvestedKg,
    soldKg,
    sales,
    avgPricePerTon: soldKg > 0 ? (sales / soldKg) * 1000 : null,
    yieldTHa: harvestedKg > 0 && sizeHa > 0 ? harvestedKg / 1000 / sizeHa : null,
    expectedTonnes: budget.yieldTHa * sizeHa,
    unsoldKg: Math.max(0, harvestedKg - soldKg),
    cashSoFar: sales - spent,
  };
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Spreadsheet export; opens in Excel, Google Sheets or WPS. */
export function toCsv(records: FarmRecord[], farm: Farm, cropName: string, budget: Budget): string {
  const label = (id?: string) => budget.costs.find((c) => c.id === id)?.label ?? (id ? 'Other' : '');
  const rows = [
    ['Farm', farm.name],
    ['Crop', cropName],
    ['Planted', farm.plantingDate],
    ['Size (ha)', farm.sizeHa],
    [],
    ['Date', 'Type', 'Category', 'Description', 'Amount (NGN)', 'Quantity (kg)', 'Note'],
    ...[...records]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => [r.date, r.kind === 'expense' ? 'Spent' : r.kind === 'harvest' ? 'Harvested' : 'Sold', r.kind === 'expense' ? label(r.category) : '', r.label, r.amount ?? '', r.kg ?? '', r.note ?? '']),
  ];
  // BOM so Excel reads ₦ and accents correctly.
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}
