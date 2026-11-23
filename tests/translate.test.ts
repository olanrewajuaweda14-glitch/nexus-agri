import { describe, expect, it } from 'vitest';
import { acceptTranslation, contentHash, numbersIn, planText, sameNumbers, translatedMessage, type PlanText } from '../src/lib/translate';
import type { PlanAction } from '../src/lib/types';

const action = (id: string, priority: PlanAction['priority'], title: string, when: string, how?: string): PlanAction => ({
  id, kind: 'fertilizer', priority, title, when, why: [], how, sources: [], checkable: true,
});

const plan = [
  action('topdress', 'now', 'Top-dress with urea', 'Tomorrow, before Thu 26 Nov rain', 'Apply 2.6 bags (130 kg) of urea on 1,000 m² rows, 5 cm from the stem.'),
  action('faw', 'week', 'Scout for fall armyworm', 'This week'),
  action('heat', 'watch', 'Heat stress', 'Fri–Sat, 36 °C'),
];
const labels = { now: 'Do now', week: 'This week', watch: 'Keep an eye on' };
const src = planText({ cropName: 'Maize', stage: { status: 'growing', dap: 34, name: 'Rapid growth' }, today: '2026-11-23', plan, labels });

const hausa = (over: Partial<Record<string, Partial<PlanText['items'][number]>>> = {}): PlanText => ({
  heading: 'Masara, rana ta 34: Saurin girma. Ayyukan makon 23 Nov.',
  labels: { now: 'Yi yanzu', week: 'Wannan makon', watch: 'Ku lura da' },
  items: [
    { id: 'topdress', title: 'Zuba yuriya', when: 'Gobe, kafin ruwan Alhamis 26 Nov', how: 'Zuba buhu 2.6 (130 kg) na yuriya a layukan 1,000 m², 5 cm daga tushe.', ...over.topdress },
    { id: 'faw', title: 'Duba tsutsar fall armyworm', when: 'Wannan makon', how: '', ...over.faw },
    { id: 'heat', title: 'Zafi mai yawa', when: 'Juma’a–Asabar, 36 °C', how: '', ...over.heat },
  ],
});

describe('plan translation', () => {
  it('builds the English text from the plan, with the farm-independent heading', () => {
    expect(src.heading).toBe('Maize, day 34: Rapid growth. Jobs for the week of 23 Nov.');
    expect(src.items.map((i) => i.id)).toEqual(['topdress', 'faw', 'heat']);
    expect(src.items[1].how).toBe('');
    const before = planText({ cropName: 'Rice', stage: { status: 'not-planted', dap: -1, name: 'Before planting' }, today: '2026-11-23', plan: [], labels });
    expect(before.heading).toBe('Rice, planting in 1 day. Jobs for the week of 23 Nov.');
  });

  it('fingerprints content so a saved translation is only reused for the same English', () => {
    expect(contentHash(src)).toBe(contentHash(planText({ cropName: 'Maize', stage: { status: 'growing', dap: 34, name: 'Rapid growth' }, today: '2026-11-23', plan, labels })));
    const moved = plan.map((a) => (a.id === 'topdress' ? { ...a, when: 'Today' } : a));
    expect(contentHash(src)).not.toBe(contentHash(planText({ cropName: 'Maize', stage: { status: 'growing', dap: 34, name: 'Rapid growth' }, today: '2026-11-23', plan: moved, labels })));
  });

  it('reads figures the way a farmer would compare them', () => {
    expect([...numbersIn('2.6 bags (130 kg) on 1,000 m², NPK 15-15-15, 6–9 am')]).toEqual(['2.6', '130', '1000', '15', '6', '9']);
    expect(sameNumbers('130 kg', '130 kg na yuriya')).toBe(true);
    expect(sameNumbers('1,250 m³', '1250 m³')).toBe(true);
    expect(sameNumbers('130 kg', '13 kg')).toBe(false);
    expect(sameNumbers('2 bags', 'buhu biyu')).toBe(false); // figure written as a word
    expect(sameNumbers('2 bags', '2 ko 3 buhu')).toBe(false); // figure added
    expect(sameNumbers('2.5 L', '2,5 L')).toBe(false); // decimal comma reads as a different number
  });

  it('accepts a faithful translation', () => {
    const r = acceptTranslation(src, hausa())!;
    expect(r.keptEnglish).toEqual([]);
    expect(r.text.items[0].title).toBe('Zuba yuriya');
    expect(r.text.heading).toContain('rana ta 34');
    expect(r.text.labels.now).toBe('Yi yanzu');
  });

  it('puts a job back into English when the translation changes a figure', () => {
    const r = acceptTranslation(src, hausa({ topdress: { how: 'Zuba buhu 2.6 (13 kg) na yuriya a layukan 1,000 m², 5 cm daga tushe.' } }))!;
    expect(r.keptEnglish).toEqual(['topdress']);
    expect(r.text.items[0]).toEqual(src.items[0]);
    expect(r.text.items[1].title).toBe('Duba tsutsar fall armyworm');
  });

  it('keeps the English heading if its figures changed, and never invents a "how" line', () => {
    const r = acceptTranslation(src, { ...hausa({ faw: { how: 'Wani karin bayani' } }), heading: 'Masara, rana ta 43.' })!;
    expect(r.text.heading).toBe(src.heading);
    expect(r.text.items[1].how).toBe('');
  });

  it('refuses replies that are not a translation of this plan', () => {
    expect(acceptTranslation(src, null)).toBeNull();
    expect(acceptTranslation(src, { ...hausa(), items: hausa().items.slice(1) })).toBeNull();
    expect(acceptTranslation(src, { ...hausa(), labels: { now: 'Yi yanzu', week: '' } })).toBeNull();
    expect(acceptTranslation(src, { ...hausa(), items: 'nope' })).toBeNull();
  });

  it('writes a WhatsApp message with only the open jobs, labelled as an AI translation', () => {
    const t = acceptTranslation(src, hausa())!.text;
    const msg = translatedMessage('Iya’s plot', t, [{ id: 'topdress', priority: 'now' }, { id: 'heat', priority: 'watch' }], 'ha');
    expect(msg).toContain('*Iya’s plot* — Masara, rana ta 34');
    expect(msg).toContain('*Yi yanzu*\n🔴 Zuba yuriya — Gobe, kafin ruwan Alhamis 26 Nov\n   Zuba buhu 2.6 (130 kg)');
    expect(msg).not.toContain('Duba tsutsar'); // ticked off
    expect(msg).not.toContain('Zafi mai yawa'); // "keep an eye on" stays on screen, like the English message
    expect(msg.trim().endsWith('Nexus Agri · Hausa (AI translation)')).toBe(true);
  });
});
