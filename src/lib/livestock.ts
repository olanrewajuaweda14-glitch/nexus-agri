/**
 * Livestock: what each kind of animal needs and when, and the arithmetic on a
 * group's own log (head count, losses, eggs, money, withdrawal periods).
 *
 * Schedules follow Nigerian practice where a source pins it down (NVRI Vom's
 * PPR guidance, the national Newcastle schedule, piglet iron at day 3).
 * Where practice varies by product or vet, the step says so (`checkWithVet`)
 * and the farmer's own dates win: every step is ticked off with the day it
 * was actually done, and repeats count from that day.
 *
 * Medicine withdrawal periods are never guessed: they differ by product, so
 * the farmer copies them from the label and the app counts the days.
 */
import { addDays, daysBetween } from './dates';

export type SpeciesId = 'broiler' | 'layer' | 'goat' | 'sheep' | 'pig' | 'cattle' | 'catfish';

export interface HealthStep {
  id: string;
  kind: 'vaccine' | 'deworm' | 'care' | 'check';
  title: string;
  /** Age window, in days of age, when it should be done. */
  fromDay: number;
  toDay: number;
  /** After this age an undone step is marked missed instead of overdue (late doses of some vaccines do little). */
  lateUntilDay?: number;
  /** Repeats this many days after it was last done. */
  repeatDays?: number;
  /** No more repeats once the animals are older than this. */
  untilDay?: number;
  how: string;
  source: string;
  /** Timing differs between products and vets; the app shows it as a guide. */
  checkWithVet?: boolean;
}

export interface FeedGuide {
  /** Grams per animal per day. */
  gPerDay: number;
  feed: string;
  note?: string;
}

export interface Species {
  id: SpeciesId;
  name: string;
  one: string;
  many: string;
  group: string;
  /** Common ages at which a farmer gets them, for the add form. */
  startAges: { label: string; days: number }[];
  /** Forecast high (°C) from which heat stress is likely. */
  heatC?: number;
  heatAdvice?: string;
  health: HealthStep[];
  /** Typical feed by age (and weight, for fish). Null where feeding is mainly grazing. */
  feed?: (ageDays: number, avgWeightKg?: number) => FeedGuide | null;
  eggs?: boolean;
  /** Usual age range for selling, days. */
  marketDays?: [number, number];
  care: string;
}

const SRC = {
  ndNigeria: 'Nigerian Newcastle schedule: Hitchner B1 at day old, La Sota at 1–2 weeks, Komarov at 7–10 weeks',
  nvriPullets: 'NVRI Vom pullet schedule (Komarov at about 9 and 16 weeks)',
  ibd: 'Common Gumboro (IBD) practice: drinking-water doses around day 14 and day 21',
  layersNd: 'Nigerian study: La Sota booster every 7–8 weeks in lay',
  ppr: 'NVRI Vom: from 3 months of age, then every 12 months',
  iron: 'Standard piglet care: 200 mg iron at about day 3',
  practice: 'Common practice — confirm with your vet',
  fish: 'FAO catfish guidance: weigh a sample every 2 weeks and adjust feed',
};

const waterVaccine = 'Give early in the morning in clean water with no chlorine, enough for the birds to finish in about 2 hours. Keep the vaccine cool and out of the sun until you use it.';

const chickStart: HealthStep[] = [
  {
    id: 'hatchery', kind: 'vaccine', title: "Day-old vaccines (Marek's, Newcastle B1)", fromDay: 0, toDay: 1, lateUntilDay: 7,
    how: "Usually given at the hatchery. Ask the hatchery for the vaccination record. If the chicks did not get Newcastle B1, ask your vet about giving it now (one drop in the eye).",
    source: SRC.ndNigeria,
  },
  { id: 'nd1', kind: 'vaccine', title: 'Newcastle (La Sota) in drinking water', fromDay: 7, toDay: 14, lateUntilDay: 21, how: waterVaccine, source: SRC.ndNigeria },
  { id: 'ibd1', kind: 'vaccine', title: 'Gumboro (IBD) in drinking water', fromDay: 12, toDay: 16, lateUntilDay: 21, how: waterVaccine, source: SRC.ibd, checkWithVet: true },
  { id: 'ibd2', kind: 'vaccine', title: 'Gumboro (IBD) booster', fromDay: 19, toDay: 23, lateUntilDay: 28, how: waterVaccine, source: SRC.ibd, checkWithVet: true },
  { id: 'nd2', kind: 'vaccine', title: 'Newcastle (La Sota) booster', fromDay: 24, toDay: 28, lateUntilDay: 35, how: waterVaccine, source: SRC.ndNigeria, checkWithVet: true },
];

