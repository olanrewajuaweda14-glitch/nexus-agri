// Must load before anything reads process.env (ES imports are evaluated first).
import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'path';
import { getClimate, getSoil, getWeather, reverseGeocode, UpstreamError } from './server/sources';
import { ai, AiFailed, AiUnavailable, ask, diagnose, LANGUAGES, MODEL } from './server/ai';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// `npm start` runs the bundled dist/server.cjs; treat that as production without needing NODE_ENV (which Windows shells can't set inline).
const isProd = process.env.NODE_ENV === 'production' || !!process.argv[1]?.endsWith('server.cjs');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '8mb' }));

/* ------------------------------ Rate limit ------------------------------ */

const hits = new Map<string, { n: number; reset: number }>();
const limit = (max: number, windowMs = 60_000): express.RequestHandler => (req, res, next) => {
  const k = `${req.ip}:${req.path}`;
  const now = Date.now();
  const e = hits.get(k);
  if (!e || e.reset < now) {
    hits.set(k, { n: 1, reset: now + windowMs });
    if (hits.size > 10_000) for (const [key, v] of hits) if (v.reset < now) hits.delete(key);
    return next();
  }
  if (++e.n > max) {
    res.setHeader('Retry-After', Math.ceil((e.reset - now) / 1000));
    return res.status(429).json({ error: 'rate_limited', message: 'Too many requests — wait a minute and try again.' });
  }
  next();
};

/* -------------------------------- Helpers -------------------------------- */

function coords(req: express.Request) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const handle = (fn: (req: express.Request, res: express.Response) => Promise<unknown>): express.RequestHandler => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e instanceof AiUnavailable) {
      return res.status(503).json({ error: 'ai_not_configured', message: 'The AI advisor is not set up on this server (GEMINI_API_KEY missing).' });
    }
    if (e instanceof AiFailed) {
      return res.status(502).json({ error: 'ai_failed', message: e.message });
    }
    if (e instanceof UpstreamError) {
      return res.status(502).json({ error: 'upstream', source: e.source, message: e.message });
    }
    console.error(e);
    res.status(500).json({ error: 'server', message: 'Something went wrong on the server.' });
  }
};

/* --------------------------------- Routes --------------------------------- */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: !!ai(), model: ai() ? MODEL : null, languages: LANGUAGES });
});

app.get('/api/weather', limit(60), handle(async (req, res) => {
  const c = coords(req);
  if (!c) return res.status(400).json({ error: 'bad_coords' });
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.json(await getWeather(c.lat, c.lng));
}));

app.get('/api/climate', limit(30), handle(async (req, res) => {
  const c = coords(req);
  if (!c) return res.status(400).json({ error: 'bad_coords' });
  res.setHeader('Cache-Control', 'private, max-age=43200');
  res.json(await getClimate(c.lat, c.lng));
}));

app.get('/api/soil', limit(20), handle(async (req, res) => {
  const c = coords(req);
  if (!c) return res.status(400).json({ error: 'bad_coords' });
  res.setHeader('Cache-Control', 'private, max-age=604800');
  res.json(await getSoil(c.lat, c.lng));
}));

app.get('/api/place', limit(20), handle(async (req, res) => {
  const c = coords(req);
  if (!c) return res.status(400).json({ error: 'bad_coords' });
  res.json({ name: await reverseGeocode(c.lat, c.lng) });
}));

app.post('/api/ask', limit(20), handle(async (req, res) => {
  const { question, language = 'en', context = {}, history = [] } = req.body ?? {};
  if (typeof question !== 'string' || !question.trim()) return res.status(400).json({ error: 'question_required' });
  const safeHistory = Array.isArray(history)
    ? history.filter((h: any) => (h?.role === 'user' || h?.role === 'model') && typeof h.text === 'string')
    : [];
  res.json(await ask({ question: question.trim(), language: String(language), context, history: safeHistory }));
}));

app.post('/api/diagnose', limit(10), handle(async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg', crop = 'crop', stage = 'unknown', notes = '', language = 'en', weatherNote = 'unknown' } = req.body ?? {};
  if (typeof imageBase64 !== 'string' || imageBase64.length < 1000) return res.status(400).json({ error: 'image_required' });
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) return res.status(400).json({ error: 'bad_image_type' });
  res.json(await diagnose({ imageBase64, mimeType, crop: String(crop), stage: String(stage), notes: String(notes), language: String(language), weatherNote: String(weatherNote) }));
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

/* ------------------------------ Static / Vite ------------------------------ */

async function start() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), 'dist');
    app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(dist, { maxAge: 0 }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`Nexus Agri on http://localhost:${PORT} · AI ${ai() ? `on (${MODEL})` : 'off'}`));
}

start();
