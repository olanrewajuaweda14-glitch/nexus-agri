import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Send, Trash2 } from 'lucide-react';
import type { Farm } from '../lib/types';
import type { Insights } from '../lib/useInsights';
import { aiStatus, api, ApiError, type AiStatus } from '../lib/data/api';
import { KEYS, load, save } from '../lib/storage';
import { Segmented, SourceTag } from '../components/ui';
import { ListenButton } from '../components/ListenButton';

interface AskReply {
  answer: string;
  steps: string[];
  basedOn: string[];
  confidence: 'high' | 'medium' | 'low';
  missing: string;
}
interface Turn {
  role: 'user' | 'model';
  text: string;
  reply?: AskReply;
}
interface Diagnosis {
  usable: boolean;
  problemIfUnusable: string;
  summary: string;
  findings: { name: string; type: string; likelihood: 'likely' | 'possible' | 'unlikely'; evidence: string }[];
  confirmBy: string[];
  actions: string[];
  urgent: boolean;
}

const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Models occasionally drop or mistype fields; never render undefined. */
function cleanReply(r: any): AskReply | null {
  if (!r || typeof r.answer !== 'string' || !r.answer.trim()) return null;
  return {
    answer: r.answer,
    steps: arr(r.steps),
    basedOn: arr(r.basedOn),
    confidence: ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'medium',
    missing: typeof r.missing === 'string' ? r.missing : '',
  };
}

function cleanDiagnosis(r: any): Diagnosis | null {
  if (!r || typeof r !== 'object') return null;
  if (r.usable === false) return { usable: false, problemIfUnusable: String(r.problemIfUnusable ?? ''), summary: '', findings: [], confirmBy: [], actions: [], urgent: false };
  if (typeof r.summary !== 'string') return null;
  const findings = Array.isArray(r.findings)
    ? r.findings
        .filter((f: any) => f && typeof f.name === 'string')
        .map((f: any) => ({ name: f.name, type: String(f.type ?? ''), likelihood: ['likely', 'possible', 'unlikely'].includes(f.likelihood) ? f.likelihood : 'possible', evidence: String(f.evidence ?? '') }))
    : [];
  return { usable: true, problemIfUnusable: '', summary: r.summary, findings, confirmBy: arr(r.confirmBy), actions: arr(r.actions), urgent: r.urgent === true };
}

const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'pcm', label: 'Pidgin' },
  { value: 'ha', label: 'Hausa' },
  { value: 'yo', label: 'Yorùbá' },
  { value: 'ig', label: 'Igbo' },
];

export function Ask({ farm, ins, initialQuestion, initialMode }: { farm: Farm; ins: Insights; initialQuestion?: string; initialMode?: 'ask' | 'photo' }) {
  const [mode, setMode] = useState<'ask' | 'photo'>(initialMode ?? 'ask');
  // A question handed over from another screen (a job card, a photo result). Chat takes it once.
  const [prefill, setPrefill] = useState(initialQuestion ?? '');
  useEffect(() => {
    if (mode === 'ask' && prefill) setPrefill('');
  }, [mode, prefill]);
  const [lang, setLang] = useState<string>(() => load(KEYS.lang, 'en'));
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    aiStatus().then(setStatus);
  }, []);
  const off = status === 'no-key' || status === 'no-server';
  useEffect(() => { save(KEYS.lang, lang); }, [lang]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Advisor</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Ask about your farm</h1>
        </div>
        <Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: 'ask', label: 'Ask' }, { value: 'photo', label: 'Check a photo' }]} />
      </header>

      <label className="flex items-center gap-2 text-sm text-ink-2">
        Answer in
        <select className="field w-auto py-1.5" value={lang} onChange={(e) => setLang(e.target.value)}>
          {LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </label>

      {off && (
        <div className="card p-4 text-[15px]">
          <p className="font-semibold">{status === 'no-server' ? 'The AI advisor needs the Nexus Agri server.' : 'The AI advisor is switched off on this server.'}</p>
          <p className="mt-1 text-ink-2">
            Everything else — the weekly plan, spray windows, water balance, soil and costs — is calculated on your phone without AI and keeps working.{' '}
            {status === 'no-server' ? (
              <>This copy is running as static files only. Run it with <code className="num rounded bg-paper px-1">npm start</code> (or any Node host) and set <code className="num rounded bg-paper px-1">ANTHROPIC_API_KEY</code>.</>
            ) : (
              <>To turn the advisor on, set <code className="num rounded bg-paper px-1">ANTHROPIC_API_KEY</code> on the server and restart it (on Vercel: add it under Environment Variables, then redeploy).</>
            )}
          </p>
        </div>
      )}
      {status === 'unreachable' && <p className="rounded-lg bg-sun-soft px-3 py-2 text-sm">Can't reach the server right now — questions will fail until the connection is back.</p>}

      {mode === 'ask' ? (
        <Chat farm={farm} ins={ins} lang={lang} disabled={off} prefill={prefill} />
      ) : (
        <Photo farm={farm} ins={ins} lang={lang} disabled={off} onFollowUp={(text) => { setPrefill(text); setMode('ask'); }} />
      )}
    </div>
  );
}

