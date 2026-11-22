/**
 * Sell at harvest or store and sell later?
 *
 * Grain prices in Nigeria usually rise between harvest and the lean season,
 * but storage costs money, stored grain is lost to insects and moisture, and
 * cash tied up in a store may be costing interest. This weighs all of it.
 */

export interface StorageMethod {
  id: 'hermetic' | 'treated' | 'untreated';
  label: string;
  /** Typical share of grain lost per month of storage (fraction). */
  lossPerMonth: number;
  note: string;
}

export const STORAGE_METHODS: StorageMethod[] = [
  { id: 'hermetic', label: 'Hermetic (airtight) bags', lossPerMonth: 0.002, note: 'Triple-layer bags starve insects of oxygen; losses stay well under 1% over a season if the grain goes in dry.' },
  { id: 'treated', label: 'Sacks + storage insecticide', lossPerMonth: 0.01, note: 'Works if the product is approved for stored grain and applied at the label rate.' },
  { id: 'untreated', label: 'Ordinary sacks, untreated', lossPerMonth: 0.03, note: 'Weevils and grain borers can take a fifth of the crop over six months.' },
];

export interface StoreInput {
  tonnes: number;
  priceNow: number; // ₦ per tonne
  priceLater: number; // ₦ per tonne at the end of storage
  months: number;
  lossPerMonth: number; // fraction
  bagCost: number; // ₦ per 100 kg bag, one-off (bags, treatment)
  monthlyCostPerBag: number; // ₦ per 100 kg bag per month (store rent, guarding)
  interestPerMonth: number; // fraction, cost of money tied up
}

export interface StoreResult {
  sellNow: number;
  bags: number;
  tonnesLeft: number;
  lostTonnes: number;
  storeRevenue: number;
  storageCost: number;
  interestCost: number;
  storeNet: number;
  gain: number;
  /** Price later that only just pays for storing. */
  breakEvenPrice: number | null;
  decision: 'store' | 'sell' | 'even';
}

export function sellOrStore(i: StoreInput): StoreResult {
  const t = Math.max(0, i.tonnes);
  const months = Math.max(0, i.months);
  const sellNow = t * Math.max(0, i.priceNow);
  const bags = Math.ceil((t * 1000) / 100 - 1e-9);
  const lostShare = Math.min(1, Math.max(0, i.lossPerMonth) * months);
  const tonnesLeft = t * (1 - lostShare);
  const storeRevenue = tonnesLeft * Math.max(0, i.priceLater);
  const storageCost = bags * (Math.max(0, i.bagCost) + Math.max(0, i.monthlyCostPerBag) * months);
  const interestCost = sellNow * Math.max(0, i.interestPerMonth) * months;
  const storeNet = storeRevenue - storageCost - interestCost;
  const gain = storeNet - sellNow;
  const breakEvenPrice = tonnesLeft > 0 ? (sellNow + storageCost + interestCost) / tonnesLeft : null;
  const margin = Math.max(1, sellNow * 0.01);
  return {
    sellNow,
    bags,
    tonnesLeft,
    lostTonnes: t - tonnesLeft,
    storeRevenue,
    storageCost,
    interestCost,
    storeNet,
    gain,
    breakEvenPrice,
    decision: gain > margin ? 'store' : gain < -margin ? 'sell' : 'even',
  };
}
