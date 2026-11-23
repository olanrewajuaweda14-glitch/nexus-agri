import { describe, expect, it } from 'vitest';
import { CROPS } from '../src/lib/crops';
import { fold, googleCalendarUrl, seasonEvents, toIcs, utcStamp } from '../src/lib/calendar';
import { key } from '../src/lib/engine/plan';
import { addDays } from '../src/lib/dates';
import type { Farm } from '../src/lib/types';

const TODAY = '2026-11-23';
const farm: Farm = { id: 'f1', name: 'Back plot, Ibadan', lat: 7.4, lng: 3.9, crop: 'maize', plantingDate: addDays(TODAY, -30), maturity: 'medium', sizeHa: 2, water: 'rainfed', createdAt: '' };
const LAGOS = 3600;

describe('season reminders', () => {
  it('converts farm-local 7 am to UTC', () => {
    expect(utcStamp('2026-11-23', 7, 0, LAGOS)).toBe('20261123T060000Z');
    expect(utcStamp('2026-01-01', 0, 30, LAGOS)).toBe('20251231T233000Z');
  });

  it('lists the jobs still ahead, from today, with amounts for this field', () => {
    const ev = seasonEvents(farm, CROPS.maize, TODAY, new Set());
    const ids = ev.map((e) => e.uid.match(/-([a-z0-9]+)@nexus-agri$/)![1]);
    expect(ids).toEqual(expect.arrayContaining(['topdress', 'weed2', 'harvest', 'faw']));
    expect(ids).not.toContain('basal'); // window 0–14 already closed at day 30
    const topdress = ev.find((e) => e.uid.includes('-topdress@'))!;
    expect(topdress.date).toBe(TODAY); // window 28–42 already open
    expect(topdress.description).toContain('For your 2 ha: 260 kg of urea');
    const faw = ev.find((e) => e.uid.includes('-faw@'))!;
    expect(faw.rrule).toBe(`FREQ=DAILY;INTERVAL=7;UNTIL=${addDays(farm.plantingDate, 55).replace(/-/g, '')}T235959Z`);
    expect(ev.map((e) => e.date)).toEqual([...ev.map((e) => e.date)].sort());
  });

  it('skips jobs already ticked off', () => {
    const ev = seasonEvents(farm, CROPS.maize, TODAY, new Set([key(farm, 'topdress')]));
    expect(ev.some((e) => e.uid.includes('-topdress@'))).toBe(false);
  });

  it('writes a valid calendar file: CRLF, folded lines, escaped text, one alarm per event', () => {
    const ev = seasonEvents(farm, CROPS.maize, TODAY, new Set());
    const ics = toIcs(ev, 'Nexus Agri — Back plot, Ibadan', LAGOS, new Date('2026-11-23T10:00:00Z'));
    const lines = ics.split('\r\n');
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    const enc = new TextEncoder();
    for (const l of lines) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    const count = (s: string) => lines.filter((l) => l === s).length;
    expect(count('BEGIN:VEVENT')).toBe(ev.length);
    expect(count('END:VEVENT')).toBe(ev.length);
    expect(count('BEGIN:VALARM')).toBe(ev.length);
    // Unfolded, the summary keeps its comma escaped.
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('SUMMARY:Top-dress with urea — Back plot\\, Ibadan');
    expect(unfolded).toContain(`DTSTART:${utcStamp(TODAY, 7, 0, LAGOS)}`);
    expect(unfolded).toContain('DTSTAMP:20261123T100000Z');
  });

  it('folds multi-byte text without splitting characters', () => {
    const long = 'DESCRIPTION:' + '₦250,000 for urea — '.repeat(10);
    const folded = fold(long);
    expect(folded.replace(/\r\n /g, '')).toBe(long);
    for (const l of folded.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });

  it('builds a pre-filled Google Calendar link', () => {
    const url = new URL(googleCalendarUrl({ date: TODAY, title: 'Top-dress with urea', description: '130 kg/ha', rrule: 'FREQ=DAILY;INTERVAL=7;UNTIL=20261201T235959Z' }, LAGOS));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('dates')).toBe('20261123T060000Z/20261123T063000Z');
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY;INTERVAL=7;UNTIL=20261201T235959Z');
  });
});
