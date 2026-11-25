import { describe, expect, it } from 'vitest';
import { addDays } from '../src/lib/dates';
import { activeAlerts, badgeCount, buildAgenda, buildAlerts, pruneDismissed, type FieldView, type GroupView } from '../src/lib/agenda';
import { balance, isLow, qtyText, unitText, type StockItem, type StockMove } from '../src/lib/stock';
import { addMonth, completeTask, pruneTasks, type OwnTask } from '../src/lib/tasks';
import { scaledCrop } from '../src/lib/crops';
import type { Farm, PlanAction } from '../src/lib/types';
import type { AnimalEvent, AnimalGroup } from '../src/lib/livestock';

const today = '2026-11-24';

describe('store', () => {
  const moves: StockMove[] = [
    { id: 'm1', itemId: 'u', date: '2026-11-01', kind: 'in', qty: 6, amount: 180000 },
    { id: 'm2', itemId: 'u', date: '2026-11-10', kind: 'out', qty: 2.25 },
    { id: 'm3', itemId: 'u', date: '2026-11-12', kind: 'count', qty: 3 },
    { id: 'm4', itemId: 'u', date: '2026-11-20', kind: 'out', qty: 1 },
    { id: 'm5', itemId: 'other', date: '2026-11-20', kind: 'in', qty: 99 },
  ];
  it('keeps a running balance, with a stock-take resetting it', () => {
    expect(balance('u', moves, '2026-11-11')).toBe(3.75);
    expect(balance('u', moves)).toBe(2);
    expect(balance('nothing', moves)).toBe(0);
  });
  it('writes quantities the way bags are counted', () => {
    expect(qtyText(5.25)).toBe('5¼');
    expect(qtyText(0.5)).toBe('½');
    expect(qtyText(3)).toBe('3');
    expect(qtyText(2.999)).toBe('3');
    expect(unitText('bag50', 1)).toBe('bag (50 kg)');
    expect(unitText('bag50', 2)).toBe('bags (50 kg)');
  });
  it('warns at or below the low-stock level', () => {
    const item: StockItem = { id: 'u', name: 'Urea', category: 'fertilizer', unit: 'bag50', lowAt: 2, createdAt: '' };
    expect(isLow(item, 2)).toBe(true);
    expect(isLow(item, 2.5)).toBe(false);
    expect(isLow({ ...item, lowAt: undefined }, 0)).toBe(false);
  });
});

describe('own tasks', () => {
  const base: OwnTask = { id: 't', title: 'Pay labourers', due: '2026-11-20', createdAt: '' };
  it('moves a repeating task past today instead of stacking missed repeats', () => {
    expect(completeTask({ ...base, repeat: 'weekly' }, today)).toMatchObject({ due: '2026-11-27', lastDone: today });
    expect(completeTask({ ...base, repeat: 'daily' }, today).due).toBe('2026-11-25');
    // 31 Oct → 30 Nov (November is short), which is already after today.
    expect(completeTask({ ...base, due: '2026-10-31', repeat: 'monthly' }, today).due).toBe('2026-11-30');
    expect(completeTask({ ...base, due: '2026-09-15', repeat: 'monthly' }, today).due).toBe('2026-12-15');
  });
  it('keeps the day of the month through short months', () => {
    expect(addMonth('2026-01-31')).toBe('2026-02-28');
    expect(addMonth('2026-02-28', 31)).toBe('2026-03-31');
    expect(addMonth('2026-12-15')).toBe('2027-01-15');
  });
  it('marks one-offs done and forgets them after a week', () => {
    const done = completeTask(base, today);
    expect(done.doneOn).toBe(today);
    expect(pruneTasks([done], addDays(today, 7))).toHaveLength(1);
    expect(pruneTasks([done], addDays(today, 8))).toHaveLength(0);
  });
});

const farm: Farm = { id: 'f1', name: 'Back plot', lat: 7.4, lng: 3.9, crop: 'maize', plantingDate: addDays(today, -38), maturity: 'medium', sizeHa: 2, water: 'rainfed', createdAt: '2026-10-01T00:00:00Z' };
const act = (a: Partial<PlanAction> & Pick<PlanAction, 'id'>): PlanAction => ({ kind: 'other', priority: 'week', title: a.id, when: 'this week', why: ['because'], sources: [], checkable: true, ...a });
const field = (plan: PlanAction[]): FieldView => ({ farm, plan, today, crop: scaledCrop('maize', 'medium'), forecast: null });

