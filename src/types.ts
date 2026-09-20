export type SoilDataSource = 'laboratory' | 'geospatial_estimate';

export interface SoilProfile {
  source: SoilDataSource;
  testDate?: string;
  ph: number;
  nitrogenKgHa: number;
  phosphorusPpm: number;
  potassiumPpm: number;
  organicMatterPercent: number;
  moisturePercent: number;
  texture: string;
  cec: number;
  labConfidenceScore?: number;
}

export interface FarmBoundaryPoint {
  lat: number;
  lng: number;
}

export interface SatelliteIndexSnapshot {
  date: string;
  ndvi: number;
  evi: number;
  savi: number;
  ndwi: number;
}

export interface SatelliteZoneAnomaly {
  id: string;
  zone: string;
  severity: 'low' | 'moderate' | 'high';
  indexDrop: string;
  suspectedFactor: string;
  coordinates: [number, number];
}

export interface SatelliteAnomaly {
  id: string;
  title: string;
  severity: 'High' | 'Moderate' | 'Low';
  dropDetail: string;
  suspectedCause: string;
  recommendedAction: string;
  coordinates: [number, number];
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  state: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  sizeHa: number;
  currentCrop: string;
  cropVariety?: string;
  plantingDate: string;
  growthStage: string;
  daysSincePlanting: number;
  irrigationType: 'Rainfed' | 'Drip' | 'Sprinkler' | 'Canal';
  soil: SoilProfile;
  healthScore: number;
  weatherRisk: 'Low' | 'Medium' | 'High';
  overallRisk: 'Low' | 'Medium' | 'High';
  estimatedYieldTonsPerHa: number;
  boundary: FarmBoundaryPoint[];
}

export interface WeatherData {
  location: string;
  currentTempC: number;
  condition: string;
  humidityPercent: number;
  windSpeedKmh: number;
  rainfallPast24hMm: number;
  rainfallNext7DaysMm: number;
  solarRadiationMjM2: number;
  evapotranspirationMmDay: number;
  heatStressIndex: 'Normal' | 'Moderate' | 'Severe';
  sprayingWindow: {
    isOpen: boolean;
    bestWindowText: string;
    rationale: string;
    windSafe: boolean;
    dewDry: boolean;
  };
  irrigationNeed: 'Low' | 'Moderate' | 'Critical';
  forecastDays: {
    date: string;
    dayName: string;
    tempMax: number;
    tempMin: number;
    rainProb: number;
    rainMm: number;
    condition: string;
  }[];
  hourlyToday: {
    time: string;
    temp: number;
    rainMm: number;
    humidity: number;
  }[];
}

export interface CropData {
  id: string;
  name: string;
  scientificName: string;
  category: 'Cereal' | 'Legume' | 'Root/Tuber' | 'Horticulture';
  suitabilityScore: number;
  typicalYieldTonsPerHa: {
    min: number;
    avg: number;
    max: number;
  };
  durationDays: number;
  idealSoil: string;
  idealPhRange: [number, number];
  idealRainfallMm: [number, number];
  idealTempC: [number, number];
  waterRequirement: 'Low' | 'Medium' | 'High';
  marketPricePerTon: number;
  inputCostPerHa: number;
  projectedMarginPercent: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  whyRecommended: string[];
  growthDuration: string;
  plantingWindow: string;
  fertilizerGuide: string;
  commonPests: string[];
  sustainabilityNote: string;
}

export interface CommodityPrice {
  id: string;
  name: string;
  market: string;
  unit: string;
  pricePerKg: number;
  changePercent7d: number;
  retailPricePerKg: number;
  demandRating: string;
  lastUpdated: string;
}

export interface MarketPriceRecord {
  crop: string;
  market: string;
  pricePerKg: number;
  pricePerTon: number;
  change7dPercent: number;
  change30dPercent: number;
  trend: 'rising' | 'falling' | 'stable';
  volatility: 'Low' | 'Medium' | 'High';
  source: string;
  lastUpdated: string;
  historyMonthly: {
    month: string;
    price: number;
  }[];
}

