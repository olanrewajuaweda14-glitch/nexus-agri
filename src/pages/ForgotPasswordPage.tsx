import React, { useState } from 'react';
import { Sprout, ArrowLeft, Mail, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ForgotPasswordPageProps {
  onNavigate: (route: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setMessage(res.message);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#10b98115_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      <div className="max-w-md w-full mx-auto relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-neutral-950">
              <Sprout className="w-4 h-4 text-neutral-950 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">NEXUS AGRI</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reset Account Access</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-2">
            Enter your account email to receive cryptographic password recovery instructions.
          </p>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Instructions Dispatched</h2>
              <p className="text-xs text-neutral-300 leading-relaxed mb-6">
                {message || `If an account exists for ${email}, an encrypted recovery token has been transmitted.`}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@farmholdings.com"
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? 'Dispatching Recovery Instructions...' : 'Send Recovery Instructions'}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="w-full py-2.5 text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>NEXUS AGRI Multi-Factor Protection</span>
          </div>
        </div>
      </div>
    </div>
  );
};
