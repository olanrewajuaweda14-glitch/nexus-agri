/**
 * Vercel serverless entry point for every /api/* route (health, ask, diagnose,
 * weather, climate, soil, place). The static app is served by Vercel's Vite
 * build; this function adds the server half. Logic lives in server/handlers.ts.
 *
 * Set GEMINI_API_KEY (and optionally GEMINI_MODEL) in the Vercel project's
 * Environment Variables to turn on the AI advisor.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApi } from '../server/handlers.js';

type VercelRequest = IncomingMessage & { query: Record<string, string | string[]>; body: unknown };
type VercelResponse = ServerResponse;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = String(Array.isArray(req.query.route) ? req.query.route[0] : req.query.route ?? '');
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

  const r = await handleApi({ route, method: req.method ?? 'GET', query: req.query, body: req.body, ip });

  res.statusCode = r.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(r.headers ?? {})) res.setHeader(k, v);
  res.end(JSON.stringify(r.body));
}
