import { useMemo, useState } from 'react';
import { Image, MessageSquareText } from 'lucide-react';
import type { Farm } from '../lib/types';
import type { Insights } from '../lib/useInsights';
import { addDays, localToday } from '../lib/dates';
import { naira } from '../lib/format';
import { allRecords } from '../lib/records';
import { farmMoney } from '../lib/ledger';
import { eggTrend, pct, reportText, weekLabel, weekReport } from '../lib/report';
import { reportImage } from '../lib/reportImage';
import { CROPS } from '../lib/crops';
import { useHub } from '../lib/hub';

/**
 * The last seven days in four numbers, ready to send: as a picture for a
 * WhatsApp group or a relative who helps pay for the farm, or as text.
 */
export function WeekCard({ farms, insights }: { farms: Farm[]; insights: Record<string, Insights> }) {
  const hub = useHub();
  const today = localToday();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const r = useMemo(() => {
    const money = farmMoney({ farms, recordsOf: allRecords, groups: hub.groups, events: hub.events, ledger: hub.ledger, stock: hub.stock, moves: hub.moves, from: addDays(today, -6), to: today });
    const first = farms.map((f) => insights[f.id]).find((i) => i?.derived.water);
    const fields = farms.map((f) => {
      const st = insights[f.id]?.stage;
      const crop = CROPS[f.crop].name;
      const line = !st ? crop : st.status === 'not-planted' ? `${crop}, planting in ${-st.dap} days` : st.status === 'mature' ? `${crop}, ready to harvest` : `${crop}, day ${st.dap}: ${st.name.toLowerCase()}`;
      return { name: f.name, line };
    });
    return weekReport({ today, farmName: hub.profile.farmName, groups: hub.groups, events: hub.events, money, rainMm: first?.derived.water?.rainLast7 ?? null, fields });
  }, [farms, insights, hub.groups, hub.events, hub.ledger, hub.stock, hub.moves, hub.profile.farmName, today]);

  const sendPicture = async () => {
    setBusy(true);
    setNote(null);
    try {
      const blob = await reportImage(r);
      const file = new File([blob], `nexus-agri-week-${r.to}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: reportText(r) }).catch(() => {});
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        setNote(`Saved ${file.name}. Send it from your photos or files.`);
      }
    } catch {
      setNote('Could not make the picture on this phone. Send it as text instead.');
    } finally {
      setBusy(false);
    }
  };
  const sendText = () => {
    const text = reportText(r);
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const stats = [
    r.eggs && { label: 'Eggs', value: r.eggs.total.toLocaleString('en-NG'), note: [r.eggs.rate != null ? `${pct(r.eggs.rate)} laying` : '', eggTrend(r) ?? ''].filter(Boolean).join(', ') },
    (r.money.in || r.money.out) && { label: r.money.net >= 0 ? 'Money ahead' : 'Money behind', value: naira(Math.abs(r.money.net), true), note: `in ${naira(r.money.in, true)}, out ${naira(r.money.out, true)}`, tone: r.money.net >= 0 ? 'text-leaf' : 'text-clay' },
    r.rainMm != null && { label: 'Rain', value: `${Math.round(r.rainMm)} mm`, note: 'over the 7 days' },
    r.animals.length > 0 && { label: 'Animals lost', value: r.losses ? String(r.losses) : 'None', note: r.sold ? `${r.sold} sold` : '', tone: r.losses ? 'text-clay' : undefined },
  ].filter(Boolean) as { label: string; value: string; note: string; tone?: string }[];

  if (!stats.length) return null;

  return (
    <section className="space-y-3" aria-labelledby="week-h">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="week-h" className="text-[21px] font-bold">The last 7 days</h2>
        <span className="text-sm text-ink-3">{weekLabel(r)}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-line bg-card p-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <dt className="eyebrow">{s.label}</dt>
            <dd className={`num text-2xl font-bold ${s.tone ?? ''}`}>{s.value}</dd>
            {s.note && <dd className="text-[13px] text-ink-3">{s.note}</dd>}
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost press" onClick={sendPicture} disabled={busy}>
          <Image className="h-4 w-4" aria-hidden /> {busy ? 'Making the picture…' : 'Send the week as a picture'}
        </button>
        <button type="button" className="btn btn-ghost press" onClick={sendText}>
          <MessageSquareText className="h-4 w-4" aria-hidden /> Send as text
        </button>
      </div>
      {note && <p role="status" className="text-sm text-ink-2">{note}</p>}
    </section>
  );
}
