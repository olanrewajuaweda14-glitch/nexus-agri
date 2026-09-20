import { CommodityPrice } from '../types';
import { COMMODITY_PRICES } from '../data/mockData';

export interface ArbitrageOpportunity {
  cropName: string;
  sourceMarket: string;
  sourcePricePerKg: number;
  destMarket: string;
  destPricePerKg: number;
  grossSpreadPerKg: number;
  haulagePerKg: number;
  netMarginPerKg: number;
  recommended: boolean;
}

export class MarketService {
  /**
   * Retrieves active commodity prices across major agricultural exchanges
   */
  static getCommodities(): CommodityPrice[] {
    return COMMODITY_PRICES;
  }

  static async getCommodityPrices(): Promise<CommodityPrice[]> {
    // In production, can fetch from AFEX, NCX, or market survey endpoints
    return COMMODITY_PRICES;
  }

  /**
   * Evaluates storage arbitrage payoff vs immediate fieldgate sale
   */
  static calculateStorageArbitrage(spotPricePerKg: number, tonnage: number, months: number) {
    const totalKg = tonnage * 1000;
    const immediateRevenue = totalKg * spotPricePerKg;
    const priceAppreciationRate = months * 0.08; // ~8% per month in off-season
    const projectedFuturePricePerKg = Math.round(spotPricePerKg * (1 + priceAppreciationRate));
    const storageCostPerKg = months * 8; // ₦8/kg per month for hermetic PICS bags & warehousing
    const storageCosts = totalKg * storageCostPerKg;
    const projectedStoredRevenue = totalKg * projectedFuturePricePerKg;
    const netGain = projectedStoredRevenue - storageCosts - immediateRevenue;
    const gainPercent = Math.round((netGain / immediateRevenue) * 1000) / 10;

    return {
      immediateRevenue,
      projectedStoredRevenue,
      storageCosts,
      projectedFuturePricePerKg,
      netGain,
      gainPercent,
      recommendation: netGain > 0
        ? `Hold in hermetic PICS storage for ${months} month(s): Estimated net arbitrage gain of +₦${Math.round(netGain).toLocaleString()} after accounting for all storage fees.`
        : `Sell immediately at spot fieldgate price: Warehousing and loss risks exceed the projected price appreciation.`,
    };
  }

  /**
   * Calculates inter-market spatial arbitrage opportunities
   */
  static getArbitrageOpportunities(): ArbitrageOpportunity[] {
    return [
      {
        cropName: 'White Maize',
        sourceMarket: 'Bodija Wholesale (Ibadan)',
        sourcePricePerKg: 480,
        destMarket: 'Mile 12 Terminal (Lagos)',
        destPricePerKg: 540,
        grossSpreadPerKg: 60,
        haulagePerKg: 22,
        netMarginPerKg: 38,
        recommended: true,
      },
      {
        cropName: 'Soybean',
        sourceMarket: 'Dawanau Exchange (Kano)',
        sourcePricePerKg: 720,
        destMarket: 'Bodija Feed Mills (Ibadan)',
        destPricePerKg: 790,
        grossSpreadPerKg: 70,
        haulagePerKg: 35,
        netMarginPerKg: 35,
        recommended: true,
      },
      {
        cropName: 'Fresh Tomatoes',
        sourceMarket: 'Mile 12 Terminal (Lagos)',
        sourcePricePerKg: 580,
        destMarket: 'Bodija Terminal (Ibadan)',
        destPricePerKg: 620,
        grossSpreadPerKg: 40,
        haulagePerKg: 30,
        netMarginPerKg: 10,
        recommended: false, // Low margin given perishability risk
      },
    ];
  }

  /**
   * Deterministic grain storage payoff calculation:
   * Compares selling immediately vs holding in hermetic storage (e.g. PICS bags) for N days.
   */
  static calculateStorageDecision(
    harvestTons: number,
    spotPricePerKg: number,
    holdDays: number = 60,
    expectedPriceIncreasePct: number = 18.5,
    storageCostPerKgMonth: number = 6
  ) {
    const totalKg = harvestTons * 1000;
    const immediateRevenue = totalKg * spotPricePerKg;

    const projectedPricePerKg = spotPricePerKg * (1 + expectedPriceIncreasePct / 100);
    const months = holdDays / 30;
    const totalStorageCost = totalKg * (storageCostPerKgMonth * months);
    const projectedGrossRevenue = totalKg * projectedPricePerKg;
    const projectedNetRevenue = projectedGrossRevenue - totalStorageCost;
    const netGain = projectedNetRevenue - immediateRevenue;

    return {
      immediateRevenue,
      projectedNetRevenue,
      netGain,
      gainPercent: Math.round((netGain / immediateRevenue) * 1000) / 10,
      recommendation: netGain > 0
        ? `Hold grain for ${holdDays} days in hermetic bags: Projected net gain of ₦${Math.round(netGain).toLocaleString()} after all storage and bag costs.`
        : `Sell at spot price immediately: Storage costs exceed projected market appreciation.`,
    };
  }
}
