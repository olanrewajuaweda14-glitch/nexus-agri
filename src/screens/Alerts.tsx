import { CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import type { Alert, Severity } from '../lib/agenda';
import { useHub } from '../lib/hub';
import { useNav } from '../lib/nav';

const LOOK: Record<Severity, { Icon: typeof Info; bar: string; icon: string; group: string }> = {
  urgent: { Icon: CircleAlert, bar: 'bg-clay', icon: 'text-clay', group: 'Act now' },
  warn: { Icon: TriangleAlert, bar: 'bg-maize', icon: 'text-sun', group: 'Soon' },
  info: { Icon: Info, bar: 'bg-rain', icon: 'text-rain', group: 'Good to know' },
};

export function AlertRow({ alert, compact = false }: { alert: Alert; compact?: boolean }) {
  const nav = useNav();
  const { dismiss } = useHub();
  const look = LOOK[alert.severity];
  const open = () => {
    const t = alert.target;
    if (t.to === 'field') nav.openField(t.fieldId, t.tab);
    else if (t.to === 'group') nav.go('animals', { groupId: t.groupId });
    else if (t.to === 'store') nav.go('store', { itemId: t.itemId });
    else nav.backup();
  };
  return (
    <li className="relative flex overflow-hidden rounded-xl border border-line bg-card">
      <span className={`w-1.5 shrink-0 ${look.bar}`} aria-hidden />
      <button type="button" onClick={open} className="flex min-w-0 flex-1 gap-3 p-3.5 text-left hover:bg-paper">
        <look.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${look.icon}`} aria-hidden />
        <span className="min-w-0">
          <span className="block font-bold leading-snug">{alert.title}</span>
          {alert.where && <span className="block text-[14px] text-ink-3">{alert.where}</span>}
          {!compact && alert.detail && <span className="mt-1 block text-[15px] leading-relaxed text-ink-2">{alert.detail}</span>}
        </span>
      </button>
      <button type="button" onClick={() => dismiss(alert.id)} className="shrink-0 self-start p-3 text-ink-3 hover:text-ink" aria-label={`Dismiss "${alert.title}"`}>
        <X className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}

export function Alerts({ alerts, hidden }: { alerts: Alert[]; hidden: number }) {
  const { undismissAll } = useHub();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[32px] font-bold leading-tight">Alerts</h1>
        <p className="mt-1 max-w-prose text-ink-2">Worked out from the forecast, your animals' records and the store. Tap an alert to go to it; the cross hides it until something changes.</p>
      </header>
      {alerts.length === 0 && <p className="rounded-xl border border-line bg-card p-5 text-[17px]">Nothing needs attention right now.</p>}
      {(['urgent', 'warn', 'info'] as Severity[]).map((sev) => {
        const list = alerts.filter((a) => a.severity === sev);
        if (!list.length) return null;
        return (
          <section key={sev} aria-labelledby={`alerts-${sev}`} className="space-y-3">
            <h2 id={`alerts-${sev}`} className="text-[21px] font-bold">{LOOK[sev].group}</h2>
            <ul className="space-y-2">
              {list.map((a) => <AlertRow key={a.id} alert={a} />)}
            </ul>
          </section>
        );
      })}
      {hidden > 0 && (
        <button type="button" className="font-bold text-leaf hover:underline" onClick={undismissAll}>
          Show {hidden} hidden alert{hidden === 1 ? '' : 's'} again
        </button>
      )}
    </div>
  );
}
