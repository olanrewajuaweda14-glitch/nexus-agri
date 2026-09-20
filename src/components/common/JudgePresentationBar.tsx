import React from 'react';
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  X,
  Sparkles,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { AppNavigationTab } from '../../types';

export interface JudgeStep {
  stepNumber: number;
  tab: AppNavigationTab;
  title: string;
  stageName: string;
  judgeHighlight: string;
  agronomicBasis: string;
}

export const JUDGE_STEPS: JudgeStep[] = [
  {
    stepNumber: 1,
    tab: 'my-farms',
    stageName: 'Farm Portfolio & Registry',
    title: '1. Multi-Parcel Management & Boundary GIS',
    judgeHighlight: 'Demonstrates real farm registration, GPS boundaries, soil classifications, and state persistence.',
    agronomicBasis: 'Farms vary by agro-ecological zone; Oyo River Basin (5.2 ha) provides rich baseline data.',
  },
  {
    stepNumber: 2,
    tab: 'overview',
    stageName: 'Command Center & Telemetry',
    title: '2. Field Command & Real-Time KPIs',
    judgeHighlight: 'Synthesizes 8 real-time indicators with zero fake UI: health score, weather risk, break-even yield, and recent anomaly stream.',
    agronomicBasis: 'Farmers make rapid daily decisions based on composite indicators rather than isolated data points.',
  },
  {
    stepNumber: 3,
    tab: 'farm-health',
    stageName: 'Farm Health & Pathology',
    title: '3. Multi-Subsystem Health & Visual AI Pathology',
    judgeHighlight: 'Combines vegetative biomass, canopy water stress, and Gemini Multimodal crop pathology with sample test cases.',
    agronomicBasis: 'Visual chlorosis inspection combined with remote NDWI water stress detects issues before leaf wilting.',
  },
  {
    stepNumber: 4,
    tab: 'weather',
    stageName: 'Meteorology & Spraying',
    title: '4. Hyperlocal Weather & Spraying Windows',
    judgeHighlight: 'Deterministic calculation of the tomorrow 07:00 AM spraying window based on wind speed, dew point, and rainfall probability.',
    agronomicBasis: 'Spraying during morning calm prevents up to 40% drift loss and foliar chemical wash-off.',
  },
  {
    stepNumber: 5,
    tab: 'soil',
    stageName: 'Pedology & Soil Chemistry',
    title: '5. Soil Chemistry & Lab-Calibrated Diagnostics',
    judgeHighlight: 'Differentiates laboratory-verified samples vs SoilGrids 250m estimates with transparent data trust badges.',
    agronomicBasis: 'Soil pH of 6.4 ensures phosphorus and nitrogen bioavailability without aluminum toxicity.',
  },
  {
    stepNumber: 6,
    tab: 'satellite',
    stageName: 'Remote Sensing & GIS',
    title: '6. Sentinel-2 Multispectral Satellite Surveillance',
    judgeHighlight: 'NDVI (0.81), NDWI, and SAVI vegetation indices with localized field zone anomaly detection in Block B-2.',
    agronomicBasis: 'Copernicus satellite passes provide non-invasive biomass tracking across large acreage.',
  },
  {
    stepNumber: 7,
    tab: 'crop-advisor',
    stageName: 'Crop Suitability Matching',
    title: '7. Crop Suitability & Side-by-Side Comparison',
    judgeHighlight: 'Agronomic matching algorithm ranks candidate crops and allows 1-click adoption to update active farm projections.',
    agronomicBasis: 'Evaluates seasonal rainfall, soil pH tolerances, and duration to recommend SAMMAZ-52 Maize.',
  },
  {
    stepNumber: 8,
    tab: 'markets',
    stageName: 'Commodities & Off-Take',
    title: '8. Regional Wholesale Terminals & Storage Arbitrage',
    judgeHighlight: 'Calculates the financial payoff of holding grain in hermetic PICS bags vs spot field gate sale.',
    agronomicBasis: 'Post-harvest gluts depress prices by 20-30%; timely off-take unlocks higher farmer equity.',
  },
  {
    stepNumber: 9,
    tab: 'economics',
    stageName: 'Deterministic Unit Economics',
    title: '9. Deterministic Economics & Break-Even Analysis',
    judgeHighlight: 'Pure mathematical arithmetic engine calculating break-even yield (1.08 t/ha), gross margin (58.2%), and unit costs.',
    agronomicBasis: 'No guesswork: separates fixed vs variable input expenses to prevent cash flow bankruptcy.',
  },
  {
    stepNumber: 10,
    tab: 'simulator',
    stageName: 'Scenario Simulation',
    title: '10. Climate & Input Scenario Stress-Testing',
    judgeHighlight: 'Multi-scenario sensitivity matrix simulating drought deficit (-30%), price collapse, and irrigation pivots.',
    agronomicBasis: 'Prepares farmers for unpredictable climate anomalies before capital is deployed.',
  },
  {
    stepNumber: 11,
    tab: 'ai-advisor',
    stageName: 'AI Synthesis & Action',
    title: '11. Gemini AI Synthesis & Executable Action Plan',
    judgeHighlight: 'Context-grounded AI advisor with strict JSON formatting, tool citation, confidence score, and downloadable reports.',
    agronomicBasis: 'Translates analytical findings into clear, prioritized operational steps for field laborers.',
  },
];

