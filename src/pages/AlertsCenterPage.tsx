import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Check,
  Trash2,
  Filter,
  ArrowRight,
  CloudSun,
  TrendingUp,
  Layers,
  Bug,
} from 'lucide-react';
import { AlertNotification, AppNavigationTab } from '../types';

interface AlertsCenterPageProps {
  alerts: AlertNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const AlertsCenterPage: React.FC<AlertsCenterPageProps> = ({
  alerts,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'warning' | 'unread'>('all');

  const filteredAlerts = alerts.filter((a) => {
    if (selectedFilter === 'critical') return a.severity === 'critical';
    if (selectedFilter === 'warning') return a.severity === 'warning';
    if (selectedFilter === 'unread') return !a.read;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'weather':
        return CloudSun;
      case 'market':
        return TrendingUp;
      case 'soil':
        return Layers;
      case 'pest':
        return Bug;
      default:
        return Bell;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              Surveillance Dispatch
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">Real-Time Operational Flags</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <Bell className="w-6 h-6 text-amber-400" />
            <span>Alerts &amp; Operational Reminders</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Real-time threshold notifications triggered by meteorological forecasts, commodity exchange shifts, and
            satellite biomass anomalies.
          </p>
        </div>

        <button
          type="button"
          onClick={onMarkAllRead}
          className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-bold border border-neutral-700 flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-neutral-500 font-bold uppercase text-[11px] mr-1">Filter:</span>
        {(['all', 'unread', 'critical', 'warning'] as const).map((filterKey) => (
          <button
            key={filterKey}
            type="button"
            onClick={() => setSelectedFilter(filterKey)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${
              selectedFilter === filterKey
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {filterKey}
          </button>
        ))}
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const Icon = getIcon(alert.type);
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  !alert.read
                    ? isCritical
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-neutral-900 border-emerald-500/40'
                    : 'bg-neutral-900/60 border-neutral-800'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-rose-950 border border-rose-500/50 text-rose-400'
                        : isWarning
                        ? 'bg-amber-950 border border-amber-500/50 text-amber-400'
                        : 'bg-emerald-950 border border-emerald-500/50 text-emerald-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-100">{alert.title}</span>
                      {!alert.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      <span className="text-[10px] font-mono text-neutral-500">&bull;</span>
                      <span className="text-[10px] font-mono text-neutral-500">{alert.timestamp}</span>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">{alert.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {alert.actionRoute && (
                    <button
                      type="button"
                      onClick={() => onNavigate(alert.actionRoute as AppNavigationTab)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-emerald-400 flex items-center gap-1 transition-colors"
                    >
                      <span>{alert.actionLabel || 'Inspect'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {!alert.read && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(alert.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-neutral-500 text-xs bg-neutral-900 border border-neutral-800 rounded-2xl">
            No alerts matching the selected filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
