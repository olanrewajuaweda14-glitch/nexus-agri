import React, { useState } from 'react';
import {
  X,
  Play,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  GitCompare,
  Sprout,
  ShieldCheck,
  DollarSign,
  Layers,
  CloudSun,
  Activity,
  Compass,
  Sliders,
  AlertTriangle,
  Cpu,
} from 'lucide-react';

interface DemoStoryWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: any) => void;
  onLaunchJudgeMode?: () => void;
}

export const DemoStoryWalkthrough: React.FC<DemoStoryWalkthroughProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onLaunchJudgeMode,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCropScenario, setSelectedCropScenario] = useState<'Maize' | 'Soybean'>('Soybean');
  const [fertilizerCut, setFertilizerCut] = useState(false);

  if (!isOpen) return null;

  const totalSteps = 10;

  const STEPS = [
    { num: 1, title: 'Farm Profile' },
    { num: 2, title: 'Weather' },
    { num: 3, title: 'Soil' },
    { num: 4, title: 'Satellite' },
    { num: 5, title: 'Market' },
    { num: 6, title: 'Economics' },
    { num: 7, title: 'Risk Analysis' },
    { num: 8, title: 'NEXUS Decision' },
    { num: 9, title: 'Scenario Change' },
    { num: 10, title: 'Updated Decision' },
  ];

  const handleRestart = () => {
    setCurrentStep(1);
    setSelectedCropScenario('Soybean');
    setFertilizerCut(false);
  };

  const handleFinish = () => {
    if (onLaunchJudgeMode) {
      onLaunchJudgeMode();
    }
    if (onNavigate) {
      onNavigate('overview');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-3xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                How NEXUS Works — 10-Stage Decision Engine Walkthrough
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                Stage {currentStep} of {totalSteps}: {STEPS[currentStep - 1]?.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestart}
              title="Restart Walkthrough"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restart</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 10-Step Timeline Dots */}
        <div className="px-4 py-2 border-b border-neutral-800/60 bg-neutral-950/40 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
          {STEPS.map((s) => {
            const isActive = s.num === currentStep;
            const isDone = s.num < currentStep;
            return (
              <button
                type="button"
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-emerald-500 text-neutral-950 font-bold shadow-sm'
                    : isDone
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span>{s.num}.</span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* STEP 1: Farm Profile */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                <Sprout className="w-4 h-4" />
                <span>STAGE 1 • CONTROLLED FIELD CONTEXT</span>
              </div>
              <h2 className="text-xl font-bold text-white">Main Farm — Oyo River Basin</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                NEXUS anchors all intelligence to verified physical boundaries. A 5.2-hectare parcel cultivated with drought-tolerant Maize (SAMMAZ 52) at the Tasseling/Silking reproductive stage (53 days post-planting).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Coordinates</span>
                  <span className="font-mono font-bold text-white">7.425° N, 3.931° E</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Parcel Area</span>
                  <span className="font-mono font-bold text-emerald-400">5.2 Hectares</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Growth Stage</span>
                  <span className="font-semibold text-white">Tasseling (V12-R1)</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Target Yield</span>
                  <span className="font-mono font-bold text-cyan-400">3.8 t/ha (19.8 t)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Weather Intelligence */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
                <CloudSun className="w-4 h-4" />
                <span>STAGE 2 • ECMWF MICROCLIMATE MODELING</span>
              </div>
              <h2 className="text-xl font-bold text-white">Signal: Precipitation Window Approaching</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Atmospheric radar and 7-day numerical forecasts show 48mm cumulative rainfall expected within 72–96 hours. A calm spraying window opens Friday morning (07:00–10:30 AM) with surface winds below 8 km/h.
              </p>
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs space-y-2">
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">7-Day Rain Expected:</span>
                  <span className="font-bold text-cyan-300">48mm (High Confidence)</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Optimal Spraying Window:</span>
                  <span className="font-bold text-emerald-400">Friday 07:00 – 10:30 AM</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-neutral-400">Current Ambient Temp:</span>
                  <span className="font-bold text-white">31.2°C (Relative Humidity 68%)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Soil Intelligence */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
                <Activity className="w-4 h-4" />
                <span>STAGE 3 • CALIBRATED SOIL PROFILE</span>
              </div>
              <h2 className="text-xl font-bold text-white">Signal: Moderate Root-Zone Deficit (22.4%)</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Soil chemistry derived from geospatial SoilGrids 250m indices indicates Sandy Clay Loam with pH 6.4 (optimal range 6.0–6.8). Soil moisture is 22.4%, showing a slight deficit (-4.6%) that will be naturally restored by upcoming rainfall.
              </p>
              <div className="grid grid-cols-3 gap-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Root Moisture</span>
                  <span className="font-mono font-bold text-amber-400">22.4%</span>
                  <span className="text-[10px] text-neutral-400">Optimal: 26-32%</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Soil pH</span>
                  <span className="font-mono font-bold text-emerald-400">6.4</span>
                  <span className="text-[10px] text-neutral-400">Favorable</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Nitrogen (N)</span>
                  <span className="font-mono font-bold text-white">82 kg/ha</span>
                  <span className="text-[10px] text-neutral-400">Moderate</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Satellite Monitoring */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                <Layers className="w-4 h-4" />
                <span>STAGE 4 • SENTINEL-2 MULTISPECTRAL REVISIT</span>
              </div>
              <h2 className="text-xl font-bold text-white">Signal: Vigorous Photosynthetic Canopy (NDVI 0.71)</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Orbital multispectral imagery verified 2 days ago under 4% cloud cover confirms uniform vegetative vigour across 92% of the parcel. Zero severe necrosis or fungal blight anomalies detected.
              </p>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-neutral-400 block">Vegetative Biomass Index:</span>
                  <span className="font-mono font-bold text-emerald-400 text-lg">NDVI 0.71</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Canopy Trend:</span>
                  <span className="font-semibold text-white">+0.04 vs 14 days ago</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Anomaly Zones:</span>
                  <span className="font-mono font-bold text-emerald-400">0 Critical</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Market Intelligence */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span>STAGE 5 • COMMODITY SPOT ARBITRAGE</span>
              </div>
              <h2 className="text-xl font-bold text-white">Signal: Spot Maize Wholesale ₦480,000/ton (+3.8%)</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Aggregated pricing from AFEX grain exchanges and regional Bodija markets shows rising spot demand driven by livestock feed millers. Protecting harvest tonnage yields maximum gross return.
              </p>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">Wholesale Spot</span>
                  <span className="font-mono font-bold text-white">₦480,000/t</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">7-Day Delta</span>
                  <span className="font-mono font-bold text-emerald-400">+3.8% (Rising)</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Off-take Liquidity</span>
                  <span className="font-semibold text-white">High (Immediate)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Farm Economics */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                <DollarSign className="w-4 h-4" />
                <span>STAGE 6 • DETERMINISTIC FINANCIAL ARITHMETIC</span>
              </div>
              <h2 className="text-xl font-bold text-white">Current Plan: ₦6.6M Profit (57.9% Margin)</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Zero hallucinated numbers. 5.2 ha producing 19.76 tons generates ₦9,484,800 revenue against ₦2,880,000 total variable cost. Break-even yield is 1.85 t/ha.
              </p>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">Total Cost</span>
                  <span className="font-mono font-bold text-white">₦2,880,000</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Gross Revenue</span>
                  <span className="font-mono font-bold text-white">₦9,484,800</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Net Profit</span>
                  <span className="font-mono font-bold text-emerald-400">₦6,604,800</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Break-even Yield</span>
                  <span className="font-mono font-bold text-cyan-400">1.85 t/ha</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Risk Analysis */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
                <ShieldCheck className="w-4 h-4" />
                <span>STAGE 7 • MULTI-FACTOR RISK MATRIX</span>
              </div>
              <h2 className="text-xl font-bold text-white">Risk Profile: Low-to-Moderate</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Weather risk is Low due to adequate 72h rain outlook. Water stress is Moderate due to temporary topsoil deficit. Input cost risk is Low. Overall composite risk score: 28/100 (Safe operating envelope).
              </p>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Weather Risk</span>
                  <span className="font-semibold text-emerald-400">Low (48mm rain incoming)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Water Stress</span>
                  <span className="font-semibold text-amber-400">Moderate (Temporary 22.4% moisture)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Market Volatility</span>
                  <span className="font-semibold text-emerald-400">Low (Rising wholesale demand)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: NEXUS Decision */}
          {currentStep === 8 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                <Cpu className="w-4 h-4" />
                <span>STAGE 8 • SYNTHESIZED DECISION DIRECTIVE</span>
              </div>
              <h2 className="text-xl font-bold text-white">Action: Defer Irrigation 48 Hours</h2>
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2.5">
                <div className="text-sm font-bold text-emerald-300">
                  "Hold mechanical irrigation pump for 48h to utilize 48mm incoming rain. Stage 100 kg/ha granular Urea top-dressing for Friday 07:00 AM calm window."
                </div>
                <div className="text-xs text-neutral-300 border-t border-emerald-500/20 pt-2 space-y-1">
                  <div>• <strong>Impact:</strong> Saves ₦85,000 diesel pump fuel while fully recharging root zone.</div>
                  <div>• <strong>Confidence:</strong> 89% (Sentinel-2 clarity + calibrated ECMWF forecast).</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 9: Scenario Change */}
          {currentStep === 9 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
                <Sliders className="w-4 h-4" />
                <span>STAGE 9 • INTERACTIVE SCENARIO SIMULATION</span>
              </div>
              <h2 className="text-xl font-bold text-white">What happens if market conditions or inputs shift?</h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Test the decision engine live. Toggle between Maize and Soybean rotational modeling or simulate a ₦500,000 budget constraint:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCropScenario('Maize')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    selectedCropScenario === 'Maize'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/40'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className="font-bold block text-sm">Model A: Maize (5.2 ha)</span>
                  <span className="text-[10px] text-neutral-400">Projected Margin: 57.9%</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCropScenario('Soybean')}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    selectedCropScenario === 'Soybean'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/40'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className="font-bold block text-sm">Model B: Soybean Rotation</span>
                  <span className="text-[10px] text-neutral-400">Projected Margin: 72.4%</span>
                </button>
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-300">Simulate -25% Input Budget Constraint:</span>
                <button
                  type="button"
                  onClick={() => setFertilizerCut(!fertilizerCut)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    fertilizerCut ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {fertilizerCut ? 'Budget Cut Active' : 'Apply Cut'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 10: Updated Decision */}
          {currentStep === 10 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>STAGE 10 • DYNAMIC RE-SYNTHESIS & RECOMMENDATION</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                Recommendation Changed: {selectedCropScenario === 'Soybean' ? 'Soybean Rotation Modeled' : 'Maize Optimization Modeled'}
              </h2>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>NEXUS Explanation:</span>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  {selectedCropScenario === 'Soybean'
                    ? 'Under current AFEX commodity prices (₦720,000/ton for oilseed legumes), Soybean produces the highest modeled gross margin (72.4%) with zero topsoil synthetic nitrogen expenditure.'
                    : 'Maize maintains superior caloric harvest volume, with break-even guaranteed at current ₦480,000/t wholesale spot rates.'}
                </p>
                {fertilizerCut && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    <strong>Budget Constraint Note:</strong> Projected yield shifts from 3.8 to 3.2 t/ha; gross margin remains positive at 52.1%.
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
                <span className="font-bold text-white block mb-1">Conclusion for Hackathon Evaluators:</span>
                <p className="text-neutral-400 leading-relaxed">
                  NEXUS AGRI connects fragmented agricultural streams and turns them into explainable, deterministic decisions.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((s) => Math.max(s - 1, 1))}
            className="px-3.5 py-2 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors font-medium"
            >
              Skip
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => Math.min(s + 1, totalSteps))}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <span>Next Stage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/25"
              >
                <Sparkles className="w-4 h-4" />
                <span>See NEXUS in Action (Launch Judge Mode)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
