import React, { useState } from 'react';
import {
  Sprout,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Layers,
  Sparkles,
  Check,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  CloudRain,
  Shield,
  Activity,
  Globe,
  Sliders,
  Maximize2,
} from 'lucide-react';
import { Farm, SoilProfile, UserAccountType } from '../types';
import { useAuth } from '../context/AuthContext';

interface OnboardingPageProps {
  onComplete: (newFarm: Farm, primaryGoal?: string) => void;
  onNavigate: (route: string) => void;
}

const GOAL_OPTIONS = [
  { id: 'improve_yield', label: 'Improve Yield', desc: 'Maximize grain or biomass tonnage per hectare', icon: TrendingUp },
  { id: 'reduce_input_costs', label: 'Reduce Input Costs', desc: 'Optimize fertilizer, agrochemicals & irrigation pacing', icon: DollarSign },
  { id: 'choose_the_right_crop', label: 'Choose the Right Crop', desc: 'Evaluate seasonal suitability & rotational margins', icon: Sprout },
  { id: 'manage_weather_risk', label: 'Manage Weather Risk', desc: 'Protect planting & spray windows against rainfall shifts', icon: CloudRain },
  { id: 'monitor_crop_health', label: 'Monitor Crop Health', desc: 'Sentinel-2 NDVI tracking & multimodal pathology diagnostics', icon: Activity },
  { id: 'find_better_selling', label: 'Better Selling Opportunities', desc: 'Commodity market arbitrage & spot price trend signals', icon: Globe },
  { id: 'plan_financially', label: 'Plan Farm Financially', desc: 'Deterministic gross margin & break-even scenario modeling', icon: Shield },
];

