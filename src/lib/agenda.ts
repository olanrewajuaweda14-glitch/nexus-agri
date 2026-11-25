/**
 * One list of everything that needs doing (crop jobs from every field, animal
 * health steps, the farmer's own tasks) and one list of everything that needs
 * attention (alerts), built from the same data the screens show.
 */
import type { CropDef } from './crops';
import type { Farm, PlanAction, Priority, WeatherBundle } from './types';
import { addDays, daysBetween, relativeDay, shortDate } from './dates';
import { key } from './engine/plan';
import { eggStats, healthSchedule, heatDays, lossRate, SPECIES, withdrawals, type AnimalEvent, type AnimalGroup, type SpeciesId } from './livestock';
import { balance, findByKey, isLow, qtyText, unitText, type StockItem, type StockMove } from './stock';
import type { OwnTask } from './tasks';

export interface FieldView {
  farm: Farm;
  plan: PlanAction[];
  today: string;
  crop: CropDef;
  forecast: WeatherBundle | null;
}

export interface GroupView {
  group: AnimalGroup;
  events: AnimalEvent[];
}

/* --------------------------------- Agenda --------------------------------- */

export type When = 'overdue' | 'today' | 'week' | 'later';

export interface AgendaItem {
  key: string;
  source: 'crop' | 'animal' | 'own';
  title: string;
  where: string;
  date: string;
  until?: string;
  when: When;
  detail?: string;
  priority?: Priority;
  fieldId?: string;
  actionId?: string;
  groupId?: string;
  species?: SpeciesId;
  stepId?: string;
  taskId?: string;
  checkWithVet?: boolean;
  repeat?: OwnTask['repeat'];
}

const ORDER: Record<When, number> = { overdue: 0, today: 1, week: 2, later: 3 };

const whenFor = (date: string, today: string): When => {
  const d = daysBetween(today, date);
  return d < 0 ? 'overdue' : d === 0 ? 'today' : d <= 7 ? 'week' : 'later';
};

