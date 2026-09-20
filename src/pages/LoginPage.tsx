import React, { useState, useEffect } from 'react';
import {
  Sprout,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Activity,
  Layers,
  CloudRain,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (route: string) => void;
  redirectUrl?: string;
}

const ROTATING_INSIGHTS = [
  {
    icon: Activity,
    category: 'Soil Sensor Telemetry',
    text: 'Root-zone moisture calibrated at 22.4% — 48-hour mechanical irrigation deferral recommended.',
    badge: 'CALIBRATED',
  },
  {
    icon: TrendingUp,
    category: 'Commodity Arbitrage',
    text: 'Maize spot wholesale pricing up +3.8% in Bodija regional hub (₦480,000/ton).',
    badge: 'LIVE MARKET',
  },
  {
    icon: CloudRain,
    category: 'ECMWF Microclimate',
    text: '48mm precipitation window opening in 72h with optimal calm morning spray window.',
    badge: 'SATELLITE GROUNDED',
  },
  {
    icon: Layers,
    category: 'Multimodal Pathology',
    text: 'Sentinel-2 vegetative index (NDVI 0.71) indicates optimal photosynthetic vigour.',
    badge: 'SENTINEL-2 MSI',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, redirectUrl }) => {
  const { login, quickDemoLogin, isLoading } = useAuth();

  const [email, setEmail] = useState('judge@nexusagri.com');
  const [password, setPassword] = useState('judge2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);

  // Rotate insights every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveInsightIndex((prev) => (prev + 1) % ROTATING_INSIGHTS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    const res = await login(email, password, rememberMe);
    if (res.success) {
      onNavigate(redirectUrl || 'overview');
    } else {
      setErrorMessage(res.error || 'Invalid credentials. Please verify and try again.');
    }
  };

  const handleQuickJudge = () => {
    quickDemoLogin('judge');
    onNavigate(redirectUrl || 'overview');
  };

  const activeInsight = ROTATING_INSIGHTS[activeInsightIndex];
  const InsightIcon = activeInsight.icon;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* Left Column: Serious Agricultural Intelligence & Visual Systems */}
      <div className="lg:w-1/2 bg-neutral-900/60 border-b lg:border-b-0 lg:border-r border-neutral-800 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative grid and glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b98115_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-neutral-950 font-black shadow-lg shadow-emerald-950/50">
              <Sprout className="w-6 h-6 text-neutral-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">NEXUS AGRI</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SYSTEM v2.5
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-medium">Agricultural Decision Operating System</p>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-8 leading-tight">
            Turn fragmented field data into <span className="text-emerald-400">decisive farm actions</span>.
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base mt-3 max-w-md leading-relaxed">
            Integrating orbital Sentinel-2 multispectral scans, calibrated SoilGrids telemetry, and deterministic economic models with multimodal agronomic AI.
          </p>
        </div>

        {/* Dynamic Agricultural Telemetry Graphic */}
        <div className="relative z-10 my-8">
          <div className="bg-neutral-950/80 border border-neutral-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-neutral-300">LIVE TELEMETRY STREAM</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                7 FEEDS ACTIVE
              </span>
            </div>

            {/* Micro grid of data streams */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase">Root Moisture</span>
                <span className="text-sm font-mono font-bold text-white">22.4%</span>
                <span className="text-[9px] text-amber-400 block mt-0.5">Deficit (-4.6%)</span>
              </div>
              <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase">NDVI Canopy</span>
                <span className="text-sm font-mono font-bold text-white">0.71</span>
                <span className="text-[9px] text-emerald-400 block mt-0.5">Vigorous</span>
              </div>
              <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase">Spot Maize</span>
                <span className="text-sm font-mono font-bold text-white">₦480k/t</span>
                <span className="text-[9px] text-emerald-400 block mt-0.5">+3.8% (7d)</span>
              </div>
              <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase">Spray Window</span>
                <span className="text-sm font-mono font-bold text-white">07:00 AM</span>
                <span className="text-[9px] text-cyan-400 block mt-0.5">Friday Optimal</span>
              </div>
            </div>

            {/* Rotating intelligence snippet */}
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 transition-all duration-300">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <InsightIcon className="w-3.5 h-3.5" />
                  <span>{activeInsight.category}</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {activeInsight.badge}
                </span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">{activeInsight.text}</p>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-800/80 pt-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Enterprise Agronomic Data Compliance</span>
          </div>
          <span className="font-mono text-[11px]">NASA POWER • SoilGrids • Sentinel-2</span>
        </div>
      </div>

      {/* Right Column: Sign In Interface */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center max-w-xl mx-auto w-full">
        <div className="w-full">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to your farm workspace</h2>
            <p className="text-neutral-400 text-sm mt-1.5">
              Access your field telemetry, scenario models, and agronomic decisions.
            </p>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Authentication Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@farmholdings.com"
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-neutral-900 border-neutral-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-neutral-950"
                />
                <span>Remember this device for 30 days</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating Farm Workspace...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access for Hackathon Judges */}
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900/60 to-cyan-950/40 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Judge & Evaluator Express Mode</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Pre-configured with Dr. Adebayo Vance (Lead Agronomist) & Ibadan Maize 5.2 ha parcel.
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickJudge}
                className="w-full sm:w-auto shrink-0 px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
              >
                1-Click Judge Access
              </button>
            </div>
          </div>

          {/* Sign Up Navigation */}
          <p className="text-center text-xs text-neutral-400 mt-6">
            New to NEXUS AGRI?{' '}
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
            >
              Create a free farm account
            </button>
          </p>

          <p className="text-center text-[11px] text-neutral-600 mt-8">
            NEXUS AGRI • Deterministic Agronomic Arithmetic + Multimodal Decision AI
          </p>
        </div>
      </div>
    </div>
  );
};