/** Compact, factual context for the model — numbers the app computed, nothing invented. */
function buildContext(farm: Farm, ins: Insights) {
  const w = ins.forecast;
  const d = ins.derived;
  const ti = w ? w.daily.time.indexOf(ins.today) : -1;
  return {
    farm: { name: farm.name, place: farm.placeName, crop: ins.crop.name, sizeHa: farm.sizeHa, water: farm.water, planted: farm.plantingDate, variety: `${farm.maturity} maturity` },
    today: ins.today,
    stage: { dap: ins.stage.dap, name: ins.stage.name, next: ins.stage.nextName, daysToNext: ins.stage.daysToNext },
    plan: d.openPlan.map((a) => ({ priority: a.priority, title: a.title, when: a.when, why: a.why })),
    water: d.water && { availablePct: Math.round(d.water.availableNow * 100), stressed: d.water.stressedNow, stressDate: d.water.stressDate, rainNext7mm: d.water.rainNext7, cropUseNext7mm: d.water.etcNext7, rainLast7mm: d.water.rainLast7 },
    forecastAvailable: !!w,
    forecast: w && ti >= 0 ? w.daily.time.slice(ti, ti + 8).map((date, k) => ({ date, rainMm: w.daily.precip[ti + k], chance: w.daily.precipProb[ti + k], tMax: w.daily.tMax[ti + k], tMin: w.daily.tMin[ti + k] })) : null,
    sprayWindows: d.spray?.windows.slice(0, 3) ?? null,
    soil: { ...ins.soilSummary, source: farm.labSoil ? 'lab + SoilGrids' : 'SoilGrids estimate', findings: ins.findings.map((f) => f.title) },
    climate: ins.climate.data && { last30Mm: ins.climate.data.last30Mm, normal30Mm: ins.climate.data.last30NormalMm },
  };
}

const THINKING = ["Reading this week's forecast…", 'Checking soil and water…', "Looking at your crop's stage and jobs…", 'Writing the answer…'];

