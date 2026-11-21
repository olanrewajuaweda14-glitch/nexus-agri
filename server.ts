// Must load before anything reads process.env (ES imports are evaluated first).
import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'path';
import { handleApi } from './server/handlers.js';
import { ai, MODEL } from './server/ai.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// `npm start` runs the bundled dist/server.cjs; treat that as production without needing NODE_ENV (which Windows shells can't set inline).
const isProd = process.env.NODE_ENV === 'production' || !!process.argv[1]?.endsWith('server.cjs');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '8mb' }));

app.all('/api/:route', async (req, res) => {
  const r = await handleApi({ route: req.params.route, method: req.method, query: req.query as Record<string, unknown>, body: req.body, ip: req.ip ?? 'unknown' });
  if (r.headers) res.set(r.headers);
  res.status(r.status).json(r.body);
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

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
