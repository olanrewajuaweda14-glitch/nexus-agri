import type { ClimateBundle, SoilBundle, WeatherBundle } from '../types';
import { KEYS, load, save } from '../storage';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, signal: AbortSignal.timeout(init?.timeoutMs ?? 30_000), headers: { 'Content-Type': 'application/json', ...init?.headers } });
  } catch (e) {
    const name = (e as Error).name;
    throw new ApiError('network', name === 'TimeoutError' ? 'The request timed out.' : 'No connection to the server.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? 'http', body.message ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

export interface Cached<T> {
  data: T;
  savedAt: string;
}

type Kind = 'weather' | 'climate' | 'soil';
const MAX_AGE: Record<Kind, number> = { weather: 30 * 60_000, climate: 24 * 3600_000, soil: 30 * 24 * 3600_000 };

/**
 * Network-first with an offline copy: if the fresh fetch fails, the last good
 * copy is returned with `stale: true` so the UI can say how old it is.
 */
export async function fetchCached<T>(kind: Kind, lat: number, lng: number, force = false): Promise<{ data: T; savedAt: string; stale: boolean; error?: string }> {
  const key = KEYS.cache(kind, lat, lng);
  const cached = load<Cached<T> | null>(key, null);
  if (!force && cached && Date.now() - Date.parse(cached.savedAt) < MAX_AGE[kind]) {
    return { ...cached, stale: false };
  }
  try {
    const data = await api<T>(`/api/${kind}?lat=${lat}&lng=${lng}`);
    const entry = { data, savedAt: new Date().toISOString() };
    save(key, entry);
    return { ...entry, stale: false };
  } catch (e) {
    if (cached) return { ...cached, stale: true, error: (e as Error).message };
    throw e;
  }
}

export const getWeather = (lat: number, lng: number, force?: boolean) => fetchCached<WeatherBundle>('weather', lat, lng, force);
export const getClimate = (lat: number, lng: number, force?: boolean) => fetchCached<ClimateBundle>('climate', lat, lng, force);
export const getSoil = (lat: number, lng: number, force?: boolean) => fetchCached<SoilBundle>('soil', lat, lng, force);
