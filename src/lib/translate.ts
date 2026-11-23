/**
 * This week's plan in Pidgin, Hausa, Yorùbá or Igbo.
 *
 * The English plan is computed on the phone; Claude only translates its text.
 * A machine translation that changes a figure is worse than none (100 kg of
 * urea becoming 10 kg), so every item is checked: if the numbers in the
 * translation are not exactly the numbers in the English, that item is shown
 * in English instead.
 */
import type { PlanAction, Priority } from './types';
import { shortDate } from './dates';

export interface PlanItemText {
  id: string;
  title: string;
  when: string;
  how: string;
}

export interface PlanText {
  heading: string;
  labels: Record<Priority, string>;
  items: PlanItemText[];
}

export const TRANSLATE_LANGS = [
  { value: 'pcm', label: 'Pidgin' },
  { value: 'ha', label: 'Hausa' },
  { value: 'yo', label: 'Yorùbá' },
  { value: 'ig', label: 'Igbo' },
] as const;

export const langLabel = (v: string) => TRANSLATE_LANGS.find((l) => l.value === v)?.label ?? v;

export function planText(opts: {
  cropName: string;
  stage: { status: 'not-planted' | 'growing' | 'mature'; dap: number; name: string };
  today: string;
  plan: PlanAction[];
  labels: Record<Priority, string>;
}): PlanText {
  const { cropName, stage, today, plan, labels } = opts;
  const status =
    stage.status === 'not-planted'
      ? `${cropName}, planting in ${-stage.dap} day${stage.dap === -1 ? '' : 's'}.`
      : stage.status === 'mature'
        ? `${cropName} is mature.`
        : `${cropName}, day ${stage.dap}: ${stage.name}.`;
  return {
    heading: `${status} Jobs for the week of ${shortDate(today)}.`,
    labels,
    items: plan.map((a) => ({ id: a.id, title: a.title, when: a.when, how: a.how ?? '' })),
  };
}

/** Short content fingerprint (FNV-1a), so a saved translation is only reused for the same English text. */
export function contentHash(p: PlanText): string {
  const s = JSON.stringify(p);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** The figures in a text, with thousands commas removed: "1,250 m³ in 2 days" → {"1250", "2"}. */
export function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d+(?:[.,]\d+)*/g)) out.add(m[0].replace(/,(?=\d{3}(?!\d))/g, ''));
  return out;
}

export const sameNumbers = (a: string, b: string) => {
  const x = numbersIn(a);
  const y = numbersIn(b);
  return x.size === y.size && [...x].every((n) => y.has(n));
};

const itemText = (i: PlanItemText) => `${i.title} ${i.when} ${i.how}`;

/**
 * Checks a reply from the server against the English it came from. Returns
 * null if it is not a translation of this plan; otherwise the translation with
 * any item whose figures changed put back into English.
 */
export function acceptTranslation(src: PlanText, raw: unknown): { text: PlanText; keptEnglish: string[] } | null {
  const r = raw as Partial<PlanText> | null;
  const str = (v: unknown): v is string => typeof v === 'string';
  if (!r || !str(r.heading) || !r.labels || !Array.isArray(r.items)) return null;
  if (!(['now', 'week', 'watch'] as const).every((k) => str(r.labels![k]) && r.labels![k].trim())) return null;
  const byId = new Map<string, PlanItemText>();
  for (const i of r.items as unknown[]) {
    const t = i as PlanItemText;
    if (t && str(t.id) && str(t.title) && str(t.when) && str(t.how)) byId.set(t.id, t);
  }
  if (src.items.some((i) => !byId.has(i.id))) return null;

  const keptEnglish: string[] = [];
  const items = src.items.map((en) => {
    const t = byId.get(en.id)!;
    const out = { id: en.id, title: t.title, when: t.when, how: en.how ? t.how : '' };
    if (!out.title.trim() || !sameNumbers(itemText(en), itemText(out))) {
      keptEnglish.push(en.id);
      return en;
    }
    return out;
  });
  const heading = r.heading.trim() && sameNumbers(src.heading, r.heading) ? r.heading : src.heading;
  return { text: { heading, labels: r.labels as Record<Priority, string>, items }, keptEnglish };
}

const MARK: Record<Priority, string> = { now: '🔴', week: '🟠', watch: '🔵' };

/** WhatsApp message for the jobs still open, in the translated language. */
export function translatedMessage(farmName: string, t: PlanText, open: { id: string; priority: Priority }[], language: string): string {
  const byId = new Map(t.items.map((i) => [i.id, i]));
  const lines = [`*${farmName}* — ${t.heading}`, ''];
  for (const p of ['now', 'week'] as Priority[]) {
    const items = open.filter((a) => a.priority === p && byId.has(a.id));
    if (!items.length) continue;
    lines.push(`*${t.labels[p]}*`);
    for (const a of items) {
      const i = byId.get(a.id)!;
      lines.push(`${MARK[p]} ${i.title} — ${i.when}${i.how ? `\n   ${i.how}` : ''}`);
    }
    lines.push('');
  }
  lines.push(`Nexus Agri · ${langLabel(language)} (AI translation)`);
  return lines.join('\n');
}
