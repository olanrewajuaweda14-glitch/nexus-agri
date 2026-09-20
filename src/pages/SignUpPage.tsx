import React, { useState } from 'react';
import {
  Sprout,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAccountType } from '../types';

interface SignUpPageProps {
  onNavigate: (route: string) => void;
}

const ACCOUNT_TYPES: { id: UserAccountType; label: string; desc: string }[] = [
  { id: 'Farmer', label: 'Farmer', desc: 'Direct parcel cultivation & seasonal harvest' },
  { id: 'Farm Manager', label: 'Farm Manager', desc: 'Multi-plot field management & operations' },
  { id: 'Agribusiness', label: 'Agribusiness', desc: 'Off-take, aggregation, input supply & finance' },
  { id: 'Student / Researcher', label: 'Researcher / Student', desc: 'Agronomic modeling & academic analysis' },
  { id: 'Other', label: 'Other', desc: 'Extension services, consulting, or general interest' },
];

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate }) => {
  const { signup, isLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserAccountType>('Farmer');
  const [organization, setOrganization] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Please enter your full legal or professional name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    const res = await signup(fullName, email, password, role, organization);

    if (res.success) {
      setSuccessMessage('Account established successfully! Preparing your onboarding setup...');
      setTimeout(() => {
        // Direct transition into onboarding as requested in Section 4
        onNavigate('onboarding');
      }, 900);
    } else {
      setErrorMessage(res.error || 'Registration could not be completed.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background ambiance */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b98115_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full mx-auto relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-neutral-950">
              <Sprout className="w-5 h-5 text-neutral-950 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">NEXUS AGRI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Create your agronomic account
          </h1>
          <p className="text-neutral-400 text-sm mt-2">
            Join thousands of growers and managers optimizing yields with deterministic intelligence.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Registration Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Success</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Oluwaseun Adeleke"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Work or Farm Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seun@riverbasinagri.com"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Account Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Primary Account Role *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACCOUNT_TYPES.map((t) => {
                  const selected = role === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setRole(t.id)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                        selected
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="font-bold block text-white">{t.label}</span>
                      <span className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Organization Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Organization / Farm Enterprise Name (Optional)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Oyo River Basin Agro Alliance"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                    <span>Establishing Agronomic Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Start Onboarding</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Encrypted Session Handling</span>
            </div>
            <span>No credit card required</span>
          </div>
        </div>

        {/* Existing User Redirect */}
        <p className="text-center text-xs text-neutral-400 mt-6">
          Already registered?{' '}
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
          >
            Sign in to existing workspace
          </button>
        </p>
      </div>
    </div>
  );
};
