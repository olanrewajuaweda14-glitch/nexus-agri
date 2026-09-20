import React, { useState } from 'react';
import { ShieldCheck, Info, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { SoilDataSource } from '../../types';

interface DataTrustBadgeProps {
  sourceName?: string;
  sourceType?: SoilDataSource | 'satellite_remote' | 'meteorological_model' | 'market_index' | 'deterministic_engine' | string;
  confidenceScore?: number;
  lastUpdated?: string;
  assumptions?: string[];
  knownLimitations?: string[];
  verified?: boolean;
  className?: string;
}

export const DataTrustBadge: React.FC<DataTrustBadgeProps> = ({
  sourceName = 'FAOSTAT & Geospatial Satellite Index',
  sourceType = 'geospatial_estimate',
  confidenceScore = 82,
  lastUpdated = 'Recently verified',
  assumptions = ['Soil parameters estimated from geospatial grid (250m resolution)'],
  knownLimitations = ['Field laboratory soil testing recommended for high-precision micro-nutrient calibration'],
  verified = false,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);

  const getSourceLabel = () => {
    switch (sourceType) {
      case 'laboratory':
        return { text: 'Lab Verified Test', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'geospatial_estimate':
        return { text: 'Geospatial Estimate', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'meteorological_model':
        return { text: 'ECMWF / GFS Weather Model', color: 'bg-sky-500/10 text-sky-300 border-sky-500/30' };
      case 'satellite_remote':
        return { text: 'Sentinel-2 Multispectral (10m)', color: 'bg-teal-500/10 text-teal-300 border-teal-500/30' };
      case 'market_index':
        return { text: 'Commodity Exchange Index', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
      case 'deterministic_engine':
        return { text: 'Deterministic Agronomic Math', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      default:
        return { text: 'Verified Agronomic Data', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
    }
  };

  const badgeInfo = getSourceLabel();

  return (
    <div className={`text-xs border rounded-lg overflow-hidden transition-all bg-neutral-900/80 dark:bg-neutral-900/80 border-neutral-800 ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${badgeInfo.color}`}>
            {badgeInfo.text}
          </span>
          <span className="text-neutral-400 flex items-center gap-1 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Confidence: <strong className="text-neutral-200">{confidenceScore}%</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200">
          <span className="text-[11px] hidden sm:inline">Data Provenance</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 py-3 border-t border-neutral-800 space-y-2.5 bg-neutral-950/60">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-neutral-400 text-[11px] uppercase tracking-wider block font-semibold">Primary Source</span>
              <p className="text-neutral-200 text-xs font-medium mt-0.5">{sourceName}</p>
            </div>
            <div className="text-right">
              <span className="text-neutral-400 text-[11px] uppercase tracking-wider block font-semibold">Last Synchronized</span>
              <p className="text-neutral-300 text-xs font-mono mt-0.5">{lastUpdated}</p>
            </div>
          </div>

          <div>
            <span className="text-neutral-400 text-[11px] uppercase tracking-wider block font-semibold mb-1">Operational Assumptions</span>
            <ul className="space-y-1">
              {assumptions.map((a, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11.5px] text-neutral-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {knownLimitations && knownLimitations.length > 0 && (
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-1.5 text-amber-400 font-medium text-[11px] mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Transparency & Precision Boundaries
              </div>
              <ul className="space-y-0.5">
                {knownLimitations.map((lim, idx) => (
                  <li key={idx} className="text-[11px] text-amber-200/90 pl-5 list-disc">
                    {lim}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