/** Broiler intake by week of age, g/bird/day: typical for commercial strains; hot weather lowers it. */
const BROILER_G = [25, 55, 95, 135, 165, 190, 205, 215];
/** Pullet intake by week (chick mash weeks 1–8, grower weeks 9–18), g/bird/day; layer mash after. */
const PULLET_G = [12, 18, 24, 30, 36, 42, 47, 52, 56, 60, 64, 68, 72, 76, 80, 85, 90, 95];

/** Catfish ration by average weight: share of body weight per day, and pellet size. */
export function catfishRation(avgG: number): { rate: number; pelletMm: string } {
  if (avgG < 5) return { rate: 0.07, pelletMm: '1.5' };
  if (avgG < 20) return { rate: 0.05, pelletMm: '2' };
  if (avgG < 100) return { rate: 0.035, pelletMm: '3' };
  if (avgG < 300) return { rate: 0.025, pelletMm: '4.5' };
  if (avgG < 600) return { rate: 0.018, pelletMm: '6' };
  return { rate: 0.012, pelletMm: '9' };
}

const smallRuminantHealth = (): HealthStep[] => [
  {
    id: 'ppr', kind: 'vaccine', title: 'PPR vaccine', fromDay: 90, toDay: 120, repeatDays: 365,
    how: 'One injection under the skin. PPR kills many goats and sheep in Nigeria and the vaccine is cheap — ask the state veterinary office or an NVRI-supplied vet.',
    source: SRC.ppr,
  },
  {
    id: 'worms', kind: 'deworm', title: 'Worm check and deworming', fromDay: 60, toDay: 75, repeatDays: 90,
    how: 'Pull down the lower eyelid of each animal. Red or dark pink is fine; pale pink or white means blood loss from worms. Deworm the pale ones, at the dose on the label for their weight.',
    source: SRC.practice, checkWithVet: true,
  },
];

