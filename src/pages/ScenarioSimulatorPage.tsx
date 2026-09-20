import React, { useState, useMemo, useEffect } from 'react';
import {
  GitCompare,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Droplets,
  DollarSign,
  Sprout,
  ShieldCheck,
  Calendar,
  CloudSun,
  Scale,
} from 'lucide-react';
import { Farm, AppNavigationTab } from '../types';
import { CROPS_DATABASE } from '../data/mockData';

interface ScenarioSimulatorPageProps {
  activeFarm: Farm;
  onNavigate: (tab: AppNavigationTab) => void;
}

export interface SimScenarioConfig {
  id: 'A' | 'B' | 'C';
  name: string;
  cropId: string;
  sizeHa: number;
  plantingWindow: 'Early' | 'Optimal' | 'Delayed';
  inputLevel: 'Low' | 'Standard' | 'High';
  irrigation: 'Rainfed' | 'Supplemental Sprinkler' | 'Solar Drip';
  weatherAssumption: 'Normal' | 'Drought Deficit (-30%)' | 'Excessive Rainfall (+35%)';
  expectedPricePerTon: number;
}

export interface ComputedScenarioMetrics {
  totalCost: number;
  yieldTonsPerHa: number;
  totalProductionTons: number;
  revenue: number;
  profit: number;
  marginPercent: number;
  waterRequirementMm: number;
  riskRating: 'Low' | 'Medium' | 'High';
  riskScore: number;
}

