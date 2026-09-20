export interface FarmCostBreakdown {
  seedCost: number;
  fertilizerCost: number;
  pesticideCost: number;
  laborCost: number;
  irrigationCost: number;
  equipmentCost: number;
  transportCost: number;
  storageCost: number;
  otherCost: number;
}

export interface FarmEconomicsInput extends FarmCostBreakdown {
  farmSizeHa: number;
  expectedYieldTonsPerHa: number;
  expectedSellingPricePerTon: number; // or pricePerKg * 1000
}

export interface FarmEconomicsOutput {
  totalCost: number;
  costPerHectare: number;
  expectedProductionTons: number;
  expectedProductionKg: number;
  expectedRevenue: number;
  expectedProfit: number;
  marginPercent: number;
  roiPercent: number;
  breakEvenPricePerTon: number;
  breakEvenPricePerKg: number;
  breakEvenYieldTonsPerHa: number;
  costDistribution: {
    name: string;
    amount: number;
    percent: number;
  }[];
}

export class EconomicsService {
  /**
   * Deterministic Agronomic Economics Calculator
   * Strictly arithmetic. No simulated approximations.
   */
  static calculate(input: FarmEconomicsInput): FarmEconomicsOutput {
    const ha = Math.max(0.01, Number(input.farmSizeHa) || 1);
    const yieldPerHa = Math.max(0, Number(input.expectedYieldTonsPerHa) || 0);
    const pricePerTon = Math.max(0, Number(input.expectedSellingPricePerTon) || 0);

    const seed = Number(input.seedCost) || 0;
    const fert = Number(input.fertilizerCost) || 0;
    const pest = Number(input.pesticideCost) || 0;
    const labor = Number(input.laborCost) || 0;
    const irrig = Number(input.irrigationCost) || 0;
    const equip = Number(input.equipmentCost) || 0;
    const trans = Number(input.transportCost) || 0;
    const stor = Number(input.storageCost) || 0;
    const other = Number(input.otherCost) || 0;

    const totalCost = seed + fert + pest + labor + irrig + equip + trans + stor + other;
    const costPerHectare = totalCost / ha;

    const expectedProductionTons = ha * yieldPerHa;
    const expectedProductionKg = expectedProductionTons * 1000;
    const expectedRevenue = expectedProductionTons * pricePerTon;
    const expectedProfit = expectedRevenue - totalCost;

    const marginPercent = expectedRevenue > 0
      ? Math.round((expectedProfit / expectedRevenue) * 1000) / 10
      : 0;

    const roiPercent = totalCost > 0
      ? Math.round((expectedProfit / totalCost) * 1000) / 10
      : 0;

    const breakEvenPricePerTon = expectedProductionTons > 0
      ? Math.round(totalCost / expectedProductionTons)
      : 0;

    const breakEvenPricePerKg = Math.round(breakEvenPricePerTon / 1000);

    const breakEvenYieldTonsPerHa = pricePerTon > 0 && ha > 0
      ? Math.round((totalCost / (ha * pricePerTon)) * 100) / 100
      : 0;

    const items = [
      { name: 'Fertilizer & Nutrition', amount: fert },
      { name: 'Labor & Operations', amount: labor },
      { name: 'Equipment & Machinery', amount: equip },
      { name: 'Seeds & Propagation', amount: seed },
      { name: 'Pesticide & Crop Protection', amount: pest },
      { name: 'Transport & Logistics', amount: trans },
      { name: 'Irrigation & Pumping', amount: irrig },
      { name: 'Storage & Post-Harvest', amount: stor },
      { name: 'Other Contingencies', amount: other },
    ];

    const costDistribution = items
      .filter((i) => i.amount > 0)
      .map((i) => ({
        name: i.name,
        amount: i.amount,
        percent: totalCost > 0 ? Math.round((i.amount / totalCost) * 1000) / 10 : 0,
      }));

    return {
      totalCost,
      costPerHectare: Math.round(costPerHectare),
      expectedProductionTons: Math.round(expectedProductionTons * 10) / 10,
      expectedProductionKg: Math.round(expectedProductionKg),
      expectedRevenue: Math.round(expectedRevenue),
      expectedProfit: Math.round(expectedProfit),
      marginPercent,
      roiPercent,
      breakEvenPricePerTon,
      breakEvenPricePerKg,
      breakEvenYieldTonsPerHa,
      costDistribution,
    };
  }
}
