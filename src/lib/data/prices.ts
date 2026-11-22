/**
 * Market prices from the World Food Programme's Nigeria market monitoring
 * (published on the Humanitarian Data Exchange, updated monthly, CC BY-IGO).
 *
 * The CSV has one row per market × commodity × month with market coordinates,
 * so we can find the monitored market nearest the farm and the usual seasonal
 * pattern there. Parsing is by column name, and unknown units are skipped
 * rather than guessed.
 */
import type { CropId } from '../types.js';
import { distance } from '../geo.js';

export interface PriceRow {
  date: string; // YYYY-MM-DD (first of month)
  admin1: string;
  market: string;
  lat: number;
  lng: number;
  commodity: string;
  pricetype: string;
  /** ₦ per kg. */
  perKg: number;
}

export interface PriceSummary {
  crop: CropId;
  commodity: string;
  pricetype: 'Wholesale' | 'Retail';
  market: string;
  admin1: string;
  distanceKm: number;
  latest: { month: string; perTon: number };
  /** Up to 24 recent months at this market, oldest first. */
  history: { month: string; perTon: number }[];
  /** Typical price relative to the yearly average, Jan..Dec (1 = average); null if too little data. */
  seasonal: number[] | null;
  seasonalSource: 'market' | 'state' | 'national' | null;
  nearby: { market: string; admin1: string; distanceKm: number; perTon: number; month: string }[];
  /** Months since the latest observation at this market. */
  ageMonths: number;
}

/* ---------------------------------- CSV ---------------------------------- */

/** RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "KG" → 1, "100 KG" → 100, "50 Kg" → 50; anything else (bowls, units, litres) → null. */
export function unitKg(unit: string): number | null {
  const m = unit.trim().match(/^(\d+(?:\.\d+)?)?\s*kg$/i);
  if (!m) return null;
  return m[1] ? Number(m[1]) : 1;
}

/** Keeps NGN prices per weight from the last `years` years. */
export function parseWfp(text: string, years = 5): PriceRow[] {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  const c = {
    date: col('date'), admin1: col('admin1'), market: col('market'), lat: col('latitude'), lng: col('longitude'),
    commodity: col('commodity'), unit: col('unit'), pricetype: col('pricetype'), currency: col('currency'), price: col('price'),
  };
  if (c.date < 0 || c.market < 0 || c.commodity < 0 || c.unit < 0 || c.price < 0) throw new Error('Unexpected price file format');
  const cutoff = `${new Date().getUTCFullYear() - years}-01-01`;
  const out: PriceRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[c.date] || r[c.date].startsWith('#')) continue; // HXL tag row
    const date = r[c.date].slice(0, 10);
    if (date < cutoff) continue;
    if (c.currency >= 0 && r[c.currency] && r[c.currency] !== 'NGN') continue;
    const kg = unitKg(r[c.unit] ?? '');
    const price = Number(r[c.price]);
    if (!kg || !(price > 0)) continue;
    out.push({
      date: `${date.slice(0, 7)}-01`,
      admin1: c.admin1 >= 0 ? r[c.admin1] : '',
      market: r[c.market],
      lat: Number(r[c.lat]),
      lng: Number(r[c.lng]),
      commodity: r[c.commodity],
      pricetype: c.pricetype >= 0 ? r[c.pricetype] : 'Retail',
      perKg: price / kg,
    });
  }
  return out;
}

/* ------------------------------- Matching ------------------------------- */

/** Commodity names to look for, best first. */
const MATCH: Record<CropId, RegExp[]> = {
  maize: [/^maize \(white\)/i, /^maize\b/i],
  rice: [/^rice \(local\)/i, /^rice \(paddy/i, /^rice\b/i],
  sorghum: [/^sorghum \(white\)/i, /^sorghum\b/i],
  soybean: [/soy/i],
  cowpea: [/^cowpeas? \(white\)/i, /^cowpeas?\b/i, /^beans? \(/i],
  tomato: [/^tomato/i],
  cassava: [/^gari \(white\)/i, /^gari\b/i, /cassava/i],
};

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));

/** Average seasonal shape: each year's monthly price divided by that year's mean. Needs 2+ years with 8+ months. */
export function seasonalIndex(rows: { date: string; perKg: number }[]): number[] | null {
  const byYear = new Map<string, Map<number, number[]>>();
  for (const r of rows) {
    const y = r.date.slice(0, 4);
    const m = Number(r.date.slice(5, 7)) - 1;
    const ym = byYear.get(y) ?? new Map<number, number[]>();
    ym.set(m, [...(ym.get(m) ?? []), r.perKg]);
    byYear.set(y, ym);
  }
  const ratios: number[][] = Array.from({ length: 12 }, () => []);
  let years = 0;
  for (const ym of byYear.values()) {
    if (ym.size < 8) continue;
    const monthly = [...ym.entries()].map(([m, v]) => [m, median(v)] as const);
    const mean = monthly.reduce((s, [, v]) => s + v, 0) / monthly.length;
    if (!(mean > 0)) continue;
    years++;
    for (const [m, v] of monthly) ratios[m].push(v / mean);
  }
  if (years < 2 || ratios.some((r) => r.length === 0)) return null;
  const idx = ratios.map(median);
  const norm = idx.reduce((a, b) => a + b, 0) / 12;
  return idx.map((v) => Math.round((v / norm) * 1000) / 1000);
}

