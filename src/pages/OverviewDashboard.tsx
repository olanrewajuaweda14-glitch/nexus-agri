import React from 'react';
import {
  Activity,
  CloudSun,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Layers,
  ArrowRight,
  Sparkles,
  Bot,
  Clock,
  CheckCircle2,
  Calendar,
  Eye,
  Droplets,
  Wind,
  Cpu,
} from 'lucide-react';
import { Farm, WeatherData, AppNavigationTab, WhatChangedEvent, AlertNotification } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { DataTrustBadge } from '../components/common/DataTrustBadge';
import { InteractiveMap } from '../components/common/InteractiveMap';
import { WHAT_CHANGED_EVENTS, SATELLITE_ANOMALIES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

interface OverviewDashboardProps {
  activeFarm: Farm;
  weather: WeatherData;
  onNavigate: (tab: AppNavigationTab) => void;
  userName?: string;
  onOpenVoice: () => void;
  onOpenDemoStory?: () => void;
  onOpenDecisionSynthesis?: () => void;
  farms?: Farm[];
  alerts?: AlertNotification[];
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  activeFarm,
  weather,
  onNavigate,
  userName = 'Agronomist',
  onOpenVoice,
  onOpenDemoStory,
  onOpenDecisionSynthesis,
}) => {
  const { user } = useAuth();
  const displayName = user?.name || userName;

  // Deterministic financial figures for active farm
  const expectedTons = (activeFarm.sizeHa || 0) * (activeFarm.estimatedYieldTonsPerHa || 0);
  const expectedRevenue = expectedTons * 480000;
  const estimatedCost = (activeFarm.sizeHa || 0) * 520000;
  const estimatedMargin = expectedRevenue > 0
    ? Math.round(((expectedRevenue - estimatedCost) / expectedRevenue) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Field Command Center
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight mt-1">
            Good morning, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Real-time status and actionable intelligence for <strong className="text-neutral-200">{activeFarm.name}</strong> ({activeFarm.sizeHa} ha, {activeFarm.currentCrop}).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenDecisionSynthesis && (
            <button
              type="button"
              onClick={onOpenDecisionSynthesis}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Cross-Stream Decision</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenDemoStory}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-neutral-700/80 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Show How NEXUS Decides</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ai-advisor')}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span>Consult NEXUS AI</span>
          </button>
        </div>
      </div>

      {/* 8 Core KPI Cards (Section 6) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Farm Health"
          value={`${activeFarm.healthScore}/100`}
          subValue="Vegetation index at peak"
          badgeText="Good"
          badgeTone="positive"
          trendDirection="up"
          trendLabel="+4 pts over 14d"
          icon={Activity}
          onClick={() => onNavigate('farm-health')}
        />

        <MetricCard
          title="Weather Risk"
          value={activeFarm.weatherRisk}
          subValue="38.6mm rain in 7-day outlook"
          badgeText="Optimal"
          badgeTone="positive"
          trendDirection="neutral"
          trendLabel="No heat stress alert"
          icon={CloudSun}
          onClick={() => onNavigate('weather')}
        />

        <MetricCard
          title="Estimated Yield"
          value={`${activeFarm.estimatedYieldTonsPerHa} t/ha`}
          subValue={`Projected Total: ${expectedTons.toFixed(1)} tons`}
          badgeText="Healthy"
          badgeTone="positive"
          trendDirection="up"
          trendLabel="+0.3 t/ha vs regional avg"
          icon={TrendingUp}
          onClick={() => onNavigate('crop-advisor')}
        />

        <MetricCard
          title="Expected Revenue"
          value={`₦${(expectedRevenue / 1000000).toFixed(2)}M`}
          subValue={`Estimated Margin: ${estimatedMargin}%`}
          badgeText={`₦${expectedRevenue.toLocaleString()}`}
          badgeTone="positive"
          trendDirection="up"
          trendLabel="Bodija market price rising"
          icon={DollarSign}
          onClick={() => onNavigate('economics')}
        />

        <MetricCard
          title="Soil Health"
          value="Good (6.4 pH)"
          subValue={`Moisture: ${activeFarm.soil.moisturePercent}% (Deficit)`}
          badgeText="Estimated"
          badgeTone="warning"
          trendDirection="down"
          trendLabel="-1.8% moisture past 72h"
          icon={Layers}
          onClick={() => onNavigate('soil')}
        />

        <MetricCard
          title="Market Trend"
          value="↑ Positive"
          subValue="White Maize: ₦480/kg (+4.2%)"
          badgeText="High Demand"
          badgeTone="positive"
          trendDirection="up"
          trendLabel="Feed millers procurement"
          icon={TrendingUp}
          onClick={() => onNavigate('markets')}
        />

        <MetricCard
          title="Spraying Window"
          value="Tomorrow 7 AM"
          subValue="Wind 5 km/h, dew dried, 0% rain"
          badgeText="Open"
          badgeTone="positive"
          trendDirection="neutral"
          trendLabel="Optimal foliar absorption"
          icon={Wind}
          onClick={() => onNavigate('weather')}
        />

        <MetricCard
          title="Overall Farm Risk"
          value={activeFarm.overallRisk}
          subValue="Main driver: topsoil moisture"
          badgeText="Actionable"
          badgeTone="warning"
          trendDirection="neutral"
          trendLabel="Manageable with sprinkler"
          icon={AlertTriangle}
          onClick={() => onNavigate('risk')}
        />
      </div>

      {/* Prominent NEXUS Insight Section (Section 7) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-neutral-900 to-neutral-900 border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold font-mono uppercase tracking-widest text-emerald-400">
                NEXUS Strategic Insight
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Generated: 25 minutes ago &bull; Model: Gemini 3.8 Flash + Deterministic Rules</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-neutral-100 leading-snug">
              Rainfall conditions will improve within 72 hours, but topsoil moisture is currently below optimal
              canopy threshold. Based on your {activeFarm.growthStage} stage, run a light 2-hour sprinkler cycle if
              available, and utilize tomorrow&apos;s 07:00 AM spraying window for foliar feeding.
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-4xl">
              <strong>Agronomic Rationale:</strong> The crop has entered high evapotranspiration demand (4.1 mm/day).
              While incoming convective clouds promise 14mm on Monday, waiting without supplemental moisture risks
              stunting silk emergence. Furthermore, wind speeds tomorrow morning drop below 6 km/h, providing an
              ideal calm window for nutrient absorption.
            </p>
          </div>

          {/* Key Evidence & Data Used */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <span className="text-neutral-400 text-[11px] block font-semibold">Data Stream Ingested</span>
              <p className="text-neutral-200 font-medium mt-0.5">ECMWF 7-Day Precipitation + ET0 Model</p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <span className="text-neutral-400 text-[11px] block font-semibold">Soil Sensor / Geospatial Grid</span>
              <p className="text-neutral-200 font-medium mt-0.5">Topsoil Moisture: 22.4% (Threshold: 25%)</p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <span className="text-neutral-400 text-[11px] block font-semibold">Analytical Confidence</span>
              <p className="text-emerald-400 font-mono font-bold mt-0.5">82% (High Confidence Support)</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('farm-intelligence')}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors"
            >
              <span>View Full Agronomic Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('ai-advisor')}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold border border-neutral-700/80 flex items-center gap-1.5 transition-colors"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ask NEXUS About This Decision</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: "What Changed?" Timeline (Left) & Farm Map Inspection (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: What Changed? (Section 8) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <span>What Changed?</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Dynamic Shifts
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Recent environmental, market, and satellite deltas &amp; their impact on your decisions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('alerts')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Alerts &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {WHAT_CHANGED_EVENTS.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-all space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-neutral-800 text-neutral-300">
                      {event.category}
                    </span>
                    <span className="font-bold text-neutral-100">{event.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">{event.timestamp}</span>
                </div>

                <div className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-950/30 px-2.5 py-1 rounded border border-emerald-500/20">
                  {event.delta}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">{event.description}</p>

                {/* Explanation of Why the decision adjusted */}
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 text-[11.5px] text-neutral-300 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-neutral-200">Decision Impact:</strong>{' '}
                    <span>{event.impactExplanation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Interactive Map Inspection & Data Trust */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-100">Live Parcel &amp; Satellite Heatmap</h3>
              <p className="text-xs text-neutral-400">
                Visualizing vegetation biomass (NDVI) and localized moisture stress zones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('satellite')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Full Screen GIS &rarr;
            </button>
          </div>

          {/* Map */}
          <InteractiveMap
            farm={activeFarm}
            anomalies={SATELLITE_ANOMALIES}
            className="shadow-xl"
          />

          {/* Data Provenance & Trust Card */}
          <DataTrustBadge
            sourceName="European Space Agency Copernicus (Sentinel-2 10m) + SoilGrids 250m"
            sourceType="satellite_remote"
            confidenceScore={82}
            lastUpdated="Overpass: 2026-09-15 11:20 WAT (Next overpass in 3 days)"
            assumptions={[
              'Atmospheric cloud cover interference evaluated at <5%',
              'Reflectance corrected using Sen2Cor Level-2A surface bottom-of-atmosphere baseline',
            ]}
            knownLimitations={[
              'Satellite vegetation indices highlight canopy density variations, but cannot diagnose a specific viral pathogen without ground tissue assay.',
            ]}
          />
        </div>
      </div>
    </div>
  );
};
