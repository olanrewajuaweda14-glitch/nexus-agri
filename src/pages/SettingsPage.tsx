import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Shield,
  RotateCcw,
  Download,
  CheckCircle2,
  Bell,
  Cpu,
  Globe2,
  DollarSign,
  User,
  Sliders,
  Check,
} from 'lucide-react';
import { Farm, AppNavigationTab } from '../types';
import { useAuth } from '../context/AuthContext';

interface SettingsPageProps {
  activeFarm: Farm;
  farms: Farm[];
  onSelectFarm: (farm: Farm) => void;
  judgeMode: boolean;
  onToggleJudgeMode: () => void;
  onResetDemoData: () => void;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  activeFarm,
  farms,
  onSelectFarm,
  judgeMode,
  onToggleJudgeMode,
  onResetDemoData,
  onNavigate,
}) => {
  const { user, updateProfile } = useAuth();

  // Local Settings State initialized from authenticated user
  const [userName, setUserName] = useState(user?.name || 'Dr. Adebayo Vance');
  const [userEmail, setUserEmail] = useState(user?.email || 'judge@nexusagri.com');
  const [organization, setOrganization] = useState(user?.organization || 'Oyo Agricultural Development Program (OADP)');
  const [currency, setCurrency] = useState<'NGN' | 'USD' | 'KES' | 'GHS'>('NGN');
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  // Synchronize with auth user if changed
  useEffect(() => {
    if (user) {
      setUserName(user.name);
      setUserEmail(user.email);
      if (user.organization) setOrganization(user.organization);
    }
  }, [user]);
  
  // Notification Thresholds
  const [moistureAlertThreshold, setMoistureAlertThreshold] = useState(20); // 20%
  const [priceVolatilityThreshold, setPriceVolatilityThreshold] = useState(5); // 5%
  const [sprayingLeadHours, setSprayingLeadHours] = useState(12); // 12h
  
  // AI Engine Preferences
  const [strictDeterministicGuardrails, setStrictDeterministicGuardrails] = useState(true);
  const [autoVoiceReadout, setAutoVoiceReadout] = useState(false);

  // Saved Toast State
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      updateProfile({ name: userName, organization });
      localStorage.setItem('nexus_user_settings', JSON.stringify({
        userName,
        userEmail,
        organization,
        currency,
        unitSystem,
        moistureAlertThreshold,
        priceVolatilityThreshold,
        sprayingLeadHours,
        strictDeterministicGuardrails,
        autoVoiceReadout,
      }));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }

    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 3000);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({
      exportDate: new Date().toISOString(),
      activeFarmId: activeFarm.id,
      farms,
      settings: {
        userName,
        userEmail,
        organization,
        currency,
        unitSystem,
      },
    }, null, 2);

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus_agri_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              System Configuration &amp; Preferences
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">Personalization &amp; Data Control</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <Settings className="w-6 h-6 text-emerald-400" />
            <span>Platform Settings &amp; Data Preferences</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Configure default farms, agronomic measurement units, currency symbols, alert thresholds,
            and hackathon presentation mode.
          </p>
        </div>

        {showSavedFeedback && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Settings Saved Successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs sm:text-sm">
        {/* 1. Account & Organization Card */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-neutral-100">Agronomist &amp; Organization Profile</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-neutral-400 block mb-1">Full Name / Role:</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Email Address:</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-neutral-400 block mb-1">Agribusiness / Cooperative Name:</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Active Farm & Localization */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <Globe2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-neutral-100">Active Parcel &amp; Measurement Units</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-neutral-400 block mb-1">Primary Active Farm:</label>
              <select
                value={activeFarm.id}
                onChange={(e) => {
                  const target = farms.find((f) => f.id === e.target.value);
                  if (target) onSelectFarm(target);
                }}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500 font-semibold"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.sizeHa} ha, {f.currentCrop})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Operational Currency:</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="NGN">₦ Nigerian Naira (NGN)</option>
                <option value="USD">$ US Dollar (USD)</option>
                <option value="KES">KSh Kenyan Shilling (KES)</option>
                <option value="GHS">GH₵ Ghanaian Cedi (GHS)</option>
              </select>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Area &amp; Yield System:</label>
              <select
                value={unitSystem}
                onChange={(e) => setUnitSystem(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="metric">Metric (Hectares / Tons)</option>
                <option value="imperial">Imperial (Acres / Bushels)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Operational Alert Thresholds */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <Bell className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-neutral-100">Surveillance Trigger Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-neutral-400 block mb-1">Soil Moisture Alert Trigger:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={45}
                  value={moistureAlertThreshold}
                  onChange={(e) => setMoistureAlertThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-xs text-neutral-400 font-mono">%</span>
              </div>
              <span className="text-[11px] text-neutral-500 mt-1 block">Trigger when root zone dips below this</span>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Wholesale Price Shift Alert:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={priceVolatilityThreshold}
                  onChange={(e) => setPriceVolatilityThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-xs text-neutral-400 font-mono">%</span>
              </div>
              <span className="text-[11px] text-neutral-500 mt-1 block">Trigger on 7-day terminal price swings</span>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Spraying Window Lead Time:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2}
                  max={48}
                  value={sprayingLeadHours}
                  onChange={(e) => setSprayingLeadHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-xs text-neutral-400 font-mono">Hours</span>
              </div>
              <span className="text-[11px] text-neutral-500 mt-1 block">Advance notice for foliar chemical prep</span>
            </div>
          </div>
        </div>

        {/* 4. AI Engine & Deterministic Guardrails */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-neutral-100">AI Model &amp; Reasoning Guardrails</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={strictDeterministicGuardrails}
                onChange={(e) => setStrictDeterministicGuardrails(e.target.checked)}
                className="mt-1 rounded text-emerald-600 focus:ring-0"
              />
              <div>
                <span className="font-bold text-neutral-200 block">Strict Deterministic Guardrails</span>
                <span className="text-xs text-neutral-400">
                  Enforces that break-even yields, spraying wind limits, and soil chemistry indices are strictly calculated
                  via mathematical formulas before Gemini synthesizes the final text.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer">
              <input
                type="checkbox"
                checked={autoVoiceReadout}
                onChange={(e) => setAutoVoiceReadout(e.target.checked)}
                className="mt-1 rounded text-emerald-600 focus:ring-0"
              />
              <div>
                <span className="font-bold text-neutral-200 block">Automatic Audio Speech Synthesis</span>
                <span className="text-xs text-neutral-400">
                  Read out daily morning farm intelligence briefings using browser speech audio.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* 5. Judge Presentation Mode Card */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-amber-500/40 bg-gradient-to-br from-neutral-900 to-amber-950/20 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-neutral-100">Hackathon Judge Presentation Mode</h3>
            </div>
            <button
              type="button"
              onClick={onToggleJudgeMode}
              className={`px-3 py-1 rounded-full text-xs font-bold font-mono transition-colors ${
                judgeMode
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-950'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {judgeMode ? 'MODE: ACTIVE' : 'MODE: OFF'}
            </button>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            Judge Presentation Mode activates a sticky navigation bar that guides hackathon evaluators through
            the 11-stage architectural journey of NEXUS AGRI, highlighting technical achievements and agronomic impacts.
          </p>
        </div>

        {/* 6. Data Management & Export / Reset */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <RotateCcw className="w-5 h-5 text-neutral-400" />
            <h3 className="text-base font-bold text-neutral-100">Data Management &amp; State Backup</h3>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-neutral-200 block text-xs">Export Farm Portfolio Snapshot</span>
              <p className="text-xs text-neutral-400">Download a full JSON archive of all farm boundaries, soil profiles, and settings.</p>
            </div>

            <button
              type="button"
              onClick={handleExportData}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-bold border border-neutral-700 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Farm JSON</span>
            </button>
          </div>

          <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-rose-400 block text-xs">Reset All Data to Demo Defaults</span>
              <p className="text-xs text-neutral-400">Clear custom farm changes, alerts, and cache to return to the verified benchmark state.</p>
            </div>

            <button
              type="button"
              onClick={onResetDemoData}
              className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold border border-rose-800/60 flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Demo State</span>
            </button>
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('overview')}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-xs hover:bg-neutral-750"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all hover:scale-102"
          >
            <Save className="w-4 h-4" />
            <span>Save All Platform Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
