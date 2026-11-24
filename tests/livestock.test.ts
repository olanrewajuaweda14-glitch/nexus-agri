import { describe, expect, it } from 'vitest';
import { addDays } from '../src/lib/dates';
import {
  ageOn, ageText, catfishRation, eggStats, feedNeed, headCount, healthSchedule, heatDays, lossRate, money, SPECIES, withdrawals,
  type AnimalEvent, type AnimalGroup,
} from '../src/lib/livestock';

const today = '2026-11-24';
let n = 0;
const ev = (e: Omit<AnimalEvent, 'id'>): AnimalEvent => ({ id: `e${n++}`, ...e });
const group = (over: Partial<AnimalGroup> = {}): AnimalGroup => ({
  id: 'g1', species: 'layer', name: 'Pen A', startDate: addDays(today, -20), ageAtStart: 0, startCount: 200, createdAt: '2026-01-01', ...over,
});

describe('livestock: counting', () => {
  it('works out age from the age on arrival', () => {
    const g = group({ startDate: addDays(today, -10), ageAtStart: 126 });
    expect(ageOn(g, today)).toBe(136);
    expect(ageText(5)).toBe('5 days');
    expect(ageText(136)).toBe('19 weeks');
    expect(ageText(400)).toBe('13 months');
    expect(ageText(1100)).toBe('3 years');
  });

  it('keeps a running head count from additions, losses, sales and home use', () => {
    const g = group({ startCount: 100 });
    const events = [
      ev({ date: addDays(today, -5), kind: 'died', count: 3 }),
      ev({ date: addDays(today, -4), kind: 'added', count: 10, amount: 15000 }),
      ev({ date: addDays(today, -2), kind: 'sold', count: 20, amount: 120000 }),
      ev({ date: addDays(today, -1), kind: 'eaten', count: 2 }),
      ev({ date: addDays(today, 3), kind: 'died', count: 50 }), // future entry: not counted yet
    ];
    expect(headCount(g, events, today)).toBe(85);
    expect(headCount(g, events, addDays(today, -3))).toBe(107);
    expect(money(events)).toEqual({ spent: 15000, received: 120000, net: 105000 });
  });

  it('measures losses against the animals there at the start of the period', () => {
    const g = group({ startCount: 200 });
    const events = [ev({ date: addDays(today, -1), kind: 'died', count: 4 }), ev({ date: today, kind: 'died', count: 2 })];
    const week = lossRate(g, events, today, 7);
    expect(week.deaths).toBe(6);
    expect(week.rate).toBeCloseTo(0.03);
    expect(lossRate(g, events, today, 1)).toMatchObject({ deaths: 2 });
  });
});

describe('livestock: eggs', () => {
  it('gives lay rate per hen and compares this week with last', () => {
    const g = group({ startCount: 100, ageAtStart: 200 });
    const events: AnimalEvent[] = [];
    for (let d = 13; d >= 7; d--) events.push(ev({ date: addDays(today, -d), kind: 'eggs', count: 90 }));
    for (let d = 6; d >= 0; d--) events.push(ev({ date: addDays(today, -d), kind: 'eggs', count: 72 }));
    const s = eggStats(g, events, today);
    expect(s.ratePrev7).toBeCloseTo(0.9);
    expect(s.rate7).toBeCloseTo(0.72);
    expect(s.today).toBe(72);
    expect(s.days).toHaveLength(14);
  });

  it('needs at least three logged days before it gives a rate', () => {
    const g = group({ startCount: 100 });
    const s = eggStats(g, [ev({ date: today, kind: 'eggs', count: 80 }), ev({ date: addDays(today, -1), kind: 'eggs', count: 80 })], today);
    expect(s.rate7).toBeNull();
  });
});

