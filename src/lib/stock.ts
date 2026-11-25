/**
 * The farm store: what is in stock (fertilizer, seed, chemicals, feed,
 * medicine, produce) as a running balance of what came in and went out.
 *
 * An item can carry the key of a buy-list line ("fert:urea", "seed"), so the
 * buy list subtracts what is already in the store and a job that needs more
 * than the store holds can be flagged before the day.
 */
export type StockCategory = 'fertilizer' | 'seed' | 'chemical' | 'feed' | 'medicine' | 'produce' | 'other';

export const CATEGORIES: { id: StockCategory; label: string }[] = [
  { id: 'fertilizer', label: 'Fertilizer' },
  { id: 'seed', label: 'Seed' },
  { id: 'chemical', label: 'Chemicals' },
  { id: 'feed', label: 'Animal feed' },
  { id: 'medicine', label: 'Vaccines and medicine' },
  { id: 'produce', label: 'Harvest in store' },
  { id: 'other', label: 'Other' },
];

export const UNITS = [
  { id: 'bag50', one: 'bag (50 kg)', many: 'bags (50 kg)' },
  { id: 'bag25', one: 'bag (25 kg)', many: 'bags (25 kg)' },
  { id: 'bag100', one: 'bag (100 kg)', many: 'bags (100 kg)' },
  { id: 'kg', one: 'kg', many: 'kg' },
  { id: 'g', one: 'g', many: 'g' },
  { id: 'litre', one: 'litre', many: 'litres' },
  { id: 'bottle', one: 'bottle', many: 'bottles' },
  { id: 'sachet', one: 'sachet', many: 'sachets' },
  { id: 'vial', one: 'vial', many: 'vials' },
  { id: 'crate', one: 'crate (30 eggs)', many: 'crates (30 eggs)' },
  { id: 'bundles', one: 'bundle', many: 'bundles' },
  { id: 'piece', one: 'piece', many: 'pieces' },
] as const;
export type UnitId = (typeof UNITS)[number]['id'];

export const unitText = (unit: UnitId, qty: number) => {
  const u = UNITS.find((x) => x.id === unit) ?? UNITS[UNITS.length - 1];
  return Math.abs(qty) === 1 ? u.one : u.many;
};

/** "5¼" style quantities: whole numbers stay whole, quarters show as fractions. */
export function qtyText(qty: number): string {
  const sign = qty < 0 ? '−' : '';
  const a = Math.abs(qty);
  const whole = Math.floor(a + 1e-9);
  const frac = Math.round((a - whole) * 4) / 4;
  if (frac === 0 || frac === 1) return sign + String(frac === 1 ? whole + 1 : whole);
  if (Math.abs(a - whole - frac) > 0.01) return sign + a.toLocaleString('en-NG', { maximumFractionDigits: 2 });
  return `${sign}${whole || ''}${{ 0.25: '¼', 0.5: '½', 0.75: '¾' }[frac as 0.25 | 0.5 | 0.75]}`;
}

export interface StockItem {
  id: string;
  name: string;
  category: StockCategory;
  unit: UnitId;
  /** Buy-list line this item stands for, e.g. "fert:urea". */
  key?: string;
  /** Warn when the balance falls to this or below. */
  lowAt?: number;
  createdAt: string;
}

export interface StockMove {
  id: string;
  itemId: string;
  date: string;
  /** in: bought or harvested; out: used, sold or lost; count: a stock-take that sets the balance. */
  kind: 'in' | 'out' | 'count';
  qty: number;
  /** ₦ paid, for "in". */
  amount?: number;
  /** The amount is also in a field's record book, a group's money or the farm ledger, so it is not counted again. */
  filed?: boolean;
  note?: string;
}

/** Which whole-farm cost a store purchase counts as. */
export const STOCK_COST: Record<StockCategory, 'fert' | 'seed' | 'chem' | 'feed' | 'medicine' | 'other'> = {
  fertilizer: 'fert', seed: 'seed', chemical: 'chem', feed: 'feed', medicine: 'medicine', produce: 'other', other: 'other',
};

export const STOCK_KEY = 'na:stock';
export const MOVES_KEY = 'na:stock-moves';

/** Balance after every move up to `date`, in the order they happened. */
export function balance(itemId: string, moves: StockMove[], date = '9999-12-31'): number {
  let n = 0;
  const mine = moves.filter((m) => m.itemId === itemId && m.date <= date).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const m of mine) {
    if (m.kind === 'in') n += m.qty;
    else if (m.kind === 'out') n -= m.qty;
    else n = m.qty;
  }
  return Math.max(0, Math.round(n * 1000) / 1000);
}

export const isLow = (item: StockItem, qty: number) => item.lowAt != null && qty <= item.lowAt;

export const findByKey = (items: StockItem[], key: string) => items.find((i) => i.key === key);

/** Unique, sortable ids, safe for two moves saved in the same millisecond. */
let seq = 0;
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++ % 1296).toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 5)}`;
