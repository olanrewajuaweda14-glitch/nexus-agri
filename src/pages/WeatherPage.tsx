import React from 'react';
import {
  CloudSun,
  Wind,
  Droplets,
  Thermometer,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { WeatherData, Farm, AppNavigationTab } from '../types';
import { DataTrustBadge } from '../components/common/DataTrustBadge';

interface WeatherPageProps {
  weather: WeatherData;
  activeFarm: Farm;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const WeatherPage: React.FC<WeatherPageProps> = ({ weather, activeFarm, onNavigate }) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Hyper-Local Agronomic Meteorology
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">{weather.location}</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <CloudSun className="w-6 h-6 text-sky-400" />
            <span>Weather &amp; Spraying Windows</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Operational spraying windows, soil moisture balance, evapotranspiration rates, and thermal stress indicators.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('ai-advisor')}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask AI About Spraying Window</span>
        </button>
      </div>

      {/* Current Conditions Bar */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>Air Temp</span>
          </div>
          <div className="text-xl font-mono font-bold text-neutral-100">{weather.currentTempC}°C</div>
          <span className="text-[10px] text-neutral-500">Condition: {weather.condition}</span>
        </div>

        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            <span>Rel Humidity</span>
          </div>
          <div className="text-xl font-mono font-bold text-neutral-100">{weather.humidityPercent}%</div>
          <span className="text-[10px] text-neutral-500">Dew Dry: {weather.sprayingWindow.dewDry ? 'Yes' : 'No'}</span>
        </div>

        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
            <Wind className="w-3.5 h-3.5 text-teal-400" />
            <span>Wind Speed</span>
          </div>
          <div className="text-xl font-mono font-bold text-neutral-100">{weather.windSpeedKmh} km/h</div>
          <span className="text-[10px] text-neutral-500">Wind Safe: {weather.sprayingWindow.windSafe ? 'Optimal (<12)' : 'Elevated'}</span>
        </div>

        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Solar Radiation</span>
          </div>
          <div className="text-xl font-mono font-bold text-neutral-100">{weather.solarRadiationMjM2} MJ/m²</div>
          <span className="text-[10px] text-neutral-500">Photosynthetic Active</span>
        </div>

        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
            <Droplets className="w-3.5 h-3.5 text-emerald-400" />
            <span>ET₀ Evapotranspiration</span>
          </div>
          <div className="text-xl font-mono font-bold text-neutral-100">{weather.evapotranspirationMmDay} mm/d</div>
          <span className="text-[10px] text-neutral-500">Daily Moisture Loss</span>
        </div>

        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
            <CloudSun className="w-3.5 h-3.5 text-sky-400" />
            <span>7-Day Rain Outlook</span>
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400">{weather.rainfallNext7DaysMm} mm</div>
          <span className="text-[10px] text-neutral-500">Past 24h: {weather.rainfallPast24hMm} mm</span>
        </div>
      </div>

      {/* Spraying & Irrigation Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spraying Window Box */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Wind className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-neutral-100">Optimal Spraying Window</h3>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              weather.sprayingWindow.isOpen 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {weather.sprayingWindow.isOpen ? 'WINDOW OPEN' : 'WAIT FOR DRIFT SUBSIDENCE'}
            </span>
          </div>

          <p className="text-xs text-neutral-200 font-medium leading-relaxed">
            {weather.sprayingWindow.bestWindowText}
          </p>

          <p className="text-xs text-neutral-400 leading-relaxed">
            {weather.sprayingWindow.rationale}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800 text-[11px] font-mono text-neutral-300">
            <div>Wind Safe: <strong>{weather.sprayingWindow.windSafe ? 'Yes (<12 km/h)' : 'High Drift Risk'}</strong></div>
            <div>Dew Dried: <strong>{weather.sprayingWindow.dewDry ? 'Ready for Foliar Uptake' : 'Wait for Sunrise'}</strong></div>
          </div>
        </div>

        {/* Irrigation Scheduling Advice */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 via-neutral-900 to-neutral-900 border border-sky-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Droplets className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-neutral-100">Irrigation Need &amp; Soil Moisture Balance</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {weather.irrigationNeed.toUpperCase()} NEED
            </span>
          </div>

          <p className="text-xs text-neutral-200 font-medium leading-relaxed">
            Current topsoil moisture is at 22.4%, slightly below the ideal 25-30% range for maize silking.
          </p>

          <p className="text-xs text-neutral-400 leading-relaxed">
            However, with {weather.rainfallNext7DaysMm} mm of convective rainfall forecast over the next 72 hours, supplemental pumping can be deferred by 48 hours to conserve fuel expenditure.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800 text-[11px] font-mono text-neutral-300">
            <div>Daily Evapotranspiration: <strong className="text-sky-400">{weather.evapotranspirationMmDay} mm/day</strong></div>
            <div>Heat Stress Index: <strong>{weather.heatStressIndex}</strong></div>
          </div>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-neutral-100">7-Day Agricultural Precipitation &amp; Thermal Outlook</h3>
            <p className="text-xs text-neutral-400">ECMWF Integrated Forecasting System &bull; Hyper-Local Grid</p>
          </div>
          <span className="text-xs font-mono text-sky-400 font-semibold">
            Cumulative 7-Day Rain: {weather.rainfallNext7DaysMm} mm
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
          {weather.forecastDays.map((day, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex flex-col justify-between text-xs ${
                idx === 0
                  ? 'bg-neutral-950 border-sky-500/40'
                  : 'bg-neutral-950/60 border-neutral-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between font-bold text-neutral-200 mb-1">
                  <span>{day.dayName}</span>
                  <span className="text-[10px] font-mono text-neutral-500">{day.date.slice(5)}</span>
                </div>
                <div className="text-[11px] text-neutral-400 truncate mb-2">{day.condition}</div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">High / Low:</span>
                    <span className="font-mono text-neutral-200">{day.tempMax}° / {day.tempMin}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Rain Prob:</span>
                    <span className={`font-mono font-bold ${day.rainProb > 40 ? 'text-sky-400' : 'text-neutral-400'}`}>
                      {day.rainProb}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Expected:</span>
                    <span className="font-mono text-neutral-200">{day.rainMm} mm</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-neutral-800 text-[10px] text-neutral-400">
                Spraying: <strong className="text-emerald-400">{day.rainProb < 30 ? 'Favorable' : 'Monitor'}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Trust Badge */}
      <DataTrustBadge
        sourceName="ECMWF Open Data + NOAA Global Forecast System (GFS)"
        sourceType="meteorological_model"
        confidenceScore={91}
        lastUpdated="Refreshed 45m ago"
        assumptions={[
          'Convective rainfall modeled using Penman-Monteith reference crop evapotranspiration FAO-56 standard.',
        ]}
      />
    </div>
  );
};
