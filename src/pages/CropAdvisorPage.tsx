import React, { useState, useEffect } from 'react';
import {
  Sprout,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  GitCompare,
  ArrowRight,
  Sparkles,
  Layers,
  Droplets,
  HelpCircle,
} from 'lucide-react';
import { CropData, Farm, AppNavigationTab } from '../types';
import { CROPS_DATABASE } from '../data/mockData';

interface CropAdvisorPageProps {
  activeFarm: Farm;
  onNavigate: (tab: AppNavigationTab) => void;
  onUpdateFarm?: (updatedFarm: Farm) => void;
}

export const CropAdvisorPage: React.FC<CropAdvisorPageProps> = ({ activeFarm, onNavigate, onUpdateFarm }) => {
  const [selectedCrop, setSelectedCrop] = useState<CropData>(CROPS_DATABASE[0]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareCropA, setCompareCropA] = useState<CropData>(CROPS_DATABASE[0]); // Primary
  const [compareCropB, setCompareCropB] = useState<CropData>(CROPS_DATABASE[1]); // Alternative
  const [adoptedFeedback, setAdoptedFeedback] = useState<string | null>(null);

  // Synchronize when activeFarm changes
  useEffect(() => {
    const match = CROPS_DATABASE.find(
      (c) => c.name.toLowerCase() === (activeFarm.currentCrop || '').toLowerCase()
    );
    if (match) {
      setSelectedCrop(match);
      setCompareCropA(match);
      // Pick a different crop for B
      const alt = CROPS_DATABASE.find((c) => c.id !== match.id) || CROPS_DATABASE[1];
      setCompareCropB(alt);
    }
  }, [activeFarm.id, activeFarm.currentCrop]);

  const handleAdoptCrop = (crop: CropData) => {
    if (!onUpdateFarm) return;
    const updated: Farm = {
      ...activeFarm,
      currentCrop: crop.name,
      cropVariety: crop.name,
      estimatedYieldTonsPerHa: crop.typicalYieldTonsPerHa.avg,
    };
    onUpdateFarm(updated);
    setAdoptedFeedback(`Successfully updated ${activeFarm.name} active crop to ${crop.name}!`);
    setTimeout(() => setAdoptedFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Agronomic Matching Engine
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">{activeFarm.name} ({activeFarm.sizeHa} ha)</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <Sprout className="w-6 h-6 text-emerald-400" />
            <span>Crop Suitability &amp; Variety Advisor</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Cross-referencing soil chemistry, rainfall outlook, and local market prices to calculate optimal crop
            profitability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCompareMode(!compareMode)}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all self-start sm:self-auto ${
            compareMode
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950'
              : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-750'
          }`}
        >
          <GitCompare className="w-4 h-4 text-emerald-400" />
          <span>{compareMode ? 'Exit Comparison Mode' : 'Side-by-Side Crop Comparison'}</span>
        </button>
      </div>

      {/* Comparison Drawer if Active */}
      {compareMode ? (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-emerald-500/40 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-emerald-400" />
                <span>Side-by-Side Agronomic &amp; Financial Comparison</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Direct comparative analysis between two candidate crops for your 5.2 ha parcel.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              Deterministic Agronomics
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { crop: compareCropA, setCrop: setCompareCropA, label: 'Crop Option A' },
              { crop: compareCropB, setCrop: setCompareCropB, label: 'Crop Option B' },
            ].map(({ crop, setCrop, label }, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-neutral-400 uppercase">{label}</span>
                  <select
                    value={crop.id}
                    onChange={(e) => {
                      const found = CROPS_DATABASE.find((c) => c.id === e.target.value);
                      if (found) setCrop(found);
                    }}
                    className="bg-neutral-900 border border-neutral-700 text-neutral-100 text-xs px-2.5 py-1 rounded-lg focus:outline-none"
                  >
                    {CROPS_DATABASE.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-baseline justify-between">
                  <h4 className="text-lg font-bold text-neutral-100">{crop.name}</h4>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300">
                    {crop.suitabilityScore}% Match
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800 text-[11px]">
                  <div>
                    <span className="text-neutral-500 block">Typical Duration:</span>
                    <strong className="text-neutral-200">{crop.growthDuration}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Expected Yield:</span>
                    <strong className="text-neutral-200 font-mono">{crop.typicalYieldTonsPerHa.avg} t/ha</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Water Need:</span>
                    <strong className="text-neutral-200">{crop.waterRequirement}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Gross Margin:</span>
                    <strong className="text-emerald-400 font-mono font-bold">{crop.projectedMarginPercent}%</strong>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Input Cost per Hectare:</span>
                    <span className="font-mono text-neutral-200">₦{crop.inputCostPerHa.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Off-Take Price:</span>
                    <span className="font-mono text-emerald-400">₦{(crop.marketPricePerTon).toLocaleString()} / ton</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-neutral-300 block text-[11px]">Key Agronomic Driver:</span>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">{crop.whyRecommended[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Recommended Crops Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CROPS_DATABASE.map((crop) => {
          const isSelected = selectedCrop.id === crop.id;
          return (
            <div
              key={crop.id}
              onClick={() => setSelectedCrop(crop)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-neutral-900 border-emerald-500/60 shadow-xl shadow-emerald-950/20'
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-neutral-100">{crop.name}</h3>
                    <span className="text-xs text-neutral-500 italic block">{crop.scientificName}</span>
                  </div>

                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {crop.suitabilityScore}% Match
                    </span>
                  </div>
                </div>

                {/* Variety & Key Highlights */}
                <div className="space-y-1.5 my-3 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500">Category:</span>
                    <strong className="text-neutral-200">{crop.category}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500">Growth Duration:</span>
                    <span className="text-neutral-300">{crop.growthDuration}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500">Projected Yield:</span>
                    <strong className="text-emerald-400 font-mono">{crop.typicalYieldTonsPerHa.avg} t/ha</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500">Gross Margin:</span>
                    <strong className="text-emerald-400 font-mono font-bold">{crop.projectedMarginPercent}%</strong>
                  </div>
                </div>

                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                  {crop.whyRecommended[0]}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-mono text-[11px]">
                  Risk: {crop.riskLevel}
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  Full Breakdown &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Crop Deep-Dive Panel */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                Full Agronomic Dossier
              </span>
              <span className="text-neutral-500">&bull;</span>
              <span className="text-xs text-neutral-400">Selected: {selectedCrop.name}</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-100 mt-1">
              {selectedCrop.name} ({selectedCrop.scientificName})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onUpdateFarm && activeFarm.currentCrop !== selectedCrop.name && (
              <button
                type="button"
                onClick={() => handleAdoptCrop(selectedCrop)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950 transition-colors"
              >
                <Sprout className="w-4 h-4" />
                <span>Plant {selectedCrop.name} on {activeFarm.name}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('simulator')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
            >
              <span>Simulate Farm Economics for {selectedCrop.name}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {adoptedFeedback && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{adoptedFeedback}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Soil & Environmental Fit */}
          <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Layers className="w-4 h-4" />
              <span>Soil &amp; Climate Adaptation</span>
            </div>
            <p className="text-neutral-300 leading-relaxed text-[11.5px]">{selectedCrop.idealSoil}</p>
            <div className="space-y-1.5 text-[11px] pt-2 border-t border-neutral-800">
              <div className="flex justify-between">
                <span className="text-neutral-500">Ideal pH Window:</span>
                <span className="text-neutral-200 font-mono">{selectedCrop.idealPhRange[0]} - {selectedCrop.idealPhRange[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Water Requirement:</span>
                <span className="text-neutral-200">{selectedCrop.waterRequirement}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Planting Calendar:</span>
                <span className="text-neutral-200">{selectedCrop.plantingWindow}</span>
              </div>
            </div>
          </div>

          {/* Economics */}
          <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <DollarSign className="w-4 h-4" />
              <span>Per-Hectare Unit Economics</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-400">Total Input Cost / Ha:</span>
                <span className="font-mono text-neutral-100">
                  ₦{selectedCrop.inputCostPerHa.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Off-Take Price / Ton:</span>
                <span className="font-mono text-emerald-400">
                  ₦{selectedCrop.marketPricePerTon.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Average Expected Yield:</span>
                <span className="font-mono text-neutral-200">
                  {selectedCrop.typicalYieldTonsPerHa.avg} tons/ha
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-neutral-800 font-bold text-emerald-400">
                <span>Gross Margin:</span>
                <span className="font-mono">{selectedCrop.projectedMarginPercent}%</span>
              </div>
            </div>
          </div>

          {/* Key Agronomic Strengths & Pests */}
          <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Why Recommended for this Farm</span>
            </div>
            <ul className="space-y-1.5 text-[11.5px] text-neutral-300">
              {selectedCrop.whyRecommended.map((rec, rIdx) => (
                <li key={rIdx} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