export function buildAgenda(opts: { fields: FieldView[]; groups: GroupView[]; tasks: OwnTask[]; done: Set<string>; today: string; laterDays?: number }): AgendaItem[] {
  const { fields, groups, tasks, done, today, laterDays = 30 } = opts;
  const out: AgendaItem[] = [];

  for (const f of fields) {
    for (const a of f.plan) {
      if (!a.checkable || done.has(key(f.farm, a.id))) continue;
      const when: When = a.overdue ? 'overdue' : a.priority === 'now' ? 'today' : 'week';
      out.push({
        key: `crop:${f.farm.id}:${a.id}`, source: 'crop', title: a.title, where: f.farm.name,
        date: a.date ?? f.today, when, detail: a.when, priority: a.priority, fieldId: f.farm.id, actionId: a.id,
      });
    }
  }

  for (const { group, events } of groups) {
    if (group.closed) continue;
    for (const s of healthSchedule(group, events, today)) {
      if (s.status !== 'overdue' && s.status !== 'due' && s.status !== 'upcoming') continue;
      const when: When = s.status === 'overdue' ? 'overdue' : s.status === 'due' ? 'today' : whenFor(s.start, today);
      if (when === 'later' && daysBetween(today, s.start) > laterDays) continue;
      out.push({
        key: `animal:${group.id}:${s.step.id}:${s.start}`, source: 'animal', title: s.step.title, where: group.name,
        date: s.start, until: s.end, when, detail: s.step.how, groupId: group.id, species: group.species, stepId: s.step.id, checkWithVet: s.step.checkWithVet,
      });
    }
  }

  for (const t of tasks) {
    if (t.doneOn) continue;
    const when = whenFor(t.due, today);
    if (when === 'later' && daysBetween(today, t.due) > laterDays) continue;
    out.push({ key: `own:${t.id}`, source: 'own', title: t.title, where: '', date: t.due, when, detail: t.note, taskId: t.id, fieldId: t.fieldId, groupId: t.groupId, repeat: t.repeat });
  }

  return out.sort((a, b) => ORDER[a.when] - ORDER[b.when] || a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/* --------------------------------- Alerts --------------------------------- */

export type Severity = 'urgent' | 'warn' | 'info';

export type AlertTarget =
  | { to: 'field'; fieldId: string; tab: 'today' | 'field' | 'weather' }
  | { to: 'group'; groupId: string }
  | { to: 'store'; itemId?: string }
  | { to: 'backup' };

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  where?: string;
  target: AlertTarget;
}

/** Plan warnings that are worth an alert; "no irrigation needed" and the monthly rain note are not. */
const CROP_ALERT = /^(onset|irrigate|dry|heat|disease|heavy-)/;
const POULTRY = new Set(['broiler', 'layer']);
const SEV: Record<Severity, number> = { urgent: 0, warn: 1, info: 2 };

export function buildAlerts(opts: {
  fields: FieldView[];
  groups: GroupView[];
  stock: StockItem[];
  moves: StockMove[];
  done: Set<string>;
  today: string;
  lastBackup: string | null;
  /** Earliest day any of the farmer's own data was created. */
  since: string | null;
}): Alert[] {
  const { fields, groups, stock, moves, done, today } = opts;
  const out: Alert[] = [];

  for (const f of fields) {
    for (const a of f.plan) {
      if (!a.checkable && CROP_ALERT.test(a.id)) {
        out.push({
          id: `crop:${f.farm.id}:${a.id}:${today}`,
          severity: a.priority === 'now' ? 'urgent' : a.priority === 'week' ? 'warn' : 'info',
          title: a.title, detail: a.why[0] ?? a.when, where: f.farm.name,
          target: { to: 'field', fieldId: f.farm.id, tab: a.kind === 'water' ? 'field' : 'today' },
        });
      } else if (a.checkable && a.overdue && !done.has(key(f.farm, a.id))) {
        out.push({ id: `late:${f.farm.id}:${a.id}`, severity: 'warn', title: `Overdue: ${a.title}`, detail: a.why[0] ?? '', where: f.farm.name, target: { to: 'field', fieldId: f.farm.id, tab: 'today' } });
      }
    }

    // Fertilizer jobs coming up that the store can't cover (only for products the store keeps track of).
    for (const a of f.plan) {
      if (a.kind !== 'fertilizer' || !a.checkable || done.has(key(f.farm, a.id))) continue;
      const dose = f.crop.tasks.find((t) => t.id === a.id)?.dose;
      const item = dose && findByKey(stock, `fert:${dose.product}`);
      if (!dose || !item) continue;
      const needBags = Math.ceil(((dose.kgPerHa * f.farm.sizeHa) / 50) * 4) / 4;
      const have = balance(item.id, moves);
      if (have + 1e-9 < needBags) {
        out.push({
          id: `short:${f.farm.id}:${a.id}:${have}`, severity: 'warn', title: `Not enough ${item.name} in the store`,
          detail: `${a.title} needs ${qtyText(needBags)} ${unitText('bag50', needBags)}; the store has ${qtyText(have)}.`, where: f.farm.name,
          target: { to: 'store', itemId: item.id },
        });
      }
    }
  }

  const fieldById = new Map(fields.map((f) => [f.farm.id, f]));
  for (const { group, events } of groups) {
    if (group.closed) continue;
    const sp = SPECIES[group.species];
    const target: AlertTarget = { to: 'group', groupId: group.id };

    for (const s of healthSchedule(group, events, today)) {
      if (s.status === 'overdue') {
        out.push({
          id: `health:${group.id}:${s.step.id}:${s.start}`, severity: s.step.kind === 'vaccine' ? 'urgent' : 'warn',
          title: `Overdue: ${s.step.title}`, detail: `Was due by ${shortDate(s.end)}.${s.step.checkWithVet ? ' Timing varies by product — check with your vet.' : ''}`, where: group.name, target,
        });
      } else if (s.status === 'due') {
        out.push({ id: `health:${group.id}:${s.step.id}:${s.start}`, severity: 'warn', title: s.step.title, detail: `Due now, by ${relativeDay(s.end, today)}.`, where: group.name, target });
      } else if (s.status === 'missed') {
        out.push({ id: `missed:${group.id}:${s.step.id}`, severity: 'info', title: `Missed: ${s.step.title}`, detail: 'Too late for the usual schedule. Ask your vet whether to give it now.', where: group.name, target });
      }
    }

    const week = lossRate(group, events, today, 7);
    const day = lossRate(group, events, today, 1);
    if (week.deaths > 0) {
      const poultry = POULTRY.has(group.species);
      const fish = group.species === 'catfish';
      const spike = poultry ? week.rate >= 0.03 || (day.deaths >= 2 && day.rate >= 0.01) : fish ? week.rate >= 0.05 : true;
      if (spike) {
        out.push({
          id: `loss:${group.id}:${today}:${week.deaths}`, severity: poultry || fish || week.deaths >= 2 ? 'urgent' : 'warn',
          title: `${week.deaths} ${week.deaths === 1 ? sp.one : sp.many} died this week`,
          detail: `${Math.round(week.rate * 1000) / 10}% of the ${sp.group}. Separate sick animals, keep visitors out and call a vet if more fall sick.`,
          where: group.name, target,
        });
      }
    }

    if (sp.eggs) {
      const e = eggStats(group, events, today);
      if (e.rate7 != null && e.ratePrev7 != null && e.ratePrev7 > 0.2) {
        const drop = 1 - e.rate7 / e.ratePrev7;
        if (drop >= 0.1) {
          out.push({
            id: `eggs:${group.id}:${today}`, severity: drop >= 0.25 ? 'urgent' : 'warn',
            title: `Egg production down ${Math.round(drop * 100)}% this week`,
            detail: 'Check water, feed and heat first, then look for sick birds. A sudden drop can be the first sign of Newcastle disease.', where: group.name, target,
          });
        }
      }
    }

    const fv = group.fieldId ? fieldById.get(group.fieldId) : fields[0];
    const hot = heatDays(group, fv?.forecast?.daily ?? null, today);
    if (hot.length) {
      const peak = Math.max(...hot.map((h) => h.tMax));
      out.push({
        id: `heat:${group.id}:${hot[0].date}`, severity: 'warn',
        title: `Heat stress risk: up to ${Math.round(peak)} °C`,
        detail: sp.heatAdvice ?? '', where: group.name, target,
      });
    }

    for (const w of withdrawals(events, today)) {
      const parts = [w.meatUntil && `meat until ${shortDate(w.meatUntil)}`, w.eggsUntil && `eggs until ${shortDate(w.eggsUntil)}`].filter(Boolean).join(', or ');
      out.push({
        id: `wd:${group.id}:${w.event.id}`, severity: 'info',
        title: `Withdrawal period: ${w.event.product || 'treatment'}`,
        detail: `Do not sell or eat ${parts}.`, where: group.name, target,
      });
    }
  }

  for (const item of stock) {
    const have = balance(item.id, moves);
    if (isLow(item, have)) {
      out.push({ id: `low:${item.id}:${have}`, severity: 'warn', title: `Running low: ${item.name}`, detail: `${qtyText(have)} ${unitText(item.unit, have)} left.`, target: { to: 'store', itemId: item.id } });
    }
  }

  if (opts.since && daysBetween(opts.since, today) >= 7) {
    const age = opts.lastBackup ? daysBetween(opts.lastBackup.slice(0, 10), today) : null;
    if (age == null || age >= 30) {
      out.push({
        id: `backup:${opts.lastBackup ?? 'never'}:${Math.floor(daysBetween('2020-01-01', today) / 30)}`, severity: 'info',
        title: age == null ? 'Your records are only on this phone' : `Last backup was ${age} days ago`,
        detail: 'If this phone is lost or broken, they are gone. Save a backup to WhatsApp or Google Drive.', target: { to: 'backup' },
      });
    }
  }

  return out.sort((a, b) => SEV[a.severity] - SEV[b.severity]);
}

/** Alerts the farmer has dismissed, by id, with the day they did it. */
export const DISMISSED_KEY = 'na:alerts-dismissed';

export const activeAlerts = (alerts: Alert[], dismissed: Record<string, string>) => alerts.filter((a) => !dismissed[a.id]);

/** Drops dismissals older than 60 days so the record doesn't grow forever. */
export const pruneDismissed = (d: Record<string, string>, today: string) =>
  Object.fromEntries(Object.entries(d).filter(([, day]) => day >= addDays(today, -60)));

export const badgeCount = (alerts: Alert[]) => alerts.filter((a) => a.severity !== 'info').length;
