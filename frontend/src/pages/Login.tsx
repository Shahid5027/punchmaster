import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { motion } from 'framer-motion';
import { Lock, Mail, Shield, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      showToast('Please fill in all fields.', 'error');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.name}! Session secured.`, 'success');
      
      // Role-based redirection upon successful validation
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/employee');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to authenticate. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Premium UX: Click-to-fill demo credentials for hackathon evaluation
  const handleQuickFill = (role: 'admin' | 'employee1' | 'employee2') => {
    setError(null);
    if (role === 'admin') {
      setEmail('admin@geoshield.ai');
      setPassword('admin123');
      showToast('Quick sandbox credentials filled for Bangalore admin.', 'info');
    } else if (role === 'employee1') {
      setEmail('employee1@geoshield.ai');
      setPassword('employee123');
      showToast('Quick sandbox credentials filled for Bangalore Employee (Alex).', 'info');
    } else {
      setEmail('employee2@geoshield.ai');
      setPassword('employee123');
      showToast('Quick sandbox credentials filled for Hyderabad Employee (Sarah).', 'info');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#09090b] px-4 overflow-hidden select-none">
      
      {/* Decorative premium background light spots */}
      <div className="glow-spot w-[600px] h-[600px] -top-40 -left-40 animate-pulse" />
      <div className="glow-spot w-[500px] h-[500px] -bottom-40 -right-40 animate-pulse" style={{ animationDuration: '6s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-premium-glow"
          >
            <Shield className="w-8 h-8 text-blue-500" />
          </motion.div>
          
          <h1 className="text-3xl font-bold font-sans tracking-tight text-white mb-2">
            GeoShield <span className="text-blue-500">AI</span>
          </h1>
          <p className="text-sm text-zinc-400 font-medium">
            Smart Geo Attendance & Workforce Insights Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#18181b] border border-white/[0.08] rounded-2xl p-5 sm:p-8 shadow-premium backdrop-blur-md">
          <h2 className="text-xl font-semibold text-white mb-6 font-sans">
            Account Access
          </h2>

          {/* Validation Failure Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 mb-6"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200 font-medium leading-relaxed">
                {error}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Business Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="name@geoshield.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-white placeholder-zinc-500 text-sm font-sans focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-premium"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-white placeholder-zinc-500 text-sm font-sans focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-premium"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-sm font-semibold transition-premium flex items-center justify-center gap-2 cursor-pointer shadow-premium-glow"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Secure Sign In
                </>
              )}
            </motion.button>
          </form>

          {/* Quick-Seeded Accounts for Evaluation */}
          <div className="mt-8 pt-6 border-t border-white/[0.06]">
            <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 text-center">
              Quick Sandbox Profiles
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="py-2 px-1 bg-zinc-900 border border-white/[0.04] hover:bg-zinc-800 text-[11px] text-zinc-300 font-medium rounded-lg transition-premium cursor-pointer truncate"
              >
                🔑 Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('employee1')}
                className="py-2 px-1 bg-zinc-900 border border-white/[0.04] hover:bg-zinc-800 text-[11px] text-zinc-300 font-medium rounded-lg transition-premium cursor-pointer truncate"
              >
                👤 Alex (Emp)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('employee2')}
                className="py-2 px-1 bg-zinc-900 border border-white/[0.04] hover:bg-zinc-800 text-[11px] text-zinc-300 font-medium rounded-lg transition-premium cursor-pointer truncate"
              >
                👤 Sarah (Emp)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6 font-medium">
          Protected by GeoShield Multi-Factor Geolocation Shield.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