describe('livestock: health schedule', () => {
  it('lays out chick vaccines by age and marks what is due', () => {
    const g = group({ species: 'broiler', startDate: addDays(today, -10), ageAtStart: 0 });
    const s = healthSchedule(g, [], today);
    const by = Object.fromEntries(s.map((x) => [x.step.id, x.status]));
    expect(by.nd1).toBe('due'); // day 7–14
    expect(by.ibd1).toBe('upcoming'); // day 12–16
    expect(by.hatchery).toBe('missed'); // day 0–1, past day 7 with no record
    expect(s[0].status).toBe('due'); // most pressing first
  });

  it('counts a repeat from the day it was actually done', () => {
    const g = group({ species: 'goat', startDate: addDays(today, -400), ageAtStart: 730 });
    const done = ev({ date: addDays(today, -100), kind: 'health', stepId: 'ppr' });
    const ppr = healthSchedule(g, [done], today).find((x) => x.step.id === 'ppr')!;
    expect(ppr.status).toBe('upcoming');
    expect(ppr.start).toBe(addDays(today, 265));
    expect(ppr.doneOn).toBe(done.date);
  });

  it('treats an unrecorded repeating vaccine as due on arrival, and one-off chick doses as the seller’s', () => {
    const g = group({ species: 'layer', startDate: today, ageAtStart: 126 });
    const s = healthSchedule(g, [], today);
    const by = Object.fromEntries(s.map((x) => [x.step.id, x]));
    expect(by.worms.status).toBe('due');
    expect(by.worms.start).toBe(today);
    expect(by.nd1.status).toBe('before');
    expect(by.kom2.status).toBe('due'); // booster window 112–126 days still open on arrival day
  });

  it('marks a late one-off vaccine as missed, not overdue forever', () => {
    const g = group({ species: 'pig', startDate: addDays(today, -20), ageAtStart: 0 });
    const iron = healthSchedule(g, [], today).find((x) => x.step.id === 'iron')!;
    expect(iron.status).toBe('missed');
  });

  it('stops a repeating step after its last age', () => {
    const g = group({ species: 'catfish', startDate: addDays(today, -200), ageAtStart: 28 });
    expect(healthSchedule(g, [], today).some((x) => x.step.id === 'sort')).toBe(false);
  });

  it('only cites NVRI where the timing really comes from it, and flags the rest for the vet', () => {
    for (const sp of Object.values(SPECIES)) {
      for (const step of sp.health) {
        expect(step.fromDay).toBeLessThanOrEqual(step.toDay);
        if (step.source.includes('confirm with your vet')) expect(step.checkWithVet || step.kind === 'check' || step.kind === 'care').toBe(true);
      }
    }
    expect(SPECIES.goat.health.find((s) => s.id === 'ppr')!.source).toMatch(/NVRI/);
  });
});

describe('livestock: medicine, feed and heat', () => {
  it('tracks withdrawal periods copied from the label', () => {
    const t = ev({ date: addDays(today, -3), kind: 'health', product: 'Oxytetracycline', meatDays: 7, eggDays: 2 });
    const w = withdrawals([t], today);
    expect(w).toHaveLength(1);
    expect(w[0].meatUntil).toBe(addDays(today, 4));
    expect(w[0].eggsUntil).toBeNull(); // egg withdrawal already over
    expect(withdrawals([t], addDays(today, 4))).toHaveLength(0);
  });

  it('works out a week of feed for the flock in 25 kg bags', () => {
    const g = group({ species: 'broiler', startDate: addDays(today, -21), ageAtStart: 0, startCount: 100 });
    const f = feedNeed(g, [], today)!;
    expect(f.feed).toBe('Broiler starter');
    expect(f.gPerDay).toBe(135); // week 4
    expect(f.kgTotal).toBeCloseTo(94.5);
    expect(f.bags25).toBeCloseTo(3.78, 2);
    const layers = feedNeed(group({ ageAtStart: 200, startCount: 300 }), [], today)!;
    expect(layers.feed).toBe('Layer mash');
    expect(layers.kgPerDay).toBeCloseTo(34.5);
  });

  it('feeds catfish by their weighed average, and asks for a weight first', () => {
    const g = group({ species: 'catfish', ageAtStart: 28, startCount: 1000 });
    expect(feedNeed(g, [], today)).toBeNull();
    const f = feedNeed(g, [ev({ date: today, kind: 'weight', kg: 0.05 })], today)!;
    expect(catfishRation(50)).toEqual({ rate: 0.035, pelletMm: '3' });
    expect(f.kgPerDay).toBeCloseTo(1.75);
    expect(f.feed).toBe('3 mm floating pellets');
  });

  it('flags forecast days hot enough to stress the animals', () => {
    const daily = { time: [today, addDays(today, 1), addDays(today, 2), addDays(today, 3)], tMax: [33, 35.5, null, 40] };
    expect(heatDays(group({ species: 'layer' }), daily, today)).toEqual([{ date: addDays(today, 1), tMax: 35.5 }]);
    expect(heatDays(group({ species: 'goat' }), daily, today)).toEqual([]);
    expect(heatDays(group({ species: 'catfish' }), daily, today)).toEqual([]);
  });
});
