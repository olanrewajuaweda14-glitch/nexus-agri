export const naira = (n: number, compact = false) => {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (compact) {
    if (a >= 1e9) return `${sign}₦${(a / 1e9).toFixed(1)}bn`;
    if (a >= 1e6) return `${sign}₦${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}m`;
    if (a >= 1e3) return `${sign}₦${Math.round(a / 1e3)}k`;
  }
  return `${sign}₦${Math.round(a).toLocaleString('en-NG')}`;
};

export const mm = (n: number) => `${n < 10 && n > 0 ? n.toFixed(1) : Math.round(n)} mm`;

export const ago = (iso: string | null) => {
  if (!iso) return '';
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

/** WMO weather interpretation codes → short label. */
export const wmo = (code: number | null) => {
  if (code == null) return '—';
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Fog / haze';
  if (code <= 57) return 'Drizzle';
  if (code <= 65) return 'Rain';
  if (code <= 67) return 'Freezing rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorm';
};