export const SPECIES: Record<SpeciesId, Species> = {
  broiler: {
    id: 'broiler', name: 'Broilers', one: 'bird', many: 'birds', group: 'flock',
    startAges: [{ label: 'Day-old chicks', days: 0 }, { label: '2 weeks old', days: 14 }],
    heatC: 34,
    heatAdvice: 'Give cool, clean water all day (add electrolytes or vitamin C), feed early morning and evening instead of midday, open the sides for air and do not crowd the birds. Older broilers suffer most.',
    health: [
      ...chickStart,
      {
        id: 'cocci', kind: 'check', title: 'Coccidiosis check', fromDay: 14, toDay: 35,
        how: 'Look for bloody or watery droppings and birds sitting huddled with ruffled feathers. Keep the litter dry. If you see it, treat with an anticoccidial from the vet shop and note the withdrawal days on the label.',
        source: SRC.practice,
      },
    ],
    feed: (age) => {
      const week = Math.floor(age / 7);
      return { gPerDay: BROILER_G[Math.min(week, BROILER_G.length - 1)], feed: age < 28 ? 'Broiler starter' : 'Broiler finisher' };
    },
    marketDays: [42, 56],
    care: 'Most broilers are sold at 6–8 weeks. Keep water in front of them all the time and the litter dry.',
  },
  layer: {
    id: 'layer', name: 'Layers', one: 'bird', many: 'birds', group: 'flock',
    startAges: [{ label: 'Day-old chicks', days: 0 }, { label: 'Point of lay (18 weeks)', days: 126 }, { label: 'In lay (25 weeks)', days: 175 }],
    heatC: 34,
    heatAdvice: 'Give cool, clean water all day (add electrolytes or vitamin C), feed in the cooler hours and keep the house airy. Expect fewer and smaller eggs on very hot days.',
    health: [
      ...chickStart,
      {
        id: 'pox', kind: 'vaccine', title: 'Fowl pox (wing-web stab)', fromDay: 42, toDay: 70, lateUntilDay: 84,
        how: 'Stab the wing web with the applicator dipped in vaccine. Look at the spot 7–10 days later: a small scab means it took; no scab means do it again.',
        source: SRC.practice, checkWithVet: true,
      },
      { id: 'kom1', kind: 'vaccine', title: 'Newcastle (Komarov) injection', fromDay: 49, toDay: 70, lateUntilDay: 84, how: 'Injection into the breast or thigh muscle, at the dose on the vial.', source: SRC.ndNigeria },
      {
        id: 'worms', kind: 'deworm', title: 'Deworming', fromDay: 56, toDay: 70, repeatDays: 90,
        how: 'Use a dewormer made for poultry, in drinking water. Once they are laying, check the egg withdrawal days on the label.',
        source: SRC.practice, checkWithVet: true,
      },
      { id: 'kom2', kind: 'vaccine', title: 'Newcastle (Komarov) booster before lay', fromDay: 112, toDay: 126, lateUntilDay: 140, how: 'Injection, at the dose on the vial, before the first eggs.', source: SRC.nvriPullets },
      { id: 'ndlay', kind: 'vaccine', title: 'Newcastle (La Sota) booster in lay', fromDay: 175, toDay: 182, repeatDays: 56, how: waterVaccine, source: SRC.layersNd, checkWithVet: true },
    ],
    feed: (age) => {
      const week = Math.floor(age / 7);
      if (week < 8) return { gPerDay: PULLET_G[week], feed: 'Chick mash' };
      if (week < 18) return { gPerDay: PULLET_G[week], feed: 'Grower mash' };
      return { gPerDay: 115, feed: 'Layer mash' };
    },
    eggs: true,
    care: 'Hens usually start laying at 18–20 weeks. A sudden drop in eggs is often the first sign of disease, heat or a water problem.',
  },
  goat: {
    id: 'goat', name: 'Goats', one: 'goat', many: 'goats', group: 'herd',
    startAges: [{ label: 'Kids (3 months)', days: 90 }, { label: 'Young (6 months)', days: 180 }, { label: 'Adults', days: 730 }],
    heatC: 38,
    heatAdvice: 'Make sure there is shade and clean water all day. Graze early and late, not at midday.',
    health: smallRuminantHealth(),
    care: 'Mostly grazing and cut fodder. A goat drinks 4–5 litres of water a day in hot weather.',
  },
  sheep: {
    id: 'sheep', name: 'Sheep', one: 'sheep', many: 'sheep', group: 'flock',
    startAges: [{ label: 'Lambs (3 months)', days: 90 }, { label: 'Young (6 months)', days: 180 }, { label: 'Adults', days: 730 }],
    heatC: 38,
    heatAdvice: 'Make sure there is shade and clean water all day. Graze early and late, not at midday.',
    health: smallRuminantHealth(),
    care: 'Mostly grazing and cut fodder, with clean water every day.',
  },
  pig: {
    id: 'pig', name: 'Pigs', one: 'pig', many: 'pigs', group: 'pen',
    startAges: [{ label: 'Newborn piglets', days: 0 }, { label: 'Weaners (8 weeks)', days: 56 }, { label: 'Growers (3 months)', days: 90 }, { label: 'Adults', days: 365 }],
    heatC: 33,
    heatAdvice: 'Pigs cannot sweat. Wet the floor or the pigs, give shade and plenty of water, and feed in the cooler hours.',
    health: [
      {
        id: 'iron', kind: 'care', title: 'Iron injection for piglets', fromDay: 2, toDay: 4, lateUntilDay: 10,
        how: 'Iron dextran into the neck muscle: 200 mg per piglet (100 mg if they will be weaned before 4 weeks). Piglets kept on soil pick up some iron and may need less — ask your vet.',
        source: SRC.iron,
      },
      { id: 'worms', kind: 'deworm', title: 'Deworming', fromDay: 49, toDay: 63, repeatDays: 90, how: 'Deworm at weaning, then on the interval your vet or the product label gives.', source: SRC.practice, checkWithVet: true },
    ],
    feed: (age) => {
      if (age < 56) return null;
      if (age < 84) return { gPerDay: 1000, feed: 'Weaner feed' };
      if (age < 140) return { gPerDay: 1800, feed: 'Grower feed' };
      return { gPerDay: 2700, feed: 'Finisher or sow feed', note: 'Nursing sows need about twice this.' };
    },
    care: 'African swine fever has no vaccine. Keep visitors and other pigs out, use a footbath at the gate, and never feed kitchen waste with pork in it.',
  },
  cattle: {
    id: 'cattle', name: 'Cattle', one: 'cow', many: 'cattle', group: 'herd',
    startAges: [{ label: 'Calves (6 months)', days: 180 }, { label: 'Young (1 year)', days: 365 }, { label: 'Adults', days: 1095 }],
    heatC: 37,
    heatAdvice: 'Make sure there is shade and plenty of water. A cow can drink 40 litres or more on a hot day.',
    health: [
      { id: 'cbpp', kind: 'vaccine', title: 'CBPP vaccine', fromDay: 180, toDay: 210, repeatDays: 365, how: 'Given by the state veterinary service or a vet, usually in yearly campaigns.', source: 'Nigeria’s CBPP control: yearly vaccination (NVRI T1/44 vaccine)', checkWithVet: true },
      { id: 'yearly', kind: 'vaccine', title: 'Anthrax, blackleg and HS vaccines', fromDay: 180, toDay: 210, repeatDays: 365, how: 'Usually once a year, before the rains. NVRI makes all three; your vet sets the dates.', source: SRC.practice, checkWithVet: true },
      { id: 'worms', kind: 'deworm', title: 'Deworming', fromDay: 120, toDay: 150, repeatDays: 120, how: 'Dose by weight, from the label. Check for ticks at the same time.', source: SRC.practice, checkWithVet: true },
    ],
    care: 'Mostly grazing. Check for ticks every week in the rainy season.',
  },
  catfish: {
    id: 'catfish', name: 'Catfish', one: 'fish', many: 'fish', group: 'pond',
    startAges: [{ label: 'Fingerlings', days: 28 }, { label: 'Juveniles', days: 49 }],
    health: [
      { id: 'weigh', kind: 'check', title: 'Weigh a sample', fromDay: 0, toDay: 3, repeatDays: 14, how: 'Weigh 10–20 fish together and divide by the number to get the average. Log it here — the feed amount is worked out from it.', source: SRC.fish },
      { id: 'sort', kind: 'care', title: 'Sort by size', fromDay: 42, toDay: 49, repeatDays: 21, untilDay: 150, how: 'Net the fish and move the big ones ("shooters") to another tank — big catfish eat small ones.', source: SRC.practice },
    ],
    feed: (_age, avgKg) => {
      if (!avgKg) return null;
      const g = avgKg * 1000;
      const r = catfishRation(g);
      return { gPerDay: g * r.rate, feed: `${r.pelletMm} mm floating pellets`, note: `${Math.round(r.rate * 1000) / 10}% of body weight a day, in two feeds.` };
    },
    marketDays: [120, 180],
    care: 'If the fish gulp at the surface or the water smells, change about a third of it. Stop feeding a day before harvest.',
  },
};

