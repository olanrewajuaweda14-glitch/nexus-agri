/**
 * Money across the whole farm: every field's record books (this season and
 * past ones), every animal group's log, and a small ledger for costs that
 * belong to no one field or flock (transport, tools, phone credit, levies).
 *
 * Nothing here is estimated: it only adds up what the farmer recorded.
 */
import type { Farm } from './types';
import type { FarmRecord } from './records';
import type { AnimalEvent, AnimalGroup } from './livestock';
import { STOCK_COST, type StockItem, type StockMove } from './stock';

export type MoneyCat =
  | 'seed' | 'fert' | 'chem' | 'land' | 'labour' | 'harvest' | 'haul'
  | 'feed' | 'medicine' | 'animals' | 'transport' | 'tools' | 'rent' | 'other';

export const MONEY_CATS: Record<MoneyCat, string> = {
  seed: 'Seed',
  fert: 'Fertilizer',
  chem: 'Chemicals',
  land: 'Land preparation',
  labour: 'Labour',
  harvest: 'Harvest and processing',
  haul: 'Bags and transport',
  feed: 'Animal feed',
  medicine: 'Vaccines and medicine',
  animals: 'Buying animals',
  transport: 'Transport',
  tools: 'Tools and repairs',
  rent: 'Rent and levies',
  other: 'Other',
};

export interface LedgerEntry {
  id: string;
  date: string;
  kind: 'in' | 'out';
  amount: number;
  category: MoneyCat;
  note?: string;
}

export const LEDGER_KEY = 'na:ledger';

export interface Part {
  /** "field:<id>", "group:<id>" or "farm". */
  id: string;
  kind: 'field' | 'group' | 'farm';
  name: string;
  in: number;
  out: number;
  net: number;
}

export interface FarmMoney {
  in: number;
  out: number;
  net: number;
  parts: Part[];
  /** Where the money went, biggest first. */
  costs: { id: MoneyCat; label: string; amount: number; share: number }[];
}

const RECORD_CAT: Record<string, MoneyCat> = { seed: 'seed', fert: 'fert', chem: 'chem', land: 'land', labour: 'labour', harvest: 'harvest', haul: 'haul' };

const within = (date: string, from: string, to: string) => date >= from && date <= to;

/**
 * Money in and out between `from` and `to` (inclusive), by part of the farm
 * and by what it was spent on. `recordsOf` returns every record a field has,
 * across its seasons.
 */
