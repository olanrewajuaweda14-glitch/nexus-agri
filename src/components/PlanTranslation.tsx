import { useEffect, useMemo, useRef, useState } from 'react';
import { Languages, Loader2, Share2 } from 'lucide-react';
import type { Farm, PlanAction, Priority } from '../lib/types';
import { aiStatus, ApiError, requestTranslation, type AiStatus } from '../lib/data/api';
import { acceptTranslation, contentHash, langLabel, TRANSLATE_LANGS, translatedMessage, type PlanText } from '../lib/translate';
import { KEYS, load, save } from '../lib/storage';
import { PRIORITY_TONE } from './ActionCard';

interface Saved {
  hash: string;
  text: PlanText;
  keptEnglish: string[];
  savedAt: string;
}

const LANG_KEY = 'na:planLang';
const SHOWN_KEY = 'na:planLangShown';
/** Under na:cache: so backups leave it out; it is rebuilt with one tap. */
const cacheKey = (farmId: string, lang: string) => `na:cache:plan-tr:${farmId}:${lang}`;
const isTranslatable = (l: string) => TRANSLATE_LANGS.some((t) => t.value === l);

/**
 * This week's plan in Pidgin, Hausa, Yorùbá or Igbo, through the Claude advisor.
 * Stays out of the way when the advisor is off, unless a translation of the
 * current plan is already saved on the phone (then it works offline too).
 */
export function PlanTranslation({ farm, text, open }: { farm: Farm; text: PlanText; open: PlanAction[] }) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    let live = true;
    aiStatus().then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, []);

  const [lang, setLang] = useState<string>(() => {
    const own = load<string>(LANG_KEY, '');
    if (isTranslatable(own)) return own;
    const askLang = load<string>(KEYS.lang, 'en');
    return isTranslatable(askLang) ? askLang : 'pcm';
  });
  const langRef = useRef(lang);
  langRef.current = lang;
  const [saved, setSaved] = useState<Saved | null>(() => load<Saved | null>(cacheKey(farm.id, lang), null));
  useEffect(() => setSaved(load<Saved | null>(cacheKey(farm.id, lang), null)), [farm.id, lang]);
  const [shown, setShown] = useState(() => load(SHOWN_KEY, false));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hash = useMemo(() => contentHash(text), [text]);
  const current = saved?.hash === hash ? saved : null;
  const outdated = !!saved && !current;

  const show = (v: boolean) => {
    setShown(v);
    save(SHOWN_KEY, v);
  };

  const translate = async () => {
    const forLang = lang;
    setBusy(true);
    setError(null);
    try {
      const reply = acceptTranslation(text, await requestTranslation(forLang, text));
      if (!reply) throw new ApiError('bad_reply', 'The translation came back incomplete. Please try again.');
      const entry: Saved = { hash, ...reply, savedAt: new Date().toISOString() };
      save(cacheKey(farm.id, forLang), entry);
      if (langRef.current === forLang) {
        setSaved(entry);
        show(true);
      }
    } catch (e) {
      if (langRef.current !== forLang) return;
      setError(
        e instanceof ApiError && e.code === 'network'
          ? 'No connection. Translating needs the internet; the English plan above works offline.'
          : e instanceof ApiError
            ? e.message
            : 'Could not translate right now. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (!current && status !== 'on') return null;

  const expanded = shown && (!!current || outdated);
  const label = busy ? null : current ? (shown ? 'Hide' : 'Show') : outdated ? 'Translate again' : 'Translate';

  return (
    <section className="card overflow-hidden [animation:rise_500ms_var(--ease-out)_both]" aria-label="This week's plan in your language">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 p-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf">
            <Languages className="h-4 w-4" aria-hidden />
          </span>
          <span id={`tr-label-${farm.id}`} className="text-sm font-medium">Read this plan in your language</span>
        </span>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <select
            aria-labelledby={`tr-label-${farm.id}`}
            className="field min-w-0 flex-1 py-1.5 sm:w-auto sm:flex-none"
            value={lang}
            disabled={busy}
            onChange={(e) => {
              setLang(e.target.value);
              save(LANG_KEY, e.target.value);
              setError(null);
            }}
          >
            {TRANSLATE_LANGS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <button
            type="button"
            className={`btn press shrink-0 ${current ? 'btn-ghost' : 'btn-primary'}`}
            disabled={busy}
            aria-expanded={current ? shown : undefined}
            onClick={() => (current ? show(!shown) : translate())}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Translating…
              </>
            ) : (
              label
            )}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="border-t border-line-2 px-4 py-3 text-sm text-clay">
          {error}
        </p>
      )}
      <div className="expand" data-open={expanded}>
        <div inert={!expanded}>
          {current ? (
            <TranslatedPlan farm={farm} saved={current} open={open} lang={lang} />
          ) : outdated ? (
            <p className="border-t border-line-2 px-4 py-3 text-sm text-ink-2">
              The plan has changed since the last {langLabel(lang)} translation, so it is hidden rather than show old timings. Tap “Translate again”.
            </p>
          ) : (
            <span />
          )}
        </div>
      </div>
    </section>
  );
}

function TranslatedPlan({ farm, saved, open, lang }: { farm: Farm; saved: Saved; open: PlanAction[]; lang: string }) {
  const t = saved.text;
  const byId = new Map(t.items.map((i) => [i.id, i]));
  const kept = new Set(saved.keptEnglish);
  const share = () => {
    const message = translatedMessage(farm.name, t, open, lang);
    if (navigator.share) navigator.share({ text: message }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  };
  return (
    <div className="space-y-4 border-t border-line-2 px-4 pb-4 pt-3">
      <div lang={lang} className="space-y-4">
        <p className="font-display text-lg font-semibold leading-snug">{t.heading}</p>
        {(['now', 'week', 'watch'] as Priority[]).map((p) => {
          const items = open.filter((a) => a.priority === p && byId.has(a.id));
          if (!items.length) return null;
          return (
            <div key={p} className="space-y-2.5">
              <h4 className={`eyebrow w-fit rounded px-1.5 py-0.5 ${PRIORITY_TONE[p].chip}`}>{t.labels[p]}</h4>
              <ul className="space-y-3">
                {items.map((a) => {
                  const i = byId.get(a.id)!;
                  return (
                    <li key={a.id} className="flex gap-3">
                      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${PRIORITY_TONE[p].rail}`} aria-hidden />
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">{i.title}</p>
                        <p className="text-sm text-ink-2">{i.when}</p>
                        {i.how && <p className="mt-1 text-[15px] leading-relaxed">{i.how}</p>}
                        {kept.has(a.id) && (
                          <p lang="en" className="mt-1 text-xs text-ink-3">
                            Kept in English: the translation changed a figure.
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn btn-ghost press" onClick={share}>
        <Share2 className="h-4 w-4" aria-hidden /> Send this on WhatsApp
      </button>
      <p className="text-xs leading-relaxed text-ink-3">
        Translated by AI from the English plan. Every figure is checked against the English; a job whose numbers changed stays in English. Ticked jobs are left out.
      </p>
    </div>
  );
}
