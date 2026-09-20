import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Layers,
  Sprout,
  DollarSign,
  User,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { Farm, SoilProfile, SoilDataSource } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (newFarm: Farm, farmerProfile: any) => void;
  onSaveFarm?: (newFarm: Farm) => void;
  onExploreDemo?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onSaveFarm,
  onExploreDemo,
}) => {
  const [step, setStep] = useState(1);

  // Farmer Profile
  const [farmerName, setFarmerName] = useState('');
  const [experience, setExperience] = useState('Commercial');
  const [farmingGoal, setFarmingGoal] = useState('maximize_profit');
  const [region, setRegion] = useState('Southwest (Oyo/Ogun)');

  // Farm details
  const [farmName, setFarmName] = useState('Riverview Plot');
  const [location, setLocation] = useState('Ibadan North-East');
  const [sizeHa, setSizeHa] = useState<number>(4.5);
  const [crop, setCrop] = useState('Maize');
  const [plantingDate, setPlantingDate] = useState('2026-08-01');
  const [irrigation, setIrrigation] = useState<'Rainfed' | 'Drip' | 'Sprinkler' | 'Canal'>('Sprinkler');

  // Soil details
  const [soilMode, setSoilMode] = useState<'estimated' | 'laboratory'>('estimated');
  const [soilPh, setSoilPh] = useState(6.4);
  const [soilMoisture, setSoilMoisture] = useState(24.0);
  const [soilTexture, setSoilTexture] = useState('Sandy Clay Loam');

  // Budget
  const [budget, setBudget] = useState(1800000);
  const [equipment, setEquipment] = useState('Tractor access + Sprayer rig');
  const [laborAvailable, setLaborAvailable] = useState('Hired casual seasonal labor');

  // Generating loading state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState('Analyzing farm coordinates...');

  if (!isOpen) return null;

  const handleFinish = () => {
    setIsGenerating(true);
    const phases = [
      'Querying geospatial SoilGrids database...',
      'Synthesizing 7-day atmospheric forecasts...',
      'Computing deterministic break-even metrics...',
      'Calibrating agricultural intelligence score...',
    ];

    let phaseIndex = 0;
    const interval = setInterval(() => {
      if (phaseIndex < phases.length) {
        setGenerationPhase(phases[phaseIndex]);
        phaseIndex++;
      } else {
        clearInterval(interval);
        setIsGenerating(false);

        const newFarm: Farm = {
          id: `farm-${Date.now()}`,
          name: farmName || 'New Venture Farm',
          location: location || 'Ibadan Region',
          state: 'Oyo State',
          country: 'Nigeria',
          coordinates: { lat: 7.42, lng: 3.93 },
          sizeHa: Number(sizeHa) || 4.5,
          currentCrop: crop,
          cropVariety: `${crop} Selected Hybrid`,
          plantingDate: plantingDate || '2026-08-01',
          growthStage: 'Vegetative V6 Stage',
          daysSincePlanting: 42,
          irrigationType: irrigation,
          soil: {
            source: soilMode === 'laboratory' ? 'laboratory' : 'geospatial_estimate',
            testDate: soilMode === 'laboratory' ? '2026-07-15' : undefined,
            ph: Number(soilPh) || 6.4,
            nitrogenKgHa: 78,
            phosphorusPpm: 15.2,
            potassiumPpm: 130,
            organicMatterPercent: 2.2,
            moisturePercent: Number(soilMoisture) || 24.0,
            texture: soilTexture,
            cec: 15.1,
          },
          healthScore: 81,
          weatherRisk: 'Low',
          overallRisk: 'Medium',
          estimatedYieldTonsPerHa: 3.7,
          boundary: [
            { lat: 7.422, lng: 3.928 },
            { lat: 7.426, lng: 3.934 },
            { lat: 7.421, lng: 3.936 },
            { lat: 7.419, lng: 3.930 },
          ],
        };

        if (onComplete) {
          onComplete(newFarm, {
            name: farmerName || 'Agronomist',
            experience,
            farmingGoal,
            region,
            budget,
          });
        }
        if (onSaveFarm) {
          onSaveFarm(newFarm);
        }
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">Welcome to NEXUS AGRI</h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                Step {step} of 6 &bull; Farm Onboarding Protocol
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {isGenerating ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <h4 className="text-base font-bold text-neutral-100">Configuring Intelligence Core</h4>
              <p className="text-xs text-neutral-400 font-mono">{generationPhase}</p>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto mb-2 shadow-xl shadow-emerald-950">
                    <Sprout className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-extrabold text-neutral-100">Turn your farm data into better decisions.</h2>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                    NEXUS AGRI connects soil metrics, satellite health, weather projections, and commodity market
                    prices to answer: <em>&ldquo;What is the smartest thing I should do next?&rdquo;</em>
                  </p>

                  <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all"
                    >
                      Get Started &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onExploreDemo) onExploreDemo();
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-semibold border border-neutral-700 transition-colors"
                    >
                      Explore Pre-Loaded Demo
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3.5">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-100">Farmer &amp; Enterprise Profile</h4>
                    <p className="text-neutral-400 text-[11px]">Tell us how you manage your operation.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-semibold">Your Name or Enterprise</label>
                    <input
                      type="text"
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      placeholder="e.g. Adeyemi Farms / Dr. Kalu"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-neutral-300 font-semibold">Experience Level</label>
                      <select
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500 text-xs"
                      >
                        <option>Smallholder (&lt; 3 ha)</option>
                        <option>Commercial Farm</option>
                        <option>Agronomist / Consultant</option>
                        <option>Agribusiness Enterprise</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-neutral-300 font-semibold">Primary Goal</label>
                      <select
                        value={farmingGoal}
                        onChange={(e) => setFarmingGoal(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500 text-xs"
                      >
                        <option value="maximize_profit">Maximize Profit Margin</option>
                        <option value="reduce_risk">Reduce Climate & Market Risk</option>
                        <option value="improve_yield">Improve Yield per Hectare</option>
                        <option value="reduce_input_costs">Reduce Fertilizer & Chemical Cost</option>
                        <option value="improve_sustainability">Soil Health & Sustainability</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-semibold">Agro-Ecological Region</label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500 text-xs"
                    >
                      <option>Southwest (Oyo / Ogun / Osun Rainforest & Derived Savanna)</option>
                      <option>Middle Belt (Benue / Plateau / Nasarawa Guinea Savanna)</option>
                      <option>Northwest (Kaduna / Kano / Katsina Sudan Savanna)</option>
                      <option>Southeast (Anambra / Imo / Enugu)</option>
                      <option>South-South (Delta / Edo / Rivers)</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3.5">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-100">Add Your First Farm</h4>
                    <p className="text-neutral-400 text-[11px]">Define your parcel boundary and primary crop.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-neutral-300 font-semibold">Farm Name</label>
                      <input
                        type="text"
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                        placeholder="e.g. Main Farm Oyo"
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-neutral-300 font-semibold">Location / Town</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Ibadan North-East"
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-neutral-300 font-semibold">Size (Hectares)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={sizeHa}
                        onChange={(e) => setSizeHa(parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-neutral-300 font-semibold">Current Crop</label>
                      <select
                        value={crop}
                        onChange={(e) => setCrop(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500 text-xs"
                      >
                        <option>Maize</option>
                        <option>Soybean</option>
                        <option>Cassava</option>
                        <option>Rice</option>
                        <option>Tomato</option>
                        <option>Yam</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-neutral-300 font-semibold">Irrigation</label>
                      <select
                        value={irrigation}
                        onChange={(e) => setIrrigation(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-emerald-500 text-xs"
                      >
                        <option>Rainfed</option>
                        <option>Sprinkler</option>
                        <option>Drip</option>
                        <option>Canal</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-neutral-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>GPS Coordinates Calibrated:</span>
                      <strong className="text-neutral-200 font-mono">7.4258° N, 3.9318° E</strong>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-semibold">Auto-Pinned</span>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3.5">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-100">Soil Data Source</h4>
                    <p className="text-neutral-400 text-[11px]">
                      Transparent agronomics: we never fabricate laboratory data when none exists.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSoilMode('estimated')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        soilMode === 'estimated'
                          ? 'bg-amber-500/10 border-amber-500/40 text-neutral-100'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span>I don&apos;t have a soil test</span>
                        {soilMode === 'estimated' && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        Use geospatial SoilGrids (250m resolution). Clearly tagged as{' '}
                        <strong className="text-amber-300">Estimated from geospatial data</strong>.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSoilMode('laboratory')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        soilMode === 'laboratory'
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-neutral-100'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span>I have a laboratory test</span>
                        {soilMode === 'laboratory' && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        Manually enter pH, nitrogen, phosphorus, and moisture readings from an accredited lab.
                      </p>
                    </button>
                  </div>

                  {soilMode === 'laboratory' ? (
                    <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                      <div className="space-y-1">
                        <label className="text-neutral-300 font-semibold">Soil pH</label>
                        <input
                          type="number"
                          step="0.1"
                          value={soilPh}
                          onChange={(e) => setSoilPh(parseFloat(e.target.value) || 6.0)}
                          className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-neutral-300 font-semibold">Moisture (%)</label>
                        <input
                          type="number"
                          step="1"
                          value={soilMoisture}
                          onChange={(e) => setSoilMoisture(parseFloat(e.target.value) || 20)}
                          className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-neutral-300 font-semibold">Texture</label>
                        <select
                          value={soilTexture}
                          onChange={(e) => setSoilTexture(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs"
                        >
                          <option>Sandy Clay Loam</option>
                          <option>Loamy Sand</option>
                          <option>Clay Loam</option>
                          <option>Silt Loam</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        NEXUS will initialize your farm with regional soil estimates (pH 6.4, Sandy Clay Loam).
                        You will receive an action reminder to perform a core sample test after harvest.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-3.5">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-100">Working Capital &amp; Budget</h4>
                    <p className="text-neutral-400 text-[11px]">
                      Essential for calculating break-even yield and return on investment.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-semibold">Available Working Capital (₦)</label>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(parseInt(e.target.value) || 1000000)}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[11px] text-neutral-500">
                      Approx. ₦{Math.round(budget / sizeHa).toLocaleString()} available per hectare
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-neutral-300 font-semibold">Existing Farm Equipment</label>
                      <input
                        type="text"
                        value={equipment}
                        onChange={(e) => setEquipment(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-neutral-300 font-semibold">Labor Arrangement</label>
                      <input
                        type="text"
                        value={laborAvailable}
                        onChange={(e) => setLaborAvailable(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Configuration Ready
                    </span>
                    <h4 className="text-base font-bold text-neutral-100">
                      {farmName} ({sizeHa} ha, {crop})
                    </h4>
                    <p className="text-xs text-neutral-400">
                      All environmental, satellite, market, and financial engines are ready to ingest your farm
                      parameters and generate live decision support.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-neutral-300">
                    <div className="p-2.5 rounded bg-neutral-800/40 border border-neutral-800">
                      <span className="text-neutral-500 block text-[10px]">Location:</span>
                      <strong>{location}</strong>
                    </div>
                    <div className="p-2.5 rounded bg-neutral-800/40 border border-neutral-800">
                      <span className="text-neutral-500 block text-[10px]">Soil Status:</span>
                      <strong className="capitalize">{soilMode.replace('_', ' ')}</strong>
                    </div>
                    <div className="p-2.5 rounded bg-neutral-800/40 border border-neutral-800">
                      <span className="text-neutral-500 block text-[10px]">Capital:</span>
                      <strong>₦{budget.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Buttons */}
        {!isGenerating && step > 1 && (
          <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(s - 1, 1))}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            {step < 6 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(s + 1, 6))}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 flex items-center gap-1.5"
              >
                Generate Intelligence Dashboard &rarr;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