export interface FarmEconomicsState {
  hectares: number;
  crop: string;
  seedCost: number;
  fertilizerCost: number;
  chemicalCost: number;
  laborCost: number;
  irrigationCost: number;
  machineryCost: number;
  transportCost: number;
  storageCost: number;
  otherCost: number;
  expectedYieldTonsPerHa: number;
  expectedPricePerTon: number;
}

export interface WhatChangedEvent {
  id: string;
  timestamp: string;
  title: string;
  delta: string;
  description: string;
  impactExplanation: string;
  category: 'weather' | 'market' | 'satellite' | 'soil';
}

export interface AlertNotification {
  id: string;
  type: 'weather' | 'crop' | 'market' | 'soil' | 'pest' | 'risk';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
  actionRoute?: string;
  actionLabel?: string;
}

export interface RiskAssessment {
  id: string;
  category: string;
  title: string;
  severity: 'Low' | 'Medium' | 'High';
  probabilityPercent: number;
  potentialImpact: string;
  earlyWarning: string;
  mitigationSteps: string[];
}

export interface RiskCategoryItem {
  id: string;
  title: string;
  severity: 'Low' | 'Medium' | 'High';
  score: number;
  primaryDrivers: string[];
  recommendedAction: string;
}

export interface ScenarioComparison {
  id: string;
  name: string;
  crop: string;
  hectares: number;
  totalCost: number;
  expectedYieldTons: number;
  revenue: number;
  margin: number;
  risk: 'Low' | 'Medium' | 'High';
  confidence: number;
  delayWeeks?: number;
  fertilizerBudgetDelta?: number;
  priceDeltaPercent?: number;
}

export interface UserPreferences {
  name: string;
  email: string;
  experienceLevel: 'Smallholder' | 'Commercial' | 'Agronomist / Consultant' | 'Agribusiness Enterprise';
  farmingGoal: 'maximize_profit' | 'reduce_risk' | 'improve_yield' | 'reduce_input_costs' | 'improve_sustainability' | 'plan_new_farm';
  currency: 'NGN' | 'USD' | 'EUR';
  currencySymbol: '₦' | '$' | '€';
  areaUnit: 'hectares' | 'acres';
  language: string;
  theme: 'dark' | 'light';
  judgeMode: boolean;
}

export type UserAccountType =
  | 'Farmer'
  | 'Farm Manager'
  | 'Agribusiness'
  | 'Student / Researcher'
  | 'Other';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserAccountType;
  organization?: string;
  joinedDate: string;
  avatarUrl?: string;
  farmCount?: number;
  primaryLocation?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  message?: string;
}

export interface OnboardingFormData {
  fullName: string;
  role: UserAccountType;
  organizationName?: string;
  country: string;
  state: string;
  locality: string;
  farmName: string;
  size: number;
  unit: 'ha' | 'acres';
  primaryCrop: string;
  irrigationType: 'Rainfed' | 'Drip' | 'Sprinkler' | 'Canal';
  primaryGoal: string;
}

export interface DecisionSynthesisResult {
  decisionTitle: string;
  recommendation: string;
  whyEvidence: string[];
  economicImpact: {
    projectedRevenueChange: string;
    costImpact: string;
    grossMarginDelta: string;
    riskShift: string;
  };
  nextAction: string;
  confidenceScore: number;
  confidenceDrivers: string;
  streamsAnalyzed: {
    weather: string;
    soil: string;
    crop: string;
    satellite: string;
    market: string;
    economics: string;
    risk: string;
  };
  timestamp: string;
  isSimulated?: boolean;
}

export type AppNavigationTab =
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'onboarding'
  | 'overview'
  | 'my-farms'
  | 'intelligence'
  | 'farm-intelligence'
  | 'crops'
  | 'crop-advisor'
  | 'weather'
  | 'soil'
  | 'satellite'
  | 'farm-health'
  | 'photo-analysis'
  | 'market'
  | 'markets'
  | 'economics'
  | 'simulator'
  | 'risks'
  | 'risk'
  | 'ai-advisor'
  | 'alerts'
  | 'reports'
  | 'knowledge'
  | 'settings'
  | 'landing';