export const ScenarioSimulatorPage: React.FC<ScenarioSimulatorPageProps> = ({
  activeFarm,
  onNavigate,
}) => {
  // 3 Scenarios: A (Current Baseline), B (Pivot / Candidate 1), C (Pivot / Candidate 2)
  const [scenarioA, setScenarioA] = useState<SimScenarioConfig>({
    id: 'A',
    name: 'Scenario A (Current Baseline)',
    cropId: 'crop-maize',
    sizeHa: activeFarm.sizeHa || 5.2,
    plantingWindow: 'Optimal',
    inputLevel: 'Standard',
    irrigation: 'Rainfed',
    weatherAssumption: 'Normal',
    expectedPricePerTon: 480000,
  });

  const [scenarioB, setScenarioB] = useState<SimScenarioConfig>({
    id: 'B',
    name: 'Scenario B (Crop Pivot to Soybean)',
    cropId: 'crop-soybean',
    sizeHa: activeFarm.sizeHa || 5.2,
    plantingWindow: 'Optimal',
    inputLevel: 'Standard',
    irrigation: 'Rainfed',
    weatherAssumption: 'Normal',
    expectedPricePerTon: 720000,
  });

  const [scenarioC, setScenarioC] = useState<SimScenarioConfig>({
    id: 'C',
    name: 'Scenario C (High-Tech Solar Drip)',
    cropId: 'crop-maize',
    sizeHa: activeFarm.sizeHa || 5.2,
    plantingWindow: 'Optimal',
    inputLevel: 'High',
    irrigation: 'Solar Drip',
    weatherAssumption: 'Normal',
    expectedPricePerTon: 480000,
  });

  // Active scenario being edited in detail
  const [activeEditId, setActiveEditId] = useState<'A' | 'B' | 'C'>('B');

  // Synchronize with activeFarm whenever farm switches
  useEffect(() => {
    const cropMatch = CROPS_DATABASE.find(
      (c) => c.name.toLowerCase() === (activeFarm.currentCrop || '').toLowerCase()
    );
    const primaryCropId = cropMatch ? cropMatch.id : 'crop-maize';

    setScenarioA((prev) => ({
      ...prev,
      cropId: primaryCropId,
      sizeHa: activeFarm.sizeHa || 5.2,
      name: `Scenario A (${activeFarm.name} Baseline)`,
    }));

    setScenarioB((prev) => ({
      ...prev,
      sizeHa: activeFarm.sizeHa || 5.2,
    }));

    setScenarioC((prev) => ({
      ...prev,
      sizeHa: activeFarm.sizeHa || 5.2,
    }));
  }, [activeFarm.id, activeFarm.sizeHa, activeFarm.currentCrop, activeFarm.name]);

  // Deterministic simulation computer
  const computeScenario = (cfg: SimScenarioConfig): ComputedScenarioMetrics => {
    const crop = CROPS_DATABASE.find((c) => c.id === cfg.cropId) || CROPS_DATABASE[0];
    const baseInputCostPerHa = crop.inputCostPerHa;
    let baseYield = crop.typicalYieldTonsPerHa.avg;

    // Adjustments for input level
    let inputCostMultiplier = 1.0;
    let inputYieldMultiplier = 1.0;
    if (cfg.inputLevel === 'Low') {
      inputCostMultiplier = 0.65;
      inputYieldMultiplier = 0.78;
    } else if (cfg.inputLevel === 'High') {
      inputCostMultiplier = 1.35;
      inputYieldMultiplier = 1.22;
    }

    // Adjustments for irrigation
    let irrigationCostPerHa = 0;
    let irrigationYieldMultiplier = 1.0;
    let waterRequirementMm = crop.category === 'Legume' ? 450 : 600;

    if (cfg.irrigation === 'Supplemental Sprinkler') {
      irrigationCostPerHa = 35000;
      irrigationYieldMultiplier = 1.12;
      waterRequirementMm += 50;
    } else if (cfg.irrigation === 'Solar Drip') {
      irrigationCostPerHa = 85000; // Annualized amortization
      irrigationYieldMultiplier = 1.32;
      waterRequirementMm -= 120; // 30% higher water efficiency
    }

    // Adjustments for planting date window
    let calendarYieldMultiplier = 1.0;
    if (cfg.plantingWindow === 'Early') {
      calendarYieldMultiplier = 1.05;
    } else if (cfg.plantingWindow === 'Delayed') {
      calendarYieldMultiplier = 0.76; // Pushed into terminal rain cut-off
    }

    // Adjustments for weather assumptions
    let weatherYieldMultiplier = 1.0;
    let weatherRiskAdd = 0;
    if (cfg.weatherAssumption === 'Drought Deficit (-30%)') {
      weatherYieldMultiplier = cfg.irrigation === 'Rainfed' ? 0.68 : 0.88;
      weatherRiskAdd = cfg.irrigation === 'Rainfed' ? 35 : 15;
    } else if (cfg.weatherAssumption === 'Excessive Rainfall (+35%)') {
      weatherYieldMultiplier = 0.85; // Waterlogging and nutrient leaching
      weatherRiskAdd = 20;
    }

    // Final calculations
    const finalYieldPerHa = Math.max(
      0.3,
      Math.round(
        baseYield *
          inputYieldMultiplier *
          irrigationYieldMultiplier *
          calendarYieldMultiplier *
          weatherYieldMultiplier *
          10
      ) / 10
    );

    const totalCostPerHa = baseInputCostPerHa * inputCostMultiplier + irrigationCostPerHa;
    const totalCost = Math.round(totalCostPerHa * cfg.sizeHa);
    const totalProductionTons = Math.round(finalYieldPerHa * cfg.sizeHa * 10) / 10;
    const revenue = Math.round(totalProductionTons * cfg.expectedPricePerTon);
    const profit = revenue - totalCost;
    const marginPercent = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

    // Risk assessment
    let riskScore = 25 + weatherRiskAdd;
    if (cfg.inputLevel === 'High') riskScore += 10;
    if (cfg.plantingWindow === 'Delayed') riskScore += 20;
    if (marginPercent < 20) riskScore += 15;
    const riskRating: 'Low' | 'Medium' | 'High' =
      riskScore > 55 ? 'High' : riskScore > 35 ? 'Medium' : 'Low';

    return {
      totalCost,
      yieldTonsPerHa: finalYieldPerHa,
      totalProductionTons,
      revenue,
      profit,
      marginPercent,
      waterRequirementMm,
      riskRating,
      riskScore,
    };
  };

  const metricA = useMemo(() => computeScenario(scenarioA), [scenarioA]);
  const metricB = useMemo(() => computeScenario(scenarioB), [scenarioB]);
  const metricC = useMemo(() => computeScenario(scenarioC), [scenarioC]);

  // Dynamic "What Changed and Why" synthesis comparing B to A, and C to A
  const analysisSynthesis = useMemo(() => {
    const profitDeltaB = metricB.profit - metricA.profit;
    const profitDeltaC = metricC.profit - metricA.profit;

    const cropA = CROPS_DATABASE.find((c) => c.id === scenarioA.cropId)?.name || 'Maize';
    const cropB = CROPS_DATABASE.find((c) => c.id === scenarioB.cropId)?.name || 'Soybean';
    const cropC = CROPS_DATABASE.find((c) => c.id === scenarioC.cropId)?.name || 'Maize';

    const bBullets: string[] = [];
    if (scenarioB.cropId !== scenarioA.cropId) {
      bBullets.push(
        `Crop switched from ${cropA} to ${cropB}: Soybean fixes atmospheric nitrogen, reducing synthetic fertilizer costs by ~₦380,000 across ${scenarioB.sizeHa} ha.`
      );
    }
    if (metricB.yieldTonsPerHa !== metricA.yieldTonsPerHa) {
      bBullets.push(
        `Yield shifted from ${metricA.yieldTonsPerHa} t/ha (${cropA}) to ${metricB.yieldTonsPerHa} t/ha (${cropB}), but off-take price of ₦${scenarioB.expectedPricePerTon.toLocaleString()}/t creates an attractive net financial margin.`
      );
    }
    if (scenarioB.weatherAssumption !== scenarioA.weatherAssumption) {
      bBullets.push(
        `Weather assumption changed to ${scenarioB.weatherAssumption}, affecting terminal grain filling.`
      );
    }

    const cBullets: string[] = [];
    if (scenarioC.irrigation !== scenarioA.irrigation) {
      cBullets.push(
        `Irrigation shifted to ${scenarioC.irrigation}: Unlocks +${Math.round(
          (metricC.yieldTonsPerHa / metricA.yieldTonsPerHa - 1) * 100
        )}% yield resilience and optimizes seasonal water consumption.`
      );
    }
    if (scenarioC.inputLevel !== scenarioA.inputLevel) {
      cBullets.push(
        `Input intensity elevated to ${scenarioC.inputLevel}: Capital expenditures expanded to ₦${metricC.totalCost.toLocaleString()}, producing ₦${metricC.revenue.toLocaleString()} in gross revenue.`
      );
    }

    return {
      bHeadline:
        profitDeltaB >= 0
          ? `Scenario B yields a +₦${Math.round(profitDeltaB).toLocaleString()} net profit gain over Baseline.`
          : `Scenario B projects a -₦${Math.round(Math.abs(profitDeltaB)).toLocaleString()} lower profit compared to Baseline.`,
      cHeadline:
        profitDeltaC >= 0
          ? `Scenario C generates a +₦${Math.round(profitDeltaC).toLocaleString()} profit advantage over Baseline.`
          : `Scenario C projects a -₦${Math.round(Math.abs(profitDeltaC)).toLocaleString()} net deficit compared to Baseline.`,
      bBullets: bBullets.length > 0 ? bBullets : ['Parameters in Scenario B are calibrated similarly to Baseline.'],
      cBullets: cBullets.length > 0 ? cBullets : ['Parameters in Scenario C reflect targeted capital investments.'],
    };
  }, [scenarioA, scenarioB, scenarioC, metricA, metricB, metricC]);

  // Preset scenarios loader
  const handleLoadPresets = (mode: 'drought' | 'irrigation' | 'crop_pivot') => {
    if (mode === 'crop_pivot') {
      setScenarioA((prev) => ({
        ...prev,
        cropId: 'crop-maize',
        irrigation: 'Rainfed',
        weatherAssumption: 'Normal',
        expectedPricePerTon: 480000,
      }));
      setScenarioB((prev) => ({
        ...prev,
        cropId: 'crop-soybean',
        irrigation: 'Rainfed',
        weatherAssumption: 'Normal',
        expectedPricePerTon: 720000,
      }));
      setScenarioC((prev) => ({
        ...prev,
        cropId: 'crop-cassava',
        irrigation: 'Rainfed',
        weatherAssumption: 'Normal',
        expectedPricePerTon: 95000,
      }));
    } else if (mode === 'drought') {
      setScenarioA((prev) => ({
        ...prev,
        weatherAssumption: 'Normal',
        irrigation: 'Rainfed',
      }));
      setScenarioB((prev) => ({
        ...prev,
        weatherAssumption: 'Drought Deficit (-30%)',
        irrigation: 'Rainfed',
      }));
      setScenarioC((prev) => ({
        ...prev,
        weatherAssumption: 'Drought Deficit (-30%)',
        irrigation: 'Supplemental Sprinkler',
      }));
    } else {
      setScenarioA((prev) => ({
        ...prev,
        irrigation: 'Rainfed',
        inputLevel: 'Standard',
      }));
      setScenarioB((prev) => ({
        ...prev,
        irrigation: 'Supplemental Sprinkler',
        inputLevel: 'Standard',
      }));
      setScenarioC((prev) => ({
        ...prev,
        irrigation: 'Solar Drip',
        inputLevel: 'High',
      }));
    }
  };

  const activeScenarioConfig =
    activeEditId === 'A' ? scenarioA : activeEditId === 'B' ? scenarioB : scenarioC;
  const setActiveScenarioConfig =
    activeEditId === 'A' ? setScenarioA : activeEditId === 'B' ? setScenarioB : setScenarioC;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Strategic Decision Engine
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">{activeFarm.name} ({activeFarm.sizeHa} ha)</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <GitCompare className="w-6 h-6 text-emerald-400" />
            <span>Scenario Simulator (&ldquo;What-If?&rdquo;)</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Test crop pivots, climatic drought shocks, planting dates, and irrigation capital investments across Scenario
            A, B, and C with deterministic real-time updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-neutral-400 font-semibold hidden md:inline">Preset Tests:</span>
          <button
            type="button"
            onClick={() => handleLoadPresets('crop_pivot')}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Maize vs Soybean vs Cassava
          </button>
          <button
            type="button"
            onClick={() => handleLoadPresets('drought')}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Drought Stress Test
          </button>
          <button
            type="button"
            onClick={() => handleLoadPresets('irrigation')}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            Irrigation Modernization
          </button>
        </div>
      </div>

      {/* 3-Column Comparative Overview Cards: Scenario A vs Scenario B vs Scenario C */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { id: 'A' as const, cfg: scenarioA, met: metricA, badge: 'Current Baseline', color: 'border-neutral-800' },
          { id: 'B' as const, cfg: scenarioB, met: metricB, badge: 'Candidate B', color: 'border-emerald-500/40' },
          { id: 'C' as const, cfg: scenarioC, met: metricC, badge: 'Candidate C', color: 'border-sky-500/40' },
        ].map(({ id, cfg, met, badge, color }) => {
          const isSelected = activeEditId === id;
          const crop = CROPS_DATABASE.find((c) => c.id === cfg.cropId);
          const profitDelta = met.profit - metricA.profit;

          return (
            <div
              key={id}
              onClick={() => setActiveEditId(id)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-neutral-900 border-emerald-500 shadow-xl shadow-emerald-950/20 ring-1 ring-emerald-500/40'
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-100 font-mono font-bold flex items-center justify-center text-xs">
                      {id}
                    </span>
                    <strong className="text-sm font-bold text-neutral-100">{cfg.name}</strong>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                    {badge}
                  </span>
                </div>

                <div className="text-xs text-neutral-400 mb-3">
                  <span>{crop?.name}</span> &bull; <span>{cfg.sizeHa} ha</span> &bull; <span>{cfg.irrigation}</span>
                </div>

                {/* Primary Outcome Metrics */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Net Profit:</span>
                      <span className={`font-mono font-bold ${
                        met.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        ₦{(met.profit / 1000000).toFixed(2)}M
                      </span>
                    </div>

                    {id !== 'A' && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-500">vs Baseline:</span>
                        <span className={`font-mono font-semibold ${
                          profitDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {profitDelta >= 0 ? '+' : ''}₦{(profitDelta / 1000000).toFixed(2)}M
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-500">Gross Margin:</span>
                      <span className="font-mono text-neutral-200">{met.marginPercent}%</span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-500">Expected Yield:</span>
                      <span className="font-mono text-neutral-200">{met.yieldTonsPerHa} t/ha ({met.totalProductionTons} t)</span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span className="text-neutral-500">Working Cost:</span>
                      <span className="font-mono text-neutral-200">₦{(met.totalCost / 1000000).toFixed(2)}M</span>
                    </div>

                    <div className="flex justify-between text-[11px] pt-1 border-t border-neutral-800/80">
                      <span className="text-neutral-500">Risk Profile:</span>
                      <span className={`font-mono font-bold text-[10px] px-1.5 py-0.2 rounded ${
                        met.riskRating === 'High'
                          ? 'bg-rose-500/20 text-rose-300'
                          : met.riskRating === 'Medium'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {met.riskRating} Risk ({met.riskScore}/100)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">
                  {isSelected ? 'Currently Editing' : 'Click to Configure'}
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  {isSelected ? 'Active Parameters &darr;' : 'Select &rarr;'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic "What Changed and Why?" Synthesis Banner */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/30 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-neutral-100">
            What Changed and Why? (Deterministic Agronomic Explanation)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          {/* Comparison A vs B */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <strong className="text-emerald-400 block font-semibold">
              Scenario B vs Baseline: {analysisSynthesis.bHeadline}
            </strong>
            <ul className="space-y-1.5 text-neutral-300 text-[11.5px]">
              {analysisSynthesis.bBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Comparison A vs C */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <strong className="text-sky-400 block font-semibold">
              Scenario C vs Baseline: {analysisSynthesis.cHeadline}
            </strong>
            <ul className="space-y-1.5 text-neutral-300 text-[11.5px]">
              {analysisSynthesis.cBullets.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Detailed Interactive Variables Configurator for Selected Scenario */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Interactive Parameter Panel
              </span>
              <span className="text-neutral-500">&bull;</span>
              <span className="text-xs text-neutral-400">Editing Scenario {activeEditId}</span>
            </div>
            <h2 className="text-lg font-bold text-neutral-100 mt-0.5">
              {activeScenarioConfig.name}
            </h2>
          </div>

          {/* Scenario tab switcher */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            {(['A', 'B', 'C'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveEditId(id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeEditId === id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Edit Scenario {id}
              </button>
            ))}
          </div>
        </div>

        {/* Form Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* 1. Crop Selection */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-semibold block">Crop Choice</label>
            <select
              value={activeScenarioConfig.cropId}
              onChange={(e) => {
                const found = CROPS_DATABASE.find((c) => c.id === e.target.value);
                setActiveScenarioConfig((prev) => ({
                  ...prev,
                  cropId: e.target.value,
                  expectedPricePerTon: found ? found.marketPricePerTon : prev.expectedPricePerTon,
                }));
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 text-xs focus:outline-none focus:border-emerald-500"
            >
              {CROPS_DATABASE.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.typicalYieldTonsPerHa.avg} t/ha)
                </option>
              ))}
            </select>
          </div>

          {/* 2. Farm Size (Ha) */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-neutral-300 font-semibold">Cultivated Extent</label>
              <span className="font-mono text-emerald-400">{activeScenarioConfig.sizeHa.toFixed(1)} ha</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="30"
              step="0.5"
              value={activeScenarioConfig.sizeHa}
              onChange={(e) =>
                setActiveScenarioConfig((prev) => ({ ...prev, sizeHa: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-500 cursor-pointer mt-1"
            />
          </div>

          {/* 3. Planting Date Window */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-semibold block">Planting Date Calendar</label>
            <select
              value={activeScenarioConfig.plantingWindow}
              onChange={(e) =>
                setActiveScenarioConfig((prev) => ({
                  ...prev,
                  plantingWindow: e.target.value as any,
                }))
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="Early">Early Season (+5% Yield)</option>
              <option value="Optimal">On-Time Optimal Window</option>
              <option value="Delayed">Delayed 3 Weeks (-24% Terminal Drought Risk)</option>
            </select>
          </div>

          {/* 4. Fertilizer / Input Level */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-semibold block">Input &amp; Fertilizer Intensity</label>
            <select
              value={activeScenarioConfig.inputLevel}
              onChange={(e) =>
                setActiveScenarioConfig((prev) => ({
                  ...prev,
                  inputLevel: e.target.value as any,
                }))
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="Low">Low-Input Baseline (35% Lower Cost, -22% Yield)</option>
              <option value="Standard">Standard Precision Package</option>
              <option value="High">High-Intensity Split Feeding (+35% Cost, +22% Yield)</option>
            </select>
          </div>

          {/* 5. Irrigation Strategy */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-semibold block">Irrigation System</label>
            <select
              value={activeScenarioConfig.irrigation}
              onChange={(e) =>
                setActiveScenarioConfig((prev) => ({
                  ...prev,
                  irrigation: e.target.value as any,
                }))
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="Rainfed">Purely Rainfed (0 Capex, Climate Dependent)</option>
              <option value="Supplemental Sprinkler">Supplemental Sprinkler (+₦35k/ha Fuel)</option>
              <option value="Solar Drip">Solar Drip Kit (+₦85k/ha Capex, +32% Yield)</option>
            </select>
          </div>

          {/* 6. Weather Assumption */}
          <div className="space-y-1.5">
            <label className="text-neutral-300 font-semibold block">Weather &amp; Climate Stress Assumption</label>
            <select
              value={activeScenarioConfig.weatherAssumption}
              onChange={(e) =>
                setActiveScenarioConfig((prev) => ({
                  ...prev,
                  weatherAssumption: e.target.value as any,
                }))
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="Normal">Normal Seasonal Precipitation</option>
              <option value="Drought Deficit (-30%)">Drought Deficit (-30% Rainfall)</option>
              <option value="Excessive Rainfall (+35%)">Excessive Monsoon Inundation (+35%)</option>
            </select>
          </div>

          {/* 7. Expected Selling Price */}
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex justify-between">
              <label className="text-neutral-300 font-semibold">Expected Farmgate / Off-Take Price</label>
              <span className="font-mono text-emerald-400">
                ₦{activeScenarioConfig.expectedPricePerTon.toLocaleString()} / ton (₦{(activeScenarioConfig.expectedPricePerTon / 1000).toFixed(0)}/kg)
              </span>
            </div>
            <input
              type="range"
              min="100000"
              max="1200000"
              step="10000"
              value={activeScenarioConfig.expectedPricePerTon}
              onChange={(e) =>
                setActiveScenarioConfig((prev) => ({
                  ...prev,
                  expectedPricePerTon: parseInt(e.target.value),
                }))
              }
              className="w-full accent-emerald-500 cursor-pointer mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
