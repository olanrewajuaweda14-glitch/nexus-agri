import type { CropDef } from '../crops';
import { daysBetween } from '../dates';

export interface StageInfo {
  dap: number;
  index: number; // -1 before planting
  name: string;
  note: string;
  nextName: string | null;
  daysToNext: number | null;
  /** 0..1 through the whole season. */
  seasonProgress: number;
  kc: number;
  rootDepthM: number;
  status: 'not-planted' | 'growing' | 'mature';
}

/**
 * FAO-56 crop coefficient curve: flat Kc_ini, linear rise during development,
 * flat Kc_mid, linear decline to Kc_end over the late season.
 */
export function kcForDap(crop: CropDef, dap: number): number {
  const [ini, dev, mid, late] = crop.faoStages;
  const { kc } = crop;
  if (dap <= ini) return kc.ini;
  if (dap <= ini + dev) return kc.ini + ((dap - ini) / dev) * (kc.mid - kc.ini);
  if (dap <= ini + dev + mid) return kc.mid;
  if (dap <= ini + dev + mid + late) return kc.mid + ((dap - ini - dev - mid) / late) * (kc.end - kc.mid);
  return kc.end;
}

/** Effective rooting depth grows from min to max across the initial + development stages. */
export function rootDepthForDap(crop: CropDef, dap: number): number {
  const [ini, dev] = crop.faoStages;
  const { min, max } = crop.rootDepthM;
  if (dap <= 0) return min;
  const t = Math.min(1, dap / (ini + dev));
  return min + t * (max - min);
}

export function stageFor(crop: CropDef, plantingDate: string, today: string): StageInfo {
  const dap = daysBetween(plantingDate, today);
  if (dap < 0) {
    return {
      dap,
      index: -1,
      name: 'Not yet planted',
      note: `Planting is ${-dap} day${dap === -1 ? '' : 's'} away.`,
      nextName: crop.stages[0].name,
      daysToNext: -dap,
      seasonProgress: 0,
      kc: crop.kc.ini,
      rootDepthM: crop.rootDepthM.min,
      status: 'not-planted',
    };
  }
  let index = 0;
  for (let i = 0; i < crop.stages.length; i++) if (dap >= crop.stages[i].startDap) index = i;
  const next = crop.stages[index + 1];
  return {
    dap,
    index,
    name: crop.stages[index].name,
    note: crop.stages[index].note,
    nextName: next?.name ?? null,
    daysToNext: next ? next.startDap - dap : null,
    seasonProgress: Math.min(1, dap / crop.maturityDays),
    kc: kcForDap(crop, dap),
    rootDepthM: rootDepthForDap(crop, dap),
    status: dap >= crop.maturityDays ? 'mature' : 'growing',
  };
}
