import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BellPlus, MessageCircle } from 'lucide-react';
import { googleCalendarUrl } from '../lib/calendar';
import type { Farm } from '../lib/types';
import { useNav, type Intent, type Tab } from '../lib/nav';
import { addRecord } from '../lib/records';
import { addDays, localToday, relativeDay } from '../lib/dates';
import { NumberInput } from './ui';
import { Bug, ChevronDown, CloudRain, Droplets, Leaf, Shovel, Sprout, SprayCan, Thermometer, Tractor, Wheat } from 'lucide-react';
import type { ActionKind, PlanAction } from '../lib/types';
import { SourceTag } from './ui';

const ICON: Record<ActionKind, typeof Leaf> = {
  fertilizer: Sprout,
  weed: Shovel,
  scout: Bug,
  spray: SprayCan,
  water: Droplets,
  harvest: Wheat,
  drainage: CloudRain,
  soil: Tractor,
  plant: Leaf,
  other: Thermometer,
};

const TONE = {
  now: { rail: 'bg-clay', chip: 'bg-clay-soft text-clay', label: 'Do now' },
  week: { rail: 'bg-sun', chip: 'bg-sun-soft text-sun', label: 'This week' },
  watch: { rail: 'bg-rain', chip: 'bg-rain-soft text-rain', label: 'Keep an eye on' },
};

/** The tool that helps with this job, so the card leads somewhere useful. */
function nextStep(a: PlanAction): { label: string; tab: Tab; intent?: Intent } | null {
  if (a.id === 'irrigate') return { label: 'Log it once you have irrigated', tab: 'field', intent: { scrollTo: 'water-log' } };
  if (a.id === 'onset' || a.kind === 'plant') return { label: 'What to buy before planting', tab: 'money', intent: { money: 'shop' } };
  switch (a.kind) {
    case 'fertilizer': return { label: 'See what to buy', tab: 'money', intent: { money: 'shop' } };
    case 'spray': return { label: 'Mix calculator', tab: 'weather', intent: { scrollTo: 'mix' } };
    case 'scout': return { label: 'Check a photo of what you find', tab: 'ask', intent: { askMode: 'photo' } };
    case 'water': return { label: 'Water in the root zone', tab: 'field', intent: { scrollTo: 'water' } };
    case 'harvest': return { label: 'Drying check & when to sell', tab: 'money', intent: { money: 'store' } };
    case 'soil': return { label: 'Soil details', tab: 'field', intent: { scrollTo: 'soil' } };
    case 'drainage': return { label: '8-day forecast', tab: 'weather', intent: { scrollTo: 'forecast' } };
    default: return null;
  }
}

/** Jobs that cost money (or produce a harvest) are worth one tap to record when ticked off. */
const LOG: Partial<Record<ActionKind, { ask: string; category?: string; harvest?: boolean }>> = {
  fertilizer: { ask: 'What did the fertilizer and application cost?', category: 'fert' },
  spray: { ask: 'What did the chemical and spraying cost?', category: 'chem' },
  weed: { ask: 'What did the weeding cost (labour or herbicide)?', category: 'labour' },
  soil: { ask: 'What did the lime and spreading cost?', category: 'other' },
  harvest: { ask: 'How many 100 kg bags did you harvest?', harvest: true },
};

