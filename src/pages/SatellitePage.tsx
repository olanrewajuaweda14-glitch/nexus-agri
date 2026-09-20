import React, { useState } from 'react';
import {
  Satellite,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Sparkles,
  Info,
  Maximize2,
} from 'lucide-react';
import { Farm, SatelliteZoneAnomaly, AppNavigationTab } from '../types';
import { InteractiveMap } from '../components/common/InteractiveMap';
import { SATELLITE_ANOMALIES } from '../data/mockData';
import { DataTrustBadge } from '../components/common/DataTrustBadge';

interface SatellitePageProps {
  activeFarm: Farm;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const SatellitePage: React.FC<SatellitePageProps> = ({ activeFarm, onNavigate }) => {
  const [selectedLayer, setSelectedLayer] = useState<'true_color' | 'ndvi' | 'ndwi' | 'elevation'>('ndvi');
  const [activeAnomaly, setActiveAnomaly] = useState<SatelliteZoneAnomaly | null>(SATELLITE_ANOMALIES[0]);

  const ndviHistory = [
    { date: '30 Days Ago', val: 0.35, label: 'Emergence' },
    { date: '20 Days Ago', val: 0.52, label: 'Early Vegetative' },
    { date: '10 Days Ago', val: 0.74, label: 'Rapid Canopy' },
    { date: 'Current (3d ago)', val: 0.81, label: 'Canopy Peak V12' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Earth Observation Subsystem
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">{activeFarm.name} ({activeFarm.sizeHa} ha)</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <Satellite className="w-6 h-6 text-emerald-400" />
            <span>Satellite Multispectral Monitor</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            European Space Agency Sentinel-2 constellation (10m spatial resolution) with automated anomaly detection.
          </p>
        </div>

        {/* Next Overpass Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>Last Overpass: <strong>3 days ago</strong> (Next pass in <strong>48 hours</strong>)</span>
        </div>
      </div>

      {/* Main Map & Layer Controller Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map Stage (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <InteractiveMap
            farm={activeFarm}
            anomalies={SATELLITE_ANOMALIES}
            activeLayer={selectedLayer}
            onLayerChange={setSelectedLayer}
            className="h-[460px] shadow-2xl"
          />

          {/* Layer description bar */}
          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-neutral-300">
                {selectedLayer === 'ndvi' && 'NDVI: Normalized Difference Vegetation Index measuring active chlorophyll reflectance.'}
                {selectedLayer === 'ndwi' && 'NDWI: Normalized Difference Water Index highlighting cellular hydration & moisture.'}
                {selectedLayer === 'elevation' && 'Digital Elevation Model: Surface topography & hydrologic flow gradients.'}
                {selectedLayer === 'true_color' && 'True Color: Natural RGB optical imagery (B04, B03, B02).'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-neutral-500 shrink-0">10m / Pixel Res</span>
          </div>
        </div>

        {/* Anomaly & Layer Details Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Anomaly Inspector */}
          {activeAnomaly ? (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-amber-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  Multispectral Anomaly Detected
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeAnomaly.severity.toUpperCase()} Severity
                </span>
              </div>

              <h3 className="text-base font-bold text-neutral-100">{activeAnomaly.zone}</h3>

              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-amber-300">
                {activeAnomaly.indexDrop}
              </div>

              <div className="space-y-1 text-xs">
                <span className="font-semibold text-neutral-400 block text-[11px]">Suspected Agronomic Factor:</span>
                <p className="text-neutral-200 leading-relaxed">{activeAnomaly.suspectedFactor}</p>
              </div>

              <div className="space-y-1 text-xs pt-2 border-t border-neutral-800">
                <span className="font-semibold text-emerald-400 block text-[11px]">Recommended Ground Action:</span>
                <p className="text-neutral-300 leading-relaxed">
                  Perform localized root zone core sampling and evaluate subsurface soil compaction or gravel layers.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('photo-analysis')}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Upload Field Photo for {activeAnomaly.zone} &rarr;</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center py-12 text-neutral-500 text-xs">
              Select an anomaly zone to inspect diagnostic telemetry.
            </div>
          )}

          {/* Spectral Indices Reference Values */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2 text-xs">
            <span className="font-bold text-neutral-200 block text-xs">Farm-Wide Index Summary</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block">Canopy NDVI:</span>
                <strong className="text-emerald-400 font-mono text-sm">0.81</strong>
              </div>
              <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block">Canopy NDWI:</span>
                <strong className="text-sky-400 font-mono text-sm">0.27</strong>
              </div>
              <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block">Enhanced EVI:</span>
                <strong className="text-emerald-400 font-mono text-sm">0.65</strong>
              </div>
              <div className="p-2 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block">Heterogeneity:</span>
                <strong className="text-amber-400 font-mono text-sm">7.2%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 30-Day Vegetation Growth Timeline */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span>Multispectral Canopy Trajectory (Last 30 Days)</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Tracking vegetative vigor development from germination to V12 tasseling transition.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            +0.46 Total Delta
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ndviHistory.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                <span>{item.date}</span>
                <span className="font-mono text-neutral-500">Pass #{idx + 1}</span>
              </div>
              <div className="text-xl font-mono font-bold text-emerald-400">
                NDVI {item.val.toFixed(2)}
              </div>
              <span className="text-[11px] text-neutral-300 font-medium block">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Trust Badge */}
      <DataTrustBadge
        sourceName="European Space Agency (ESA) Copernicus Sentinel-2 MSI"
        sourceType="satellite_remote"
        confidenceScore={94}
        lastUpdated="Acquisition: 2026-09-15 11:20 WAT"
        assumptions={[
          'Atmospheric aerosol optical depth (AOD) validated at 0.12 (clear sky condition).',
        ]}
      />
    </div>
  );
};