function Chat({ farm, ins, lang, disabled, prefill = '' }: { farm: Farm; ins: Insights; lang: string; disabled: boolean; prefill?: string }) {
  const [turns, setTurns] = useState<Turn[]>(() => load(KEYS.chat(farm.id), []));
  const [q, setQ] = useState(prefill);
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { save(KEYS.chat(farm.id), turns.slice(-20)); }, [turns, farm.id]);
  // A handed-over question: focus the box with the cursor at the end, ready to edit or send.
  useEffect(() => {
    if (!prefill || !input.current) return;
    input.current.focus();
    input.current.setSelectionRange(prefill.length, prefill.length);
  }, [prefill]);
  // Show what the advisor is working through while it thinks.
  useEffect(() => {
    if (!busy) return setPhase(0);
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, THINKING.length - 1)), 3500);
    return () => clearInterval(t);
  }, [busy]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns.length, busy]);

  const suggestions = [
    `Is it a good week to apply fertilizer?`,
    `What should I look for when I scout today?`,
    ins.crop.legume ? 'Do I need nitrogen fertilizer at all?' : 'Can I use NPK 20-10-10 instead of 15-15-15?',
    'When should I sell to get a better price?',
  ];

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const history = turns.map((t) => ({ role: t.role, text: t.reply ? t.reply.answer : t.text }));
    setTurns((t) => [...t, { role: 'user', text }]);
    setQ('');
    setBusy(true);
    setErr(null);
    try {
      const raw = await api<unknown>('/api/ask', { method: 'POST', body: JSON.stringify({ question: text, language: lang, context: buildContext(farm, ins), history }), timeoutMs: 60_000 });
      const reply = cleanReply(raw);
      if (!reply) throw new ApiError('bad_reply', 'The advisor returned an empty answer. Please ask again.');
      setTurns((t) => [...t, { role: 'model', text: reply.answer, reply }]);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {turns.length === 0 && (
        <div className="space-y-3">
          <p className="text-[15px] text-ink-2">The advisor sees this week's plan, the forecast, your soil and growth stage, and answers from those numbers.</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button" disabled={disabled || busy} onClick={() => send(s)} className="rounded-full border border-line bg-card px-3 py-1.5 text-left text-sm hover:border-leaf disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4" aria-live="polite">
        {turns.map((t, i) =>
          t.role === 'user' ? (
            <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-paper">{t.text}</div>
          ) : (
            t.reply ? <Reply key={i} r={t.reply} /> : <div key={i} className="card max-w-[95%] p-4 text-[15px]">{t.text}</div>
          ),
        )}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-ink-3">
            <Loader2 className="h-4 w-4 animate-spin" /> <span key={phase} className="[animation:fade_400ms_ease]">{THINKING[phase]}</span>
          </div>
        )}
        {err && <p role="alert" className="text-sm text-clay">{err}</p>}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(q); }} className="sticky bottom-20 z-10 flex gap-2 md:bottom-4">
        <input
          ref={input}
          className="field flex-1 rounded-full py-3 pl-4 shadow-sm"
          placeholder={disabled ? 'Advisor is off' : 'Type a question…'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled}
          maxLength={1000}
          aria-label="Your question"
        />
        <button type="submit" className="btn btn-primary h-12 w-12 shrink-0 p-0" disabled={disabled || busy || !q.trim()} aria-label="Send">
          <Send className="h-5 w-5" />
        </button>
      </form>
      {turns.length > 0 && (
        <button type="button" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-clay" onClick={() => setTurns([])}>
          <Trash2 className="h-3.5 w-3.5" /> Clear conversation
        </button>
      )}
    </div>
  );
}

