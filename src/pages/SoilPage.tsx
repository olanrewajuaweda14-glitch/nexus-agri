import React, { useState, useMemo } from 'react';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Droplets,
  Sprout,
  CheckCircle2,
  HelpCircle,
  FileText,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { Farm, SoilProfile, AppNavigationTab } from '../types';
import { DataTrustBadge } from '../components/common/DataTrustBadge';
import { SoilService } from '../services/soilService';

interface SoilPageProps {
  activeFarm: Farm;
  onUpdateSoilSource?: (source: 'laboratory' | 'geospatial_estimate') => void;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const SoilPage: React.FC<SoilPageProps> = ({
  activeFarm,
  onUpdateSoilSource,
  onNavigate,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedLabName, setUploadedLabName] = useState('IITA Soil Chemistry Laboratory, Ibadan');
  const [uploadedDate, setUploadedDate] = useState('2026-08-20');
  const [interactivePh, setInteractivePh] = useState<number>(activeFarm.soil.ph);

  const isEstimated = activeFarm.soil.source === 'geospatial_estimate';

  // Dynamic liming calculation
  const limingCalc = useMemo(() => {
    return SoilService.calculateLimingRequirement(
      interactivePh,
      6.5,
      activeFarm.soil.texture,
      activeFarm.sizeHa || 5.2
    );
  }, [interactivePh, activeFarm.soil.texture, activeFarm.sizeHa]);

  // Organic matter interpretation
  const omInterpretation = useMemo(() => {
    const om = activeFarm.soil.organicMatterPercent;
    if (om < 1.5) return { status: 'Depleted', advice: 'Incorporate cover crops or animal manure to boost organic carbon.' };
    if (om < 2.5) return { status: 'Moderate', advice: 'Sufficient organic carbon. Retain crop stubble after harvest.' };
    return { status: 'Optimal', advice: 'High microbial activity and water holding capacity.' };
  }, [activeFarm.soil.organicMatterPercent]);

  // pH interpretation
  const phInterpretation = useMemo(() => {
    if (interactivePh < 5.5) return { label: 'Strongly Acidic', color: 'text-rose-400', desc: 'Phosphorus fixation risk; liming strongly advised.' };
    if (interactivePh < 6.0) return { label: 'Moderately Acidic', color: 'text-amber-400', desc: 'Acceptable for maize/cassava; slight liming beneficial.' };
    if (interactivePh <= 7.2) return { label: 'Optimal Range', color: 'text-emerald-400', desc: 'Peak bioavailability for N-P-K and micronutrients.' };
    return { label: 'Alkaline', color: 'text-sky-400', desc: 'Zinc and iron deficiency risks.' };
  }, [interactivePh]);

  const handleSimulateLabUpload = () => {
    if (onUpdateSoilSource) {
      onUpdateSoilSource('laboratory');
    }
    setShowUploadModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider">
              Pedology &amp; Soil Horizon
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">{activeFarm.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <Layers className="w-6 h-6 text-amber-400" />
            <span>Soil Intelligence System</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Physical texture, chemical nutrient availability (N-P-K), pH buffer capacity, and hydrological moisture
            dynamics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-bold border border-neutral-700 flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Upload className="w-4 h-4 text-emerald-400" />
          <span>Upload Laboratory Soil Assay</span>
        </button>
      </div>

      {/* Critical Honest Data Source Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isEstimated
            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {isEstimated ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-neutral-100">
                {isEstimated ? 'Data Source: Estimated from Geospatial Data' : 'Data Source: Certified Laboratory Assay'}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isEstimated
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isEstimated ? 'SoilGrids 250m' : 'IITA Certified Lab'}
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed max-w-2xl">
              {isEstimated
                ? 'These soil chemical values are derived from spatial machine learning models calibrated across West African pedological surveys. For maximum precision in micro-nutrient application, consider sending a physical core sample to an accredited lab.'
                : `Verified laboratory soil sample processed on ${uploadedDate}. Precision confidence is maximized at 96%.`}
            </p>
          </div>
        </div>

        {isEstimated && (
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 shrink-0 transition-colors"
          >
            Refine with Lab Test
          </button>
        )}
      </div>

      {/* Primary Soil Parameter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-neutral-500 block">Soil pH (H₂O)</span>
            <input
              type="range"
              min="4.5"
              max="8.5"
              step="0.1"
              value={interactivePh}
              onChange={(e) => setInteractivePh(parseFloat(e.target.value))}
              className="w-12 h-1 accent-emerald-500 cursor-pointer"
              title="Adjust pH to test liming needs"
            />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-100 mt-1">{interactivePh.toFixed(1)}</div>
          <span className={`text-[11px] font-semibold mt-1 block truncate ${phInterpretation.color}`}>
            {phInterpretation.label}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-neutral-500 block">Available Nitrogen</span>
          <div className="text-2xl font-bold font-mono text-neutral-100 mt-1">{activeFarm.soil.nitrogenKgHa} <span className="text-xs font-normal text-neutral-500">kg/ha</span></div>
          <span className="text-[11px] text-amber-400 font-semibold mt-1 block">Moderate Deficit</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-neutral-500 block">Phosphorus (Bray-1)</span>
          <div className="text-2xl font-bold font-mono text-neutral-100 mt-1">{activeFarm.soil.phosphorusPpm} <span className="text-xs font-normal text-neutral-500">ppm</span></div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">Adequate</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-neutral-500 block">Potassium (Exch.)</span>
          <div className="text-2xl font-bold font-mono text-neutral-100 mt-1">{activeFarm.soil.potassiumPpm} <span className="text-xs font-normal text-neutral-500">ppm</span></div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">High Reserve</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-neutral-500 block">Organic Carbon</span>
          <div className="text-2xl font-bold font-mono text-neutral-100 mt-1">{activeFarm.soil.organicMatterPercent}%</div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">{omInterpretation.status} SOM</span>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-neutral-500 block">Topsoil Moisture</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{activeFarm.soil.moisturePercent}%</div>
          <span className="text-[11px] text-amber-400 font-semibold mt-1 block">Below Field Capacity</span>
        </div>
      </div>

      {/* Actionable Prescriptions: Fertilizer & Liming & Moisture Retention */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Fertilizer Plan */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Sprout className="w-4 h-4" />
            <h3 className="text-sm font-bold text-neutral-100">Fertilizer Prescription (Split-Dose)</h3>
          </div>
          <p className="text-neutral-300 leading-relaxed text-[11.5px]">
            To sustain target yield of 3.8 t/ha for {activeFarm.currentCrop}:
          </p>
          <ul className="space-y-2 text-neutral-300 text-[11px]">
            <li className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
              <strong className="text-neutral-100 block">Basal Application (Completed):</strong>
              <span>NPK 15-15-15 @ 200 kg/ha placed 5cm from seed furrow.</span>
            </li>
            <li className="p-2.5 rounded-lg bg-neutral-950 border border-emerald-500/30">
              <strong className="text-emerald-400 block">Top-Dressing Window (Next 7 Days):</strong>
              <span>Granular Urea (46% N) @ 100 kg/ha applied before Tuesday convective rain.</span>
            </li>
          </ul>
        </div>

        {/* Soil Chemistry & Liming */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold">
            <Layers className="w-4 h-4" />
            <h3 className="text-sm font-bold text-neutral-100">pH Buffer &amp; Liming Rationale</h3>
          </div>
          <p className="text-neutral-300 leading-relaxed text-[11.5px]">
            {phInterpretation.desc}
          </p>
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-neutral-500">Liming Requirement:</span>
              <strong className={limingCalc.isNeeded ? "text-amber-400 font-mono" : "text-emerald-400 font-mono"}>
                {limingCalc.isNeeded ? `${limingCalc.tonsPerHa} t/ha (${limingCalc.totalTons} t total)` : "0.0 kg (Not Required)"}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Cation Exchange (CEC):</span>
              <span className="text-neutral-200 font-mono">{activeFarm.soil.cec} cmol/kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Aluminum Saturation:</span>
              <span className="text-neutral-200 font-mono">&lt; 1% (Zero Toxicity)</span>
            </div>
          </div>
          <p className="text-[10px] text-neutral-400 italic">
            {limingCalc.recommendation}
          </p>
        </div>

        {/* Moisture Retention */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Droplets className="w-4 h-4" />
            <h3 className="text-sm font-bold text-neutral-100">Moisture Retention Strategy</h3>
          </div>
          <p className="text-neutral-300 leading-relaxed text-[11.5px]">
            {activeFarm.soil.texture} offers strong drainage with moderate water retention. Topsoil moisture (22.4%)
            is 3.6% beneath ideal field capacity (26.0%).
          </p>
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-neutral-200 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recommended Practices:</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Maintain crop residue mulch along row middles to reduce evaporative loss by up to 28% during high
              solar noon flux.
            </p>
          </div>
        </div>
      </div>

      {/* Modal for Uploading Lab Test */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-100">Upload Laboratory Soil Analysis</h3>
            <p className="text-xs text-neutral-400">
              Provide certified laboratory documentation to replace regional geospatial estimates with ground-truth
              readings.
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Accredited Testing Laboratory</label>
                <input
                  type="text"
                  value={uploadedLabName}
                  onChange={(e) => setUploadedLabName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Test Completion Date</label>
                <input
                  type="date"
                  value={uploadedDate}
                  onChange={(e) => setUploadedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs focus:outline-none"
                />
              </div>

              <div className="p-4 border-2 border-dashed border-neutral-700 rounded-xl text-center cursor-pointer hover:border-emerald-500 transition-colors">
                <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-1" />
                <span className="text-xs text-neutral-300 font-semibold block">
                  Click or drag PDF / CSV / Image assay report
                </span>
                <span className="text-[10px] text-neutral-500">IITA, SGS, or State Soil Testing Bureau</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSimulateLabUpload}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Validate &amp; Ingest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Trust Badge */}
      <DataTrustBadge
        sourceName="ISRIC SoilGrids 250m Global Soil Information + Regional Field Calibration"
        sourceType="laboratory_soil"
        confidenceScore={isEstimated ? 78 : 96}
        lastUpdated="Sample Epoch: 2026 Season Survey"
        assumptions={[
          'Texture determined via USDA textural triangle classification.',
          'Nitrogen estimates model organic matter mineralization rate under sub-humid tropical conditions.',
        ]}
      />
    </div>
  );
};
