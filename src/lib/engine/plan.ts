import type { CropDef, CropTask } from '../crops';
import type { ClimateBundle, Farm, PlanAction, Priority, WeatherBundle } from '../types';
import { addDays, daysBetween, hourLabel, relativeDay } from '../dates';
import type { StageInfo } from './stage';
import type { WaterBalance } from './water';
import { mainBlocker, type SprayOutlook, type SprayWindow } from './spray';
import type { SoilFinding } from './soil';

export interface PlanInput {
  farm: Farm;
  crop: CropDef;
  stage: StageInfo;
  /** Farm-local date. */
  today: string;
  /** Weather-derived inputs are null when no forecast is available (offline, first load failed). */
  weather: WeatherBundle | null;
  water: WaterBalance | null;
  spray: SprayOutlook | null;
  soilFindings: SoilFinding[];
  climate: ClimateBundle | null;
  /** Keys of completed checkable actions. */
  done: Set<string>;
}

const SRC = {
  forecast: 'Open-Meteo forecast',
  balance: 'FAO-56 water balance',
  practice: 'Nigerian extension practice',
  soil: 'SoilGrids 250 m',
  climate: 'Open-Meteo 10-yr record',
};

const HEAVY_RAIN_MM = 25;

export function formatWindow(w: SprayWindow, today: string) {
  const day = relativeDay(w.start.slice(0, 10), today);
  const endHour = `${w.end.slice(0, 11)}${String(Number(w.end.slice(11, 13)) + 1).padStart(2, '0')}:00`;
  return `${day[0].toUpperCase()}${day.slice(1)} ${hourLabel(w.start)}–${hourLabel(endHour)}`;
}

/** Forecast days from today forward (today included). */
function forecastDays(weather: WeatherBundle | null, today: string) {
  if (!weather) return [];
  const { daily } = weather;
  const out: { date: string; rain: number; prob: number; tMax: number }[] = [];
  daily.time.forEach((date, i) => {
    if (date >= today) out.push({ date, rain: daily.precip[i] ?? 0, prob: daily.precipProb[i] ?? 0, tMax: daily.tMax[i] ?? 0 });
  });
  return out.slice(0, 8);
}

/**
 * Best day in the next week to put fertilizer down: soil moist, no heavy rain
 * that day or the next (runoff and leaching), and preferably right after rain.
 */
function fertilizerTiming(input: PlanInput, _task: CropTask, windowEndDate: string) {
  const { weather, water, today } = input;
  if (!weather || !water) {
    return {
      when: 'check soil and forecast first',
      why: ['No forecast loaded. Apply only when the topsoil is moist and no heavy rain is expected for a day — rain straight after application washes fertilizer off.'],
      sources: [] as string[],
    };
  }
  const fc = forecastDays(weather, today).filter((d) => d.date <= windowEndDate || d.date <= addDays(today, 2));
  const dayWater = new Map(water.days.map((d) => [d.date, d]));
  const heavy = (d: { rain: number; prob: number }) => d.rain >= HEAVY_RAIN_MM && d.prob >= 40;

  let best: { date: string; why: string } | null = null;
  for (let i = 0; i < fc.length; i++) {
    const d = fc[i];
    const next = fc[i + 1];
    if (heavy(d) || (next && heavy(next))) continue;
    const w = dayWater.get(addDays(d.date, -1));
    // Topsoil is wet the day after a good rain even when the deeper root zone is still short.
    const prev = i > 0 ? fc[i - 1] : null;
    const prevRain = prev ? prev.rain : water.days[water.todayIndex - 1]?.rain ?? 0;
    const prevLikely = prev ? prev.prob >= 60 : true;
    const wetTop = prevRain >= 8 && prevLikely;
    const rootOk = w ? w.depletion <= w.raw : true;
    if (wetTop || rootOk) {
      best = {
        date: d.date,
        why: wetTop
          ? `topsoil wet after ${Math.round(prevRain)} mm of rain ${prev ? `forecast ${relativeDay(prev.date, today)}` : 'yesterday'}`
          : 'soil moisture is adequate and no heavy rain is due',
      };
      break;
    }
  }

  const heavyDay = fc.find(heavy);
  const why: string[] = [];
  if (best) {
    why.push(`Best day: ${relativeDay(best.date, today)} — ${best.why}.`);
  } else if (water.stressedNow) {
    why.push('The soil is dry. Urea on dry soil loses nitrogen to the air; fertilizer on dry soil is not taken up. Apply straight after the next good rain (>10 mm) or after irrigating.');
  } else {
    why.push('No ideal day this week — heavy rain on most days would wash fertilizer away. Apply in the first dry spell after the rain.');
  }
  if (heavyDay) why.push(`Avoid ${relativeDay(heavyDay.date, today)}: ${Math.round(heavyDay.rain)} mm forecast (${heavyDay.prob}% chance).`);
  return { when: best ? relativeDay(best.date, today) : 'after next good rain', why, sources: [SRC.forecast, SRC.balance] };
}

