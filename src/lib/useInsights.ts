import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClimateBundle, Farm, SoilBundle, SoilSummary, WeatherBundle } from './types';
import { getClimate, getSoil, getWeather } from './data/api';
import { scaledCrop, type CropDef } from './crops';
import { stageFor } from './engine/stage';
import { interpretSoil, waterLimits } from './engine/soil';
import { waterBalance, type WaterLogEntry } from './engine/water';
import { load, save } from './storage';
import { sprayOutlook } from './engine/spray';
import { buildPlan, key } from './engine/plan';
import { localToday } from './dates';

export interface Source<T> {
  status: 'idle' | 'loading' | 'ok' | 'error';
  data: T | null;
  savedAt: string | null;
  stale: boolean;
  error: string | null;
}

const idle = <T,>(): Source<T> => ({ status: 'idle', data: null, savedAt: null, stale: false, error: null });

/** Local farm time as "YYYY-MM-DDTHH:MM" using the forecast's UTC offset. */
export function farmNow(w: WeatherBundle | null) {
  const offset = w?.utcOffsetSeconds ?? -new Date().getTimezoneOffset() * 60;
  return new Date(Date.now() + offset * 1000).toISOString().slice(0, 16);
}

export function mergedSoil(soil: SoilBundle | null, lab?: Partial<SoilSummary>): SoilSummary {
  const base: SoilSummary = soil ?? { ph: null, clayPct: null, sandPct: null, siltPct: null, socGKg: null, nitrogenGKg: null, cecCmolKg: null, bulkDensity: null };
  const out = { ...base };
  if (lab) for (const [k, v] of Object.entries(lab)) if (v != null && Number.isFinite(v)) (out as any)[k] = v;
  return out;
}

interface FieldSources {
  weather: Source<WeatherBundle>;
  climate: Source<ClimateBundle>;
  soil: Source<SoilBundle>;
}
type Kind = keyof FieldSources;
const KINDS: Kind[] = ['weather', 'climate', 'soil'];
const FETCH = { weather: getWeather, climate: getClimate, soil: getSoil } as const;
const empty = (): FieldSources => ({ weather: idle(), climate: idle(), soil: idle() });
const logKey = (id: string) => `na:waterlog:${id}`;

/** Everything the crop screens show for one field, worked out from its data. */
function compute(farm: Farm, src: FieldSources, waterLog: WaterLogEntry[], done: Set<string>) {
  const { weather, climate, soil } = src;
  const crop: CropDef = scaledCrop(farm.crop, farm.maturity);
  // Today's date at the farm, from the clock — not from the saved forecast, which may be days old when offline.
  const today = weather.data ? farmNow(weather.data).slice(0, 10) : localToday();
  // A saved forecast is only usable while it still covers today.
  const w = weather.data && weather.data.daily.time.includes(today) ? weather.data : null;
  const stage = stageFor(crop, farm.plantingDate, today);
  const soilSummary = mergedSoil(soil.data, farm.labSoil);
  const limits = waterLimits(soilSummary);
  const findings = interpretSoil(soilSummary, crop);
  const water = w ? waterBalance(w.daily, today, crop, farm.plantingDate, limits, waterLog) : null;
  const spray = w ? sprayOutlook(w.hourly, farmNow(w)) : null;
  // Built with nothing ticked so finished jobs stay on screen (struck through) for the week;
  // `openPlan` is what still needs doing.
  const plan = buildPlan({ farm, crop, stage, today, weather: w, water, spray, soilFindings: findings, climate: climate.data, done: new Set() });
  const openPlan = plan.filter((a) => !(a.checkable && done.has(key(farm, a.id))));
  return { weather, climate, soil, crop, stage, soilSummary, limits, findings, derived: { water, spray, plan, openPlan, forecastOk: !!w }, today, forecast: w, waterLog };
}

export type Insights = ReturnType<typeof compute> & {
  refresh: () => void;
  setWaterLog: (next: WaterLogEntry[]) => void;
};

/**
 * Weather, climate and soil for every field, and the plan each one gives.
 * Data comes from the phone's saved copy when it is fresh enough; requests for
 * the same place are shared (see fetchCached).
 */
export function useFieldInsights(farms: Farm[], done: Set<string>): Record<string, Insights> {
  const [sources, setSources] = useState<Record<string, FieldSources>>({});
  const [logs, setLogs] = useState<Record<string, WaterLogEntry[]>>({});
  const latest = useRef(new Map<string, number>());
  const loadedAt = useRef(new Map<string, string>());

  const fetchOne = useCallback((farm: Farm, kind: Kind, force: boolean) => {
    const k = `${farm.id}:${kind}`;
    const req = (latest.current.get(k) ?? 0) + 1;
    latest.current.set(k, req);
    const put = (next: (prev: Source<any>) => Source<any>) =>
      setSources((all) => {
        const cur = all[farm.id] ?? empty();
        return { ...all, [farm.id]: { ...cur, [kind]: next(cur[kind]) } };
      });
    put((p) => ({ ...p, status: 'loading', error: null }));
    (FETCH[kind] as (lat: number, lng: number, force?: boolean) => Promise<{ data: unknown; savedAt: string; stale: boolean; error?: string }>)(farm.lat, farm.lng, force)
      .then((r) => latest.current.get(k) === req && put(() => ({ status: 'ok', data: r.data, savedAt: r.savedAt, stale: r.stale, error: r.error ?? null })))
      .catch((e: Error) => latest.current.get(k) === req && put(() => ({ status: 'error', data: null, savedAt: null, stale: false, error: e.message })));
  }, []);

  // Load each field once, and again if it moves on the map.
  const coords = farms.map((f) => `${f.id}@${f.lat},${f.lng}`).join('|');
  useEffect(() => {
    for (const f of farms) {
      const at = `${f.lat},${f.lng}`;
      if (loadedAt.current.get(f.id) === at) continue;
      loadedAt.current.set(f.id, at);
      KINDS.forEach((kind) => fetchOne(f, kind, false));
    }
  }, [coords]); // eslint-disable-line react-hooks/exhaustive-deps

  const setWaterLog = useCallback((farmId: string, next: WaterLogEntry[]) => {
    // Older than the 30-day balance window: no longer used, so not kept.
    const cutoff = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
    const kept = next.filter((e) => e.date >= cutoff);
    save(logKey(farmId), kept);
    setLogs((all) => ({ ...all, [farmId]: kept }));
  }, []);

  return useMemo(() => {
    const out: Record<string, Insights> = {};
    for (const f of farms) {
      const log = logs[f.id] ?? load<WaterLogEntry[]>(logKey(f.id), []);
      out[f.id] = {
        ...compute(f, sources[f.id] ?? empty(), log, done),
        refresh: () => KINDS.forEach((kind) => fetchOne(f, kind, true)),
        setWaterLog: (next) => setWaterLog(f.id, next),
      };
    }
    return out;
  }, [farms, sources, logs, done, fetchOne, setWaterLog]);
}
