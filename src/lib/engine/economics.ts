import type { Budget } from '../types';

export interface Economics {
  costPerHa: number;
  totalCost: number;
  revenue: number;
  profit: number;
  /** Profit as % of revenue. null when revenue is 0. */
  marginPct: number | null;
  /** Yield (t/ha) needed to cover costs at the entered price. */
  breakEvenYield: number | null;
  /** Price (₦/t) needed to cover costs at the entered yield. */
  breakEvenPrice: number | null;
  /** Naira returned per naira spent. */
  returnPerNaira: number | null;
}

export function economics(b: Budget, sizeHa: number): Economics {
  const ha = Math.max(0, sizeHa);
  const costPerHa = b.costs.reduce((s, c) => s + (Number.isFinite(c.amount) ? Math.max(0, c.amount) : 0), 0);
  const totalCost = costPerHa * ha;
  const revenue = Math.max(0, b.yieldTHa) * Math.max(0, b.pricePerTon) * ha;
  const profit = revenue - totalCost;
  return {
    costPerHa,
    totalCost,
    revenue,
    profit,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : null,
    breakEvenYield: b.pricePerTon > 0 ? costPerHa / b.pricePerTon : null,
    breakEvenPrice: b.yieldTHa > 0 ? costPerHa / b.yieldTHa : null,
    returnPerNaira: totalCost > 0 ? revenue / totalCost : null,
  };
}

/** Profit across yield and price changes, e.g. steps [-30,-15,0,15,30] (%). */
export function sensitivity(b: Budget, sizeHa: number, steps = [-30, -15, 0, 15, 30]) {
  return steps.map((dy) =>
    steps.map((dp) => economics({ ...b, yieldTHa: b.yieldTHa * (1 + dy / 100), pricePerTon: b.pricePerTon * (1 + dp / 100) }, sizeHa).profit),
  );
}
