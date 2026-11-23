import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Captured = { url: string; headers: Record<string, string>; body: any };
let captured: Captured[] = [];

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
}
const message = (text: string, stop_reason = 'end_turn') => ({
  id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
  content: [{ type: 'text', text }], stop_reason, stop_sequence: null,
  usage: { input_tokens: 1200, output_tokens: 300 },
});

// Match production: no proxy base URL or auth token inherited from the test machine.
const saved = { base: process.env.ANTHROPIC_BASE_URL, token: process.env.ANTHROPIC_AUTH_TOKEN };
delete process.env.ANTHROPIC_BASE_URL;
delete process.env.ANTHROPIC_AUTH_TOKEN;
afterAll(() => {
  if (saved.base) process.env.ANTHROPIC_BASE_URL = saved.base;
  if (saved.token) process.env.ANTHROPIC_AUTH_TOKEN = saved.token;
});

async function load(reply: (body: any) => Response) {
  vi.resetModules();
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  delete process.env.ANTHROPIC_MODEL;
  captured = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
    const body = JSON.parse(String(init?.body ?? '{}'));
    captured.push({ url: String(url), headers, body });
    return reply(body);
  }));
  return import('../server/ai');
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
});

const answer = { answer: 'Top-dress before Monday’s rain.', steps: ['130 kg urea per ha.'], basedOn: ['18 mm Monday'], confidence: 'high', missing: '' };

