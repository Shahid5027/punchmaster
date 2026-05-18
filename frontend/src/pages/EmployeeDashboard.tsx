import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import AnimatedCounter from '../components/AnimatedCounter.js';
import { LogOut, User, Clock, ShieldCheck, MapPin, AlertCircle, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [todayStatus, setTodayStatus] = useState<{
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
    checkInTime: string | null;
    checkOutTime: string | null;
    workingHours: number | null;
    status: string;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/attendance/today');
        setTodayStatus(response.data);
      } catch (err: any) {
        console.error('❌ Failed to fetch dashboard today status:', err);
        setError('Failed to sync today\'s punch parameters.');
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans">
      
      {/* Navbar */}
      <header className="border-b border-white/[0.08] bg-[#18181b]/50 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-500" />
          <span className="font-bold tracking-tight text-base sm:text-lg">GeoShield AI</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 bg-zinc-800 border border-white/[0.06] rounded-full text-zinc-300">
            WORKSPACE
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-zinc-400 hover:text-red-400 transition-colors cursor-pointer bg-transparent border-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        
        {/* Subtle background glow */}
        <div className="glow-spot w-[500px] h-[500px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-premium z-10"
        >
          {/* Welcome User Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center shadow-inner">
                <User className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-white font-sans">Welcome back, {user?.name}</h1>
                <p className="text-xs text-zinc-400 font-medium">Shift Assignment: <span className="font-mono font-semibold text-zinc-200 bg-zinc-800/50 border border-white/[0.04] px-1.5 py-0.5 rounded">{user?.shift_start_time} AM</span> start</p>
              </div>
            </div>
            
            {/* Today status badge */}
            {!loading && todayStatus && (
              <span className={`self-start sm:self-center text-[10px] font-bold px-3 py-1.5 rounded-full border ${
                todayStatus.hasCheckedOut
                  ? 'bg-zinc-850 border-white/[0.06] text-zinc-400'
                  : todayStatus.hasCheckedIn
                    ? todayStatus.status === 'LATE'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
              }`}>
                {todayStatus.hasCheckedOut 
                  ? 'WORK COMPLETED' 
                  : todayStatus.hasCheckedIn 
                    ? todayStatus.status === 'LATE' 
                      ? 'LATE ARRIVAL' 
                      : 'CHECKED IN (ON TIME)'
                    : 'MISSING PUNCH-IN'}
              </span>
            )}
          </div>

          {/* Quick Metrics display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-[#09090b]/40 border border-white/[0.06] p-4 rounded-xl shadow-inner">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                Check-In Time
              </span>
              <span className="text-sm font-bold text-zinc-200 flex items-center gap-2 font-mono">
                <Clock className="w-4 h-4 text-zinc-500" />
                {loading ? (
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                ) : (
                  formatTime(todayStatus?.checkInTime ?? null)
                )}
              </span>
            </div>
            
            <div className="bg-[#09090b]/40 border border-white/[0.06] p-4 rounded-xl shadow-inner">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                Check-Out Time
              </span>
              <span className="text-sm font-bold text-zinc-200 flex items-center gap-2 font-mono">
                <Clock className="w-4 h-4 text-zinc-500" />
                {loading ? (
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                ) : (
                  formatTime(todayStatus?.checkOutTime ?? null)
                )}
              </span>
            </div>

            <div className="bg-[#09090b]/40 border border-white/[0.06] p-4 rounded-xl shadow-inner">
              <span className="block text-[9px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                working hours
              </span>
              <span className="text-sm font-bold text-zinc-200 flex items-center gap-2 font-mono">
                <Clock className="w-4 h-4 text-zinc-500" />
                {loading ? (
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                ) : todayStatus?.workingHours !== null && todayStatus?.workingHours !== undefined ? (
                  <span className="font-mono font-bold text-zinc-250 flex items-center">
                    <AnimatedCounter value={todayStatus.workingHours} decimals={2} suffix=" hrs" />
                  </span>
                ) : (
                  '--:--'
                )}
              </span>
            </div>
          </div>

          {/* Alert panel for failed state sync */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <span className="text-xs text-red-200 leading-relaxed font-semibold">{error}</span>
            </div>
          )}

          {/* Action portal launch card */}
          <div className="bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5 mb-4">
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2 justify-center sm:justify-start">
                <MapPin className="w-4 h-4 animate-bounce" />
                Location-Validated Attendance
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm font-medium">
                In order to check-in or out, you must verify your location within the office geofence allowed perimeter.
              </p>
            </div>
            
            <button
              onClick={() => navigate('/punch')}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-premium cursor-pointer shadow-premium-glow flex items-center justify-center gap-1.5 active-scale shrink-0"
            >
              Access Punch Portal
            </button>
          </div>

          {/* History link card */}
          <div className="bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5 transition-all">
            <div className="space-y-1.5 text-center sm:text-left">
              <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 justify-center sm:justify-start">
                <Clock className="w-4 h-4 text-zinc-400" />
                Timesheet Logs & History
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm font-medium">
                Access your chronological timesheet log details, calendar views, tardiness statuses, and AI verification details.
              </p>
            </div>
            
            <button
              onClick={() => navigate('/employee/history')}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-premium cursor-pointer border border-white/[0.04] flex items-center justify-center gap-1.5 active-scale shrink-0"
            >
              View Attendance History
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-white/[0.06] text-center text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            🛡️ Protected by GeoShield AI • Browser Telemetry Verification Active
          </div>

        </motion.div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
