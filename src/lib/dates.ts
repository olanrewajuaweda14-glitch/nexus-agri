/** Date helpers that work on plain local date strings (YYYY-MM-DD) to avoid timezone drift. */

const toUtc = (d: string) => {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, day);
};

export const daysBetween = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / 86_400_000);

export const addDays = (d: string, n: number) => new Date(toUtc(d) + n * 86_400_000).toISOString().slice(0, 10);

export const localToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const weekday = (d: string) => WEEKDAYS[new Date(toUtc(d)).getUTCDay()];
export const weekdayLong = (d: string) => WEEKDAYS_LONG[new Date(toUtc(d)).getUTCDay()];
export const monthName = (i: number) => MONTHS[i];
export const shortDate = (d: string) => {
  const dt = new Date(toUtc(d));
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
};

/** "today", "tomorrow", "Thu", or "12 Dec" relative to `today`. */
export const relativeDay = (d: string, today: string) => {
  const n = daysBetween(today, d);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 1 && n < 7) return weekdayLong(d);
  return shortDate(d);
};

/** Hour label from a local ISO time like 2026-11-21T07:00 → "7 am". */
export const hourLabel = (t: string) => {
  const h = Number(t.slice(11, 13));
  if (h === 0) return '12 am';
  if (h === 12) return 'noon';
  return h < 12 ? `${h} am` : `${h - 12} pm`;
};
