import { describe, expect, it } from 'vitest';
import { handleApi } from '../server/handlers';

const req = (route: string, method = 'GET', extra: Partial<Parameters<typeof handleApi>[0]> = {}) =>
  handleApi({ route, method, query: {}, body: undefined, ip: '10.0.0.1', ...extra });

describe('shared API handler (Express and Vercel)', () => {
  it('reports AI status on /health', async () => {
    const r = await req('health');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, languages: { ha: 'Hausa' } });
  });
  it('routes by method: 405 for the wrong verb, 404 for unknown routes', async () => {
    expect((await req('ask', 'GET')).status).toBe(405);
    expect((await req('health', 'POST')).status).toBe(405);
    expect((await req('nope')).status).toBe(404);
  });
  it('validates inputs before calling anything upstream', async () => {
    expect((await req('weather', 'GET', { query: { lat: '91', lng: '3' } })).body).toEqual({ error: 'bad_coords' });
    expect((await req('ask', 'POST', { body: { question: '  ' } })).body).toEqual({ error: 'question_required' });
    expect((await req('diagnose', 'POST', { body: { imageBase64: 'x'.repeat(2000), mimeType: 'image/gif' } })).body).toEqual({ error: 'bad_image_type' });
  });
  it('checks a translation request before anything is sent to Claude', async () => {
    const body = { language: 'ha', heading: 'Maize, day 34.', labels: { now: 'Do now', week: 'This week', watch: 'Keep an eye on' }, items: [{ id: 'a', title: 'Top-dress', when: 'Today', how: '' }] };
    const post = (b: unknown) => req('translate', 'POST', { body: b, ip: '10.0.0.7' }).then((r) => r.body);
    expect(await post({ ...body, language: 'en' })).toEqual({ error: 'bad_language' });
    expect(await post({ ...body, language: 'toString' })).toEqual({ error: 'bad_language' });
    expect(await post({ ...body, heading: ' ' })).toEqual({ error: 'bad_heading' });
    expect(await post({ ...body, labels: { now: 'x' } })).toEqual({ error: 'bad_labels' });
    expect(await post({ ...body, items: [] })).toEqual({ error: 'bad_items' });
    expect(await post({ ...body, items: [body.items[0], body.items[0]] })).toEqual({ error: 'bad_items' });
    expect(await post({ ...body, items: [{ ...body.items[0], how: 'x'.repeat(1501) }] })).toEqual({ error: 'bad_items' });
    // Valid, but no key on this test server: a clear 503, not a crash.
    const r = await req('translate', 'POST', { body, ip: '10.0.0.8' });
    expect(r.status).toBe(503);
    expect(r.body).toMatchObject({ error: 'ai_not_configured' });
  });
  it('accepts array-valued query params (Vercel parses repeated keys as arrays)', async () => {
    expect((await req('place', 'GET', { query: { lat: ['abc'], lng: ['3'] } })).body).toEqual({ error: 'bad_coords' });
  });
  it('rate-limits per IP and route', async () => {
    const ip = '10.9.9.9';
    let last;
    for (let i = 0; i < 11; i++) last = await req('diagnose', 'POST', { ip, body: {} });
    expect(last!.status).toBe(429);
    expect(last!.headers?.['Retry-After']).toBeDefined();
    expect((await req('diagnose', 'POST', { ip: '10.9.9.10', body: {} })).status).toBe(400);
  });
});