const REGION_PRESETS = [
  { name: 'Ibadan North-East (Oyo State)', lat: 7.4258, lng: 3.9318, soilPh: 6.4, soilTexture: 'Sandy Clay Loam' },
  { name: 'Ikenne Agro-Ecological Corridor (Ogun)', lat: 7.3775, lng: 3.8964, soilPh: 6.8, soilTexture: 'Loamy Sand' },
  { name: 'Kaduna Grain Savanna Basin', lat: 10.5105, lng: 7.4165, soilPh: 6.2, soilTexture: 'Sandy Loam' },
  { name: 'Middle Niger River Valley', lat: 9.0765, lng: 7.3986, soilPh: 6.6, soilTexture: 'Clay Loam' },
];

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete, onNavigate }) => {
  const { user, updateProfile } = useAuth();

  const [step, setStep] = useState(1);

  // Step 1: User Profile
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState<UserAccountType>(user?.role || 'Farmer');
  const [organization, setOrganization] = useState(user?.organization || '');

  // Step 2: Location
  const [country, setCountry] = useState('Nigeria');
  const [state, setState] = useState('Oyo State');
  const [locality, setLocality] = useState('Ibadan North-East');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  // Step 3: Farm Specifics
  const [farmName, setFarmName] = useState(name ? `${name.split(' ')[0]}'s Main Field` : 'Oyo River Basin Plot');
  const [farmSize, setFarmSize] = useState<number>(5.2);
  const [unit, setUnit] = useState<'ha' | 'acres'>('ha');
  const [primaryCrop, setPrimaryCrop] = useState('Maize');
  const [irrigation, setIrrigation] = useState<'Rainfed' | 'Sprinkler' | 'Drip' | 'Canal'>('Rainfed');

  // Step 4: Primary Goal
  const [selectedGoal, setSelectedGoal] = useState('improve_yield');

  // Step 5: Finalizing state
  const [isInitializing, setIsInitializing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('Configuring farm parcel boundary...');

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinalSubmit = () => {
    setIsInitializing(true);

    const preset = REGION_PRESETS[selectedPresetIndex] || REGION_PRESETS[0];

    const messages = [
      'Calibrating orbital Sentinel-2 multispectral baseline (NDVI)...',
      'Retrieving geospatial SoilGrids nutrient profile (pH, N-P-K)...',
      'Initializing ECMWF microclimate 7-day atmospheric window...',
      'Computing deterministic break-even financial model...',
      'Finalizing farm intelligence workspace...',
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < messages.length) {
        setProgressMessage(messages[i]);
        i++;
      } else {
        clearInterval(interval);
        setIsInitializing(false);

        // Update user profile if changed
        if (name !== user?.name || role !== user?.role || organization !== user?.organization) {
          updateProfile({ name, role, organization });
        }

        // Convert acres to hectares if needed (1 acre = 0.404686 ha)
        const sizeInHectares = unit === 'acres' ? Math.round(farmSize * 0.404686 * 10) / 10 : farmSize;

        // Deterministic crop yield baseline based on selected crop
        let yieldEstimate = 3.8;
        if (primaryCrop === 'Soybean') yieldEstimate = 2.4;
        if (primaryCrop === 'Cassava') yieldEstimate = 18.5;
        if (primaryCrop === 'Rice') yieldEstimate = 4.2;
        if (primaryCrop === 'Tomato') yieldEstimate = 22.0;

        const initialSoil: SoilProfile = {
          source: 'geospatial_estimate',
          testDate: new Date().toISOString().split('T')[0],
          ph: preset.soilPh,
          nitrogenKgHa: 80,
          phosphorusPpm: 15.2,
          potassiumPpm: 132,
          organicMatterPercent: 2.2,
          moisturePercent: 22.4,
          texture: preset.soilTexture,
          cec: 14.5,
          labConfidenceScore: 88,
        };

        const newFarm: Farm = {
          id: `farm-${Date.now()}`,
          name: farmName.trim() || 'New Agronomic Field',
          location: locality.trim() || 'Regional Basin',
          state: state.trim() || 'Oyo State',
          country: country.trim() || 'Nigeria',
          coordinates: { lat: preset.lat, lng: preset.lng },
          sizeHa: sizeInHectares,
          currentCrop: primaryCrop,
          cropVariety: `${primaryCrop} Commercial Certified`,
          plantingDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          growthStage: primaryCrop === 'Maize' ? 'Tasseling & Silking (V12-R1)' : 'Active Vegetative Growth',
          daysSincePlanting: 45,
          irrigationType: irrigation,
          soil: initialSoil,
          healthScore: 84,
          weatherRisk: 'Low',
          overallRisk: 'Low',
          estimatedYieldTonsPerHa: yieldEstimate,
          boundary: [
            { lat: preset.lat + 0.002, lng: preset.lng - 0.002 },
            { lat: preset.lat + 0.003, lng: preset.lng + 0.003 },
            { lat: preset.lat - 0.002, lng: preset.lng + 0.004 },
            { lat: preset.lat - 0.003, lng: preset.lng - 0.001 },
          ],
        };

        // Complete onboarding: adds to shared state, sets as active farm, and triggers first-session experience!
        onComplete(newFarm, selectedGoal);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Visual background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b98115_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />
      <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full mx-auto relative z-10">
        {/* Progress Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-neutral-950">
                <Sprout className="w-5 h-5 text-neutral-950 stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-lg text-white">NEXUS ONBOARDING</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('overview')}
                className="text-xs text-neutral-400 hover:text-neutral-200 hover:underline transition-colors"
              >
                Exit to Dashboard
              </button>
              <span className="text-xs font-mono text-neutral-400 font-semibold">
                STEP {step} OF 5
              </span>
            </div>
          </div>

          {/* Stepper bar */}
          <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-full flex-1 transition-all duration-300 ${
                  s <= step ? 'bg-emerald-500' : 'bg-neutral-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card Body */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* STEP 1: Tell NEXUS about you */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Tell NEXUS about you
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                  We personalize advisory recommendations based on your operational scale.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Adebayo Vance"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Your Operational Role
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(['Farmer', 'Farm Manager', 'Agribusiness', 'Student / Researcher', 'Other'] as UserAccountType[]).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRole(r)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          role === r
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Organization / Farm Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Oyo Agro Research Plot"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Where do you farm? */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Where do you farm?
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                  Location coordinates connect your parcel to ECMWF weather models, Sentinel-2 scans, and SoilGrids data.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Country
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                      State / Region
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Locality / Basin
                    </label>
                    <input
                      type="text"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Quick Coordinate & Soil Presets
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {REGION_PRESETS.map((p, idx) => {
                      const isSelected = selectedPresetIndex === idx;
                      return (
                        <button
                          type="button"
                          key={p.name}
                          onClick={() => {
                            setSelectedPresetIndex(idx);
                            setLocality(p.name);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-white line-clamp-1">{p.name}</span>
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                            <span>GPS: {p.lat.toFixed(3)}°, {p.lng.toFixed(3)}°</span>
                            <span>pH: {p.soilPh}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Tell us about your farm */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Tell us about your farm
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                  Specify parcel size, primary cultivated crop, and water delivery method.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Farm / Parcel Name
                  </label>
                  <input
                    type="text"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="e.g. Main Farm — Oyo River Basin"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Parcel Size
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.2"
                        value={farmSize}
                        onChange={(e) => setFarmSize(parseFloat(e.target.value) || 1)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex rounded-xl bg-neutral-950 border border-neutral-800 p-1">
                        <button
                          type="button"
                          onClick={() => setUnit('ha')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            unit === 'ha' ? 'bg-emerald-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          ha
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnit('acres')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            unit === 'acres' ? 'bg-emerald-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          acres
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Primary Crop
                    </label>
                    <select
                      value={primaryCrop}
                      onChange={(e) => setPrimaryCrop(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Maize">Maize (White / Yellow Grain)</option>
                      <option value="Soybean">Soybean (Oilseed Legume)</option>
                      <option value="Cassava">Cassava (High Starch Root)</option>
                      <option value="Rice">Rice (Lowland Paddy)</option>
                      <option value="Sorghum">Sorghum (Drought-Hardy Cereal)</option>
                      <option value="Tomato">Tomato (Horticultural Produce)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Irrigation Infrastructure
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Rainfed', 'Sprinkler', 'Drip', 'Canal'] as const).map((irr) => (
                      <button
                        type="button"
                        key={irr}
                        onClick={() => setIrrigation(irr)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          irrigation === irr
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        {irr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: What matters most right now? */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  What matters most right now?
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                  NEXUS weights its intelligence synthesis to prioritize your critical operational target.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {GOAL_OPTIONS.map((g) => {
                  const isSelected = selectedGoal === g.id;
                  const Icon = g.icon;
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => setSelectedGoal(g.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/20'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-white block">{g.label}</span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5 leading-snug">{g.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Your NEXUS workspace is ready */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>PARCEL PROFILE READY</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Your NEXUS workspace is ready.
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                  Here is the configured operational profile that will power your decision engine:
                </p>
              </div>

              {/* Summary Dossier */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <span className="text-xs text-neutral-500 uppercase tracking-wider block">Farm Identity</span>
                    <span className="font-bold text-sm sm:text-base text-white">{farmName}</span>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {farmSize} {unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase">Location</span>
                    <span className="font-semibold text-neutral-200">{locality}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase">Primary Crop</span>
                    <span className="font-semibold text-emerald-400">{primaryCrop}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase">Irrigation</span>
                    <span className="font-semibold text-neutral-200">{irrigation}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase">Primary Focus</span>
                    <span className="font-semibold text-cyan-400">
                      {GOAL_OPTIONS.find((g) => g.id === selectedGoal)?.label || 'Optimize Yield'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-neutral-800/80 pt-3 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                  <span>Soil: pH 6.4 (Estimated)</span>
                  <span>Atmospheric Window: 7-Day ECMWF</span>
                  <span>Sentinel-2 Revisit: Active</span>
                </div>
              </div>

              {/* Initialization feedback overlay if generating */}
              {isInitializing && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-xs text-emerald-300 font-medium">{progressMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="mt-8 pt-5 border-t border-neutral-800 flex items-center justify-between">
            {step > 1 && !isInitializing ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2.5 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isInitializing}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Enter NEXUS Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
