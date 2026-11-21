import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClimateBundle, Farm, SoilBundle, SoilSummary, WeatherBundle } from './types';
import { getClimate, getSoil, getWeather } from './data/api';
import { scaledCrop } from './crops';
import { stageFor } from './engine/stage';
import { interpretSoil, waterLimits } from './engine/soil';
import { waterBalance } from './engine/water';
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

function useSource<T>(fetcher: (lat: number, lng: number, force?: boolean) => Promise<{ data: T; savedAt: string; stale: boolean; error?: string }>, lat: number, lng: number) {
  const [s, setS] = useState<Source<T>>(idle);
  const run = useCallback(
    (force = false) => {
      let alive = true;
      setS((p) => ({ ...p, status: 'loading', error: null }));
      fetcher(lat, lng, force)
        .then((r) => alive && setS({ status: 'ok', data: r.data, savedAt: r.savedAt, stale: r.stale, error: r.error ?? null }))
        .catch((e: Error) => alive && setS({ status: 'error', data: null, savedAt: null, stale: false, error: e.message }));
      return () => {
        alive = false;
      };
    },
    [fetcher, lat, lng],
  );
  useEffect(() => run(false), [run]);
  return [s, run] as const;
}

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

export function useInsights(farm: Farm, done: Set<string>) {
  const [weather, reloadWeather] = useSource<WeatherBundle>(getWeather, farm.lat, farm.lng);
  const [climate, reloadClimate] = useSource<ClimateBundle>(getClimate, farm.lat, farm.lng);
  const [soil, reloadSoil] = useSource<SoilBundle>(getSoil, farm.lat, farm.lng);

  const crop = useMemo(() => scaledCrop(farm.crop, farm.maturity), [farm.crop, farm.maturity]);
  // Today's date at the farm, from the clock — not from the saved forecast, which may be days old when offline.
  const today = weather.data ? farmNow(weather.data).slice(0, 10) : localToday();
  // A saved forecast is only usable while it still covers today.
  const w = weather.data && weather.data.daily.time.includes(today) ? weather.data : null;
  const stage = useMemo(() => stageFor(crop, farm.plantingDate, today), [crop, farm.plantingDate, today]);
  const soilSummary = useMemo(() => mergedSoil(soil.data, farm.labSoil), [soil.data, farm.labSoil]);
  const limits = useMemo(() => waterLimits(soilSummary), [soilSummary]);
  const findings = useMemo(() => interpretSoil(soilSummary, crop), [soilSummary, crop]);

  const derived = useMemo(() => {
    const water = w ? waterBalance(w.daily, today, crop, farm.plantingDate, limits) : null;
    const spray = w ? sprayOutlook(w.hourly, farmNow(w)) : null;
    // Build with nothing ticked so finished jobs stay on screen (struck through) for the week;
    // `openPlan` is what still needs doing.
    const plan = buildPlan({ farm, crop, stage, today, weather: w, water, spray, soilFindings: findings, climate: climate.data, done: new Set() });
    const openPlan = plan.filter((a) => !(a.checkable && done.has(key(farm, a.id))));
    return { water, spray, plan, openPlan, forecastOk: !!w };
  }, [w, today, crop, farm, stage, limits, findings, climate.data, done]);

  const refresh = useCallback(() => {
    reloadWeather(true);
    reloadClimate(true);
    reloadSoil(true);
  }, [reloadWeather, reloadClimate, reloadSoil]);

  return { weather, climate, soil, crop, stage, soilSummary, limits, findings, derived, today, forecast: w, refresh };
}

export type Insights = ReturnType<typeof useInsights>;
