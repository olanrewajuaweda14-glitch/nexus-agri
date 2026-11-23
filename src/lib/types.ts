export type CropId = 'maize' | 'rice' | 'sorghum' | 'soybean' | 'cowpea' | 'tomato' | 'cassava';
export type Maturity = 'early' | 'medium' | 'late';
export type WaterSource = 'rainfed' | 'irrigated';

export interface Farm {
  id: string;
  name: string;
  lat: number;
  lng: number;
  placeName?: string;
  crop: CropId;
  plantingDate: string; // YYYY-MM-DD
  maturity: Maturity;
  sizeHa: number;
  water: WaterSource;
  /** Lab results override SoilGrids estimates when present. */
  labSoil?: Partial<SoilSummary>;
  /** Field boundary measured on the map or by walking it, [lat, lng] corners. */
  boundary?: [number, number][];
  /**
   * Stable id of the current season; records, ticked jobs and storage plans are
   * filed under it. Older farms have none — their season id is the planting date.
   */
  seasonId?: string;
  /** Finished seasons, oldest first. */
  history?: SeasonSummary[];
  createdAt: string;
}

/** A finished season, kept as the farm's track record. */
export interface SeasonSummary {
  seasonId: string;
  crop: CropId;
  plantingDate: string;
  maturity: Maturity;
  sizeHa: number;
  endedAt: string; // YYYY-MM-DD
  spent: number;
  sales: number;
  harvestedKg: number;
  soldKg: number;
}

/* ----------------------------- Weather ----------------------------- */

export interface HourlySeries {
  time: string[]; // local ISO, no offset
  temp: (number | null)[];
  rh: (number | null)[];
  precip: (number | null)[];
  precipProb: (number | null)[];
  wind: (number | null)[];
  gust: (number | null)[];
  isDay: (number | null)[];
}

export interface DailySeries {
  time: string[]; // YYYY-MM-DD
  tMax: (number | null)[];
  tMin: (number | null)[];
  precip: (number | null)[];
  precipProb: (number | null)[];
  et0: (number | null)[];
  windMax: (number | null)[];
  code: (number | null)[];
  /** Mean modelled volumetric soil moisture 9–81 cm (m³/m³). */
  soilMoisture: (number | null)[];
}

export interface WeatherBundle {
  fetchedAt: string;
  lat: number;
  lng: number;
  timezone: string;
  utcOffsetSeconds: number;
  /** Local date of "today" at the farm. */
  today: string;
  hourly: HourlySeries; // ~24h past + next 7 days
  daily: DailySeries; // 30 days past + today + 7 days
}

export interface ClimateBundle {
  fetchedAt: string;
  years: number[];
  /** Mean monthly rainfall (mm), Jan..Dec, over `years`. */
  monthlyNormalMm: number[];
  /** Rain in the 30 days ending `windowEnd`, this year. */
  last30Mm: number;
  /** Mean rain for the same calendar window across `years`. */
  last30NormalMm: number;
  windowEnd: string;
}

/* ------------------------------- Soil ------------------------------ */

export interface SoilSummary {
  ph: number | null;
  clayPct: number | null;
  sandPct: number | null;
  siltPct: number | null;
  socGKg: number | null; // soil organic carbon g/kg
  nitrogenGKg: number | null;
  cecCmolKg: number | null;
  bulkDensity: number | null; // g/cm³
}

export interface SoilBundle extends SoilSummary {
  fetchedAt: string;
  source: 'soilgrids';
  depth: '0-30cm';
}

/* ------------------------------ Engine ----------------------------- */

export type ActionKind =
  | 'fertilizer'
  | 'weed'
  | 'scout'
  | 'spray'
  | 'water'
  | 'harvest'
  | 'drainage'
  | 'soil'
  | 'plant'
  | 'other';

export type Priority = 'now' | 'week' | 'watch';

export interface PlanAction {
  id: string;
  kind: ActionKind;
  priority: Priority;
  title: string;
  when: string;
  why: string[];
  how?: string;
  sources: string[];
  /** Calendar tasks can be ticked off; derived alerts cannot. */
  checkable: boolean;
  overdue?: boolean;
  /** Suggested day to do it (YYYY-MM-DD), for reminders. Calendar jobs only. */
  date?: string;
}

export interface CostLine {
  id: string;
  label: string;
  amount: number; // ₦ per ha
}

export interface Budget {
  pricePerTon: number;
  yieldTHa: number;
  costs: CostLine[];
}
