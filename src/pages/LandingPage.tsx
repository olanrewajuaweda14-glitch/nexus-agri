import React from 'react';
import {
  Sprout,
  Play,
  ArrowRight,
  Shield,
  CheckCircle2,
  Cpu,
  Layers,
  CloudSun,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Sparkles,
  Bot,
  Trees,
  Check,
  Globe2,
  FileText,
} from 'lucide-react';
import { Farm, AppNavigationTab } from '../types';

interface LandingPageProps {
  activeFarm: Farm;
  onNavigate: (tab: AppNavigationTab) => void;
  onOpenOnboarding: () => void;
  onOpenDemoStory: () => void;
  onToggleJudgeMode: () => void;
  judgeMode: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  activeFarm,
  onNavigate,
  onOpenOnboarding,
  onOpenDemoStory,
  onToggleJudgeMode,
  judgeMode,
}) => {
  return (
    <div className="space-y-16 pb-20 max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="text-center pt-8 sm:pt-14 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>NEXUS AGRI &bull; Autonomous Agricultural Intelligence Engine</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-100 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
          Transforming African Soil, Weather &amp; Satellite Data into{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            Profitable Farm Decisions
          </span>
        </h1>

        <p className="text-sm sm:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          NEXUS bridges high-resolution Sentinel-2 earth observation, ECMWF atmospheric forecasts,
          SoilGrids pedology, and wholesale grain exchange prices with deterministic financial arithmetic
          and multimodal Gemini AI.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onOpenDemoStory}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-emerald-950/60 transition-all hover:scale-102"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Show Me How NEXUS Works</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('overview')}
            className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-100 font-bold text-sm border border-neutral-700 flex items-center gap-2 transition-all hover:scale-102"
          >
            <span>Launch Field Command Center</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            type="button"
            onClick={onOpenOnboarding}
            className="px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-emerald-400 font-semibold text-sm border border-emerald-500/40 flex items-center gap-2 transition-colors"
          >
            <Trees className="w-4 h-4" />
            <span>Onboard Your Farm</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!judgeMode) onToggleJudgeMode();
              onNavigate('my-farms');
            }}
            className="px-4 py-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-sm border border-amber-500/40 flex items-center gap-2 transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>{judgeMode ? 'Judge Mode Active &rarr;' : 'Enter Hackathon Judge Mode'}</span>
          </button>
        </div>

        {/* Live Farm Status Pill */}
        <div className="pt-2">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connected Demo Farm:</span>
            <strong className="text-neutral-100">{activeFarm.name}</strong>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-emerald-400 font-mono font-semibold">{activeFarm.currentCrop} ({activeFarm.sizeHa} ha)</span>
            <button
              type="button"
              onClick={() => onNavigate('my-farms')}
              className="text-neutral-400 hover:text-white underline text-[11px] ml-1"
            >
              Switch Farm
            </button>
          </div>
        </div>
      </section>

      {/* 8 Core Functional Subsystems Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-100">
            One Unified Operating System for Modern Agriculture
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
            Every module directly informs the next. Zero disconnected pages, zero placeholder stubs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Cpu,
              title: 'Farm Intelligence Core',
              desc: 'Continuous multi-subsystem diagnostic score aggregating soil, satellite, weather, and economics.',
              tab: 'farm-intelligence' as AppNavigationTab,
              badge: 'Score 82/100',
            },
            {
              icon: CloudSun,
              title: 'Spraying Windows',
              desc: 'Deterministic spraying suitability algorithm based on wind speeds (<10 km/h), dew point, and rainfall.',
              tab: 'weather' as AppNavigationTab,
              badge: 'Window: Tomorrow 07:00 AM',
            },
            {
              icon: Layers,
              title: 'Pedology & Soil Chemistry',
              desc: 'NPK macronutrient balance, pH toxicity prevention, and lab test calibration with clear data trust badges.',
              tab: 'soil' as AppNavigationTab,
              badge: 'pH 6.4 Favorable',
            },
            {
              icon: Globe2,
              title: 'Sentinel-2 Satellite Biomass',
              desc: '10-meter multispectral NDVI, NDWI moisture indices, and localized field quadrant anomaly detection.',
              tab: 'satellite' as AppNavigationTab,
              badge: 'NDVI 0.81 (Vigorous)',
            },
            {
              icon: Sprout,
              title: 'Crop Advisor & Matching',
              desc: 'Algorithmic matching of varieties like SAMMAZ-52 Maize with 1-click adoption onto your active farm.',
              tab: 'crop-advisor' as AppNavigationTab,
              badge: '94% Match',
            },
            {
              icon: TrendingUp,
              title: 'Terminal Off-Take Arbitrage',
              desc: 'Bodija wholesale commodity quotes and financial calculations for holding grain in hermetic PICS bags.',
              tab: 'markets' as AppNavigationTab,
              badge: '₦480,000 / ton',
            },
            {
              icon: DollarSign,
              title: 'Deterministic Unit Economics',
              desc: '9 explicit cost inputs producing transparent break-even yields (1.08 t/ha) and net equity margins.',
              tab: 'economics' as AppNavigationTab,
              badge: '58.2% Gross Margin',
            },
            {
              icon: Bot,
              title: 'Multimodal Gemini AI Advisor',
              desc: 'Grounded agronomic chat with verifiable citations, actionable task checklists, and image diagnostics.',
              tab: 'ai-advisor' as AppNavigationTab,
              badge: 'Gemini 3.8 Flash',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigate(item.tab)}
                className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-900 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-neutral-100 group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                  <span>Open Module</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How NEXUS Makes Decisions (Step-by-Step Flow) */}
      <section className="p-8 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Agronomic Decision Architecture
            </span>
            <h2 className="text-2xl font-bold text-neutral-100 mt-1">
              How NEXUS AGRI Generates Concrete Action Plans
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenDemoStory}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors self-start sm:self-auto"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Interactive Walkthrough</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
          <div className="space-y-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center border border-emerald-500/40">
              1
            </div>
            <h4 className="text-sm font-bold text-neutral-200">Continuous Ingestion</h4>
            <p className="text-neutral-400 leading-relaxed">
              Pulls ECMWF rainfall outlooks, Copernicus Sentinel-2 multispectral passes, and AFEX commodity prices.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center border border-emerald-500/40">
              2
            </div>
            <h4 className="text-sm font-bold text-neutral-200">Deterministic Arithmetic</h4>
            <p className="text-neutral-400 leading-relaxed">
              Applies exact agronomic rules and financial models. Break-even yields and spraying windows never hallucinate numbers.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center border border-emerald-500/40">
              3
            </div>
            <h4 className="text-sm font-bold text-neutral-200">Risk Stress-Testing</h4>
            <p className="text-neutral-400 leading-relaxed">
              Evaluates drought sensitivity, sudden market price collapses, and pest vector emergence across field zones.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center border border-emerald-500/40">
              4
            </div>
            <h4 className="text-sm font-bold text-neutral-200">Executable Protocol</h4>
            <p className="text-neutral-400 leading-relaxed">
              Gemini AI synthesizes findings into prioritized action steps with confidence ratings and printable bank dossiers.
            </p>
          </div>
        </div>
      </section>

      {/* Scientific & Data Grounding Credibility */}
      <section className="text-center space-y-4">
        <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-widest block">
          Integrated Data Standards &amp; Agronomic Partners
        </span>
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400 font-medium">
          <span className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
            European Space Agency &bull; Copernicus Sentinel-2
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
            ECMWF High-Resolution Meteorology
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
            IITA (International Institute of Tropical Agriculture)
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
            ISRIC World Soil Information (SoilGrids 250m)
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
            AFEX Commodities Exchange Index
          </span>
        </div>
      </section>
    </div>
  );
};
