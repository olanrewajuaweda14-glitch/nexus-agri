/**
 * The farm's last seven days, for the farmer, a cooperative or the relative
 * who helps pay for the farm: eggs, animals, money, rain and where each crop
 * is. Built only from what was recorded; anything not recorded is left out
 * rather than shown as zero.
 */
import { addDays, shortDate } from './dates';
import { headCount, SPECIES, type AnimalEvent, type AnimalGroup } from './livestock';
import type { FarmMoney } from './ledger';
import { naira } from './format';

export interface WeekReport {
  from: string;
  to: string;
  farmName: string | null;
  eggs: { total: number; rate: number | null; prevRate: number | null } | null;
  animals: { name: string; head: string }[];
  losses: number;
  sold: number;
  added: number;
  healthDone: number;
  money: { in: number; out: number; net: number };
  rainMm: number | null;
  fields: { name: string; line: string }[];
}

function eggTotals(groups: AnimalGroup[], events: Record<string, AnimalEvent[]>, from: string, to: string) {
  let eggs = 0;
  let henDays = 0;
  let logged = 0;
  for (const g of groups) {
    if (!SPECIES[g.species].eggs) continue;
    for (const e of events[g.id] ?? []) {
      if (e.kind !== 'eggs' || e.count == null || e.date < from || e.date > to) continue;
      eggs += e.count;
      henDays += headCount(g, events[g.id] ?? [], e.date);
      logged++;
    }
  }
  return { eggs, rate: henDays > 0 ? eggs / henDays : null, logged };
}

export function weekReport(opts: {
  today: string;
  farmName?: string | null;
  groups: AnimalGroup[];
  events: Record<string, AnimalEvent[]>;
  money: FarmMoney;
  rainMm: number | null;
  fields: { name: string; line: string }[];
}): WeekReport {
  const to = opts.today;
  const from = addDays(to, -6);
  const open = opts.groups.filter((g) => !g.closed);
  const now = eggTotals(open, opts.events, from, to);
  const before = eggTotals(open, opts.events, addDays(from, -7), addDays(from, -1));

  let losses = 0;
  let sold = 0;
  let added = 0;
  let healthDone = 0;
  for (const g of open) {
    for (const e of opts.events[g.id] ?? []) {
      if (e.date < from || e.date > to) continue;
      if (e.kind === 'died') losses += e.count ?? 0;
      else if (e.kind === 'sold') sold += e.count ?? 0;
      else if (e.kind === 'added') added += e.count ?? 0;
      else if (e.kind === 'health') healthDone++;
    }
  }

  return {
    from,
    to,
    farmName: opts.farmName ?? null,
    eggs: now.logged ? { total: now.eggs, rate: now.rate, prevRate: before.logged ? before.rate : null } : null,
    animals: open.map((g) => {
      const n = headCount(g, opts.events[g.id] ?? [], to);
      const sp = SPECIES[g.species];
      return { name: g.name, head: `${n.toLocaleString('en-NG')} ${n === 1 ? sp.one : sp.many}` };
    }),
    losses,
    sold,
    added,
    healthDone,
    money: { in: opts.money.in, out: opts.money.out, net: opts.money.net },
    rainMm: opts.rainMm,
    fields: opts.fields,
  };
}

export const weekLabel = (r: WeekReport) => `${shortDate(r.from)} to ${shortDate(r.to)}`;

export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** "up from 84%", "down from 91%" or "same as the week before", compared as whole percentages. */
export function eggTrend(r: WeekReport): string | null {
  if (r.eggs?.rate == null || r.eggs.prevRate == null) return null;
  const now = Math.round(r.eggs.rate * 100);
  const then = Math.round(r.eggs.prevRate * 100);
  return now === then ? 'same as the week before' : `${now > then ? 'up' : 'down'} from ${then}%`;
}

/** Plain text for WhatsApp: one line per thing, marked so it can be scanned. */
export function reportText(r: WeekReport): string {
  const lines = [`*${r.farmName ?? 'My farm'}*: the week of ${weekLabel(r)}`, ''];
  if (r.eggs) {
    const parts: string[] = [];
    if (r.eggs.rate != null) parts.push(`${pct(r.eggs.rate)} laying`);
    const trend = eggTrend(r);
    if (trend) parts.push(trend);
    lines.push(`🥚 Eggs: ${r.eggs.total.toLocaleString('en-NG')}${parts.length ? ` (${parts.join(', ')})` : ''}`);
  }
  if (r.animals.length) {
    const moves = [r.losses && `${r.losses} lost`, r.sold && `${r.sold} sold`, r.added && `${r.added} added`].filter(Boolean).join(', ');
    lines.push(`🐾 Animals: ${r.animals.map((a) => `${a.head} (${a.name})`).join(', ')}${moves ? `. This week: ${moves}` : ''}`);
  }
  if (r.healthDone) lines.push(`💉 Health work done: ${r.healthDone}`);
  if (r.money.in || r.money.out) lines.push(`💰 Money: in ${naira(r.money.in)}, out ${naira(r.money.out)}, ${r.money.net >= 0 ? 'ahead' : 'behind'} ${naira(Math.abs(r.money.net))}`);
  if (r.rainMm != null) lines.push(`🌧️ Rain: ${Math.round(r.rainMm)} mm`);
  for (const f of r.fields) lines.push(`🌱 ${f.name}: ${f.line}`);
  lines.push('', 'From Nexus Agri');
  return lines.join('\n');
}
