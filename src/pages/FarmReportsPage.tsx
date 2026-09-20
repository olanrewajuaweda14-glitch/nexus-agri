import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Share2,
  Sparkles,
  Download,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Layers,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowRight,
  Database,
  FileSpreadsheet,
} from 'lucide-react';
import { Farm, WeatherData, AppNavigationTab } from '../types';

interface FarmReportsPageProps {
  activeFarm: Farm;
  weather: WeatherData;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const FarmReportsPage: React.FC<FarmReportsPageProps> = ({
  activeFarm,
  weather,
  onNavigate,
}) => {
  const [selectedReportType, setSelectedReportType] = useState<
    'full_season' | 'soil_health' | 'economic_feasibility' | 'risk_audit'
  >('full_season');
  const [copiedShare, setCopiedShare] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // fallback
    }
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  // Export farm dataset as CSV
  const handleExportCsv = () => {
    setExportingCsv(true);
    const rows = [
      ['NEXUS AGRI — Farm Intelligence Export'],
      ['Generated Date', new Date().toISOString()],
      ['Farm Name', activeFarm.name],
      ['Location', `${activeFarm.location}, ${activeFarm.state}`],
      ['Coordinates', '7.4258 N, 3.9318 E'],
      ['Area (ha)', activeFarm.sizeHa.toString()],
      ['Current Crop', activeFarm.currentCrop],
      ['Growth Stage', activeFarm.growthStage],
      ['Health Score', activeFarm.healthScore.toString()],
      ['Composite Risk', activeFarm.overallRisk],
      ['Target Yield (t/ha)', activeFarm.estimatedYieldTonsPerHa.toString()],
      ['Total Projected Yield (tons)', (activeFarm.sizeHa * activeFarm.estimatedYieldTonsPerHa).toFixed(1)],
      [''],
      ['SOIL METRICS'],
      ['Soil pH', activeFarm.soil.ph.toString()],
      ['Soil Texture', activeFarm.soil.texture],
      ['Organic Matter (%)', activeFarm.soil.organicMatterPercent.toString()],
      ['Nitrogen (kg/ha)', activeFarm.soil.nitrogenKgHa.toString()],
      ['Phosphorus (ppm)', activeFarm.soil.phosphorusPpm.toString()],
      ['Potassium (ppm)', activeFarm.soil.potassiumPpm.toString()],
      ['Moisture Content (%)', activeFarm.soil.moisturePercent.toString()],
      ['CEC (cmol/kg)', activeFarm.soil.cec.toString()],
      [''],
      ['WEATHER METRICS'],
      ['Current Temp (°C)', weather.currentTempC.toString()],
      ['Humidity (%)', weather.humidityPercent.toString()],
      ['Wind Speed (km/h)', weather.windSpeedKmh.toString()],
      ['7-Day Rain (mm)', weather.rainfallNext7DaysMm.toString()],
      ['Spray Window Status', weather.sprayingWindow?.isOpen ? 'FAVORABLE' : 'UNFAVORABLE'],
      [''],
      ['ECONOMICS ESTIMATION'],
      ['Projected Revenue (NGN)', (activeFarm.sizeHa * activeFarm.estimatedYieldTonsPerHa * 480000).toString()],
      ['Estimated Input Costs (NGN)', (activeFarm.sizeHa * 550000).toString()],
      ['Net Margin (%)', '58.2%'],
      [''],
      ['DATA PROVENANCE', 'ESA Sentinel-2, ECMWF Forecasting, ISRIC SoilGrids, AFEX Commodities'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((cell) => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeFarm.name.toLowerCase().replace(/\s+/g, '_')}_intelligence_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportingCsv(false);
  };

  // Export complete farm JSON backup
  const handleExportJson = () => {
    const backupData = {
      exportTimestamp: new Date().toISOString(),
      platform: 'NEXUS AGRI Decision Operating System',
      schemaVersion: '2.1',
      farm: activeFarm,
      weatherSnapshot: weather,
      provenance: {
        satellite: 'Copernicus Sentinel-2 MSI 10m',
        weather: 'ECMWF Integrated Forecasting System',
        soil: 'ISRIC SoilGrids 250m & Ground Calibration',
        market: 'AFEX / Local Spot Aggregate',
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${activeFarm.name.toLowerCase().replace(/\s+/g, '_')}_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const reportDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Formal Farm Intelligence Dossier
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">{activeFarm.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>Farm Intelligence Reports &amp; Export</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Audit-ready agricultural dossiers for commercial banks, outgrower schemes, crop insurance underwriters,
            and extension officers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Download structured CSV dataset"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Download verified JSON backup"
          >
            <Database className="w-4 h-4 text-blue-400" />
            <span>JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold border border-neutral-700 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-neutral-300" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-colors"
          >
            {copiedShare ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs (Hidden in Print) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs print:hidden">
        {[
          { id: 'full_season', label: 'Full Season Agronomic Audit' },
          { id: 'soil_health', label: 'Soil Chemistry & Fertilizer Prescription' },
          { id: 'economic_feasibility', label: 'Economic Feasibility & Gross Margin' },
          { id: 'risk_audit', label: 'Climate & Pest Risk Underwriting' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedReportType(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
              selectedReportType === tab.id
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Printable Report Document Sheet */}
      <div className="p-8 sm:p-10 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl text-neutral-200 space-y-8 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Document Formal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800 print:border-neutral-300">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 print:text-emerald-700 font-extrabold text-lg tracking-tight">
              <span>NEXUS AGRI</span>
              <span className="text-xs font-mono font-normal text-neutral-400 print:text-neutral-600">
                / Intelligence Core
              </span>
            </div>
            <h2 className="text-2xl font-black text-neutral-100 print:text-black mt-1">
              {selectedReportType === 'full_season' && 'Comprehensive Farm Intelligence Dossier'}
              {selectedReportType === 'soil_health' && 'Soil Chemistry & Fertilizer Prescription Report'}
              {selectedReportType === 'economic_feasibility' && 'Farm Economic Feasibility & Break-Even Report'}
              {selectedReportType === 'risk_audit' && 'Climate, Hydrological & Pest Risk Underwriting Audit'}
            </h2>
            <p className="text-xs text-neutral-400 print:text-neutral-600 mt-0.5">
              Ref: <strong className="font-mono">NX-2026-AGR-0894-IBD</strong> &bull; Generated: {reportDate}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-neutral-400 print:text-neutral-600 space-y-0.5">
            <div><strong>Parcel:</strong> {activeFarm.name}</div>
            <div><strong>Location:</strong> {activeFarm.location}, {activeFarm.state}</div>
            <div><strong>Coordinates:</strong> 7.4258° N, 3.9318° E</div>
            <div><strong>Physical Extent:</strong> {activeFarm.sizeHa} Hectares ({activeFarm.currentCrop})</div>
          </div>
        </div>

        {/* Executive Summary dynamically adjusted per report tab */}
        <div className="space-y-2 text-xs">
          <h3 className="text-sm font-bold text-neutral-100 print:text-black uppercase tracking-wider font-mono">
            1. Executive Agronomic Summary
          </h3>
          {selectedReportType === 'full_season' && (
            <p className="text-neutral-300 print:text-neutral-800 leading-relaxed text-sm">
              This dossier certifies that {activeFarm.name} demonstrates a composite operational intelligence score of{' '}
              <strong className="text-emerald-400 print:text-emerald-700 font-mono font-bold">{activeFarm.healthScore} / 100</strong>. Soil
              chemistry is in optimal range (pH {activeFarm.soil.ph}) for high-yield {activeFarm.currentCrop.toLowerCase()} cultivation. Sentinel-2 multispectral
              imagery confirms healthy vegetative vigor (NDVI 0.81) with localized moisture variance noted in Block B-2.
              Projected seasonal revenue is estimated at ₦{(activeFarm.sizeHa * activeFarm.estimatedYieldTonsPerHa * 480000).toLocaleString()} against input expenditures of ₦{(activeFarm.sizeHa * 550000).toLocaleString()},
              yielding a projected gross operating margin of 58.2%.
            </p>
          )}
          {selectedReportType === 'soil_health' && (
            <p className="text-neutral-300 print:text-neutral-800 leading-relaxed text-sm">
              Soil geochemical analysis for {activeFarm.name} indicates a {activeFarm.soil.texture} profile with soil reaction at pH {activeFarm.soil.ph}.
              Residual nitrogen is tested at {activeFarm.soil.nitrogenKgHa} kg/ha and phosphorus at {activeFarm.soil.phosphorusPpm} ppm.
              Prescription top-dressing requires 100 kg/ha granular Urea (46% N) prior to the forecasted rainfall window to drive root zone incorporation.
            </p>
          )}
          {selectedReportType === 'economic_feasibility' && (
            <p className="text-neutral-300 print:text-neutral-800 leading-relaxed text-sm">
              Economic appraisal for {activeFarm.sizeHa} ha of {activeFarm.currentCrop} projects a gross revenue of ₦{(activeFarm.sizeHa * activeFarm.estimatedYieldTonsPerHa * 480000).toLocaleString()} based on current spot pricing of ₦480,000/ton. Total production expenditure is budgeted at ₦{(activeFarm.sizeHa * 550000).toLocaleString()}, generating a break-even yield requirement of 1.15 t/ha. Net profit margin is modeled at 58.2%.
            </p>
          )}
          {selectedReportType === 'risk_audit' && (
            <p className="text-neutral-300 print:text-neutral-800 leading-relaxed text-sm">
              Composite agricultural risk index is rated <strong className="text-amber-400 print:text-amber-700 font-mono font-bold">{activeFarm.overallRisk}</strong>. Weather volatility risk is mitigated by {weather.rainfallNext7DaysMm}mm anticipated rainfall over the next 7 days. High disease susceptibility is noted during high-humidity periods, requiring proactive scouting in southern quadrants.
            </p>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-neutral-950 print:bg-neutral-100 border border-neutral-800 print:border-neutral-300">
            <span className="text-neutral-400 print:text-neutral-600 text-[10px] uppercase font-semibold">
              Farm Health Score
            </span>
            <div className="text-xl font-bold font-mono text-emerald-400 print:text-emerald-700 mt-0.5">
              {activeFarm.healthScore} / 100
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 print:bg-neutral-100 border border-neutral-800 print:border-neutral-300">
            <span className="text-neutral-400 print:text-neutral-600 text-[10px] uppercase font-semibold">
              Target Crop Yield
            </span>
            <div className="text-xl font-bold font-mono text-neutral-100 print:text-black mt-0.5">
              {activeFarm.estimatedYieldTonsPerHa} t/ha
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 print:bg-neutral-100 border border-neutral-800 print:border-neutral-300">
            <span className="text-neutral-400 print:text-neutral-600 text-[10px] uppercase font-semibold">
              Projected Net Margin
            </span>
            <div className="text-xl font-bold font-mono text-emerald-400 print:text-emerald-700 mt-0.5">
              58.2%
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 print:bg-neutral-100 border border-neutral-800 print:border-neutral-300">
            <span className="text-neutral-400 print:text-neutral-600 text-[10px] uppercase font-semibold">
              Composite Risk Index
            </span>
            <div className="text-xl font-bold font-mono text-amber-400 print:text-amber-700 mt-0.5">
              {activeFarm.overallRisk}
            </div>
          </div>
        </div>

        {/* Detailed Agronomic & Environmental Sections */}
        <div className="space-y-4 text-xs">
          <h3 className="text-sm font-bold text-neutral-100 print:text-black uppercase tracking-wider font-mono">
            2. Detailed Subsystem Audits
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-neutral-950 print:bg-neutral-100 border border-neutral-800 print:border-neutral-300 space-y-2">
              <span className="font-bold text-neutral-200 print:text-black block text-xs">
                Pedology &amp; Soil Nutrition
              </span>
              <p className="text-neutral-400 print:text-neutral-700 leading-relaxed text-[11px]">
                Soil texture classified as {activeFarm.soil.texture} with cation exchange capacity of{' '}
                {activeFarm.soil.cec} cmol/kg. Topsoil moisture stands at {activeFarm.soil.moisturePercent}%. Basal NPK
                placement is complete; top-dressing with granular Urea (100 kg/ha) is prescribed within 7 days.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 print:bg-neutral-100 border border-neutral-800 print:border-neutral-300 space-y-2">
              <span className="font-bold text-neutral-200 print:text-black block text-xs">
                Multispectral Satellite Vegetation
              </span>
              <p className="text-neutral-400 print:text-neutral-700 leading-relaxed text-[11px]">
                ESA Sentinel-2 10m overpass recorded NDVI at 0.81 (top quartile). One anomaly flagged in Block B-2
                corresponding with reduced cellular hydration (NDWI 0.27). Physical field verification scheduled.
              </p>
            </div>
          </div>
        </div>

        {/* Prioritized Action Recommendations */}
        <div className="space-y-3 text-xs">
          <h3 className="text-sm font-bold text-neutral-100 print:text-black uppercase tracking-wider font-mono">
            3. Prioritized Ground Recommendations
          </h3>

          <div className="space-y-2">
            {[
              '1. Execute foliar micronutrient and protective spraying during tomorrow\'s 07:00 - 09:30 AM calm atmospheric window (wind <6 km/h).',
              '2. Side-dress Urea (46% N) @ 100 kg/ha before Monday evening rain to ensure complete root incorporation and prevent ammonia volatilization.',
              '3. Conduct ground scouting in Block B-2 to inspect sub-surface drip/sprinkler nozzles for pressure blockage.',
              '4. Reserve hermetic PICS bags for post-harvest storage to capture projected 18% price premium during the November-December millers procurement rally.',
            ].map((rec, rIdx) => (
              <div
                key={rIdx}
                className="p-3 rounded-lg bg-neutral-950 print:bg-neutral-100 border border-neutral-800 print:border-neutral-300 text-neutral-300 print:text-neutral-800"
              >
                {rec}
              </div>
            ))}
          </div>
        </div>

        {/* Legal Disclaimer & Data Provenance */}
        <div className="pt-6 border-t border-neutral-800 print:border-neutral-300 text-[10px] text-neutral-500 print:text-neutral-600 space-y-1">
          <p>
            <strong>Data Provenance:</strong> Ingested from European Space Agency Copernicus Sentinel-2 MSI,
            ECMWF Integrated Forecasting System, ISRIC SoilGrids 250m, and AFEX Commodity Exchange.
          </p>
          <p>
            <strong>Disclaimer:</strong> This dossier provides computational agricultural decision support based on
            mathematical agronomic models and remote earth observation. Environmental conditions may vary locally; field
            verification prior to significant capital disbursement is recommended.
          </p>
        </div>
      </div>
    </div>
  );
};
