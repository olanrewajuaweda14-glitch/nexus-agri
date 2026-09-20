import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  CloudSun,
  Activity,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Farm, WeatherData, AppNavigationTab } from '../types';
import { DataTrustBadge } from '../components/common/DataTrustBadge';

interface FarmIntelligencePageProps {
  activeFarm: Farm;
  weather: WeatherData;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const FarmIntelligencePage: React.FC<FarmIntelligencePageProps> = ({
  activeFarm,
  weather,
  onNavigate,
}) => {
  const [selectedPillar, setSelectedPillar] = useState<'soil' | 'weather' | 'crop' | 'market' | 'economics' | 'risk'>('soil');

  const pillars = [
    {
      id: 'soil',
      title: 'Soil Subsystem',
      score: 81,
      tone: 'good',
      summary: 'pH 6.4 is within optimal range; topsoil moisture at 22.4% suggests irrigation watch.',
      driver: 'pH 6.4, CEC 14.8, N 82kg/ha, moisture 22.4%',
      tabTarget: 'soil',
    },
    {
      id: 'weather',
      title: 'Atmospheric Subsystem',
      score: 90,
      tone: 'excellent',
      summary: 'Normal-to-above rainfall expected (38.6mm); daytime temperatures below heat-stress threshold.',
      driver: 'ECMWF 7-Day rain 38.6mm, ET0 4.1 mm/day',
      tabTarget: 'weather',
    },
    {
      id: 'crop',
      title: 'Crop Health (Biomass)',
      score: 86,
      tone: 'excellent',
      summary: 'Canopy NDVI at 0.81 reflects vigorous photosynthetic uptake; 1 anomaly detected in NW block.',
      driver: 'Sentinel-2 NDVI 0.81, NDWI 0.27',
      tabTarget: 'satellite',
    },
    {
      id: 'market',
      title: 'Market Viability',
      score: 85,
      tone: 'good',
      summary: 'White Maize wholesale spot quotes up +4.2% at Bodija wholesale hub; forward demand strong.',
      driver: '₦480,000 / ton spot quote, rising trend',
      tabTarget: 'markets',
    },
    {
      id: 'economics',
      title: 'Gross Margin & ROI',
      score: 74,
      tone: 'moderate',
      summary: 'Projected net margin is 58.2%; mechanical pumping fuel expenditures require careful budgeting.',
      driver: 'Expected Rev ₦9.12M vs Input Cost ₦2.60M',
      tabTarget: 'economics',
    },
    {
      id: 'risk',
      title: 'Composite Farm Risk',
      score: 72,
      tone: 'moderate',
      summary: 'Medium overall risk driven by localized soil moisture deficit and regional pest emergence.',
      driver: 'Pest vector scouting + moisture fluctuation',
      tabTarget: 'risk',
    },
  ];

  const overallScore = Math.round(
    pillars.reduce((acc, p) => acc + p.score, 0) / pillars.length
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Diagnostic Core
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">{activeFarm.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <Cpu className="w-6 h-6 text-emerald-400" />
            <span>Farm Intelligence System</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Multi-spectral composite analysis aggregating physical soil chemistry, remote satellite sensing,
            atmospheric modeling, and financial viability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('ai-advisor')}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask AI to Explain Score</span>
        </button>
      </div>

      {/* Large Hero Score Banner (Section 10) */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            {/* Circular SVG Gauge */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-neutral-800 stroke-current"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-emerald-500 stroke-current transition-all duration-1000"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallScore / 100)}`}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold font-mono text-neutral-100 leading-none">
                {overallScore}
              </span>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mt-0.5">
                / 100
              </span>
            </div>
          </div>

          <div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Optimal Operational Condition
            </span>
            <h2 className="text-xl font-bold text-neutral-100 mt-1">Farm Intelligence Score</h2>
            <p className="text-xs text-neutral-300 max-w-xl mt-1 leading-relaxed">
              Your farm ranks in the top 15% of regional productivity benchmarks. Favorable weather forecasts
              and high market prices bolster your position, with soil moisture management being the sole actionable
              bottleneck.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] block">Current Crop</span>
            <strong className="text-neutral-200">{activeFarm.currentCrop}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] block">Crop Stage</span>
            <strong className="text-neutral-200">{activeFarm.growthStage}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] block">Irrigation System</span>
            <strong className="text-neutral-200">{activeFarm.irrigationType}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] block">Field Extent</span>
            <strong className="text-neutral-200">{activeFarm.sizeHa} Hectares</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] block">Days in Ground</span>
            <strong className="text-neutral-200">{activeFarm.daysSincePlanting} Days</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
            <span className="text-neutral-500 text-[10px] block">Target Yield</span>
            <strong className="text-emerald-400 font-mono">{activeFarm.estimatedYieldTonsPerHa} t/ha</strong>
          </div>
        </div>
      </div>

      {/* 6 Subsystem Pillar Cards (Clickable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pillars.map((pillar) => {
          const isSelected = selectedPillar === pillar.id;
          return (
            <div
              key={pillar.id}
              onClick={() => setSelectedPillar(pillar.id as any)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-neutral-850 border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                  : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-200">{pillar.title}</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-neutral-800 text-emerald-400 border border-neutral-700">
                  {pillar.score}/100
                </span>
              </div>

              {/* Mini Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden mb-3">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${pillar.score}%` }}
                />
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">{pillar.summary}</p>

              <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500 truncate max-w-[170px]">{pillar.driver}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(pillar.tabTarget as AppNavigationTab);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center"
                >
                  Deep-dive &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Pillar Detailed Inspector */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-neutral-100 capitalize">
              {selectedPillar} Subsystem Analytical Detail
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(selectedPillar as any)}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>Open Dedicated {selectedPillar} Module</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <span className="font-semibold text-neutral-200 block text-[11px] uppercase tracking-wider">
              Diagnostic Observations
            </span>
            <ul className="space-y-1.5 text-neutral-300">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>Primary variables are in compliance with SAMMAZ-52 Maize physiological guidelines.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>Continuous monitoring advised for moisture retention until Monday convective rain arrival.</span>
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <span className="font-semibold text-neutral-200 block text-[11px] uppercase tracking-wider">
              Decision Rule Attribution
            </span>
            <p className="text-neutral-400 leading-relaxed">
              Weights applied: Soil Chemistry (20%), Atmospheric Conditions (25%), Canopy Reflectance (20%),
              Market Off-take Liquidity (20%), Economic Resilience (15%).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