export function summarizePrices(all: PriceRow[], crop: CropId, lat: number, lng: number, today = new Date().toISOString().slice(0, 10)): PriceSummary | null {
  let rows: PriceRow[] = [];
  let commodity = '';
  for (const re of MATCH[crop]) {
    const hit = all.filter((r) => re.test(r.commodity));
    if (hit.length) {
      // Several commodities can match a broad pattern; keep the most reported one.
      const counts = new Map<string, number>();
      hit.forEach((r) => counts.set(r.commodity, (counts.get(r.commodity) ?? 0) + 1));
      commodity = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      rows = hit.filter((r) => r.commodity === commodity);
      break;
    }
  }
  if (!rows.length) return null;

  const wholesale = rows.filter((r) => /wholesale/i.test(r.pricetype));
  const pricetype: PriceSummary['pricetype'] = wholesale.length >= rows.length * 0.2 ? 'Wholesale' : 'Retail';
  rows = rows.filter((r) => (pricetype === 'Wholesale' ? /wholesale/i.test(r.pricetype) : !/wholesale/i.test(r.pricetype)));

  const newest = rows.reduce((m, r) => (r.date > m ? r.date : m), '');
  const recentFrom = `${Number(newest.slice(0, 4)) - 1}${newest.slice(4)}`;
  const markets = new Map<string, PriceRow[]>();
  for (const r of rows) markets.set(r.market, [...(markets.get(r.market) ?? []), r]);

  const candidates = [...markets.entries()]
    .map(([market, rs]) => {
      const last = rs.reduce((m, r) => (r.date > m.date ? r : m));
      return { market, rs, last, km: Number.isFinite(last.lat) ? distance([lat, lng], [last.lat, last.lng]) / 1000 : Infinity };
    })
    .filter((m) => m.last.date >= recentFrom)
    .sort((a, b) => a.km - b.km);
  if (!candidates.length) return null;

  const best = candidates[0];
  const monthly = new Map<string, number[]>();
  for (const r of best.rs) monthly.set(r.date, [...(monthly.get(r.date) ?? []), r.perKg]);
  const history = [...monthly.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-24)
    .map(([d, v]) => ({ month: d.slice(0, 7), perTon: Math.round(median(v) * 1000) }));

  let seasonal = seasonalIndex(best.rs);
  let seasonalSource: PriceSummary['seasonalSource'] = seasonal ? 'market' : null;
  if (!seasonal) {
    seasonal = seasonalIndex(rows.filter((r) => r.admin1 === best.last.admin1));
    if (seasonal) seasonalSource = 'state';
  }
  if (!seasonal) {
    const nat = new Map<string, number[]>();
    rows.forEach((r) => nat.set(r.date, [...(nat.get(r.date) ?? []), r.perKg]));
    seasonal = seasonalIndex([...nat.entries()].map(([date, v]) => ({ date, perKg: median(v) })));
    if (seasonal) seasonalSource = 'national';
  }

  const latest = history[history.length - 1];
  return {
    crop,
    commodity,
    pricetype,
    market: best.market,
    admin1: best.last.admin1,
    distanceKm: Math.round(best.km),
    latest,
    history,
    seasonal,
    seasonalSource,
    nearby: candidates.slice(1, 4).map((m) => ({ market: m.market, admin1: m.last.admin1, distanceKm: Math.round(m.km), perTon: Math.round(m.last.perKg * 1000), month: m.last.date.slice(0, 7) })),
    ageMonths: Math.max(0, monthsBetween(latest.month, today.slice(0, 7))),
  };
}

/**
 * Typical price `monthsAhead` from today: the latest observed price scaled by
 * the seasonal ratio between the month it was observed and the target month.
 */
export function seasonalForecast(summary: PriceSummary, monthsAhead: number, today = new Date().toISOString().slice(0, 10)) {
  if (!summary.seasonal) return null;
  const observed = Number(summary.latest.month.slice(5, 7)) - 1;
  const target = (Number(today.slice(5, 7)) - 1 + Math.round(monthsAhead)) % 12;
  return Math.round((summary.latest.perTon * summary.seasonal[target]) / summary.seasonal[observed] / 1000) * 1000;
}

/* ------------------------------ Data source ------------------------------ */

export const HDX_PACKAGE = 'https://data.humdata.org/api/3/action/package_show?id=wfp-food-prices-for-nigeria';

/** Finds the current CSV download URL from the dataset's metadata (resource ids change on update). */
export function csvUrlFromPackage(pkg: any): string | null {
  const resources: any[] = pkg?.result?.resources ?? [];
  const csv = resources.find((r) => /wfp_food_prices_nga\.csv$/i.test(r.url ?? '')) ?? resources.find((r) => String(r.format).toLowerCase() === 'csv' && /food_prices/i.test(r.url ?? ''));
  return csv?.url ?? null;
}