function Reply({ r }: { r: AskReply }) {
  return (
    <div className="card max-w-[95%] space-y-3 p-4">
      <p className="text-[15px] leading-relaxed">{r.answer}</p>
      {r.steps?.length > 0 && (
        <ol className="list-decimal space-y-1 pl-5 text-[15px] leading-relaxed text-ink-2">
          {r.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {r.missing && <p className="rounded-lg bg-paper px-3 py-2 text-sm text-ink-2"><span className="eyebrow mr-2">Would help to know</span>{r.missing}</p>}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-line-2 pt-3">
        <ListenButton compact text={[r.answer, ...r.steps].join(' ')} />
        <span className={`eyebrow mr-1 ${r.confidence === 'low' ? 'text-clay' : r.confidence === 'medium' ? 'text-sun' : 'text-leaf'}`}>{r.confidence} confidence</span>
        {r.basedOn?.slice(0, 4).map((b, i) => <SourceTag key={i}>{b}</SourceTag>)}
      </div>
    </div>
  );
}

/* ------------------------------- Photo check ------------------------------- */

async function downscale(file: File, max = 1024): Promise<{ base64: string; url: string }> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', 0.82);
  return { base64: url.split(',')[1], url };
}

const LIKELY = { likely: 'bg-clay-soft text-clay', possible: 'bg-sun-soft text-sun', unlikely: 'bg-line-2 text-ink-3' };

function Photo({ farm, ins, lang, disabled, onFollowUp }: { farm: Farm; ins: Insights; lang: string; disabled: boolean; onFollowUp: (question: string) => void }) {
  const [img, setImg] = useState<{ base64: string; url: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Diagnosis | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setRes(null);
    setErr(null);
    try {
      setImg(await downscale(f));
    } catch {
      setErr('Could not read that image. Try a JPEG or PNG.');
    }
  };

  const run = async () => {
    if (!img) return;
    setBusy(true);
    setErr(null);
    const w = ins.derived.water;
    const weatherNote = w ? `${w.rainLast7} mm rain in the last 7 days, root-zone water ${Math.round(w.availableNow * 100)}%` : 'unknown';
    try {
      const raw = await api<unknown>('/api/diagnose', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: img.base64, mimeType: 'image/jpeg', crop: ins.crop.name, stage: `${ins.stage.name}, day ${ins.stage.dap}`, notes, language: lang, weatherNote }),
        timeoutMs: 90_000,
      });
      const d = cleanDiagnosis(raw);
      if (!d) throw new ApiError('bad_reply', 'The photo check returned an unreadable answer. Please try again.');
      setRes(d);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[15px] text-ink-2">
        Take a clear, close photo of one affected leaf or plant in daylight. Include a healthy leaf for comparison if you can. The result is a list of likely causes and how to tell them apart in the field — not a lab diagnosis.
      </p>
      <label className={`card flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-6 text-center hover:border-leaf ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
        {img ? (
          <img src={img.url} alt="Selected crop photo" className="max-h-72 rounded-lg object-contain" />
        ) : (
          <>
            <Camera className="h-8 w-8 text-ink-3" aria-hidden />
            <span className="font-medium">Take or choose a photo</span>
            <span className="text-sm text-ink-3">Resized on your phone before upload to save data</span>
          </>
        )}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={disabled} />
      </label>
      {img && (
        <>
          <textarea className="field min-h-20" placeholder={`What have you noticed? e.g. "yellowing from the leaf tip on lower leaves, started last week" (optional)`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          <button type="button" className="btn btn-primary" onClick={run} disabled={busy || disabled}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Looking…</> : `Check this ${ins.crop.name.toLowerCase()} photo`}
          </button>
        </>
      )}
      {err && <p role="alert" className="text-sm text-clay">{err}</p>}
      {res && (
        <div className="card space-y-4 p-4" aria-live="polite">
          {!res.usable ? (
            <p><b>Can't judge this photo.</b> {res.problemIfUnusable}</p>
          ) : (
            <>
              {res.urgent && <p className="rounded-lg bg-clay-soft px-3 py-2 text-sm font-medium text-clay">This can spread fast. Check the rest of the field today.</p>}
              <p className="font-display text-xl font-semibold leading-snug">{res.summary}</p>
              <ul className="space-y-2">
                {res.findings.map((f, i) => (
                  <li key={i} className="rounded-lg border border-line-2 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{f.name}</span>
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] uppercase ${LIKELY[f.likelihood]}`}>{f.likelihood}</span>
                      <span className="text-xs text-ink-3">{f.type}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-2">{f.evidence}</p>
                  </li>
                ))}
              </ul>
              {res.confirmBy.length > 0 && (
                <div>
                  <div className="eyebrow mb-1">Check in the field</div>
                  <ul className="list-disc space-y-1 pl-5 text-[15px] text-ink-2">{res.confirmBy.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              {res.actions.length > 0 && (
                <div>
                  <div className="eyebrow mb-1">What to do</div>
                  <ol className="list-decimal space-y-1 pl-5 text-[15px] text-ink-2">{res.actions.map((c, i) => <li key={i}>{c}</li>)}</ol>
                </div>
              )}
              <button
                type="button"
                className="btn btn-ghost press w-full sm:w-auto"
                onClick={() => onFollowUp(`My ${ins.crop.name.toLowerCase()} photo check said: "${res.summary}" (${res.findings.map((f) => `${f.name}: ${f.likelihood}`).join('; ')}). What should I do on my farm this week, and what will it cost?`)}
              >
                Ask a follow-up about this
              </button>
              <p className="text-xs text-ink-3">AI image assessment for {farm.name}. If a large part of the field is affected, show a sample to your extension officer or ADP before spending on chemicals.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
