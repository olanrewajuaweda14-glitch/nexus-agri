import { SoilProfile, Farm } from '../types';

export class SoilService {
  /**
   * Generates or retrieves deterministic soil profiles based on geography and assay type.
   */
  static getSoilProfile(farm: Farm): SoilProfile {
    return farm.soil;
  }

  /**
   * Calculates lime requirement in kg/hectare if pH is below optimal target (e.g., 6.2 for maize).
   * Formula: Lime (t/ha) = Target pH - Current pH * Buffer Capacity Factor
   */
  static calculateLimeRequirement(currentPh: number, targetPh = 6.4, texture: string = 'Sandy Loam'): {
    needed: boolean;
    tonsPerHa: number;
    explanation: string;
  } {
    if (currentPh >= targetPh) {
      return {
        needed: false,
        tonsPerHa: 0,
        explanation: `Soil pH of ${currentPh} is within the optimal bio-availability window. No liming needed.`,
      };
    }

    const deficit = targetPh - currentPh;
    const factor = texture.toLowerCase().includes('clay') ? 2.5 : texture.toLowerCase().includes('loam') ? 1.8 : 1.2;
    const tonsPerHa = Math.round(deficit * factor * 10) / 10;

    return {
      needed: true,
      tonsPerHa,
      explanation: `To adjust soil pH from ${currentPh} to ${targetPh} in ${texture}, apply approximately ${tonsPerHa} tons/ha of agricultural limestone (calcium carbonate) 4 to 6 weeks prior to planting.`,
    };
  }

  static calculateLimingRequirement(
    currentPh: number,
    targetPh = 6.5,
    texture: string = 'Sandy Loam',
    farmSizeHa: number = 1
  ): {
    isNeeded: boolean;
    tonsPerHa: number;
    totalTons: number;
    recommendation: string;
  } {
    const res = SoilService.calculateLimeRequirement(currentPh, targetPh, texture);
    const totalTons = Math.round(res.tonsPerHa * farmSizeHa * 10) / 10;
    return {
      isNeeded: res.needed,
      tonsPerHa: res.tonsPerHa,
      totalTons,
      recommendation: res.explanation,
    };
  }

  /**
   * Evaluates macro-nutrient N-P-K bioavailability rating
   */
  static evaluateNutrients(nitrogenMgKg: number, phosphorusPpm: number, potassiumCmolKg: number) {
    const nRating = nitrogenMgKg < 20 ? 'Deficient' : nitrogenMgKg < 40 ? 'Adequate' : 'Optimal';
    const pRating = phosphorusPpm < 10 ? 'Deficient' : phosphorusPpm < 20 ? 'Moderate' : 'Optimal';
    const kRating = potassiumCmolKg < 0.2 ? 'Deficient' : potassiumCmolKg < 0.4 ? 'Moderate' : 'Optimal';

    return {
      nRating,
      pRating,
      kRating,
      summary: `Nitrogen is ${nRating}, Phosphorus is ${pRating}, Potassium is ${kRating}.`,
    };
  }
}