describe('Claude advisor', () => {
  it('sends a well-formed structured-output request and returns the parsed answer', async () => {
    const ai = await load(() => respond(200, message(JSON.stringify(answer))));
    const out = await ai.ask({ question: 'Should I top-dress?', language: 'ha', context: { stage: { dap: 38 } }, history: [{ role: 'model', text: 'earlier answer' }, { role: 'user', text: 'hi' }, { role: 'model', text: 'hello' }] });
    expect(out).toEqual(answer);

    const req = captured[0];
    expect(new URL(req.url).origin + new URL(req.url).pathname).toBe('https://api.anthropic.com/v1/messages');
    // SDK 1.x sends the configured key as a bearer token (API version 2026-10-21).
    expect(req.headers.authorization).toBe('Bearer sk-ant-test');
    expect(req.headers['anthropic-beta']).toContain('server-side-fallback-2026-07-01');
    expect(req.body.model).toBe('claude-opus-5-5');
    expect(req.body.fallbacks).toBe('default');
    expect(req.body.output_config.effort).toBe('medium');
    expect(req.body.output_config.format.type).toBe('json_schema');
    expect(Object.keys(req.body.output_config.format.schema.properties)).toEqual(['answer', 'steps', 'basedOn', 'confidence', 'missing']);
    expect(req.body.thinking).toBeUndefined(); // Opus 5.5: thinking is always on; don't send disabled
    expect(req.body.temperature).toBeUndefined();
    // History starts with a user turn and maps "model" → "assistant".
    expect(req.body.messages.map((m: any) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(req.body.messages.at(-1).content).toContain('<farmer_question>');
    expect(req.body.messages.at(-1).content).toContain('Reply in Hausa.');
    expect(req.body.system).toContain('field advisor inside Nexus Agri');
  });

  it('sends the photo as a base64 image block before the text, at high effort', async () => {
    const dx = { usable: true, problemIfUnusable: '', summary: 'Likely nitrogen deficiency.', findings: [{ name: 'Nitrogen deficiency', type: 'nutrient', likelihood: 'likely', evidence: 'V-shaped yellowing' }], confirmBy: ['Oldest leaves first?'], actions: ['Top-dress'], urgent: false };
    const ai = await load(() => respond(200, message(JSON.stringify(dx))));
    const out = await ai.diagnose({ imageBase64: 'QUJD'.repeat(400), mimeType: 'image/jpeg', crop: 'Maize', stage: 'Rapid growth, day 38', notes: 'yellow tips', language: 'en', weatherNote: '4 mm rain' });
    expect(out.summary).toBe('Likely nitrogen deficiency.');
    const content = captured[0].body.messages[0].content;
    expect(content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg' } });
    expect(content[1].type).toBe('text');
    expect(captured[0].body.output_config.effort).toBe('high');
  });

  it('turns refusals, key errors, unknown models and bad JSON into clear messages', async () => {
    let ai = await load(() => respond(200, message('', 'refusal')));
    await expect(ai.ask({ question: 'x', language: 'en', context: {}, history: [] })).rejects.toThrow(/declined/);

    ai = await load(() => respond(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }));
    await expect(ai.ask({ question: 'x', language: 'en', context: {}, history: [] })).rejects.toThrow(/ANTHROPIC_API_KEY/);

    ai = await load(() => respond(404, { type: 'error', error: { type: 'not_found_error', message: 'model: nope' } }));
    await expect(ai.ask({ question: 'x', language: 'en', context: {}, history: [] })).rejects.toThrow(/not found/);

    ai = await load(() => respond(200, message('{"answer": 3}')));
    await expect(ai.ask({ question: 'x', language: 'en', context: {}, history: [] })).rejects.toThrow(/incomplete answer/);

    ai = await load(() => respond(200, message('not json')));
    await expect(ai.ask({ question: 'x', language: 'en', context: {}, history: [] })).rejects.toThrow(/unreadable answer/);

    ai = await load(() => respond(200, message('{"answer":"cut off', 'max_tokens')));
    await expect(ai.ask({ question: 'x', language: 'en', context: {}, history: [] })).rejects.toThrow(/too long/);
  });

  it('translates the plan with its own instructions, at low effort, and checks the jobs come back', async () => {
    const input = {
      language: 'yo',
      heading: 'Maize, day 34.',
      labels: { now: 'Do now', week: 'This week', watch: 'Keep an eye on' },
      items: [{ id: 'topdress', title: 'Top-dress', when: 'Today', how: '130 kg urea' }, { id: 'faw', title: 'Scout', when: 'This week', how: '' }],
    };
    const reply = {
      heading: 'Àgbàdo, ọjọ́ 34.',
      labels: { now: 'Ṣe é báyìí', week: 'Ọ̀sẹ̀ yìí', watch: 'Ṣọ́ra fún' },
      items: [{ id: 'faw', title: 'Ṣàyẹ̀wò', when: 'Ọ̀sẹ̀ yìí', how: 'àfikún' }, { id: 'topdress', title: 'Fi ajile kún un', when: 'Lónìí', how: '130 kg urea' }],
    };
    let ai = await load(() => respond(200, message(JSON.stringify(reply))));
    const out = await ai.translatePlan(input);
    // Back in the plan's order; nothing added where the English had no "how".
    expect(out.items.map((i) => i.id)).toEqual(['topdress', 'faw']);
    expect(out.items[1].how).toBe('');
    const req = captured[0].body;
    expect(req.output_config.effort).toBe('low');
    expect(req.system).toContain('translate the weekly job list');
    expect(req.system).not.toContain('field advisor');
    expect(req.messages[0].content).toContain('Translate this plan into Yoruba.');
    expect(req.messages[0].content).toContain('<plan>');

    ai = await load(() => respond(200, message(JSON.stringify({ ...reply, items: reply.items.slice(0, 1) }))));
    await expect(ai.translatePlan(input)).rejects.toThrow(/incomplete/);
    await expect(ai.translatePlan({ ...input, language: 'en' })).rejects.toThrow(/Choose/);
  });

  it('reports itself off without a key and makes no request', async () => {
    vi.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const ai = await import('../server/ai');
    expect(ai.ai()).toBeNull();
    await expect(ai.ask({ question: 'x', language: 'en', context: {}, history: [] })).rejects.toBeInstanceOf(ai.AiUnavailable);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