/* --------------------------------- Groups -------------------------------- */

export interface AnimalGroup {
  id: string;
  species: SpeciesId;
  name: string;
  /** Day the group started on this farm (arrived, hatched or stocked). */
  startDate: string;
  /** Age in days on that day. */
  ageAtStart: number;
  startCount: number;
  /** Field whose location (weather) applies. */
  fieldId?: string;
  createdAt: string;
  /** Sold out or finished; kept for its record. */
  closed?: boolean;
}

export type AnimalEventKind = 'added' | 'died' | 'sold' | 'eaten' | 'eggs' | 'weight' | 'health' | 'cost' | 'income';

export interface AnimalEvent {
  id: string;
  date: string;
  kind: AnimalEventKind;
  /** Animals added, lost, sold or eaten; eggs collected. */
  count?: number;
  /** ₦ paid (added, cost, health) or received (sold, income — eggs, manure, milk). */
  amount?: number;
  /** Average weight, kg (weight). */
  kg?: number;
  /** Schedule step this health entry completes. */
  stepId?: string;
  /** Vaccine or medicine used. */
  product?: string;
  /** From the product label: days before meat may be eaten or sold. */
  meatDays?: number;
  /** From the product label: days before eggs may be eaten or sold. */
  eggDays?: number;
  /** cost: feed, medicine, buying the animals, or other. */
  category?: 'feed' | 'medicine' | 'animals' | 'other';
  note?: string;
}

