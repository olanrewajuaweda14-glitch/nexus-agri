/** localStorage with graceful failure (private mode, full quota, blocked storage). */

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the app still works for this session */
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const KEYS = {
  farms: 'na:farms',
  active: 'na:active',
  done: 'na:done',
  budget: (farmId: string) => `na:budget:${farmId}`,
  cache: (kind: string, lat: number, lng: number) => `na:cache:${kind}:${lat.toFixed(3)},${lng.toFixed(3)}`,
  chat: (farmId: string) => `na:chat:${farmId}`,
  lang: 'na:lang',
};
