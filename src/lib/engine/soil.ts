import type { CropDef } from '../crops';
import type { SoilSummary } from '../types';

export interface WaterLimits {
  fieldCapacity: number; // m³/m³ at −33 kPa
  wiltingPoint: number; // m³/m³ at −1500 kPa
  /** Plant-available water per metre of soil, mm/m. */
  awcMmPerM: number;
  estimated: boolean;
}

/**
 * Saxton & Rawls (2006) pedotransfer functions: water held at field capacity
 * and permanent wilting point from sand, clay and organic matter.
 * Soil Sci. Soc. Am. J. 70:1569–1578, equations 1–2.
 */
export function waterLimits(soil: Pick<SoilSummary, 'sandPct' | 'clayPct' | 'socGKg'>): WaterLimits {
  if (soil.sandPct == null || soil.clayPct == null) {
    // Sandy loam defaults — the most common topsoil texture across Nigeria's savanna belt.
    return { fieldCapacity: 0.2, wiltingPoint: 0.09, awcMmPerM: 110, estimated: true };
  }
  const S = soil.sandPct / 100;
  const C = soil.clayPct / 100;
  // Organic matter % (by weight) ≈ SOC % × 1.724; cap at 8% (equation validity range).
  const OM = Math.min(8, ((soil.socGKg ?? 8) / 10) * 1.724);

  const t1500 = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * S * OM - 0.013 * C * OM + 0.068 * S * C + 0.031;
  const wp = t1500 + (0.14 * t1500 - 0.02);
  const t33 = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * S * OM - 0.027 * C * OM + 0.452 * S * C + 0.299;
  const fc = t33 + (1.283 * t33 * t33 - 0.374 * t33 - 0.015);

  const fieldCapacity = clamp(fc, 0.05, 0.55);
  const wiltingPoint = clamp(wp, 0.01, fieldCapacity - 0.02);
  return {
    fieldCapacity,
    wiltingPoint,
    awcMmPerM: Math.round((fieldCapacity - wiltingPoint) * 1000),
    estimated: soil.socGKg == null,
  };
}

/** USDA soil texture triangle. */
export function textureClass(sand: number | null, clay: number | null): string {
  if (sand == null || clay == null) return 'Unknown';
  const silt = 100 - sand - clay;
  if (silt + 1.5 * clay < 15) return 'Sand';
  if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return 'Loamy sand';
  if ((clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) || (clay < 7 && silt < 50 && silt + 2 * clay >= 30)) return 'Sandy loam';
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'Loam';
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return 'Silt loam';
  if (silt >= 80 && clay < 12) return 'Silt';
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return 'Sandy clay loam';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'Clay loam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'Silty clay loam';
  if (clay >= 35 && sand > 45) return 'Sandy clay';
  if (clay >= 40 && silt >= 40) return 'Silty clay';
  if (clay >= 40 && sand <= 45 && silt < 40) return 'Clay';
  return 'Loam';
}

export interface SoilFinding {
  id: string;
  tone: 'good' | 'warn' | 'bad' | 'info';
  title: string;
  detail: string;
}

/**
 * Lime requirement in t/ha of agricultural lime (CaCO₃) to raise topsoil pH to
 * the crop's lower bound. Uses a texture-based buffer factor — a field rule of
 * thumb, not a lab buffer-pH test.
 */
export function limeRequirement(ph: number, target: number, clayPct: number | null): number {
  if (ph >= target) return 0;
  const factor = clayPct == null ? 1.5 : clayPct < 15 ? 1.0 : clayPct < 30 ? 1.8 : 2.5;
  return Math.round((target - ph) * factor * 10) / 10;
}

export function interpretSoil(soil: SoilSummary, crop: CropDef): SoilFinding[] {
  const out: SoilFinding[] = [];
  const [lo, hi] = crop.phRange;

  if (soil.ph != null) {
    if (soil.ph < lo) {
      const t = limeRequirement(soil.ph, lo, soil.clayPct);
      out.push({
        id: 'ph-low', tone: soil.ph < lo - 0.7 ? 'bad' : 'warn',
        title: `pH ${soil.ph.toFixed(1)} is too acidic for ${crop.name.toLowerCase()}`,
        detail: `${crop.name} does best at pH ${lo}–${hi}. Roughly ${t} t/ha of agricultural lime, worked in 4–6 weeks before planting, would close the gap. Confirm with a lab buffer test first — over-liming locks up zinc and manganese.`,
      });
    } else if (soil.ph > hi + 0.5) {
      out.push({
        id: 'ph-high', tone: 'warn',
        title: `pH ${soil.ph.toFixed(1)} is on the alkaline side`,
        detail: `Above pH ${hi}, phosphorus, iron and zinc become harder for roots to take up. Use ammonium-based fertilizers and organic matter rather than lime.`,
      });
    } else {
      out.push({ id: 'ph-ok', tone: 'good', title: `pH ${soil.ph.toFixed(1)} suits ${crop.name.toLowerCase()}`, detail: `Within or close to the ${lo}–${hi} range.` });
    }
  }

  if (soil.socGKg != null) {
    const pct = soil.socGKg / 10;
    if (pct < 0.6) {
      out.push({
        id: 'soc-low', tone: 'bad',
        title: `Very low organic carbon (${pct.toFixed(1)}%)`,
        detail: 'The soil holds little water or nutrients, so fertilizer is easily lost. Add 5–10 t/ha of manure or compost and keep crop residues on the field.',
      });
    } else if (pct < 1.2) {
      out.push({
        id: 'soc-mid', tone: 'warn',
        title: `Low organic carbon (${pct.toFixed(1)}%)`,
        detail: 'Typical of continuously cropped land. Manure, compost or a legume rotation will improve water holding and fertilizer response.',
      });
    } else {
      out.push({ id: 'soc-ok', tone: 'good', title: `Reasonable organic carbon (${pct.toFixed(1)}%)`, detail: 'Keep residues on the field to maintain it.' });
    }
  }

  if (soil.cecCmolKg != null && soil.cecCmolKg < 6) {
    out.push({
      id: 'cec-low', tone: 'warn',
      title: `Low nutrient-holding capacity (CEC ${soil.cecCmolKg.toFixed(1)} cmol/kg)`,
      detail: 'Nutrients leach quickly. Split fertilizer into smaller, more frequent doses rather than one large application.',
    });
  }

  if (soil.nitrogenGKg != null && !crop.legume && soil.nitrogenGKg < 0.8) {
    out.push({
      id: 'n-low', tone: 'warn',
      title: `Low total nitrogen (${soil.nitrogenGKg.toFixed(2)} g/kg)`,
      detail: 'Expect a strong response to nitrogen. Do not skip or delay the top-dressing.',
    });
  }

  const tex = textureClass(soil.sandPct, soil.clayPct);
  if (tex === 'Sand' || tex === 'Loamy sand') {
    out.push({ id: 'tex-sand', tone: 'info', title: `${tex}: drains fast`, detail: 'Water and nitrogen move through quickly. Irrigate little and often, and split nitrogen applications.' });
  } else if (tex.includes('Clay') || tex === 'Clay') {
    out.push({ id: 'tex-clay', tone: 'info', title: `${tex}: holds water, drains slowly`, detail: 'Good water reserve, but waterlogs after heavy rain. Keep drainage channels open and avoid working the soil when wet.' });
  }
  return out;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
