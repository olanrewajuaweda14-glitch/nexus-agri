/**
 * Server-side data access: the shared adapters plus a per-location cache, so
 * repeated requests for the same farm don't hit the upstream APIs.
 */
import type { ClimateBundle, SoilBundle, WeatherBundle } from '../src/lib/types.js';
import { fetchClimateDirect, fetchPlaceDirect, fetchSoilDirect, fetchWeatherDirect } from '../src/lib/data/sources.js';

export { UpstreamError, normaliseSoil, normaliseWeather, summariseClimate } from '../src/lib/data/sources.js';

const UA = { 'User-Agent': 'nexus-agri/2.0 (farm decision support)' };

class TTLCache<T> {
  private m = new Map<string, { v: T; exp: number }>();
  constructor(private ttlMs: number, private max = 500) {}
  get(k: string) {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (e.exp < Date.now()) {
      this.m.delete(k);
      return undefined;
    }
    return e.v;
  }
  set(k: string, v: T) {
    if (this.m.size >= this.max) this.m.delete(this.m.keys().next().value as string);
    this.m.set(k, { v, exp: Date.now() + this.ttlMs });
  }
}

export const cacheKey = (lat: number, lng: number) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

function cached<T>(ttlMs: number, load: (lat: number, lng: number) => Promise<T>) {
  const cache = new TTLCache<T>(ttlMs);
  const inflight = new Map<string, Promise<T>>();
  return async (lat: number, lng: number): Promise<T> => {
    const k = cacheKey(lat, lng);
    const hit = cache.get(k);
    if (hit) return hit;
    // Collapse concurrent requests for the same point into one upstream call.
    let p = inflight.get(k);
    if (!p) {
      p = load(lat, lng)
        .then((v) => {
          cache.set(k, v);
          return v;
        })
        .finally(() => inflight.delete(k));
      inflight.set(k, p);
    }
    return p;
  };
}

export const getWeather = cached<WeatherBundle>(30 * 60_000, (a, b) => fetchWeatherDirect(a, b, UA));
export const getClimate = cached<ClimateBundle>(24 * 3600_000, (a, b) => fetchClimateDirect(a, b, UA));
export const getSoil = cached<SoilBundle>(30 * 24 * 3600_000, (a, b) => fetchSoilDirect(a, b, UA));
export const reverseGeocode = (lat: number, lng: number) => fetchPlaceDirect(lat, lng, UA);