function sprayTiming(input: PlanInput) {
  const { spray, today } = input;
  if (!spray) {
    return { when: 'calm, dry morning', why: ['No forecast loaded. Spray in daylight with a light breeze (3–15 km/h), below 30 °C, and only if no rain is expected for 4 hours.'] };
  }
  if (spray.next) {
    const extra = spray.windows.slice(1, 3).map((w) => formatWindow(w, today));
    return {
      when: formatWindow(spray.next, today),
      why: [
        `Next safe spray window: ${formatWindow(spray.next, today)} — wind 3–15 km/h, no rain for 4 h after, below 30 °C.`,
        ...(extra.length ? [`Backup: ${extra.join('; ')}.`] : []),
      ],
    };
  }
  const blocker = mainBlocker(spray.hours);
  return {
    when: 'no safe window in 3 days',
    why: [`No safe spray window in the next 72 hours${blocker ? `, mainly because of ${blocker}` : ''}. Spraying now risks drift or wash-off. Check again tomorrow.`],
  };
}

export function buildPlan(input: PlanInput): PlanAction[] {
  const { farm, crop, stage, weather, water, soilFindings, climate, done, today } = input;
  const dap = stage.dap;
  const actions: PlanAction[] = [];
  const fc = forecastDays(weather, today);
  const dapDate = (n: number) => addDays(farm.plantingDate, n);

  /* ---------- Pre-planting ---------- */
  if (dap < 0) {
    const phIssue = soilFindings.find((f) => f.id === 'ph-low');
    if (phIssue && dap <= -28) {
      actions.push({ id: 'lime', kind: 'soil', priority: 'week', title: 'Lime the field before planting', when: `by ${relativeDay(addDays(farm.plantingDate, -28), today)}`,
        why: [phIssue.title + '.', phIssue.detail], sources: [SRC.soil], checkable: true });
    }
    if (!water) {
      actions.push({ id: 'onset', kind: 'plant', priority: dap >= -7 ? 'now' : 'watch', checkable: false,
        title: 'Check the rains before planting', when: `planned for ${relativeDay(farm.plantingDate, today)}`,
        why: ['No forecast loaded. Plant once about 20 mm has fallen over 2–3 days and the soil is moist to a hand’s depth — a false start followed by a dry spell can kill the seedlings.'],
        sources: ['Onset rule: ≥20 mm in 3 days, no 7-day dry spell'] });
      return sortPlan(actions);
    }
    const rainPast3 = water.days.slice(Math.max(0, water.todayIndex - 2), water.todayIndex + 1).reduce((s, d) => s + d.rain, 0);
    const dryRun = longestDryRun(fc.map((d) => d.rain * (d.prob / 100)));
    const ready = rainPast3 >= 20 && dryRun < 7;
    actions.push({
      id: 'onset', kind: 'plant', priority: dap >= -7 ? 'now' : 'watch', checkable: false,
      title: ready ? 'Soil is ready for planting' : 'Rains not established yet — hold planting',
      when: `planned for ${relativeDay(farm.plantingDate, today)}`,
      why: [
        `${Math.round(rainPast3)} mm fell in the last 3 days (target: 20 mm or more).`,
        `Forecast shows ${Math.round(water.rainNext7)} mm over the next 7 days; longest dry run ${dryRun} day${dryRun === 1 ? '' : 's'}.`,
        ready ? 'Seed sown now should emerge evenly.' : 'Planting into dry soil after a false start risks losing the seed when a dry spell follows.',
      ],
      sources: [SRC.forecast, 'Onset rule: ≥20 mm in 3 days, no 7-day dry spell'],
    });
    return sortPlan(actions);
  }

  /* ---------- Calendar tasks ---------- */
  for (const task of crop.tasks) {
    const windowStart = dapDate(task.fromDap);
    const windowEnd = dapDate(task.toDap);

    if (task.repeatDays) {
      if (dap < task.fromDap - 3 || dap > task.toDap) continue;
      const k = Math.max(0, Math.floor((dap - task.fromDap) / task.repeatDays));
      const id = `${task.id}@${k}`;
      if (done.has(key(farm, id))) continue;
      actions.push({
        id, kind: task.kind, priority: 'week', checkable: true,
        title: task.title,
        when: dap < task.fromDap ? `from ${relativeDay(windowStart, today)}` : task.repeatDays === 7 ? 'this week' : `every ${task.repeatDays} days`,
        why: [`${crop.name} is at day ${dap} (${stage.name.toLowerCase()}). This check runs until day ${task.toDap}.`],
        how: task.how,
        sources: [SRC.practice],
      });
      continue;
    }

    if (done.has(key(farm, task.id))) continue;
    const startsIn = task.fromDap - dap;
    const overdue = dap > task.toDap && dap <= task.toDap + 14;
    const active = dap >= task.fromDap && dap <= task.toDap;
    const upcoming = startsIn > 0 && startsIn <= 7;
    if (!active && !overdue && !upcoming) continue;

    let priority: Priority = 'week';
    if (overdue || (active && task.toDap - dap <= 3)) priority = 'now';

    const why: string[] = [];
    let when = '';
    if (overdue) {
      why.push(`The usual window (day ${task.fromDap}–${task.toDap}) closed ${dap - task.toDap} day${dap - task.toDap === 1 ? '' : 's'} ago. Do it as soon as possible — or tick it off if it is already done.`);
      when = 'overdue';
    } else if (upcoming) {
      why.push(`Window opens ${relativeDay(windowStart, today)} (day ${task.fromDap}) and runs to day ${task.toDap}.`);
      when = `from ${relativeDay(windowStart, today)}`;
    } else {
      why.push(`Window: day ${task.fromDap}–${task.toDap}. Today is day ${dap}; ${task.toDap - dap === 0 ? 'last day' : `${task.toDap - dap} days left`}.`);
      when = `by ${relativeDay(windowEnd, today)}`;
    }
    const sources = [SRC.practice];

    if (task.needsMoistSoil && !upcoming) {
      const t = fertilizerTiming(input, task, windowEnd);
      why.push(...t.why);
      when = overdue ? `overdue · ${t.when}` : t.when;
      sources.push(...t.sources);
    }
    if (task.needsSprayWindow && !upcoming) {
      const t = sprayTiming(input);
      why.push(...t.why);
      when = t.when;
      sources.push(SRC.forecast);
    }
    if (task.kind === 'harvest') {
      const wet = fc.slice(0, 4).filter((d) => d.rain >= 10 && d.prob >= 50);
      if (wet.length) why.push(`Rain due ${wet.map((d) => relativeDay(d.date, today)).join(', ')} — harvest in the dry days around it and get the crop under cover.`);
    }

    const how = task.dose ? `${task.how} ${doseForFarm(task.dose, farm.sizeHa)}` : task.how;
    actions.push({ id: task.id, kind: task.kind, priority, title: task.title, when, why, how, sources, checkable: true, overdue });
  }

  if (!weather || !water) return sortPlan(actions);

  /* ---------- Water ---------- */
  const sensitive = crop.heat && stage.index === crop.heat.stageIndex ? ' during flowering — the stage where water stress costs the most yield' : '';
  const farmM3 = (mm: number) => Math.round(mm * 10 * farm.sizeHa);
  if (stage.status !== 'mature') {
    const dep = Math.round(water.depletionNow);
    const pct = Math.round(water.availableNow * 100);
    if (farm.crop === 'rice' && farm.water === 'irrigated') {
      // Flooded paddy: the upland bucket model does not apply.
    } else if (farm.water === 'irrigated') {
      if (water.stressedNow) {
        actions.push({ id: 'irrigate', kind: 'water', priority: 'now', checkable: false, title: `Irrigate: about ${dep} mm`, when: 'today',
          why: [`Root zone is down to ${pct}% of available water — past the point where ${crop.name.toLowerCase()} starts closing its pores and slowing growth${sensitive}.`,
            `Only ${Math.round(water.rainNext7)} mm of useful rain is expected over 7 days, against ${Math.round(water.etcNext7)} mm of crop water use.`],
          how: `${dep} mm = ${dep * 10} m³ per hectare, about ${farmM3(dep).toLocaleString()} m³ for ${farm.sizeHa} ha. Add 30–40% for losses with furrow or hose irrigation.`,
          sources: [SRC.balance, SRC.forecast] });
      } else if (water.stressDate && daysBetween(today, water.stressDate) <= 4) {
        actions.push({ id: 'irrigate', kind: 'water', priority: 'week', checkable: false, title: `Plan to irrigate by ${relativeDay(water.stressDate, today)}`, when: relativeDay(water.stressDate, today),
          why: [`At current water use (${(water.etcNext7 / 7).toFixed(1)} mm/day) and with little rain expected, the root zone reaches stress level ${relativeDay(water.stressDate, today)}.`],
          sources: [SRC.balance, SRC.forecast] });
      } else {
        actions.push({ id: 'no-irrigate', kind: 'water', priority: 'watch', checkable: false, title: 'No irrigation needed this week', when: 'next 7 days',
          why: [`Root zone holds ${pct}% of available water. Expected rain (${Math.round(water.rainNext7)} mm) and stored water cover crop use (${Math.round(water.etcNext7)} mm).`],
          how: 'Skipping unneeded irrigation saves fuel and stops nitrogen washing below the roots.',
          sources: [SRC.balance, SRC.forecast] });
      }
    } else if (water.stressedNow || water.stressDate) {
      const when = water.stressedNow ? 'now' : relativeDay(water.stressDate!, today);
      actions.push({ id: 'dry', kind: 'water', priority: water.stressedNow ? 'now' : 'week', checkable: false,
        title: water.stressedNow ? 'Crop is short of water' : `Dry stress likely from ${when}`, when,
        why: [`Root zone has ${pct}% of available water left${sensitive}.`, `Expected useful rain over 7 days: ${Math.round(water.rainNext7)} mm; crop will use about ${Math.round(water.etcNext7)} mm.`],
        how: 'On rainfed land: keep the field weed-free (weeds compete for the same water), mulch with residues where you can, and hold fertilizer until rain returns.',
        sources: [SRC.balance, SRC.forecast] });
    }
  }

  /* ---------- Heavy rain ---------- */
  const heavy = fc.slice(0, 7).find((d) => d.rain >= 30 && d.prob >= 50);
  if (heavy) {
    actions.push({ id: `heavy-${heavy.date}`, kind: 'drainage', priority: 'week', checkable: false,
      title: `Heavy rain ${relativeDay(heavy.date, today)}: ${Math.round(heavy.rain)} mm`, when: relativeDay(heavy.date, today),
      why: [`${heavy.prob}% chance of ${Math.round(heavy.rain)} mm in one day.`, 'Clear drainage channels so water does not pond around roots. Do not spray or fertilize the day before.'],
      sources: [SRC.forecast] });
  }

  /* ---------- Heat at flowering ---------- */
  if (crop.heat && stage.status === 'growing') {
    const stageStart = crop.stages[crop.heat.stageIndex].startDap;
    const stageEnd = crop.stages[crop.heat.stageIndex + 1]?.startDap ?? crop.maturityDays;
    const hot = fc.filter((d) => {
      const dDap = daysBetween(farm.plantingDate, d.date);
      return dDap >= stageStart && dDap < stageEnd && d.tMax >= crop.heat!.tMaxC;
    });
    if (hot.length) {
      actions.push({ id: 'heat', kind: 'other', priority: 'now', checkable: false,
        title: `Heat at ${crop.stages[crop.heat.stageIndex].name.toLowerCase()}`, when: hot.map((d) => relativeDay(d.date, today)).join(', '),
        why: [`Forecast highs of ${Math.max(...hot.map((d) => Math.round(d.tMax)))} °C while the crop is flowering. Above ${crop.heat.tMaxC} °C pollen dies and seed set drops.`],
        how: farm.water === 'irrigated' ? 'Irrigate the evening before the hottest days — a well-watered crop keeps its canopy several degrees cooler.' : 'Not much can be done on rainfed land beyond keeping weeds down. Record it — it explains yield gaps later.',
        sources: [SRC.forecast] });
    }
  }

  /* ---------- Fungal disease conditions ---------- */
  if (stage.status === 'growing' && dap > 14) {
    const run = longestHumidRun(weather, today);
    if (run.hours >= 10) {
      actions.push({ id: 'disease', kind: 'scout', priority: run.hours >= 16 ? 'week' : 'watch', checkable: false,
        title: `Damp conditions favour ${crop.humidDiseases}`, when: run.future ? 'next 2 days' : 'last 2 days',
        why: [`${run.hours} hours in a row with humidity at or above 90% (a proxy for wet leaves) ${run.future ? 'are forecast' : 'were recorded'}. Fungal spores need long wet periods to infect.`],
        how: 'Check lower leaves over the next week. Act on what you see, not on the forecast alone.',
        sources: [SRC.forecast, 'Leaf-wetness proxy: RH ≥ 90%'] });
    }
  }

  /* ---------- Season context ---------- */
  if (climate && climate.last30NormalMm > 20) {
    const ratio = climate.last30Mm / climate.last30NormalMm;
    if (ratio < 0.6 || ratio > 1.5) {
      actions.push({ id: 'season', kind: 'other', priority: 'watch', checkable: false,
        title: ratio < 0.6 ? 'Drier month than usual' : 'Wetter month than usual', when: `30 days to ${relativeDay(climate.windowEnd, today)}`,
        why: [`${Math.round(climate.last30Mm)} mm in the last 30 days, against a ${climate.years.length}-year average of ${Math.round(climate.last30NormalMm)} mm for the same dates (${Math.round(ratio * 100)}%).`],
        sources: [SRC.climate] });
    }
  }

  return sortPlan(actions);
}

