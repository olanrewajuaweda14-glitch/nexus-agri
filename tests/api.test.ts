import { afterEach, describe, expect, it, vi } from 'vitest';

const openMeteo = {
  latitude: 7.4, longitude: 3.9, timezone: 'Africa/Lagos', utc_offset_seconds: 3600,
  hourly: { time: [] as string[] },
  daily: { time: ['2026-11-21'], temperature_2m_max: [31], temperature_2m_min: [22], precipitation_sum: [0], precipitation_probability_max: [5], et0_fao_evapotranspiration: [4], wind_speed_10m_max: [10], weather_code: [1] },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const html = (status: number) => new Response('<!doctype html><title>404</title>', { status, headers: { 'content-type': 'text/html' } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('data fetching without the Node server', () => {
  it('falls back to Open-Meteo directly when /api answers with an HTML 404', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url);
      return url.startsWith('/api/') ? html(404) : json(openMeteo);
    }));
    const api = await import('../src/lib/data/api');
    const r = await api.getWeather(7.4, 3.9, true);
    expect(r.data.daily.time).toEqual(['2026-11-21']);
    expect(calls[0]).toMatch(/^\/api\/weather/);
    expect(calls[1]).toMatch(/^https:\/\/api\.open-meteo\.com/);
    expect(api.serverMissing()).toBe(true);

    // Once the server is known to be missing, it isn't asked again.
    await api.getWeather(7.5, 3.9, true);
    expect(calls.filter((u) => u.startsWith('/api/'))).toHaveLength(1);
  });

  it('also falls back when the server is up but cannot reach the source', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.startsWith('/api/') ? json({ error: 'upstream', message: 'Could not reach Open-Meteo.' }, 502) : json(openMeteo))));
    const api = await import('../src/lib/data/api');
    const r = await api.getWeather(7.4, 3.9, true);
    expect(r.data.lat).toBe(7.4);
    expect(api.serverMissing()).toBe(false);
  });

  it('reports a clear error when both paths fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.startsWith('/api/') ? html(404) : json({}, 503))));
    const api = await import('../src/lib/data/api');
    await expect(api.getWeather(7.4, 3.9, true)).rejects.toThrow(/Open-Meteo returned an error \(HTTP 503\)/);
  });

  it('tells the advisor screen whether the server or only the key is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => html(404)));
    let api = await import('../src/lib/data/api');
    expect(await api.aiStatus()).toBe('no-server');
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(async () => json({ ok: true, ai: false })));
    api = await import('../src/lib/data/api');
    expect(await api.aiStatus()).toBe('no-key');
  });
});