export const eventsKey = (groupId: string) => `na:animal-log:${groupId}`;
export const ANIMALS_KEY = 'na:animals';

export const birthDate = (g: AnimalGroup) => addDays(g.startDate, -g.ageAtStart);
export const ageOn = (g: AnimalGroup, date: string) => daysBetween(birthDate(g), date);

export function ageText(days: number): string {
  if (days < 0) return 'not born yet';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 7 * 26) return `${Math.floor(days / 7)} weeks`;
  if (days < 730) return `${Math.floor(days / 30.4)} months`;
  return `${(days / 365).toFixed(1).replace(/\.0$/, '')} years`;
}

/** Animals on the farm on `date`, counting every entry up to and including that day. */
export function headCount(g: AnimalGroup, events: AnimalEvent[], date = '9999-12-31'): number {
  let n = g.startCount;
  for (const e of events) {
    if (e.date > date || !e.count) continue;
    if (e.kind === 'added') n += e.count;
    else if (e.kind === 'died' || e.kind === 'sold' || e.kind === 'eaten') n -= e.count;
  }
  return Math.max(0, n);
}

/** Deaths over the `days` up to `today`, as a share of the animals there at the start of that period. */
export function lossRate(g: AnimalGroup, events: AnimalEvent[], today: string, days = 7) {
  const from = addDays(today, -days + 1);
  const deaths = events.filter((e) => e.kind === 'died' && e.date >= from && e.date <= today).reduce((s, e) => s + (e.count ?? 0), 0);
  const base = headCount(g, events, addDays(from, -1)) || g.startCount;
  return { deaths, rate: base > 0 ? deaths / base : 0 };
}

export interface EggStats {
  /** Eggs per hen per day over the last 7 logged days, 0–1. */
  rate7: number | null;
  /** The 7 days before that. */
  ratePrev7: number | null;
  /** Last 14 days, oldest first: date, eggs (null if not logged), rate. */
  days: { date: string; eggs: number | null; rate: number | null }[];
  today: number | null;
}

export function eggStats(g: AnimalGroup, events: AnimalEvent[], today: string): EggStats {
  const byDate = new Map<string, number>();
  for (const e of events) if (e.kind === 'eggs' && e.count != null) byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.count);
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i - 13);
    const eggs = byDate.get(date) ?? null;
    const hens = headCount(g, events, date);
    return { date, eggs, rate: eggs != null && hens > 0 ? eggs / hens : null };
  });
  const avg = (xs: typeof days) => {
    const logged = xs.filter((d) => d.rate != null);
    return logged.length >= 3 ? logged.reduce((s, d) => s + d.rate!, 0) / logged.length : null;
  };
  return { rate7: avg(days.slice(7)), ratePrev7: avg(days.slice(0, 7)), days, today: byDate.get(today) ?? null };
}

/** Latest average weight logged, kg. */
export const lastWeight = (events: AnimalEvent[]) =>
  [...events].filter((e) => e.kind === 'weight' && e.kg != null).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

export function money(events: AnimalEvent[]) {
  let spent = 0;
  let received = 0;
  for (const e of events) {
    if (!e.amount) continue;
    if (e.kind === 'sold' || e.kind === 'income') received += e.amount;
    else if (e.kind === 'added' || e.kind === 'cost' || e.kind === 'health') spent += e.amount;
  }
  return { spent, received, net: received - spent };
}

