import type { ClimateBundle, CropId, SoilBundle, WeatherBundle } from '../types';
import type { PriceSummary } from './prices';
import type { PlanText } from '../translate';
import { KEYS, load, save } from '../storage';
import { fetchClimateDirect, fetchPlaceDirect, fetchSoilDirect, fetchWeatherDirect } from './sources';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) {
    super(message);
  }
}

/**
 * True once we've seen that this deployment has no Node server behind /api
 * (static hosting, `vite preview`). Data then comes straight from the public
 * sources; only the AI advisor needs the server.
 */
let noServer = false;
export const serverMissing = () => noServer;

export async function api<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, signal: AbortSignal.timeout(init?.timeoutMs ?? 30_000), headers: { 'Content-Type': 'application/json', ...init?.headers } });
  } catch (e) {
    const name = (e as Error).name;
    throw new ApiError('network', name === 'TimeoutError' ? 'The request timed out.' : 'No connection.');
  }
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  const body = isJson ? await res.json().catch(() => ({})) : {};
  // Our server always answers /api with JSON. HTML or a bare 404/405 means there is no server.
  if (!isJson || ((res.status === 404 || res.status === 405) && !body.error)) {
    noServer = true;
    throw new ApiError('no_server', 'This copy of the app is running without its server.', res.status);
  }
  if (!res.ok) throw new ApiError(body.error ?? 'http', body.message ?? `Request failed (${res.status}).`, res.status);
  return body as T;
}

export interface Cached<T> {
  data: T;
  savedAt: string;
}

type Kind = 'weather' | 'climate' | 'soil';
const MAX_AGE: Record<Kind, number> = { weather: 30 * 60_000, climate: 24 * 3600_000, soil: 30 * 24 * 3600_000 };
const DIRECT = { weather: fetchWeatherDirect, climate: fetchClimateDirect, soil: fetchSoilDirect };

async function fetchFresh<T>(kind: Kind, lat: number, lng: number): Promise<T> {
  if (!noServer) {
    try {
      return await api<T>(`/api/${kind}?lat=${lat}&lng=${lng}`);
    } catch (e) {
      // Bad input will fail the same way upstream; everything else is worth a direct try
      // (no server, server's own network blocked, server overloaded).
      if (e instanceof ApiError && e.status === 400) throw e;
    }
  }
  try {
    return (await DIRECT[kind](lat, lng)) as T;
  } catch (e) {
    throw new ApiError('upstream', (e as Error).message);
  }
}

/**
 * Network-first with an offline copy: if fresh data can't be had, the last
 * good copy is returned with `stale: true` so the UI can say how old it is.
 */
/** Requests already on their way, so two fields at the same place (or two screens) share one download. */
const inflight = new Map<string, Promise<unknown>>();

export function fetchCached<T>(kind: Kind, lat: number, lng: number, force = false): Promise<{ data: T; savedAt: string; stale: boolean; error?: string }> {
  const id = `${KEYS.cache(kind, lat, lng)}:${force ? 'force' : ''}`;
  const pending = inflight.get(id);
  if (pending) return pending as Promise<{ data: T; savedAt: string; stale: boolean; error?: string }>;
  const p = fetchCachedOnce<T>(kind, lat, lng, force).finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

async function fetchCachedOnce<T>(kind: Kind, lat: number, lng: number, force: boolean): Promise<{ data: T; savedAt: string; stale: boolean; error?: string }> {
  const key = KEYS.cache(kind, lat, lng);
  const cached = load<Cached<T> | null>(key, null);
  if (!force && cached && Date.now() - Date.parse(cached.savedAt) < MAX_AGE[kind]) {
    return { ...cached, stale: false };
  }
  try {
    const data = await fetchFresh<T>(kind, lat, lng);
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

export async function getPlace(lat: number, lng: number): Promise<string | null> {
  if (!noServer) {
    try {
      return (await api<{ name: string | null }>(`/api/place?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`, { timeoutMs: 8000 })).name;
    } catch {
      /* fall through */
    }
  }
  return fetchPlaceDirect(lat, lng);
}

/**
 * Nearest-market prices. Server only: the source file is several megabytes,
 * too much to download on a phone, so static deployments get a clear error.
 */
export async function getPrices(crop: CropId, lat: number, lng: number): Promise<{ summary: PriceSummary | null; savedAt: string; stale: boolean }> {
  const key = `na:cache:prices:${crop}:${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = load<{ summary: PriceSummary | null; savedAt: string } | null>(key, null);
  if (cached && Date.now() - Date.parse(cached.savedAt) < 12 * 3600_000) return { ...cached, stale: false };
  try {
    if (noServer) throw new ApiError('no_server', 'Market prices need the Nexus Agri server.');
    const r = await api<{ summary: PriceSummary | null }>(`/api/prices?crop=${crop}&lat=${lat}&lng=${lng}`, { timeoutMs: 60_000 });
    const entry = { summary: r.summary, savedAt: new Date().toISOString() };
    save(key, entry);
    return { ...entry, stale: false };
  } catch (e) {
    if (cached) return { ...cached, stale: true };
    if (e instanceof ApiError && e.code === 'no_server') throw new ApiError('no_server', 'Market prices need the Nexus Agri server (not available on a static-only deployment).');
    throw e;
  }
}

export type AiStatus = 'on' | 'no-key' | 'no-server' | 'unreachable';
let statusCheck: Promise<AiStatus> | null = null;
/** Asked once per visit; an unreachable server is asked again next time. */
export function aiStatus(): Promise<AiStatus> {
  statusCheck ??= (async (): Promise<AiStatus> => {
    try {
      const h = await api<{ ai: boolean }>('/api/health', { timeoutMs: 8000 });
      return h.ai ? 'on' : 'no-key';
    } catch (e) {
      return e instanceof ApiError && e.code === 'no_server' ? 'no-server' : 'unreachable';
    }
  })().then((s) => {
    if (s === 'unreachable') statusCheck = null;
    return s;
  });
  return statusCheck;
}

/** Sends the English plan text to the server for translation; the caller checks the reply. */
export const requestTranslation = (language: string, text: PlanText) =>
  api<unknown>('/api/translate', { method: 'POST', body: JSON.stringify({ language, ...text }), timeoutMs: 60_000 });
