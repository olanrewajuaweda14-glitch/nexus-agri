/**
 * Reminders through the phone's own calendar: no accounts, no push server,
 * works offline once imported.
 *
 *  - `seasonEvents` turns the rest of the season's field jobs into events.
 *  - `toIcs` writes them as an iCalendar file (RFC 5545) with a morning alarm,
 *    which iPhone, Samsung Calendar, Outlook and Google Calendar (on a
 *    computer) can import.
 *  - `googleCalendarUrl` opens one event pre-filled in Google Calendar, the
 *    dependable route on Android phones.
 */
import type { CropDef } from './crops';
import type { Farm } from './types';
import { addDays, daysBetween } from './dates';
import { doseForFarm, key } from './engine/plan';
import { seasonOf } from './seasons';

export interface CalEvent {
  uid: string;
  /** Local date of the (first) occurrence, YYYY-MM-DD. */
  date: string;
  title: string;
  description: string;
  /** Repeat rule body, e.g. "FREQ=WEEKLY;UNTIL=20261201T235959Z". */
  rrule?: string;
}

/** Morning reminder time, farm-local. */
export const REMIND_AT = { hour: 7, minute: 0 };
const DURATION_MIN = 30;

const pad = (n: number) => String(n).padStart(2, '0');

/** Farm-local date + time → UTC stamp "YYYYMMDDTHHMMSSZ", using the farm's UTC offset in seconds. */
export function utcStamp(date: string, hour: number, minute: number, offsetSec: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d, hour, minute) - offsetSec * 1000;
  const t = new Date(ms);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00Z`;
}

/** The rest of this season's field jobs, from `today` on, skipping ones already ticked off. */
export function seasonEvents(farm: Farm, crop: CropDef, today: string, done: Set<string>): CalEvent[] {
  const dap = daysBetween(farm.plantingDate, today);
  const events: CalEvent[] = [];
  const footer = 'Open Nexus Agri that morning for the best day, the spray window and the weather.';
  for (const t of crop.tasks) {
    if (t.toDap < dap) continue;
    const startDap = Math.max(t.fromDap, dap);
    const start = addDays(farm.plantingDate, startDap);
    const end = addDays(farm.plantingDate, t.toDap);
    const how = t.dose ? `${t.how} ${doseForFarm(t.dose, farm.sizeHa)}` : t.how;
    const uid = `${farm.id}-${seasonOf(farm)}-${t.id}@nexus-agri`;
    if (t.repeatDays) {
      events.push({
        uid,
        date: start,
        title: `${t.title} — ${farm.name}`,
        description: `${how}\n\nRepeats every ${t.repeatDays === 7 ? 'week' : `${t.repeatDays} days`} until ${end}.\n${footer}`,
        rrule: `FREQ=DAILY;INTERVAL=${t.repeatDays};UNTIL=${end.replace(/-/g, '')}T235959Z`,
      });
      continue;
    }
    if (done.has(key(farm, t.id))) continue;
    events.push({
      uid,
      date: start,
      title: `${t.title} — ${farm.name}`,
      description: `${how}\n\nWindow: ${start === addDays(farm.plantingDate, t.fromDap) ? '' : 'already open, '}until ${end} (day ${t.toDap} after planting).\n${footer}`,
    });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------ iCalendar ------------------------------ */

const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Folds a content line at 75 octets (UTF-8), never splitting a character. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + n > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function toIcs(events: CalEvent[], calendarName: string, offsetSec: number, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nexus Agri//Season reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escapeText(calendarName)}`];
  for (const e of events) {
    const startMin = REMIND_AT.hour * 60 + REMIND_AT.minute;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utcStamp(e.date, REMIND_AT.hour, REMIND_AT.minute, offsetSec)}`,
      `DTEND:${utcStamp(e.date, Math.floor((startMin + DURATION_MIN) / 60), (startMin + DURATION_MIN) % 60, offsetSec)}`,
      `SUMMARY:${escapeText(e.title)}`,
      `DESCRIPTION:${escapeText(e.description)}`,
      ...(e.rrule ? [`RRULE:${e.rrule}`] : []),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(e.title)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Google Calendar "add event" link, pre-filled. */
export function googleCalendarUrl(e: Pick<CalEvent, 'date' | 'title' | 'description' | 'rrule'>, offsetSec: number): string {
  const startMin = REMIND_AT.hour * 60 + REMIND_AT.minute;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${utcStamp(e.date, REMIND_AT.hour, REMIND_AT.minute, offsetSec)}/${utcStamp(e.date, Math.floor((startMin + DURATION_MIN) / 60), (startMin + DURATION_MIN) % 60, offsetSec)}`,
    details: e.description,
  });
  if (e.rrule) p.set('recur', `RRULE:${e.rrule}`);
  return `https://calendar.google.com/calendar/render?${p}`;
}
