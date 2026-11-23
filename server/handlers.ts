/**
 * API routes as plain functions, shared by the Express server (server.ts) and
 * the Vercel serverless function (api/[route].ts), so both deployments behave
 * identically.
 *
 * Relative imports carry a .js extension: Vercel runs these files as native
 * ES modules, which need explicit extensions. TypeScript, Vite, tsx and
 * esbuild all map them back to the .ts sources.
 */
import { getClimate, getPriceRows, getSoil, getWeather, reverseGeocode, UpstreamError } from './sources.js';
import { summarizePrices } from '../src/lib/data/prices.js';
import { CROPS } from '../src/lib/crops.js';
import type { CropId } from '../src/lib/types.js';
import { ai, AiFailed, AiUnavailable, ask, diagnose, LANGUAGES, MODEL, translatePlan } from './ai.js';

export interface ApiRequest {
  route: string;
  method: string;
  query: Record<string, unknown>;
  body: unknown;
  ip: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

/* ------------------------------ Rate limit ------------------------------ */

// Per-instance memory. On serverless this resets with each cold start, so it
// blunts bursts rather than enforcing a hard quota.
const hits = new Map<string, { n: number; reset: number }>();
const LIMITS: Record<string, number> = { weather: 60, climate: 30, soil: 20, place: 20, prices: 30, ask: 20, diagnose: 10, translate: 10 };

function rateLimited(route: string, ip: string): ApiResponse | null {
  const max = LIMITS[route];
  if (!max) return null;
  const k = `${ip}:${route}`;
  const now = Date.now();
  const e = hits.get(k);
  if (!e || e.reset < now) {
    hits.set(k, { n: 1, reset: now + 60_000 });
    if (hits.size > 10_000) for (const [key, v] of hits) if (v.reset < now) hits.delete(key);
    return null;
  }
  if (++e.n <= max) return null;
  return {
    status: 429,
    headers: { 'Retry-After': String(Math.ceil((e.reset - now) / 1000)) },
    body: { error: 'rate_limited', message: 'Too many requests — wait a minute and try again.' },
  };
}

/* -------------------------------- Routes -------------------------------- */

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

function coords(q: Record<string, unknown>) {
  const lat = Number(first(q.lat));
  const lng = Number(first(q.lng));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const ok = (body: unknown, maxAge?: number): ApiResponse => ({ status: 200, body, headers: maxAge ? { 'Cache-Control': `private, max-age=${maxAge}` } : undefined });
const bad = (error: string): ApiResponse => ({ status: 400, body: { error } });

type Handler = (r: ApiRequest) => Promise<ApiResponse>;

const DATA = {
  weather: { load: getWeather, maxAge: 600 },
  climate: { load: getClimate, maxAge: 43_200 },
  soil: { load: getSoil, maxAge: 604_800 },
} as const;

const GET: Record<string, Handler> = {
  health: async () => ok({ ok: true, ai: !!ai(), model: ai() ? MODEL : null, languages: LANGUAGES }),
  prices: async ({ query }) => {
    const c = coords(query);
    const crop = String(first(query.crop) ?? '') as CropId;
    if (!c) return bad('bad_coords');
    if (!(crop in CROPS)) return bad('bad_crop');
    const summary = summarizePrices(await getPriceRows(), crop, c.lat, c.lng);
    return ok({ summary, source: 'WFP Nigeria market monitoring (HDX)' }, 6 * 3600);
  },
  place: async ({ query }) => {
    const c = coords(query);
    return c ? ok({ name: await reverseGeocode(c.lat, c.lng) }) : bad('bad_coords');
  },
  ...Object.fromEntries(
    Object.entries(DATA).map(([name, d]) => [
      name,
      (async ({ query }) => {
        const c = coords(query);
        return c ? ok(await d.load(c.lat, c.lng), d.maxAge) : bad('bad_coords');
      }) as Handler,
    ]),
  ),
};

const POST: Record<string, Handler> = {
  ask: async ({ body }) => {
    const { question, language = 'en', context = {}, history = [] } = (body ?? {}) as any;
    if (typeof question !== 'string' || !question.trim()) return bad('question_required');
    const safeHistory = Array.isArray(history)
      ? history.filter((h: any) => (h?.role === 'user' || h?.role === 'model') && typeof h.text === 'string')
      : [];
    return ok(await ask({ question: question.trim(), language: String(language), context, history: safeHistory }));
  },
  diagnose: async ({ body }) => {
    const { imageBase64, mimeType = 'image/jpeg', crop = 'crop', stage = 'unknown', notes = '', language = 'en', weatherNote = 'unknown' } = (body ?? {}) as any;
    if (typeof imageBase64 !== 'string' || imageBase64.length < 1000) return bad('image_required');
    if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) return bad('bad_image_type');
    return ok(await diagnose({ imageBase64, mimeType, crop: String(crop), stage: String(stage), notes: String(notes), language: String(language), weatherNote: String(weatherNote) }));
  },
  translate: async ({ body }) => {
    const { language, heading, labels, items } = (body ?? {}) as any;
    if (typeof language !== 'string' || language === 'en' || !Object.hasOwn(LANGUAGES, language)) return bad('bad_language');
    const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
    if (!text(heading, 300) || !heading.trim()) return bad('bad_heading');
    if (!labels || typeof labels !== 'object' || !['now', 'week', 'watch'].every((k) => text(labels[k], 60))) return bad('bad_labels');
    if (!Array.isArray(items) || items.length === 0 || items.length > 25) return bad('bad_items');
    const ids = new Set<string>();
    for (const i of items) {
      if (!i || !text(i.id, 80) || !text(i.title, 200) || !text(i.when, 200) || !text(i.how ?? '', 1500) || ids.has(i.id)) return bad('bad_items');
      ids.add(i.id);
    }
    return ok(
      await translatePlan({
        language,
        heading,
        labels: { now: labels.now, week: labels.week, watch: labels.watch },
        items: items.map((i: any) => ({ id: i.id, title: i.title, when: i.when, how: i.how ?? '' })),
      }),
    );
  },
};

export async function handleApi(req: ApiRequest): Promise<ApiResponse> {
  const table = req.method === 'GET' ? GET : req.method === 'POST' ? POST : null;
  const fn = table?.[req.route];
  if (!fn) {
    const exists = req.route in GET || req.route in POST;
    return exists ? { status: 405, body: { error: 'method_not_allowed' } } : { status: 404, body: { error: 'not_found' } };
  }
  const limited = rateLimited(req.route, req.ip);
  if (limited) return limited;
  try {
    return await fn(req);
  } catch (e) {
    if (e instanceof AiUnavailable) {
      return { status: 503, body: { error: 'ai_not_configured', message: 'The AI advisor is not set up on this server (ANTHROPIC_API_KEY missing).' } };
    }
    if (e instanceof AiFailed) return { status: 502, body: { error: 'ai_failed', message: e.message } };
    if (e instanceof UpstreamError) return { status: 502, body: { error: 'upstream', source: e.source, message: e.message } };
    console.error(e);
    return { status: 500, body: { error: 'server', message: 'Something went wrong on the server.' } };
  }
}