export function ActionCard({ action, done, onToggle, defaultOpen = false, farm, offsetSec = 3600 }: { action: PlanAction; done: boolean; onToggle?: () => void; defaultOpen?: boolean; farm?: Farm; offsetSec?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  const nav = useNav();
  const step = nextStep(action);
  // A 7 am reminder for today has usually passed already: due-now jobs remind tomorrow morning.
  const remindOn = action.date ? (action.date > localToday() ? action.date : addDays(localToday(), 1)) : null;
  const log = farm && action.checkable ? LOG[action.kind] : undefined;
  const [logging, setLogging] = useState<'ask' | 'saved' | null>(null);
  const [amount, setAmount] = useState(0);
  const card = useRef<HTMLElement>(null);
  // Finished jobs move to the bottom of their group; keep this card in view while asking about the cost.
  useEffect(() => {
    if (logging !== 'ask') return;
    const t = setTimeout(() => card.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    return () => clearTimeout(t);
  }, [logging]);
  const toggle = () => {
    if (!done) setOpen(false); // finished: fold the details away
    if (!done && log) setLogging('ask');
    if (done) setLogging(null);
    onToggle?.();
  };
  const saveLog = () => {
    if (!farm || !log || !(amount > 0)) return;
    if (log.harvest) addRecord(farm, { date: localToday(), kind: 'harvest', label: action.title, kg: Math.round(amount * 100) });
    else addRecord(farm, { date: localToday(), kind: 'expense', category: log.category, label: action.title, amount });
    setLogging('saved');
    setAmount(0);
  };
  const Icon = ICON[action.kind];
  const tone = TONE[action.priority];

  return (
    <article ref={card} className={`card press lift relative overflow-hidden ${done && logging !== 'ask' ? 'opacity-60' : ''}`} style={{ transition: 'opacity 300ms ease, transform 160ms var(--ease-out), box-shadow 200ms ease' }}>
      <div className={`absolute inset-y-0 left-0 w-1 origin-top transition-colors duration-300 ${done ? 'bg-line' : tone.rail}`} aria-hidden />
      <div className="flex items-start gap-3 py-3.5 pl-4 pr-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${open ? 'bg-ink text-paper' : 'bg-paper text-ink-2'}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </div>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <h3 className="relative w-fit font-bold leading-snug">
            {action.title}
            <span
              className="absolute left-0 top-1/2 h-[1.5px] w-full origin-left bg-ink-3 transition-transform duration-500"
              style={{ transform: done ? 'scaleX(1)' : 'scaleX(0)', transitionTimingFunction: 'var(--ease-out)' }}
              aria-hidden
            />
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
            <span className={action.overdue ? 'font-medium text-clay' : ''}>{action.when}</span>
            <ChevronDown className={`h-4 w-4 text-ink-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden />
          </p>
        </button>
        {action.checkable && onToggle && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={done}
            aria-label={done ? `Mark "${action.title}" as not done` : `Mark "${action.title}" as done`}
            className={`relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${done ? 'border-leaf bg-leaf text-white' : 'border-line text-transparent hover:border-leaf'}`}
          >
            {done && <span key="ripple" className="absolute inset-0 rounded-full bg-leaf [animation:ripple_600ms_var(--ease-out)_forwards]" aria-hidden />}
            <svg viewBox="0 0 24 24" className={`relative h-5 w-5 ${done ? '[animation:pop_420ms_var(--ease-spring)]' : ''}`} aria-hidden>
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={done ? 0 : 1}
                style={{ transition: 'stroke-dashoffset 380ms var(--ease-out) 60ms' }}
              />
            </svg>
          </button>
        )}
      </div>
      {done && logging === 'ask' && log && (
        <form
          className="flex flex-wrap items-center gap-2 border-t border-line-2 bg-leaf-soft/40 py-3 pl-[68px] pr-4 text-sm [animation:rise_300ms_var(--ease-out)]"
          onSubmit={(e) => { e.preventDefault(); saveLog(); }}
          aria-label={`Record ${action.title}`}
        >
          <span className="w-full text-ink-2">Done. {log.ask}</span>
          <span className="relative">
            {!log.harvest && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">₦</span>}
            <NumberInput aria-label={log.harvest ? 'Bags harvested' : 'Amount spent'} className={`field num w-36 py-1.5 ${log.harvest ? '' : 'pl-7'}`} grouped={!log.harvest} value={amount} onChange={setAmount} />
          </span>
          {log.harvest && <span className="text-ink-3">bags</span>}
          <button type="submit" className="btn btn-primary px-3 py-1.5 text-sm" disabled={!(amount > 0)}>Save to records</button>
          <button type="button" className="btn px-2 py-1.5 text-sm text-ink-3 hover:text-ink" onClick={() => setLogging(null)}>Skip</button>
        </form>
      )}
      {done && logging === 'saved' && (
        <p className="flex flex-wrap items-center gap-2 border-t border-line-2 bg-leaf-soft/40 py-2.5 pl-[68px] pr-4 text-sm [animation:fade_300ms_ease]" role="status">
          Saved to your record book.
          <button type="button" className="font-medium text-leaf underline-offset-2 hover:underline" onClick={() => nav.go('money', { money: 'records' })}>Open it</button>
        </p>
      )}
      <div className="expand" data-open={open}>
        <div>
          <div className="space-y-3 border-t border-line-2 py-3.5 pl-[68px] pr-4 text-[15px] leading-relaxed" inert={!open}>
            <ul className="space-y-1.5 text-ink-2">
              {action.why.map((w, i) => (
                <li key={i} className="relative pl-3.5 before:absolute before:left-0 before:top-[0.6em] before:h-1 before:w-1 before:rounded-full before:bg-ink-3">
                  {w}
                </li>
              ))}
            </ul>
            {action.how && (
              <p className="rounded-lg bg-paper px-3 py-2 text-ink">
                <span className="eyebrow mr-2 text-ink-2">How</span>
                {action.how}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {step && (
                <button type="button" className="btn btn-ghost press px-3 py-1.5 text-sm" onClick={() => nav.go(step.tab, step.intent)}>
                  {step.label} <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                className="btn press px-3 py-1.5 text-sm text-leaf hover:bg-leaf-soft"
                onClick={() => nav.go('ask', { ask: `About "${action.title}" (${action.when}): what exactly should I do on my farm, and what should I watch out for?` })}
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> Ask about this
              </button>
              {remindOn && farm && !done && (
                <a
                  className="btn press px-3 py-1.5 text-sm text-ink-2 hover:bg-paper hover:text-ink"
                  href={googleCalendarUrl({ date: remindOn, title: `${action.title} — ${farm.name}`, description: `${action.how ?? ''}\n\n${action.why.join('\n')}\n\nFrom Nexus Agri.` }, offsetSec)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BellPlus className="h-4 w-4" aria-hidden /> Remind me {relativeDay(remindOn, localToday())}
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {action.sources.map((src) => (
                <SourceTag key={src}>{src}</SourceTag>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export { TONE as PRIORITY_TONE };
