import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  Calculator,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Download,
  Info,
  Scale,
  Percent,
  Layers,
} from 'lucide-react';
import { Farm, AppNavigationTab } from '../types';
import { EconomicsService, FarmEconomicsInput } from '../services/economicsService';

interface FarmEconomicsPageProps {
  activeFarm: Farm;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const FarmEconomicsPage: React.FC<FarmEconomicsPageProps> = ({ activeFarm, onNavigate }) => {
  // Input mode: per hectare vs total farm
  const [inputMode, setInputMode] = useState<'perHa' | 'total'>('perHa');

  // Core Farm Parameters
  const [farmSizeHa, setFarmSizeHa] = useState<number>(activeFarm.sizeHa || 5.2);
  const [expectedYieldTonsPerHa, setExpectedYieldTonsPerHa] = useState<number>(activeFarm.estimatedYieldTonsPerHa || 3.8);
  const [expectedSellingPricePerTon, setExpectedSellingPricePerTon] = useState<number>(480000); // ₦480/kg = ₦480,000/ton

  // Synchronize when activeFarm changes
  useEffect(() => {
    setFarmSizeHa(activeFarm.sizeHa || 5.2);
    setExpectedYieldTonsPerHa(activeFarm.estimatedYieldTonsPerHa || 3.8);
    // Dynamic price based on crop if desired
    if (activeFarm.currentCrop === 'Soybean') {
      setExpectedSellingPricePerTon(720000);
    } else if (activeFarm.currentCrop === 'Cassava') {
      setExpectedSellingPricePerTon(120000);
    } else if (activeFarm.currentCrop === 'Rice') {
      setExpectedSellingPricePerTon(650000);
    } else {
      setExpectedSellingPricePerTon(480000);
    }
  }, [activeFarm.id, activeFarm.sizeHa, activeFarm.estimatedYieldTonsPerHa, activeFarm.currentCrop]);

  // 9 Explicit Deterministic Cost Inputs (Defaulted to per-hectare amounts calibrated for West African grain cultivation)
  const [seedCost, setSeedCost] = useState<number>(45000);
  const [fertilizerCost, setFertilizerCost] = useState<number>(180000);
  const [pesticideCost, setPesticideCost] = useState<number>(65000);
  const [laborCost, setLaborCost] = useState<number>(120000);
  const [irrigationCost, setIrrigationCost] = useState<number>(30000);
  const [equipmentCost, setEquipmentCost] = useState<number>(80000);
  const [transportCost, setTransportCost] = useState<number>(35000);
  const [storageCost, setStorageCost] = useState<number>(20000);
  const [otherCost, setOtherCost] = useState<number>(15000);

  // Toggle formula explainer
  const [showFormulas, setShowFormulas] = useState(false);

  // Calculate economics deterministically
  const results = useMemo(() => {
    // If input mode is perHa, multiply by hectares to get total costs
    const multiplier = inputMode === 'perHa' ? farmSizeHa : 1;

    const input: FarmEconomicsInput = {
      farmSizeHa,
      expectedYieldTonsPerHa,
      expectedSellingPricePerTon,
      seedCost: seedCost * multiplier,
      fertilizerCost: fertilizerCost * multiplier,
      pesticideCost: pesticideCost * multiplier,
      laborCost: laborCost * multiplier,
      irrigationCost: irrigationCost * multiplier,
      equipmentCost: equipmentCost * multiplier,
      transportCost: transportCost * multiplier,
      storageCost: storageCost * multiplier,
      otherCost: otherCost * multiplier,
    };

    return EconomicsService.calculate(input);
  }, [
    inputMode,
    farmSizeHa,
    expectedYieldTonsPerHa,
    expectedSellingPricePerTon,
    seedCost,
    fertilizerCost,
    pesticideCost,
    laborCost,
    irrigationCost,
    equipmentCost,
    transportCost,
    storageCost,
    otherCost,
  ]);

  // Presets loader
  const handleLoadPreset = (preset: 'maize' | 'soybean' | 'low_input') => {
    if (preset === 'maize') {
      setInputMode('perHa');
      setExpectedYieldTonsPerHa(3.8);
      setExpectedSellingPricePerTon(480000);
      setSeedCost(45000);
      setFertilizerCost(180000);
      setPesticideCost(65000);
      setLaborCost(120000);
      setIrrigationCost(30000);
      setEquipmentCost(80000);
      setTransportCost(35000);
      setStorageCost(20000);
      setOtherCost(15000);
    } else if (preset === 'soybean') {
      setInputMode('perHa');
      setExpectedYieldTonsPerHa(2.4);
      setExpectedSellingPricePerTon(720000);
      setSeedCost(55000);
      setFertilizerCost(60000); // Much lower nitrogen need
      setPesticideCost(45000);
      setLaborCost(110000);
      setIrrigationCost(15000);
      setEquipmentCost(75000);
      setTransportCost(28000);
      setStorageCost(25000);
      setOtherCost(15000);
    } else {
      setInputMode('perHa');
      setExpectedYieldTonsPerHa(2.2);
      setExpectedSellingPricePerTon(480000);
      setSeedCost(30000);
      setFertilizerCost(90000);
      setPesticideCost(30000);
      setLaborCost(80000);
      setIrrigationCost(0);
      setEquipmentCost(50000);
      setTransportCost(20000);
      setStorageCost(10000);
      setOtherCost(10000);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      'NEXUS AGRI - Farm Budget & Economic Assessment',
      `Farm Name,${activeFarm.name}`,
      `Crop,${activeFarm.currentCrop}`,
      `Farm Size (Ha),${farmSizeHa}`,
      `Expected Yield (t/ha),${expectedYieldTonsPerHa}`,
      `Expected Selling Price (₦/ton),${expectedSellingPricePerTon}`,
      '',
      'ITEMIZED PRODUCTION COSTS,AMOUNT (₦)',
      `Seeds & Seedlings,${seedCost * (inputMode === 'perHa' ? farmSizeHa : 1)}`,
      `Fertilizers & Nutrients,${fertilizerCost * (inputMode === 'perHa' ? farmSizeHa : 1)}`,
      `Pesticides & Protection,${pesticideCost * (inputMode === 'perHa' ? farmSizeHa : 1)}`,
      `Labor & Field Operations,${laborCost * (inputMode === 'perHa' ? farmSizeHa : 1)}`,
      `Irrigation & Water,${irrigationCost * (inputMode === 'perHa' ? farmSizeHa : 1)}`,
      `Equipment & Mechanization,${equipmentCost * (inputMode === 'perHa' ? farmSizeHa : 1)}`,
      `Transport & Haulage,${transportCost * (inputMode === 'perHa' ? farmSizeHa : 1)}`,
      `Storage & Bagging,${storageCost * (inputMode === 'perHa' ? farmSizeHa : 1)}`,
      `Other Contingencies,${otherCost * (inputMode === 'perHa' ? farmSizeHa : 1)}`,
      `TOTAL COST,${results.totalCost}`,
      '',
      'FINANCIAL OUTCOMES,VALUE',
      `Expected Production (Tons),${results.expectedProductionTons}`,
      `Expected Revenue (₦),${results.expectedRevenue}`,
      `Net Profit (₦),${results.expectedProfit}`,
      `Gross Margin (%),${results.marginPercent}%`,
      `Return on Investment (ROI),${results.roiPercent}%`,
      `Break-Even Price per Ton (₦),${results.breakEvenPricePerTon}`,
      `Break-Even Yield (t/ha),${results.breakEvenYieldTonsPerHa}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nexus_agri_budget_${activeFarm.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Deterministic Agricultural Financial Engine
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">{activeFarm.name} ({activeFarm.currentCrop})</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span>Farm Economics &amp; Enterprise Budget</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Strict deterministic arithmetic for all 9 itemized input costs, revenue, gross margin, return on investment,
            and break-even thresholds. No AI approximations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-bold border border-neutral-700 flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('simulator')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>&ldquo;What-If&rdquo; Simulator</span>
          </button>
        </div>
      </div>

      {/* Top 4 Primary Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-neutral-500 block">Total Working Capital</span>
          <div className="text-2xl font-bold font-mono text-neutral-100 mt-1">
            ₦{(results.totalCost / 1000000).toFixed(2)}M
          </div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block font-mono">
            ₦{results.costPerHectare.toLocaleString()} / ha
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-neutral-500 block">Expected Revenue</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            ₦{(results.expectedRevenue / 1000000).toFixed(2)}M
          </div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block">
            {results.expectedProductionTons} tons @ ₦{(expectedSellingPricePerTon / 1000).toFixed(0)}/kg
          </span>
        </div>

        <div className={`p-4 rounded-2xl border ${
          results.expectedProfit >= 0
            ? 'bg-neutral-900 border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900'
            : 'bg-neutral-900 border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-neutral-900 to-neutral-900'
        }`}>
          <span className={`text-[10px] font-mono uppercase font-bold block ${
            results.expectedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            Expected Net Profit
          </span>
          <div className={`text-2xl font-bold font-mono mt-1 ${
            results.expectedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {results.expectedProfit >= 0 ? '+' : ''}₦{(results.expectedProfit / 1000000).toFixed(2)}M
          </div>
          <span className="text-[11px] text-neutral-300 mt-0.5 block font-mono font-semibold">
            Margin: {results.marginPercent}% &bull; ROI: {results.roiPercent}%
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-neutral-500 block">Break-Even Thresholds</span>
          <div className="text-xl font-bold font-mono text-neutral-100 mt-1">
            {results.breakEvenYieldTonsPerHa} <span className="text-xs font-normal text-neutral-500">t/ha</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-0.5 block font-mono">
            Floor Price: ₦{results.breakEvenPricePerKg}/kg (₦{results.breakEvenPricePerTon.toLocaleString()}/t)
          </span>
        </div>
      </div>

      {/* Preset Quick Selectors & Mode Switcher */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-neutral-400 font-semibold">Quick Presets:</span>
          <button
            type="button"
            onClick={() => handleLoadPreset('maize')}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700"
          >
            Hybrid White Maize
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('soybean')}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700"
          >
            Commercial Soybean
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('low_input')}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700"
          >
            Low-Input Baseline
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setInputMode('perHa')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                inputMode === 'perHa'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Per Hectare (₦/ha)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('total')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                inputMode === 'total'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Total Farm Sum
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulas(!showFormulas)}
            className="text-neutral-400 hover:text-emerald-400 flex items-center gap-1"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showFormulas ? 'Hide Formulas' : 'View Formulas'}</span>
          </button>
        </div>
      </div>

      {/* Formula Explainer Drawer */}
      {showFormulas && (
        <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/30 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Calculator className="w-4 h-4" />
            <span>Deterministic Agronomic Accounting Formulas</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-neutral-300 pt-1">
            <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
              <strong className="text-neutral-100 block">Break-Even Yield (t/ha):</strong>
              <code className="text-emerald-400 font-mono">Total Cost ÷ (Farm Size × Price/Ton)</code>
              <p className="text-neutral-500 mt-1">Minimum yield needed to avoid financial loss.</p>
            </div>
            <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
              <strong className="text-neutral-100 block">Break-Even Price (₦/kg):</strong>
              <code className="text-emerald-400 font-mono">Total Cost ÷ Total Produced Kg</code>
              <p className="text-neutral-500 mt-1">Minimum farmgate price to recover all expenses.</p>
            </div>
            <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
              <strong className="text-neutral-100 block">Gross Margin (%):</strong>
              <code className="text-emerald-400 font-mono">((Revenue - Total Cost) ÷ Revenue) × 100</code>
              <p className="text-neutral-500 mt-1">Percentage of revenue retained as profit.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout: Cost Inputs Grid (Left) & Farm Parameters & Revenue (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 9 Explicit Editable Cost Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-100">Itemized Operating Costs</h3>
                <p className="text-xs text-neutral-400">
                  Enter or calibrate each expenditure category ({inputMode === 'perHa' ? 'per hectare' : 'total farm'}).
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Total: ₦{results.totalCost.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* 1. Seed Cost */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <label className="text-neutral-400 text-[11px] block font-semibold">1. Seed &amp; Seedlings</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-mono">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={seedCost}
                    onChange={(e) => setSeedCost(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 2. Fertilizer Cost */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <label className="text-neutral-400 text-[11px] block font-semibold">2. Fertilizer &amp; Nutrition</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-mono">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={fertilizerCost}
                    onChange={(e) => setFertilizerCost(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 3. Pesticide Cost */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <label className="text-neutral-400 text-[11px] block font-semibold">3. Pesticide &amp; Crop Protection</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-mono">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={pesticideCost}
                    onChange={(e) => setPesticideCost(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 4. Labour Cost */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <label className="text-neutral-400 text-[11px] block font-semibold">4. Labour &amp; Field Crew</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-mono">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={laborCost}
                    onChange={(e) => setLaborCost(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 5. Irrigation Cost */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <label className="text-neutral-400 text-[11px] block font-semibold">5. Irrigation &amp; Pumping Fuel</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-mono">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={irrigationCost}
                    onChange={(e) => setIrrigationCost(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 6. Equipment Cost */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <label className="text-neutral-400 text-[11px] block font-semibold">6. Equipment &amp; Mechanization</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-mono">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={equipmentCost}
                    onChange={(e) => setEquipmentCost(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 7. Transport Cost */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <label className="text-neutral-400 text-[11px] block font-semibold">7. Transport &amp; Haulage</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-mono">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={transportCost}
                    onChange={(e) => setTransportCost(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 8. Storage Cost */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <label className="text-neutral-400 text-[11px] block font-semibold">8. Storage &amp; Bagging (PICS)</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-mono">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={storageCost}
                    onChange={(e) => setStorageCost(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 9. Other Costs */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 sm:col-span-2">
                <label className="text-neutral-400 text-[11px] block font-semibold">9. Other Operating &amp; Contingency Costs</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-neutral-500 font-mono">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={otherCost}
                    onChange={(e) => setOtherCost(Number(e.target.value) || 0)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Cost Distribution Progress Bars */}
            <div className="pt-3 border-t border-neutral-800 space-y-2">
              <span className="text-[11px] font-bold text-neutral-400 block uppercase font-mono">
                Cost Allocation Schedule
              </span>
              <div className="space-y-1.5 text-[11px]">
                {results.costDistribution.slice(0, 5).map((dist, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-neutral-300">
                      <span>{dist.name}</span>
                      <span className="font-mono text-neutral-400">₦{dist.amount.toLocaleString()} ({dist.percent}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dist.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Farm Parameters, Market Selling Price, & Sensitivity Matrix (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="text-base font-bold text-neutral-100">Production &amp; Market Parameters</h3>
              <p className="text-xs text-neutral-400">
                Land size, expected yield, and market off-take pricing.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Farm Size (Hectares) */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold text-neutral-300">
                  <span>Farm Size</span>
                  <span className="font-mono text-emerald-400">{farmSizeHa.toFixed(1)} Hectares</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={farmSizeHa}
                  onChange={(e) => setFarmSizeHa(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Expected Yield (t/ha) */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold text-neutral-300">
                  <span>Expected Yield</span>
                  <span className="font-mono text-emerald-400">{expectedYieldTonsPerHa.toFixed(1)} Tons / Ha</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.1"
                  value={expectedYieldTonsPerHa}
                  onChange={(e) => setExpectedYieldTonsPerHa(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Expected Selling Price (₦/ton) */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold text-neutral-300">
                  <span>Expected Selling Price</span>
                  <span className="font-mono text-emerald-400">
                    ₦{expectedSellingPricePerTon.toLocaleString()} / ton (₦{(expectedSellingPricePerTon / 1000).toFixed(0)}/kg)
                  </span>
                </div>
                <input
                  type="range"
                  min="200000"
                  max="1200000"
                  step="10000"
                  value={expectedSellingPricePerTon}
                  onChange={(e) => setExpectedSellingPricePerTon(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Calculated Output Summary Card */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Total Production Volume:</span>
                <span className="font-mono font-bold text-neutral-100">
                  {results.expectedProductionTons} tons ({results.expectedProductionKg.toLocaleString()} kg)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Gross Harvest Revenue:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₦{results.expectedRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Total Operating Expenses:</span>
                <span className="font-mono text-neutral-300">
                  ₦{results.totalCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-800">
                <span className="font-bold text-neutral-200">Net Farm Profit:</span>
                <span className={`font-mono font-bold ${
                  results.expectedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {results.expectedProfit >= 0 ? '+' : ''}₦{results.expectedProfit.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Market Price Stress Matrix */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                Downside Price Stress-Test Matrix
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                {[-10, -20, -30].map((dropPct) => {
                  const stressedPrice = expectedSellingPricePerTon * (1 + dropPct / 100);
                  const stressedRevenue = results.expectedProductionTons * stressedPrice;
                  const stressedProfit = stressedRevenue - results.totalCost;
                  const stressedMargin = stressedRevenue > 0 ? Math.round((stressedProfit / stressedRevenue) * 100) : 0;

                  return (
                    <div key={dropPct} className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-center">
                      <span className="text-neutral-500 block text-[10px] uppercase font-sans">Price {dropPct}%</span>
                      <div className={`font-bold mt-0.5 text-[11px] ${
                        stressedProfit >= 0 ? 'text-neutral-200' : 'text-rose-400'
                      }`}>
                        ₦{(stressedProfit / 1000000).toFixed(2)}M
                      </div>
                      <span className="text-[10px] text-neutral-400 font-sans">{stressedMargin}% Margin</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
