import React, { useState } from 'react';
import { Layers, ZoomIn, ZoomOut, Maximize2, AlertCircle, Compass, MapPin, Eye, Check } from 'lucide-react';
import { Farm, SatelliteZoneAnomaly } from '../../types';

interface InteractiveMapProps {
  farm?: Farm;
  farms?: Farm[];
  onSelectFarm?: (farmId: string) => void;
  anomalies?: SatelliteZoneAnomaly[];
  activeLayer?: 'true_color' | 'ndvi' | 'ndwi' | 'elevation';
  onLayerChange?: (layer: 'true_color' | 'ndvi' | 'ndwi' | 'elevation') => void;
  allowBoundaryDraw?: boolean;
  onPointAdded?: (lat: number, lng: number) => void;
  className?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  farm,
  farms = [],
  onSelectFarm,
  anomalies = [],
  activeLayer: externalActiveLayer,
  onLayerChange,
  allowBoundaryDraw = false,
  onPointAdded,
  className = '',
}) => {
  const [internalLayer, setInternalLayer] = useState<'true_color' | 'ndvi' | 'ndwi' | 'elevation'>('ndvi');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedAnomaly, setSelectedAnomaly] = useState<SatelliteZoneAnomaly | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const activeLayer = externalActiveLayer || internalLayer;

  const handleLayerSelect = (layer: 'true_color' | 'ndvi' | 'ndwi' | 'elevation') => {
    if (onLayerChange) onLayerChange(layer);
    else setInternalLayer(layer);
    setShowLayerMenu(false);
  };

  const getLayerDescription = () => {
    switch (activeLayer) {
      case 'ndvi':
        return 'Normalized Difference Vegetation Index (10m Sentinel-2). Scale: 0.2 (dry soil) to 0.85 (vigorous canopy).';
      case 'ndwi':
        return 'Normalized Difference Water Index. Highlights canopy hydration and root-zone water stress.';
      case 'elevation':
        return 'Hydrological Elevation & Watershed Contours (SRTM 30m). Guides surface runoff furrow design.';
      case 'true_color':
        return 'High-Resolution Aerial Orthophoto (RGB Natural Band Composite).';
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 select-none ${className}`}>
      {/* Map Header Controls */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800 text-xs shadow-lg">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-neutral-200">{farm?.name || 'Oyo River Basin Agro-Corridor'}</span>
          <span className="text-neutral-400">({farm?.sizeHa || 5.2} ha)</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Layer Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-900/90 backdrop-blur-md border border-neutral-800 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 shadow-lg"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="capitalize">{activeLayer.replace('_', ' ')}</span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-neutral-900 border border-neutral-800 shadow-2xl p-1.5 z-30 text-xs">
                {[
                  { id: 'ndvi', label: 'NDVI (Canopy Biomass)', desc: 'Vegetation health index' },
                  { id: 'ndwi', label: 'NDWI (Canopy Moisture)', desc: 'Water stress analysis' },
                  { id: 'true_color', label: 'Natural Aerial RGB', desc: 'Visible spectrum' },
                  { id: 'elevation', label: 'Elevation & Contours', desc: 'Drainage & runoff' },
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleLayerSelect(l.id as any)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                      activeLayer === l.id ? 'bg-emerald-600/20 text-emerald-400 font-semibold' : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <div>
                      <div>{l.label}</div>
                      <div className="text-[10px] text-neutral-400">{l.desc}</div>
                    </div>
                    {activeLayer === l.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center rounded-lg bg-neutral-900/90 backdrop-blur-md border border-neutral-800 overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.0))}
              className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
              className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 border-l border-neutral-800"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Map Rendering */}
      <div className="w-full h-80 sm:h-96 md:h-[420px] relative overflow-hidden bg-[#0a110e] flex items-center justify-center cursor-crosshair">
        <svg
          viewBox="0 0 800 500"
          className="w-full h-full object-cover transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
          onClick={(e) => {
            if (allowBoundaryDraw && onPointAdded) {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              onPointAdded(7.42 + y * 0.01, 3.93 + x * 0.01);
            }
          }}
        >
          <defs>
            {/* NDVI Gradient Definition */}
            <radialGradient id="ndviFieldGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="85%" stopColor="#047857" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.65" />
            </radialGradient>

            {/* NDWI Water Stress Gradient */}
            <radialGradient id="ndwiFieldGrad" cx="45%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.7" />
            </radialGradient>

            {/* Elevation Gradient */}
            <linearGradient id="elevGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78716c" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#a8a29e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#44403c" stopOpacity="0.8" />
            </linearGradient>

            {/* Natural Satellite True Color Pattern */}
            <radialGradient id="aerialFieldGrad" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#2e5a36" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#24492b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1b3620" stopOpacity="0.8" />
            </radialGradient>
          </defs>

          {/* Background Topographic Matrix Grid */}
          <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#162c1d" strokeWidth="0.75" />
          </pattern>
          <rect width="800" height="500" fill="url(#gridPattern)" />

          {/* Surrounding Forest & Adjacent Parcels */}
          <path d="M 50,80 Q 250,40 450,90 T 750,60 L 780,450 L 30,470 Z" fill="#0d1f14" opacity="0.4" />
          <path d="M 120,130 L 380,110 L 400,280 L 140,300 Z" fill="#132a1b" stroke="#1b3d27" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M 430,90 L 710,70 L 740,240 L 450,260 Z" fill="#102517" stroke="#1b3d27" strokeWidth="1" strokeDasharray="4 4" />

          {/* River Stream / Hydrology Corridor */}
          <path
            d="M -10,380 C 150,370 280,440 450,410 C 600,380 720,430 820,420"
            fill="none"
            stroke="#0369a1"
            strokeWidth="8"
            strokeOpacity="0.6"
            strokeLinecap="round"
          />
          <path
            d="M -10,380 C 150,370 280,440 450,410 C 600,380 720,430 820,420"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeOpacity="0.8"
            strokeLinecap="round"
          />
          <text x="320" y="445" fill="#38bdf8" fontSize="10" fontFamily="monospace" opacity="0.8">
            Oyo Basin Tributary &rarr;
          </text>

          {/* MAIN FARM POLYGON */}
          <g>
            {/* Layer Fill based on active selection */}
            <polygon
              points="240,160 560,140 600,360 210,380"
              fill={
                activeLayer === 'ndvi'
                  ? 'url(#ndviFieldGrad)'
                  : activeLayer === 'ndwi'
                  ? 'url(#ndwiFieldGrad)'
                  : activeLayer === 'elevation'
                  ? 'url(#elevGrad)'
                  : 'url(#aerialFieldGrad)'
              }
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Field Contour Stripes */}
            <path d="M 230,220 L 570,200" stroke="#ffffff" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.3" />
            <path d="M 220,280 L 585,260" stroke="#ffffff" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.3" />
            <path d="M 215,330 L 595,310" stroke="#ffffff" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.3" />

            {/* Field Center Label */}
            <rect x="345" y="240" width="120" height="34" rx="6" fill="#09140e" stroke="#10b981" strokeWidth="1" opacity="0.9" />
            <text x="405" y="255" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">
              {farm?.currentCrop || 'Maize'} (SAMMAZ-52)
            </text>
            <text x="405" y="268" fill="#a7f3d0" fontSize="9.5" textAnchor="middle" fontFamily="monospace">
              {farm?.sizeHa || 5.2} ha &bull; Block A-D
            </text>

            {/* Boundary Vertices Pins */}
            {[
              [240, 160],
              [560, 140],
              [600, 360],
              [210, 380],
            ].map(([vx, vy], idx) => (
              <g key={idx}>
                <circle cx={vx} cy={vy} r="5" fill="#0d2319" stroke="#34d399" strokeWidth="2" />
                <circle cx={vx} cy={vy} r="2" fill="#34d399" />
              </g>
            ))}

            {/* Anomaly 1 Marker Northwest Block B-2 */}
            <g
              className="cursor-pointer group"
              onClick={() => setSelectedAnomaly(anomalies[0] || null)}
            >
              <circle cx="310" cy="205" r="22" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
              <circle cx="310" cy="205" r="8" fill="#f59e0b" />
              <text x="310" y="209" fill="#000" fontSize="9" fontWeight="bold" textAnchor="middle">!</text>
              <rect x="250" y="155" width="130" height="22" rx="4" fill="#1f1807" stroke="#f59e0b" strokeWidth="1" opacity="0.95" />
              <text x="315" y="170" fill="#fef3c7" fontSize="9" fontWeight="600" textAnchor="middle">
                Moisture Anomaly -14%
              </text>
            </g>

            {/* Anomaly 2 Marker Southern Boundary Block D */}
            <g
              className="cursor-pointer"
              onClick={() => setSelectedAnomaly(anomalies[1] || null)}
            >
              <circle cx="480" cy="340" r="14" fill="#10b981" fillOpacity="0.2" stroke="#34d399" strokeWidth="1" />
              <circle cx="480" cy="340" r="5" fill="#34d399" />
            </g>
          </g>

          {/* Compass Rose */}
          <g transform="translate(730, 430)">
            <circle cx="0" cy="0" r="18" fill="#0d2319" stroke="#22543d" strokeWidth="1" />
            <polygon points="0,-14 4,0 0,14 -4,0" fill="#10b981" />
            <polygon points="0,-14 -4,0 0,0" fill="#34d399" />
            <text x="0" y="-17" fill="#6ee7b7" fontSize="9" fontWeight="bold" textAnchor="middle">N</text>
          </g>
        </svg>

        {/* Selected Anomaly Inspector Card */}
        {selectedAnomaly && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-30 p-3 rounded-lg bg-neutral-900/95 backdrop-blur-md border border-amber-500/40 shadow-2xl text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Field Zone Inspection: {selectedAnomaly.zone}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnomaly(null)}
                className="text-neutral-400 hover:text-white text-xs px-1"
              >
                &times;
              </button>
            </div>
            <p className="text-neutral-200 mt-1.5 font-medium">{selectedAnomaly.indexDrop}</p>
            <p className="text-neutral-400 text-[11px] mt-1">{selectedAnomaly.suspectedFactor}</p>
            <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-mono">Severity: {selectedAnomaly.severity.toUpperCase()}</span>
              <span className="text-neutral-400">Ground verification suggested</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="px-3.5 py-2.5 bg-neutral-900 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-neutral-400 flex items-center gap-1.5">
          <span className="text-neutral-200 font-medium capitalize">{activeLayer.replace('_', ' ')} Layer:</span>
          <span className="text-[11px] text-neutral-400 hidden md:inline">{getLayerDescription()}</span>
        </div>

        {activeLayer === 'ndvi' && (
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-amber-400">&lt; 0.35 Sparse</span>
            <div className="w-24 h-2 rounded bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-300" />
            <span className="text-emerald-400">&gt; 0.80 Dense Vigorous</span>
          </div>
        )}

        {activeLayer === 'ndwi' && (
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-rose-400">Low Hydration</span>
            <div className="w-24 h-2 rounded bg-gradient-to-r from-rose-500 via-amber-500 to-sky-500" />
            <span className="text-sky-400">Optimal Turgidity</span>
          </div>
        )}
      </div>
    </div>
  );
};
