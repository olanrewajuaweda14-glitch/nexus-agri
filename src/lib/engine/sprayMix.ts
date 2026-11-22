/**
 * Knapsack mixing, the way extension agents teach it (and the IITA herbicide
 * calculator works): label dose per hectare + how much water your sprayer
 * puts on a hectare → how much product goes in each tank.
 */

export type DoseUnit = 'L' | 'ml' | 'kg' | 'g';

export interface MixInput {
  /** Label rate. */
  dose: number;
  unit: DoseUnit;
  /** Whether `dose` is per hectare (most labels) or per knapsack. */
  per: 'ha' | 'tank';
  /** Knapsack capacity, litres. */
  tankL: number;
  /** Water sprayed per hectare, litres (from calibration). */
  waterLPerHa: number;
  /** Area to spray, ha. */
  areaHa: number;
}

export interface MixResult {
  /** Product per full tank, in ml (liquids) or g (powders). */
  perTank: number;
  smallUnit: 'ml' | 'g';
  tanksPerHa: number;
  /** Full tanks plus a part tank for the field. */
  fullTanks: number;
  lastTankWaterL: number;
  lastTankProduct: number;
  totalWaterL: number;
  /** Product to have on hand for the whole area, ml or g. */
  totalProduct: number;
  /** Area one full tank covers, m². */
  m2PerTank: number;
}

const toSmall = (n: number, u: DoseUnit) => (u === 'L' || u === 'kg' ? n * 1000 : n);

export function mix(i: MixInput): MixResult | null {
  if (!(i.dose > 0) || !(i.tankL > 0) || !(i.waterLPerHa > 0) || !(i.areaHa > 0)) return null;
  const smallUnit = i.unit === 'L' || i.unit === 'ml' ? 'ml' : 'g';
  const tanksPerHa = i.waterLPerHa / i.tankL;
  const perTank = i.per === 'ha' ? toSmall(i.dose, i.unit) / tanksPerHa : toSmall(i.dose, i.unit);
  const totalWaterL = i.waterLPerHa * i.areaHa;
  const exactTanks = totalWaterL / i.tankL;
  const fullTanks = Math.floor(exactTanks + 1e-9);
  const lastTankWaterL = Math.max(0, totalWaterL - fullTanks * i.tankL);
  const lastShare = lastTankWaterL / i.tankL;
  return {
    perTank,
    smallUnit,
    tanksPerHa,
    fullTanks,
    lastTankWaterL,
    lastTankProduct: perTank * lastShare,
    totalWaterL,
    totalProduct: perTank * exactTanks,
    m2PerTank: (i.tankL / i.waterLPerHa) * 10_000,
  };
}

/** Calibration: spray plain water evenly over a measured patch, see how much was used. */
export const waterRateFromTest = (litresUsed: number, testAreaM2: number) => (testAreaM2 > 0 ? (litresUsed / testAreaM2) * 10_000 : 0);