interface JudgePresentationBarProps {
  currentTab: AppNavigationTab;
  onNavigate: (tab: AppNavigationTab) => void;
  onExitJudgeMode: () => void;
  onResetDemoData: () => void;
}

export const JudgePresentationBar: React.FC<JudgePresentationBarProps> = ({
  currentTab,
  onNavigate,
  onExitJudgeMode,
  onResetDemoData,
}) => {
  // Determine matching step
  const currentStepIndex = JUDGE_STEPS.findIndex((s) => s.tab === currentTab || (currentTab === 'intelligence' && s.tab === 'overview'));
  const activeStep = currentStepIndex >= 0 ? JUDGE_STEPS[currentStepIndex] : JUDGE_STEPS[0];
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  const handleNext = () => {
    const nextIndex = (activeIndex + 1) % JUDGE_STEPS.length;
    onNavigate(JUDGE_STEPS[nextIndex].tab);
  };

  const handlePrev = () => {
    const prevIndex = (activeIndex - 1 + JUDGE_STEPS.length) % JUDGE_STEPS.length;
    onNavigate(JUDGE_STEPS[prevIndex].tab);
  };

  return (
    <div className="bg-amber-950/90 border-b border-amber-500/40 text-neutral-100 px-4 py-2.5 shadow-xl sticky top-16 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Judge Badge + Step Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-xs font-bold font-mono tracking-wide">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>JUDGE WALKTHROUGH</span>
            <span className="text-amber-200">({activeIndex + 1}/{JUDGE_STEPS.length})</span>
          </div>

          <div className="relative inline-block">
            <select
              value={activeStep.tab}
              onChange={(e) => onNavigate(e.target.value as AppNavigationTab)}
              className="bg-neutral-900/90 text-neutral-100 border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-amber-400"
            >
              {JUDGE_STEPS.map((s) => (
                <option key={s.stepNumber} value={s.tab}>
                  {s.stepNumber}. {s.stageName}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-amber-200 font-medium hidden sm:inline truncate max-w-md">
            {activeStep.judgeHighlight}
          </span>
        </div>

        {/* Right: Controls (Prev, Next, Reset, Exit) */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            className="px-2.5 py-1 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold border border-amber-500/30 flex items-center gap-1 transition-colors"
            title="Previous Presentation Stage"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950 transition-colors"
            title="Next Presentation Stage"
          >
            <span>Next Stage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onResetDemoData}
            className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-amber-500/30 transition-colors"
            title="Reset All Farm & Market Data to Demonstration Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExitJudgeMode}
            className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-rose-950 text-neutral-400 hover:text-rose-300 border border-amber-500/30 transition-colors"
            title="Exit Judge Presentation Mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
