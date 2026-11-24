/**
 * Jobs the app cannot work out for itself — "fix the fence", "pay the
 * labourers", "buy feed on market day" — with an optional repeat.
 */
import { addDays } from './dates';

export type Repeat = 'daily' | 'weekly' | 'monthly';

export interface OwnTask {
  id: string;
  title: string;
  /** Next day it is due, YYYY-MM-DD. */
  due: string;
  repeat?: Repeat;
  fieldId?: string;
  groupId?: string;
  note?: string;
  /** Set when a one-off task is finished. */
  doneOn?: string;
  /** Last time a repeating task was ticked. */
  lastDone?: string;
  createdAt: string;
}

export const TASKS_KEY = 'na:tasks';

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Same day next month, or the month's last day if it is shorter (31 Jan → 28/29 Feb). */
export function addMonth(date: string, dayOfMonth = Number(date.slice(8, 10))): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)); // 1–12; as a 0-based index it already points at next month
  const ny = m === 12 ? y + 1 : y;
  const nm = m % 12;
  const d = Math.min(dayOfMonth, daysInMonth(ny, nm));
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const step = (date: string, repeat: Repeat, dom: number) => (repeat === 'daily' ? addDays(date, 1) : repeat === 'weekly' ? addDays(date, 7) : addMonth(date, dom));

/**
 * Ticks a task off on `today`. A repeating task moves to its next due date
 * after today (missed repeats are not stacked up); a one-off is marked done.
 */
export function completeTask(t: OwnTask, today: string): OwnTask {
  if (!t.repeat) return { ...t, doneOn: today };
  const dom = Number(t.due.slice(8, 10));
  let next = step(t.due, t.repeat, dom);
  while (next <= today) next = step(next, t.repeat, dom);
  return { ...t, due: next, lastDone: today };
}

export const isOpen = (t: OwnTask) => !t.doneOn;

/** Keeps finished one-off tasks for a week, so a mistaken tick can be undone. */
export const pruneTasks = (tasks: OwnTask[], today: string) => tasks.filter((t) => !t.doneOn || t.doneOn >= addDays(today, -7));
