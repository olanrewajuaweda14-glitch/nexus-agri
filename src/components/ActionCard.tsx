import { useState } from 'react';
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

export function ActionCard({ action, done, onToggle, defaultOpen = false }: { action: PlanAction; done: boolean; onToggle?: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = ICON[action.kind];
  const tone = TONE[action.priority];

  return (
    <article className={`card press lift relative overflow-hidden ${done ? 'opacity-60' : ''}`} style={{ transition: 'opacity 300ms ease, transform 160ms var(--ease-out), box-shadow 200ms ease' }}>
      <div className={`absolute inset-y-0 left-0 w-1 origin-top transition-colors duration-300 ${done ? 'bg-line' : tone.rail}`} aria-hidden />
      <div className="flex items-start gap-3 py-3.5 pl-4 pr-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${open ? 'bg-ink text-paper' : 'bg-paper text-ink-2'}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </div>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <h3 className="relative w-fit font-semibold leading-snug">
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
            onClick={onToggle}
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
      <div className="expand" data-open={open}>
        <div>
          <div className="space-y-3 border-t border-line-2 py-3.5 pl-[68px] pr-4 text-[15px] leading-relaxed" aria-hidden={!open}>
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