describe('agenda', () => {
  it('merges crop jobs, animal health and own tasks in order of urgency', () => {
    const g: AnimalGroup = { id: 'g', species: 'broiler', name: 'Broilers', startDate: addDays(today, -10), ageAtStart: 0, startCount: 100, createdAt: '' };
    const items = buildAgenda({
      fields: [field([act({ id: 'weed1', overdue: true, priority: 'now' }), act({ id: 'topdress', date: today, priority: 'now' }), act({ id: 'heat', checkable: false })])],
      groups: [{ group: g, events: [] }],
      tasks: [{ id: 'own', title: 'Fix fence', due: addDays(today, 3), createdAt: '' }, { id: 'far', title: 'Far away', due: addDays(today, 90), createdAt: '' }],
      done: new Set(),
      today,
    });
    expect(items.map((i) => `${i.when}:${i.source}:${i.title}`)).toEqual([
      'overdue:crop:weed1',
      // Within a group, the job whose window opened first comes first.
      'today:animal:Newcastle (La Sota) in drinking water',
      'today:crop:topdress',
      'week:animal:Gumboro (IBD) in drinking water',
      'week:own:Fix fence',
      'week:animal:Coccidiosis check',
      'later:animal:Gumboro (IBD) booster',
      'later:animal:Newcastle (La Sota) booster',
    ]);
    // 90 days away is beyond the 30-day horizon.
    expect(items.some((i) => i.title === 'Far away')).toBe(false);
  });
  it('leaves out ticked crop jobs and finished own tasks', () => {
    const items = buildAgenda({
      fields: [field([act({ id: 'topdress' })])],
      groups: [],
      tasks: [{ id: 'x', title: 'Done thing', due: today, doneOn: today, createdAt: '' }],
      done: new Set(['f1:2026-10-17:topdress']),
      today,
    });
    expect(items).toEqual([]);
  });
});

describe('alerts', () => {
  const layers: AnimalGroup = { id: 'L', species: 'layer', name: 'Layers', startDate: addDays(today, -60), ageAtStart: 200, startCount: 100, createdAt: '' };
  const eggs = (perDay: (d: number) => number): AnimalEvent[] => Array.from({ length: 14 }, (_, i) => ({ id: `x${i}`, date: addDays(today, -13 + i), kind: 'eggs', count: perDay(13 - i) }));
  const base = { fields: [] as FieldView[], groups: [] as GroupView[], stock: [] as StockItem[], moves: [] as StockMove[], done: new Set<string>(), today, lastBackup: null, since: null };

  it('raises egg drops, deaths and withdrawal periods for a flock', () => {
    const events: AnimalEvent[] = [
      ...eggs((ago) => (ago >= 7 ? 88 : 60)),
      { id: 'd', date: today, kind: 'died', count: 4 },
      { id: 'h', date: addDays(today, -1), kind: 'health', product: 'Amprolium', eggDays: 5 },
      { id: 'w', date: addDays(today, -60), kind: 'health', stepId: 'worms' },
    ];
    const a = buildAlerts({ ...base, groups: [{ group: layers, events }] });
    const titles = a.map((x) => x.title);
    expect(titles).toContain('4 birds died this week');
    expect(titles.some((t) => /^Egg production down \d+% this week$/.test(t))).toBe(true);
    expect(titles).toContain('Withdrawal period: Amprolium');
    expect(a[0].severity).toBe('urgent');
    expect(badgeCount(a)).toBe(a.filter((x) => x.severity !== 'info').length);
  });

  it('flags a fertilizer job the store cannot cover, only for products it tracks', () => {
    const plan = [act({ id: 'topdress', kind: 'fertilizer', priority: 'now' })];
    const stock: StockItem[] = [{ id: 'u', name: 'Urea', category: 'fertilizer', unit: 'bag50', key: 'fert:urea', createdAt: '' }];
    const moves: StockMove[] = [{ id: 'm', itemId: 'u', date: today, kind: 'in', qty: 2 }];
    const a = buildAlerts({ ...base, fields: [field(plan)], stock, moves });
    const short = a.find((x) => x.id.startsWith('short:'))!;
    expect(short.title).toBe('Not enough Urea in the store');
    expect(short.detail).toBe('topdress needs 5¼ bags (50 kg); the store has 2.');
    expect(buildAlerts({ ...base, fields: [field(plan)] }).some((x) => x.id.startsWith('short:'))).toBe(false);
  });

  it('reminds about backups only once there is a week of real data', () => {
    expect(buildAlerts({ ...base, since: addDays(today, -3) }).some((x) => x.target.to === 'backup')).toBe(false);
    expect(buildAlerts({ ...base, since: addDays(today, -10) }).find((x) => x.target.to === 'backup')?.title).toBe('Your records are only on this phone');
    expect(buildAlerts({ ...base, since: addDays(today, -100), lastBackup: `${addDays(today, -5)}T08:00:00Z` }).some((x) => x.target.to === 'backup')).toBe(false);
    expect(buildAlerts({ ...base, since: addDays(today, -100), lastBackup: `${addDays(today, -40)}T08:00:00Z` }).find((x) => x.target.to === 'backup')?.title).toBe('Last backup was 40 days ago');
  });

  it('hides dismissed alerts and forgets old dismissals', () => {
    const a = buildAlerts({ ...base, since: addDays(today, -10) });
    expect(activeAlerts(a, { [a[0].id]: today })).toHaveLength(a.length - 1);
    expect(pruneDismissed({ old: addDays(today, -61), recent: addDays(today, -2) }, today)).toEqual({ recent: addDays(today, -2) });
  });
});
