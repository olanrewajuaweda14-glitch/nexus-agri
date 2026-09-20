import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Shield,
  CloudRain,
  Droplets,
  Sprout,
  Bug,
  TrendingUp,
  DollarSign,
  Layers,
  Info,
} from 'lucide-react';
import { Farm, RiskAssessment, AppNavigationTab } from '../types';
import { RiskService } from '../services/riskService';
import { RISK_ASSESSMENTS } from '../data/mockData';

interface RiskCenterPageProps {
  activeFarm: Farm;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const RiskCenterPage: React.FC<RiskCenterPageProps> = ({ activeFarm, onNavigate }) => {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('risk-pest');

  // Compute transparent deterministic risk model
  const riskProfile = useMemo(() => {
    return RiskService.evaluateFarmRisk(activeFarm);
  }, [activeFarm]);

  const selectedAssessment =
    riskProfile.activeAssessments.find((a) => a.id === selectedAssessmentId) ||
    riskProfile.activeAssessments[0];

  const getCategoryIcon = (name: string) => {
    if (name.includes('Water')) return <Droplets className="w-5 h-5 text-sky-400" />;
    if (name.includes('Atmospheric')) return <CloudRain className="w-5 h-5 text-indigo-400" />;
    if (name.includes('Crop') || name.includes('Pest')) return <Bug className="w-5 h-5 text-rose-400" />;
    if (name.includes('Pedology') || name.includes('Fertility')) return <Sprout className="w-5 h-5 text-emerald-400" />;
    if (name.includes('Market')) return <TrendingUp className="w-5 h-5 text-amber-400" />;
    return <DollarSign className="w-5 h-5 text-teal-400" />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              Early Warning &amp; Threat Surveillance
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">{activeFarm.name} ({activeFarm.currentCrop})</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span>Farm Risk Center &amp; Mitigation Protocols</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Transparent multi-factor risk model evaluating Weather, Water, Soil, Crop/Pest, Market, and Financial
            vulnerabilities with concrete actionable protocols.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('ai-advisor')}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask AI Mitigation Advisor</span>
        </button>
      </div>

      {/* Composite Risk Score Banner (Section 11 requirement) */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-neutral-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-neutral-100">Overall Farm Composite Risk Assessment</h2>
            </div>
            <p className="text-xs text-neutral-400 max-w-2xl">{riskProfile.summary}</p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-mono text-neutral-500 uppercase block">Composite Threat Index</span>
              <span className={`text-3xl font-bold font-mono ${
                riskProfile.overallRiskRating === 'High'
                  ? 'text-rose-400'
                  : riskProfile.overallRiskRating === 'Medium'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {riskProfile.overallRiskScore} <span className="text-xs text-neutral-500">/ 100</span>
              </span>
            </div>

            <span className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs border ${
              riskProfile.overallRiskRating === 'High'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : riskProfile.overallRiskRating === 'Medium'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              {riskProfile.overallRiskRating} Risk
            </span>
          </div>
        </div>

        {/* Calculation Formula Summary */}
        <div className="pt-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-neutral-400 font-mono">
          <span className="text-neutral-500 font-bold uppercase">Weight Formula:</span>
          <span>Water (25%)</span>
          <span>&bull;</span>
          <span>Weather (20%)</span>
          <span>&bull;</span>
          <span>Crop/Pest (20%)</span>
          <span>&bull;</span>
          <span>Soil (15%)</span>
          <span>&bull;</span>
          <span>Market (10%)</span>
          <span>&bull;</span>
          <span>Financial (10%)</span>
        </div>
      </div>

      {/* 6 Transparent Category Cards: Weather, Water, Soil, Crop/Pest, Market, Financial */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {riskProfile.categories.map((cat, idx) => {
          const isHigh = cat.severity === 'High';
          const isMed = cat.severity === 'Medium';

          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(cat.name)}
                    <h3 className="text-sm font-bold text-neutral-100">{cat.name}</h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                      isHigh
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isMed
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {cat.score}/100 &bull; {cat.severity}
                  </span>
                </div>

                {/* Score progress bar */}
                <div className="w-full h-1.5 rounded-full bg-neutral-800 mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>

                <div className="space-y-2 mt-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">Key Driver:</span>
                    <p className="text-neutral-300 text-[11.5px] leading-relaxed">{cat.keyDriver}</p>
                  </div>

                  <div className="space-y-0.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      What the farmer should do:
                    </span>
                    <p className="text-neutral-200 text-[11.5px] leading-relaxed font-medium bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                      {cat.action}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Field Threat Surveillance Dossier */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              Operational Protocols
            </span>
            <h3 className="text-base font-bold text-neutral-100 mt-0.5">
              Specific Pathogen &amp; Climate Threat Dossier
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {riskProfile.activeAssessments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAssessmentId(a.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedAssessmentId === a.id
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                {a.category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          {/* Left: Summary and Impact (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm text-neutral-100">{selectedAssessment.title}</strong>
                <span className="text-xs font-mono font-bold text-rose-400">
                  {selectedAssessment.potentialImpact}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 text-[10px] block">Probability</span>
                  <strong className="text-neutral-200 font-mono">{selectedAssessment.probabilityPercent}%</strong>
                </div>
                <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 text-[10px] block">Severity</span>
                  <strong className="text-amber-400 font-mono">{selectedAssessment.severity}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                  Early Warning Trigger:
                </span>
                <p className="text-[11.5px] text-neutral-300 leading-relaxed">
                  {selectedAssessment.earlyWarning}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Step-by-Step Prescribed Mitigation (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="p-4 rounded-xl bg-neutral-950 border border-emerald-500/30 space-y-3">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                Prescribed Standard Operating Procedure (SOP)
              </span>

              <div className="space-y-2">
                {selectedAssessment.mitigationSteps.map((step, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-[11.5px] flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {sIdx + 1}
                    </span>
                    <span className="text-neutral-200 leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
