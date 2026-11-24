import { useEffect, useState } from 'react';
import { Check, ChevronRight, ListChecks, Sprout, Trash2, Undo2 } from 'lucide-react';
import { SpeciesIcon } from './SpeciesIcon';
import type { AgendaItem } from '../lib/agenda';
import type { Farm } from '../lib/types';
import { key } from '../lib/engine/plan';
import { localToday, relativeDay, shortDate } from '../lib/dates';
import { useHub } from '../lib/hub';
import { useNav } from '../lib/nav';
import type { OwnTask } from '../lib/tasks';

const REPEAT_TEXT = { daily: 'every day', weekly: 'every week', monthly: 'every month' } as const;

export function whenText(item: AgendaItem, today = localToday()): string {
  if (item.source === 'crop') return item.detail ? item.detail.charAt(0).toUpperCase() + item.detail.slice(1) : relativeDay(item.date, today);
  if (item.source === 'animal') {
    if (item.when === 'overdue') return `Overdue, was due by ${shortDate(item.until ?? item.date)}`;
    if (item.when === 'today') return item.until && item.until !== today ? `Due now, by ${relativeDay(item.until, today)}` : 'Due today';
    return `From ${relativeDay(item.date, today)}`;
  }
  const rel = relativeDay(item.date, today);
  const base = item.when === 'overdue' ? `Overdue, was due ${shortDate(item.date)}` : rel.charAt(0).toUpperCase() + rel.slice(1);
  return item.repeat ? `${base}, ${REPEAT_TEXT[item.repeat]}` : base;
}


/**
 * A list of jobs from anywhere on the farm. The circle ticks a job off (and
 * the bar that appears can undo it); the rest of the row opens where the job
 * lives.
 */
export function AgendaList({ items, farms, done, toggleDone, empty, label }: {
  items: AgendaItem[];
  farms: Farm[];
  done: Set<string>;
  toggleDone: (k: string) => void;
  empty?: string;
  label: string;
}) {
  const hub = useHub();
  const nav = useNav();
  const [undo, setUndo] = useState<{ text: string; run: () => void } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  const tick = (it: AgendaItem) => {
    const today = localToday();
    if (it.source === 'crop') {
      const farm = farms.find((f) => f.id === it.fieldId);
      if (!farm || !it.actionId) return;
      const k = key(farm, it.actionId);
      if (done.has(k)) return;
      toggleDone(k);
      setUndo({ text: `Done: ${it.title}`, run: () => toggleDone(k) });
    } else if (it.source === 'animal' && it.groupId && it.stepId) {
      const e = hub.addEvent(it.groupId, { date: today, kind: 'health', stepId: it.stepId });
      const gid = it.groupId;
      setUndo({ text: `Done today: ${it.title}`, run: () => hub.deleteEvent(gid, e.id) });
    } else if (it.source === 'own' && it.taskId) {
      const before = hub.tasks.find((t) => t.id === it.taskId) as OwnTask;
      hub.tickTask(it.taskId);
      setUndo({ text: it.repeat ? `Done: ${it.title}. Next one is set.` : `Done: ${it.title}`, run: () => hub.saveTask(before) });
    }
  };

  const open = (it: AgendaItem) => {
    if (it.source === 'crop' && it.fieldId) nav.openField(it.fieldId, 'today');
    else if (it.source === 'animal' && it.groupId) nav.go('animals', { groupId: it.groupId });
    else if (it.groupId) nav.go('animals', { groupId: it.groupId });
    else if (it.fieldId) nav.openField(it.fieldId, 'today');
  };

  return (
    <div>
      {items.length === 0 ? (
        empty ? <p className="py-2 text-ink-2">{empty}</p> : null
      ) : (
        <ul className="divide-y divide-line-2 overflow-hidden rounded-xl border border-line bg-card" aria-label={label}>
          {items.map((it) => {
            const openable = it.source !== 'own' || !!it.groupId || !!it.fieldId;
            const late = it.when === 'overdue';
            return (
              <li key={it.key} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => tick(it)}
                  className="group flex w-14 shrink-0 items-center justify-center"
                  aria-label={`Mark "${it.title}" as done`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors group-hover:border-leaf group-hover:bg-leaf-soft ${late ? 'border-clay' : 'border-ink-3'}`}>
                    <Check className="h-4 w-4 text-leaf opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </span>
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-2 py-3 pr-2">
                  <button type="button" disabled={!openable} onClick={() => open(it)} className="min-w-0 flex-1 text-left disabled:cursor-default">
                    <span className="block font-bold leading-snug">{it.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[14px] text-ink-2">
                      <span className={late ? 'font-bold text-clay' : it.when === 'today' ? 'font-bold text-sun' : ''}>{whenText(it)}</span>
                      {it.where && (
                        <span className="inline-flex items-center gap-1 text-ink-3">
                          {it.source === 'animal' ? <SpeciesIcon species={it.species} className="h-3.5 w-3.5" /> : it.source === 'crop' ? <Sprout className="h-3.5 w-3.5" aria-hidden /> : <ListChecks className="h-3.5 w-3.5" aria-hidden />}
                          {it.where}
                        </span>
                      )}
                      {it.checkWithVet && <span className="text-ink-3">Timing varies; check with your vet</span>}
                    </span>
                  </button>
                  {it.source === 'own' && it.taskId ? (
                    <button type="button" onClick={() => hub.deleteTask(it.taskId!)} className="rounded-full p-2 text-ink-3 hover:bg-paper hover:text-clay" aria-label={`Delete "${it.title}"`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  ) : (
                    openable && <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {undo && (
        <div role="status" className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-forest px-4 py-3 text-forest-ink shadow-xl [animation:rise_240ms_var(--ease-out)_both] lg:bottom-6">
          <Check className="h-5 w-5 shrink-0 text-maize" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{undo.text}</span>
          <button
            type="button"
            onClick={() => {
              undo.run();
              setUndo(null);
            }}
            className="inline-flex items-center gap-1 font-bold text-maize"
          >
            <Undo2 className="h-4 w-4" aria-hidden /> Undo
          </button>
        </div>
      )}
    </div>
  );
}