/** Treatments whose withdrawal period is still running on `today`. */
export function withdrawals(events: AnimalEvent[], today: string) {
  const out: { event: AnimalEvent; meatUntil: string | null; eggsUntil: string | null }[] = [];
  for (const e of events) {
    if (e.kind !== 'health') continue;
    const meatUntil = e.meatDays ? addDays(e.date, e.meatDays) : null;
    const eggsUntil = e.eggDays ? addDays(e.date, e.eggDays) : null;
    if ((meatUntil && meatUntil > today) || (eggsUntil && eggsUntil > today)) {
      out.push({ event: e, meatUntil: meatUntil && meatUntil > today ? meatUntil : null, eggsUntil: eggsUntil && eggsUntil > today ? eggsUntil : null });
    }
  }
  return out;
}

/* ----------------------------- Health schedule ---------------------------- */

export type StepStatus = 'done' | 'overdue' | 'due' | 'upcoming' | 'missed' | 'before';

export interface ScheduledStep {
  step: HealthStep;
  status: StepStatus;
  /** Window for the next (or last missed) occurrence. */
  start: string;
  end: string;
  /** When it was last done. */
  doneOn?: string;
}

/**
 * Where each health step stands on `today`. Repeats count from the day the
 * farmer actually did it. One-off steps whose window closed before the group
 * reached this farm are `before` (the seller's job); repeating ones with no
 * record are due on arrival, because an unrecorded vaccine has to be treated
 * as not given.
 */
export function healthSchedule(g: AnimalGroup, events: AnimalEvent[], today: string): ScheduledStep[] {
  const born = birthDate(g);
  const age = ageOn(g, today);
  const out: ScheduledStep[] = [];
  for (const step of SPECIES[g.species].health) {
    const done = events.filter((e) => e.kind === 'health' && e.stepId === step.id).sort((a, b) => b.date.localeCompare(a.date));
    const lastDone = done[0]?.date;
    const len = step.toDay - step.fromDay;

    let start: string;
    if (lastDone) {
      if (!step.repeatDays) {
        out.push({ step, status: 'done', start: lastDone, end: lastDone, doneOn: lastDone });
        continue;
      }
      start = addDays(lastDone, step.repeatDays);
    } else if (step.toDay < g.ageAtStart) {
      if (!step.repeatDays) {
        out.push({ step, status: 'before', start: addDays(born, step.fromDay), end: addDays(born, step.toDay) });
        continue;
      }
      start = g.startDate;
    } else {
      start = addDays(born, step.fromDay);
    }
    // Past the last age for this step (fish too big to sort): drop it, done or not.
    if (step.untilDay != null && (daysBetween(born, start) > step.untilDay || age > step.untilDay)) continue;
    const end = addDays(start, len);
    let status: StepStatus = today < start ? 'upcoming' : today <= end ? 'due' : 'overdue';
    if (status === 'overdue' && !step.repeatDays && step.lateUntilDay != null && age > step.lateUntilDay) status = 'missed';
    out.push({ step, status, start, end, doneOn: lastDone });
  }
  const order: Record<StepStatus, number> = { overdue: 0, due: 1, upcoming: 2, missed: 3, done: 4, before: 5 };
  return out.sort((a, b) => order[a.status] - order[b.status] || a.start.localeCompare(b.start));
}

/* ------------------------------ Feed and heat ----------------------------- */

/** Feed for the whole group for the next `days`, from the species guide. */
export function feedNeed(g: AnimalGroup, events: AnimalEvent[], today: string, days = 7) {
  const sp = SPECIES[g.species];
  const n = headCount(g, events, today);
  const w = lastWeight(events);
  const guide = sp.feed?.(ageOn(g, today), w?.kg);
  if (!guide || n === 0) return null;
  const kgPerDay = (guide.gPerDay * n) / 1000;
  return { ...guide, head: n, kgPerDay, kgTotal: kgPerDay * days, bags25: (kgPerDay * days) / 25, days };
}

/** Forecast days at or above the species' heat-stress temperature. */
export function heatDays(g: AnimalGroup, daily: { time: string[]; tMax: (number | null)[] } | null, today: string, ahead = 3) {
  const t = SPECIES[g.species].heatC;
  if (t == null || !daily) return [];
  const i = daily.time.indexOf(today);
  if (i < 0) return [];
  const out: { date: string; tMax: number }[] = [];
  for (let k = i; k < Math.min(daily.time.length, i + ahead); k++) {
    const v = daily.tMax[k];
    if (v != null && v >= t) out.push({ date: daily.time[k], tMax: v });
  }
  return out;
}