/** "For your 2 ha: 260 kg of urea — 5¼ bags (50 kg)." Bags rounded up to the nearest quarter. */
export function doseForFarm(dose: { product: string; kgPerHa: number }, sizeHa: number) {
  const kg = dose.kgPerHa * sizeHa;
  const bags = Math.ceil((kg / 50) * 4) / 4;
  const whole = Math.floor(bags);
  const frac = ['', '¼', '½', '¾'][Math.round((bags - whole) * 4)];
  const bagText = `${whole > 0 ? whole : ''}${frac || (whole === 0 ? '0' : '')}`;
  return `For your ${sizeHa} ha: ${Math.round(kg).toLocaleString('en-NG')} kg of ${dose.product} — ${bagText} bag${bags > 1 ? 's' : ''} (50 kg).`;
}

export interface UpcomingTask {
  id: string;
  title: string;
  kind: CropTask['kind'];
  start: string;
  end: string;
}

/** Field operations after the coming week, for a season-at-a-glance list. */
export function seasonAhead(farm: Farm, crop: CropDef, today: string, done: Set<string>): UpcomingTask[] {
  const dap = daysBetween(farm.plantingDate, today);
  return crop.tasks
    .filter((t) => !t.repeatDays && t.fromDap - dap > 7 && !done.has(key(farm, t.id)))
    .map((t) => ({ id: t.id, title: t.title, kind: t.kind, start: addDays(farm.plantingDate, t.fromDap), end: addDays(farm.plantingDate, t.toDap) }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export const key = (farm: Farm, id: string) => `${farm.id}:${farm.plantingDate}:${id}`;

const ORDER: Record<Priority, number> = { now: 0, week: 1, watch: 2 };
function sortPlan(a: PlanAction[]) {
  return a.sort((x, y) => ORDER[x.priority] - ORDER[y.priority] || Number(!!y.overdue) - Number(!!x.overdue));
}

function longestDryRun(rain: number[]) {
  let best = 0;
  let cur = 0;
  for (const r of rain) {
    cur = r < 1 ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

function longestHumidRun(weather: WeatherBundle, today: string) {
  const { hourly } = weather;
  const nowIdx = Math.max(0, hourly.time.findIndex((t) => t.slice(0, 10) >= today));
  const from = Math.max(0, nowIdx - 48);
  const to = Math.min(hourly.time.length, nowIdx + 48);
  let best = 0;
  let bestEnd = 0;
  let cur = 0;
  for (let i = from; i < to; i++) {
    const rh = hourly.rh[i] ?? 0;
    const t = hourly.temp[i] ?? 25;
    cur = rh >= 90 && t >= 15 && t <= 32 ? cur + 1 : 0;
    if (cur > best) [best, bestEnd] = [cur, i];
  }
  return { hours: best, future: bestEnd >= nowIdx };
}
