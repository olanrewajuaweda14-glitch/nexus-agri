import type { CropDef } from '../crops';
import type { DailySeries } from '../types';
import { daysBetween } from '../dates';
import { kcForDap, rootDepthForDap } from './stage';
import type { WaterLimits } from './soil';

/** What the farmer recorded at the field. */
export interface WaterLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  kind: 'rain' | 'irrigation';
  /** Millimetres of rain measured, or of irrigation water applied. */
  mm?: number;
  /** Irrigation that wet the whole root zone (watered until the soil was soaked). */
  full?: boolean;
}

export interface WaterDay {
  date: string;
  forecast: boolean;
  rain: number; // mm (probability-weighted on forecast days)
  /** True when rain for this day came from the farmer's own gauge reading. */
  observed?: boolean;
  /** Net irrigation applied that day, mm (Infinity is never stored: full refills are recorded as `refilled`). */
  irrigation?: number;
  refilled?: boolean;
  etc: number; // mm crop water use
  depletion: number; // mm below field capacity at end of day
  raw: number; // readily available water, mm
  taw: number; // total available water, mm
}

export interface WaterBalance {
  days: WaterDay[];
  todayIndex: number;
  /** Fraction of plant-available water left in the root zone today (0–1). */
  availableNow: number;
  depletionNow: number;
  rawNow: number;
  tawNow: number;
  stressedNow: boolean;
  /** Date the crop first enters stress in the forecast, if it does. */
  stressDate: string | null;
  rainNext7: number;
  etcNext7: number;
  etcLast7: number;
  rainLast7: number;
  initialisedFromModel: boolean;
}

/** Rain that actually enters the root zone. Light showers mostly evaporate off leaves and soil. */
export const effectiveRain = (mm: number) => (mm <= 2 ? 0 : mm * 0.9);

/**
 * Daily root-zone soil-water balance (FAO-56 chapter 8, single crop coefficient).
 *
 *   Dr[i] = Dr[i-1] − Peff[i] + Ks·Kc·ET0[i]      clamped to [0, TAW]
 *
 * Starts 30 days back from the modelled soil moisture where available, runs
 * through today on observed weather and then 7 days ahead on forecast weather.
 *
 * The farmer's own log overrides the model where it exists: a rain-gauge
 * reading replaces the gridded rain for that day, irrigation is added, and a
 * full irrigation refills the root zone to field capacity.
 */
export function waterBalance(
  daily: DailySeries,
  today: string,
  crop: CropDef,
  plantingDate: string,
  limits: WaterLimits,
  log: WaterLogEntry[] = [],
): WaterBalance {
  const days: WaterDay[] = [];
  const byDate = new Map<string, WaterLogEntry[]>();
  for (const e of log) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  let depletion = 0;
  let initialisedFromModel = false;

  for (let i = 0; i < daily.time.length; i++) {
    const date = daily.time[i];
    const dap = daysBetween(plantingDate, date);
    const zr = rootDepthForDap(crop, dap);
    const taw = (limits.fieldCapacity - limits.wiltingPoint) * 1000 * zr;
    const raw = crop.p * taw;
    const forecast = date > today;

    if (i === 0) {
      const theta = daily.soilMoisture[0];
      if (theta != null) {
        depletion = clamp((limits.fieldCapacity - theta) * 1000 * zr, 0, taw);
        initialisedFromModel = true;
      } else {
        depletion = 0.4 * taw;
      }
    }

    const logged = forecast ? [] : byDate.get(date) ?? [];
    const gauge = logged.filter((e) => e.kind === 'rain' && (e.mm ?? -1) >= 0);
    const irrigations = logged.filter((e) => e.kind === 'irrigation');
    const observed = gauge.length > 0;

    const rawRain = daily.precip[i] ?? 0;
    const prob = daily.precipProb[i];
    const rain = observed ? gauge.reduce((s, e) => s + (e.mm ?? 0), 0) : forecast && prob != null ? rawRain * (prob / 100) : rawRain;
    const irrigation = irrigations.reduce((s, e) => s + Math.max(0, e.mm ?? 0), 0);
    const refilled = irrigations.some((e) => e.full);
    const et0 = daily.et0[i] ?? 4;
    const kc = kcForDap(crop, dap);
    const ks = depletion > raw ? Math.max(0, (taw - depletion) / ((1 - crop.p) * taw)) : 1;
    const etc = kc * et0 * ks;

    depletion = refilled ? 0 : clamp(depletion - effectiveRain(rain) - irrigation + etc, 0, taw);
    days.push({
      date, forecast, rain: round1(rain), etc: round1(etc), depletion: round1(depletion), raw: round1(raw), taw: round1(taw),
      ...(observed ? { observed } : {}),
      ...(irrigation > 0 ? { irrigation: round1(irrigation) } : {}),
      ...(refilled ? { refilled } : {}),
    });
  }

  let todayIndex = days.findIndex((d) => d.date === today);
  if (todayIndex < 0) todayIndex = Math.max(0, days.findIndex((d) => d.forecast) - 1);
  const t = days[todayIndex];
  const future = days.slice(todayIndex + 1, todayIndex + 8);
  const past = days.slice(Math.max(0, todayIndex - 6), todayIndex + 1);
  const stressDay = future.find((d) => d.depletion > d.raw);

  return {
    days,
    todayIndex,
    availableNow: t.taw > 0 ? 1 - t.depletion / t.taw : 1,
    depletionNow: t.depletion,
    rawNow: t.raw,
    tawNow: t.taw,
    stressedNow: t.depletion > t.raw,
    stressDate: stressDay?.date ?? null,
    rainNext7: round1(sum(future.map((d) => d.rain))),
    etcNext7: round1(sum(future.map((d) => d.etc))),
    rainLast7: round1(sum(past.map((d) => d.rain))),
    etcLast7: round1(sum(past.map((d) => d.etc))),
    initialisedFromModel,
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
