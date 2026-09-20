import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  subValue?: string;
  badgeText?: string;
  badgeTone?: 'positive' | 'warning' | 'danger' | 'neutral' | 'info';
  trendDirection?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  subValue,
  badgeText,
  badgeTone = 'neutral',
  trendDirection,
  trendLabel,
  icon: Icon,
  onClick,
  className = '',
}) => {
  const getBadgeClass = () => {
    switch (badgeTone) {
      case 'positive':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'danger':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'info':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  const isClickable = !!onClick;

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative p-4 rounded-xl border border-neutral-800 bg-neutral-900/90 hover:border-neutral-700 transition-all ${
        isClickable ? 'cursor-pointer hover:bg-neutral-850 hover:shadow-lg' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          {title}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-neutral-800/80 text-neutral-300 border border-neutral-700/50">
            <Icon className="w-4 h-4 text-emerald-400" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-neutral-100">
            {value}
          </div>
          {subValue && (
            <div className="text-xs text-neutral-400 mt-1 font-medium">
              {subValue}
            </div>
          )}
        </div>

        {badgeText && (
          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${getBadgeClass()}`}>
            {badgeText}
          </span>
        )}
      </div>

      {(trendDirection || trendLabel) && (
        <div className="mt-3 pt-2.5 border-t border-neutral-800/70 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1 font-medium">
            {trendDirection === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />}
            {trendDirection === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
            {trendDirection === 'neutral' && <Minus className="w-3.5 h-3.5 text-neutral-400" />}
            <span
              className={
                trendDirection === 'up'
                  ? 'text-emerald-400 font-semibold'
                  : trendDirection === 'down'
                  ? 'text-rose-400 font-semibold'
                  : 'text-neutral-300'
              }
            >
              {trendLabel}
            </span>
          </div>
          {isClickable && (
            <span className="text-[11px] text-neutral-400 hover:text-emerald-400 flex items-center">
              Inspect &rarr;
            </span>
          )}
        </div>
      )}
    </div>
  );
};
