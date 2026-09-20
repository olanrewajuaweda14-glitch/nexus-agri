import React, { useState } from 'react';
import {
  Sprout,
  ArrowRight,
  Database,
  Cpu,
  CheckCircle2,
  Sparkles,
  Layers,
  TrendingUp,
  ShieldCheck,
  Activity,
  Compass,
} from 'lucide-react';
import { Farm } from '../../types';

interface FirstSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  farm: Farm;
}

export const FirstSessionModal: React.FC<FirstSessionModalProps> = ({ isOpen, onClose, farm }) => {
  const [activeLayer, setActiveLayer] = useState<0 | 1 | 2>(0);

  if (!isOpen) return null;

  const LAYERS = [
    {
      step: 'LAYER 1',
      title: 'DATA',
      subtitle: 'Understand what is happening',
      desc: `NEXUS aggregates 7 continuous raw data streams for ${farm.name} — including Sentinel-2 multispectral vegetation indices (NDVI), SoilGrids chemical profiles, ECMWF 7-day microclimate forecasts, and spot commodity market prices.`,
      icon: Database,
      accent: 'emerald',
      badge: 'GROUND TRUTH TELEMETRY',
      items: [
        `Sentinel-2 MSI scanning ${farm.sizeHa} ha parcel`,
        `Root-zone moisture calibrated at ${farm.soil.moisturePercent}%`,
        `ECMWF weather window: 7-day rain distribution`,
      ],
    },
    {
      step: 'LAYER 2',
      title: 'INTELLIGENCE',
      subtitle: 'Understand what it means',
      desc: 'Raw measurements are contextualized through deterministic agronomic and economic models. We translate physical millimeters of rain and chemical N-P-K ratios into physiological crop response and operational impact.',
      icon: Cpu,
      accent: 'cyan',
      badge: 'DETERMINISTIC CONTEXT',
      items: [
        `${farm.currentCrop} growth stage: ${farm.growthStage}`,
        'Spraying window validation (wind speed + dew point)',
        'Break-even yield threshold vs local wholesale market prices',
      ],
    },
    {
      step: 'LAYER 3',
      title: 'DECISION',
      subtitle: 'Know what to do next',
      desc: 'Instead of passive charts, NEXUS synthesizes these layers into clear, explainable actions: whether to irrigate today or wait 48 hours, when to apply foliar nutrients, and how to protect projected gross margins.',
      icon: Compass,
      accent: 'amber',
      badge: 'ACTIONABLE DECISION ENGINE',
      items: [
        'Tactical input & irrigation scheduling with clear rationale',
        'Gross margin & scenario simulation sandbox',
        'Multimodal pathology photo diagnostics for foliar symptoms',
      ],
    },
  ];

  const current = LAYERS[activeLayer];
  const IconComponent = current.icon;

  const handleNext = () => {
    if (activeLayer < 2) {
      setActiveLayer((prev) => (prev + 1) as any);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
            <Sprout className="w-3.5 h-3.5" />
            <span>WELCOME TO NEXUS AGRI</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How your decision engine works
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Configured for <strong className="text-white">{farm.name}</strong> ({farm.sizeHa} ha of {farm.currentCrop}).
          </p>
        </div>

        {/* 3-Layer Step Indicators */}
        <div className="relative z-10 grid grid-cols-3 gap-2 mb-6">
          {LAYERS.map((layer, idx) => {
            const isActive = activeLayer === idx;
            const isCompleted = activeLayer > idx;
            return (
              <button
                type="button"
                key={layer.title}
                onClick={() => setActiveLayer(idx as any)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-neutral-950 border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : isCompleted
                    ? 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                    : 'bg-neutral-950/30 border-neutral-800/60 text-neutral-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-emerald-400">{layer.step}</span>
                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <span className="font-extrabold text-xs text-white block">{layer.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Layer Deep Dive Card */}
        <div className="relative z-10 bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-neutral-400 block">{current.subtitle}</span>
                <span className="text-base font-bold text-white">{current.title} LAYER</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
              {current.badge}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-4">
            {current.desc}
          </p>

          <div className="space-y-1.5 border-t border-neutral-900 pt-3">
            {current.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-neutral-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="relative z-10 flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors font-semibold"
          >
            Skip briefing & enter workspace
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
          >
            <span>{activeLayer === 2 ? 'Launch Workspace' : 'Next Layer'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
