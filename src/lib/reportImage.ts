/**
 * The week's report as a picture (1080 × 1350, the shape WhatsApp shows
 * best), drawn on the phone: no server, no data used.
 */
import type { WeekReport } from './report';
import { eggTrend, pct, weekLabel } from './report';
import { naira } from './format';

const C = { ground: '#f4f6f1', forest: '#0f3d24', forestInk: '#e9f1ea', forestInk2: '#a9c2b0', maize: '#f2c230', ink: '#17231b', ink2: '#46534a', ink3: '#66726a', line: '#d9e0d7', leaf: '#1e6b3a', clay: '#b03a22', card: '#ffffff' };
const W = 1080;
const H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The logo mark: a sprout over three furrows, gold on the green band. */
function mark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 32, s / 32);
  ctx.fillStyle = C.maize;
  roundRect(ctx, 0, 0, 32, 32, 8);
  ctx.fill();
  ctx.strokeStyle = C.forest;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.6;
  for (const yy of [22, 17.5, 13]) {
    ctx.beginPath();
    ctx.moveTo(6, yy);
    ctx.lineTo(26, yy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.stroke(new Path2D('M16 25V11m0 0c0-3 2.5-5 6-5 0 3.5-2.5 5.5-6 5Zm0 3c0-2.6-2.2-4.4-5.2-4.4 0 3 2.2 4.8 5.2 4.4Z'));
  ctx.restore();
}

export async function reportImage(r: WeekReport): Promise<Blob> {
  // Use the app's typeface when it is available; the system sans otherwise.
  const family = await document.fonts
    ?.load('700 64px Andika')
    .then((f) => (f.length ? 'Andika' : 'sans-serif'))
    .catch(() => 'sans-serif') ?? 'sans-serif';
  const font = (weight: 400 | 700, size: number) => `${weight} ${size}px ${family}, sans-serif`;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  // Green band: who and when.
  ctx.fillStyle = C.forest;
  ctx.fillRect(0, 0, W, 330);
  mark(ctx, 72, 64, 56);
  ctx.fillStyle = C.forestInk2;
  ctx.font = font(700, 30);
  ctx.fillText('Nexus Agri', 144, 102);
  ctx.fillStyle = C.forestInk;
  ctx.font = font(700, 68);
  const name = wrap(ctx, r.farmName ?? 'My farm', W - 144)[0];
  ctx.fillText(name, 72, 216);
  ctx.fillStyle = C.maize;
  ctx.font = font(400, 36);
  ctx.fillText(`The week of ${weekLabel(r)}`, 72, 276);

  // The numbers, two to a row, only those that were recorded.
  const tiles: { label: string; value: string; note: string; tone?: string }[] = [];
  if (r.eggs) tiles.push({ label: 'Eggs', value: r.eggs.total.toLocaleString('en-NG'), note: [r.eggs.rate != null ? `${pct(r.eggs.rate)} laying` : '', eggTrend(r) ?? ''].filter(Boolean).join(', ') });
  if (r.money.in || r.money.out) tiles.push({ label: r.money.net >= 0 ? 'Money ahead' : 'Money behind', value: naira(Math.abs(r.money.net), true), note: `In ${naira(r.money.in, true)}, out ${naira(r.money.out, true)}`, tone: r.money.net >= 0 ? C.leaf : C.clay });
  if (r.rainMm != null) tiles.push({ label: 'Rain', value: `${Math.round(r.rainMm)} mm`, note: 'Over the 7 days' });
  // Birds, goats and fish don't add up to one number, so the tile is about losses and the counts go underneath.
  if (r.animals.length) tiles.push({ label: 'Animals lost', value: r.losses ? r.losses.toLocaleString('en-NG') : 'None', note: r.animals.map((a) => a.head).join(', '), tone: r.losses ? C.clay : undefined });

  const pad = 72;
  const gap = 28;
  const tw = (W - pad * 2 - gap) / 2;
  const th = 230;
  tiles.slice(0, 4).forEach((t, i) => {
    const x = pad + (i % 2) * (tw + gap);
    const y = 380 + Math.floor(i / 2) * (th + gap);
    ctx.fillStyle = C.card;
    roundRect(ctx, x, y, tw, th, 28);
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = C.ink2;
    ctx.font = font(700, 32);
    ctx.fillText(t.label, x + 36, y + 62);
    ctx.fillStyle = t.tone ?? C.ink;
    ctx.font = font(700, 76);
    ctx.fillText(wrap(ctx, t.value, tw - 72)[0], x + 36, y + 150);
    ctx.fillStyle = C.ink3;
    ctx.font = font(400, 28);
    ctx.fillText(wrap(ctx, t.note, tw - 72)[0] ?? '', x + 36, y + 196);
  });

  // Fields and animals, one line each.
  let y = 380 + Math.ceil(Math.min(tiles.length, 4) / 2) * (th + gap) + 40;
  const rows = [...r.fields.map((f) => ({ a: f.name, b: f.line })), ...r.animals.map((a) => ({ a: a.name, b: a.head }))];
  for (const row of rows.slice(0, 5)) {
    if (y > H - 150) break;
    ctx.fillStyle = C.ink;
    ctx.font = font(700, 34);
    ctx.fillText(wrap(ctx, row.a, W - pad * 2)[0], pad, y);
    ctx.fillStyle = C.ink2;
    ctx.font = font(400, 32);
    ctx.fillText(wrap(ctx, row.b, W - pad * 2)[0], pad, y + 44);
    y += 104;
  }

  ctx.fillStyle = C.ink3;
  ctx.font = font(400, 26);
  ctx.fillText('Recorded with Nexus Agri. Only what was written down is counted.', pad, H - 64);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the report'))), 'image/png'));
}
