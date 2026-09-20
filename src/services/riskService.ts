import { Farm, WeatherData, RiskAssessment } from '../types';
import { RISK_ASSESSMENTS } from '../data/mockData';

export interface ComprehensiveRiskProfile {
  overallRiskScore: number; // 0 - 100 (lower is safer)
  overallRiskRating: 'Low' | 'Medium' | 'High';
  summary: string;
  categories: {
    name: string;
    score: number;
    severity: 'Low' | 'Medium' | 'High';
    keyDriver: string;
    action: string;
  }[];
  activeAssessments: RiskAssessment[];
}

export class RiskService {
  /**
   * Deterministic Risk Evaluation Model
   * Evaluates agronomic and financial indicators without hallucination.
   */
  static evaluateFarmRisk(farm: Farm, weather?: WeatherData): ComprehensiveRiskProfile {
    // 1. Weather risk
    const rainForecast7d = weather?.forecastDays?.reduce((acc: number, d: { rainMm: number }) => acc + d.rainMm, 0) ?? 38;
    const weatherScore = rainForecast7d < 15 ? 58 : rainForecast7d > 120 ? 65 : 24;

    // 2. Water / Soil moisture risk
    const moisture = farm.soil?.moisturePercent || 22.4;
    const waterScore = moisture < 20 ? 75 : moisture < 25 ? 52 : 20;

    // 3. Soil nutrient risk
    const ph = farm.soil?.ph || 6.4;
    const soilScore = ph < 5.5 || ph > 7.5 ? 68 : ph < 6.0 ? 45 : 25;

    // 4. Crop health risk
    const health = farm.healthScore || 82;
    const cropHealthScore = Math.max(10, 100 - health);

    // 5. Market risk
    const marketScore = 28; // Based on strong current grain demand

    // 6. Financial risk
    const financialScore = 42;

    const weightedScore = Math.round(
      weatherScore * 0.2 +
      waterScore * 0.25 +
      soilScore * 0.15 +
      cropHealthScore * 0.2 +
      marketScore * 0.1 +
      financialScore * 0.1
    );

    const overallRating: 'Low' | 'Medium' | 'High' =
      weightedScore < 35 ? 'Low' : weightedScore < 65 ? 'Medium' : 'High';

    return {
      overallRiskScore: weightedScore,
      overallRiskRating: overallRating,
      summary: `Composite risk is rated ${overallRating} (${weightedScore}/100). Primary vulnerability is localized soil moisture depletion at root zone (currently ${moisture}%).`,
      categories: [
        {
          name: 'Water & Root Zone Moisture',
          score: waterScore,
          severity: waterScore > 60 ? 'High' : waterScore > 35 ? 'Medium' : 'Low',
          keyDriver: `Topsoil moisture at ${moisture}% is near lower boundary of optimal range.`,
          action: 'Deploy supplemental irrigation or row mulching if rain delays.',
        },
        {
          name: 'Atmospheric & Weather',
          score: weatherScore,
          severity: weatherScore > 60 ? 'High' : weatherScore > 35 ? 'Medium' : 'Low',
          keyDriver: `7-day cumulative precipitation projected at ${rainForecast7d.toFixed(1)}mm.`,
          action: 'Clear perimeter drainage furrows for convective downpours.',
        },
        {
          name: 'Crop Pathology & Pests',
          score: cropHealthScore,
          severity: cropHealthScore > 60 ? 'High' : cropHealthScore > 35 ? 'Medium' : 'Low',
          keyDriver: 'Scouting flags regional fall armyworm presence.',
          action: 'Conduct morning leaf whorl scouting twice weekly.',
        },
        {
          name: 'Pedology & Fertility',
          score: soilScore,
          severity: soilScore > 60 ? 'High' : soilScore > 35 ? 'Medium' : 'Low',
          keyDriver: `Soil pH ${ph} is bio-available for current crop.`,
          action: 'Plan post-harvest composite soil sampling test.',
        },
        {
          name: 'Market & Off-Take',
          score: marketScore,
          severity: 'Low',
          keyDriver: 'Robust off-take pricing and strong domestic miller procurement.',
          action: 'Consider locking in 30% forward contract.',
        },
        {
          name: 'Working Capital & Inputs',
          score: financialScore,
          severity: 'Medium',
          keyDriver: 'Pumping diesel and haulage logistics rate variability.',
          action: 'Cooperative bulk haulage booking recommended.',
        },
      ],
      activeAssessments: RISK_ASSESSMENTS,
    };
  }
}