export function farmMoney(opts: {
  farms: Farm[];
  recordsOf: (farm: Farm) => FarmRecord[];
  groups: AnimalGroup[];
  events: Record<string, AnimalEvent[]>;
  ledger: LedgerEntry[];
  /** Store purchases whose cost was not filed anywhere else count as whole-farm costs. */
  stock?: StockItem[];
  moves?: StockMove[];
  from: string;
  to: string;
}): FarmMoney {
  const { from, to } = opts;
  const parts: Part[] = [];
  const costs = new Map<MoneyCat, number>();
  const cost = (c: MoneyCat, a: number) => costs.set(c, (costs.get(c) ?? 0) + a);

  for (const f of opts.farms) {
    let inn = 0;
    let out = 0;
    for (const r of opts.recordsOf(f)) {
      if (!within(r.date, from, to) || !(r.amount && r.amount > 0)) continue;
      if (r.kind === 'expense') {
        out += r.amount;
        cost(RECORD_CAT[r.category ?? ''] ?? 'other', r.amount);
      } else if (r.kind === 'sale') inn += r.amount;
    }
    parts.push({ id: `field:${f.id}`, kind: 'field', name: f.name, in: inn, out, net: inn - out });
  }

  for (const g of opts.groups) {
    let inn = 0;
    let out = 0;
    for (const e of opts.events[g.id] ?? []) {
      if (!within(e.date, from, to) || !(e.amount && e.amount > 0)) continue;
      if (e.kind === 'sold' || e.kind === 'income') inn += e.amount;
      else if (e.kind === 'added') {
        out += e.amount;
        cost('animals', e.amount);
      } else if (e.kind === 'health') {
        out += e.amount;
        cost('medicine', e.amount);
      } else if (e.kind === 'cost') {
        out += e.amount;
        cost(e.category === 'feed' || e.category === 'medicine' || e.category === 'animals' ? e.category : 'other', e.amount);
      }
    }
    parts.push({ id: `group:${g.id}`, kind: 'group', name: g.name, in: inn, out, net: inn - out });
  }

  let inn = 0;
  let out = 0;
  for (const l of opts.ledger) {
    if (!within(l.date, from, to) || !(l.amount > 0)) continue;
    if (l.kind === 'in') inn += l.amount;
    else {
      out += l.amount;
      cost(l.category, l.amount);
    }
  }
  const items = new Map((opts.stock ?? []).map((i) => [i.id, i]));
  for (const m of opts.moves ?? []) {
    if (m.kind !== 'in' || m.filed || !(m.amount && m.amount > 0) || !within(m.date, from, to)) continue;
    out += m.amount;
    cost(STOCK_COST[items.get(m.itemId)?.category ?? 'other'], m.amount);
  }
  if (inn || out) parts.push({ id: 'farm', kind: 'farm', name: 'Whole farm', in: inn, out, net: inn - out });

  const totalIn = parts.reduce((s, p) => s + p.in, 0);
  const totalOut = parts.reduce((s, p) => s + p.out, 0);
  return {
    in: totalIn,
    out: totalOut,
    net: totalIn - totalOut,
    parts: parts.filter((p) => p.in || p.out).sort((a, b) => b.net - a.net),
    costs: [...costs.entries()]
      .map(([id, amount]) => ({ id, label: MONEY_CATS[id], amount, share: totalOut > 0 ? amount / totalOut : 0 }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export interface MoneyLine {
  key: string;
  date: string;
  dir: 'in' | 'out';
  amount: number;
  label: string;
  part: string;
}

/** Every money entry in the period, newest first, from wherever it was recorded. */
export function farmEntries(opts: Parameters<typeof farmMoney>[0]): MoneyLine[] {
  const { from, to } = opts;
  const out: MoneyLine[] = [];
  const add = (l: MoneyLine) => within(l.date, from, to) && l.amount > 0 && out.push(l);
  for (const f of opts.farms) {
    for (const r of opts.recordsOf(f)) {
      if (r.kind === 'harvest' || !r.amount) continue;
      add({ key: `r:${f.id}:${r.id}`, date: r.date, dir: r.kind === 'sale' ? 'in' : 'out', amount: r.amount, label: r.label, part: f.name });
    }
  }
  for (const g of opts.groups) {
    for (const e of opts.events[g.id] ?? []) {
      if (!e.amount) continue;
      const dir = e.kind === 'sold' || e.kind === 'income' ? 'in' : e.kind === 'added' || e.kind === 'cost' || e.kind === 'health' ? 'out' : null;
      if (!dir) continue;
      const label = e.note || (e.kind === 'sold' ? `${e.count ?? ''} sold`.trim() : e.kind === 'health' ? e.product ?? 'Treatment' : e.kind === 'added' ? 'Animals added' : MONEY_CATS[(e.category as MoneyCat) ?? 'other'] ?? 'Cost');
      add({ key: `e:${g.id}:${e.id}`, date: e.date, dir, amount: e.amount, label, part: g.name });
    }
  }
  for (const l of opts.ledger) add({ key: `l:${l.id}`, date: l.date, dir: l.kind, amount: l.amount, label: l.note || MONEY_CATS[l.category], part: 'Whole farm' });
  const items = new Map((opts.stock ?? []).map((i) => [i.id, i]));
  for (const m of opts.moves ?? []) {
    if (m.kind !== 'in' || m.filed || !m.amount) continue;
    add({ key: `m:${m.id}`, date: m.date, dir: 'out', amount: m.amount, label: `${items.get(m.itemId)?.name ?? 'Store'} for the store`, part: 'Whole farm' });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.key.localeCompare(b.key));
}

export type Period = 'month' | 'quarter' | 'year' | 'all';
export const PERIODS: { value: Period; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'Last 3 months' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

/** First day of the period that ends today. */
export function periodStart(p: Period, today: string): string {
  if (p === 'month') return `${today.slice(0, 7)}-01`;
  if (p === 'year') return `${today.slice(0, 4)}-01-01`;
  if (p === 'all') return '1900-01-01';
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 2; // two months back, so three calendar months including this one
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toISOString().slice(0, 10);
}
