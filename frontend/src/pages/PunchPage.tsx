import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import useGeolocation from '../hooks/useGeolocation.js';
import LeafletMap from '../components/LeafletMap.js';
import api from '../services/api.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, MapPin, Navigation, Clock, ShieldAlert, ArrowLeft, RefreshCcw, Landmark } from 'lucide-react';

// Math calculation of Haversine formula on client-side strictly for visual/informational UI checks
const calculateHaversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

const PunchPage: React.FC = () => {
  useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { coords, error: geoError, loading: geoLoading, requestLocation } = useGeolocation();

  // Settings & Status states
  const [office, setOffice] = useState<{ latitude: number; longitude: number; radius_meters: number } | null>(null);
  const [todayStatus, setTodayStatus] = useState<{
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
    checkInTime: string | null;
    checkOutTime: string | null;
    workingHours: number | null;
    status: string;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isInside, setIsInside] = useState<boolean>(false);

  // Fetch office configurations & today's log status
  const fetchSettingsAndStatus = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [settingsRes, statusRes] = await Promise.all([
        api.get('/settings/office'),
        api.get('/attendance/today'),
      ]);
      setOffice(settingsRes.data);
      setTodayStatus(statusRes.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to sync corporate geofence configs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettingsAndStatus();
  }, [fetchSettingsAndStatus]);

  // Handle client-side geofencing warnings when coords are updated
  useEffect(() => {
    if (coords && office) {
      const dist = calculateHaversineMeters(
        coords.latitude,
        coords.longitude,
        office.latitude,
        office.longitude
      );
      setDistance(dist);
      setIsInside(dist <= office.radius_meters);
    } else {
      setDistance(null);
      setIsInside(false);
    }
  }, [coords, office]);

  // Request browser location and prepare coordinates
  const handleAcquireLocation = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await requestLocation();
      showToast('Coordinates captured successfully. Evaluating office bounds...', 'success');
    } catch (err: any) {
      const msg = err.message || 'Location permission rejected.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    }
  };

  // Perform secure server-side Check-in / Check-out punch action
  const handlePunch = async () => {
    if (!coords || !office || !todayStatus) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setActionLoading(true);

    const isCheckIn = !todayStatus.hasCheckedIn;
    const endpoint = isCheckIn ? '/attendance/check-in' : '/attendance/check-out';

    try {
      const response = await api.post(endpoint, {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      const successMsg = response.data.message;
      setSuccessMessage(successMsg);
      showToast(successMsg, 'success');
      
      // Immediately refresh daily status
      const statusRes = await api.get('/attendance/today');
      setTodayStatus(statusRes.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'A geofence boundary validation failure occurred during transaction.';
      setErrorMessage(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Clean formatted time strings helper
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative min-h-screen bg-[#09090b] text-white flex flex-col font-sans px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden select-none">
      
      {/* Decorative layout spot glow */}
      <div className="glow-spot w-[500px] h-[500px] -top-60 -left-60 animate-pulse" />

      {/* Header breadcrumb bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between mb-6 sm:mb-8 z-10">
        <button
          onClick={() => navigate('/employee')}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Hub
        </button>
        <div className="flex items-center gap-1 text-xs sm:text-sm font-bold tracking-tight">
          <ShieldCheck className="w-5 h-5 text-blue-500" />
          <span>GeoShield Verification</span>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 z-10 flex-1">
        
        {/* Left Side: Mapping & Coordinate details */}
        <div className="md:col-span-7 flex flex-col gap-6">
          <div className="glass-card rounded-2xl p-4 sm:p-6 shadow-premium relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-white font-sans flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-500" />
                Live Geofencing Canvas
              </span>
              {coords && (
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border ${
                  isInside 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {isInside ? 'VERIFIED: IN ZONE' : 'WARNING: OUT OF ZONE'}
                </span>
              )}
            </div>

            {loading ? (
              <div className="w-full h-[350px] bg-[#09090b]/50 rounded-xl flex items-center justify-center border border-white/[0.04]">
                <div className="flex flex-col items-center gap-3 text-zinc-400 text-xs">
                  <RefreshCcw className="w-6 h-6 animate-spin text-blue-500" />
                  <span>Syncing map layers...</span>
                </div>
              </div>
            ) : office ? (
              <LeafletMap
                officeLat={office.latitude}
                officeLng={office.longitude}
                officeRadius={office.radius_meters}
                userLat={coords?.latitude}
                userLng={coords?.longitude}
                isInsideGeofence={isInside}
              />
            ) : (
              <div className="w-full h-[350px] bg-[#09090b]/50 rounded-xl flex items-center justify-center border border-red-500/20 text-red-400 text-xs">
                Failed to parse geocenter variables.
              </div>
            )}
          </div>

          {/* Coordinate logs panel */}
          {coords && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#09090b]/40 border border-white/[0.06] rounded-xl p-4 grid grid-cols-3 gap-4 shadow-inner"
            >
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5 font-sans">Latitude</span>
                <span className="text-xs font-semibold text-zinc-250 font-mono">{coords.latitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5 font-sans">Longitude</span>
                <span className="text-xs font-semibold text-zinc-250 font-mono">{coords.longitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5 font-sans">Accuracy</span>
                <span className="text-xs font-semibold text-zinc-250 font-mono">±{coords.accuracy?.toFixed(1)}m</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Side: Execution controls & Punch action */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-premium flex flex-col flex-1 relative justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white mb-6 font-sans">
                Attendance Punch Portal
              </h2>

              {/* Status metrics card */}
              <div className="bg-[#09090b] border border-white/[0.04] p-4 rounded-xl space-y-3.5 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-semibold">Office Location</span>
                  <span className="text-xs text-zinc-300 font-bold flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 text-zinc-500" />
                    Bangalore Central HQ
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-semibold">Today's Punch Status</span>
                  <span className={`text-xs font-bold ${
                    todayStatus?.hasCheckedOut 
                      ? 'text-zinc-400' 
                      : todayStatus?.hasCheckedIn 
                        ? 'text-emerald-400' 
                        : 'text-amber-500 animate-pulse'
                  }`}>
                    {todayStatus?.hasCheckedOut 
                      ? 'COMPLETED PUNCHES' 
                      : todayStatus?.hasCheckedIn 
                        ? 'ACTIVE CHECKED-IN' 
                        : 'PENDING CHECK-IN'}
                  </span>
                </div>
                <div className="h-px bg-white/[0.04] w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5 font-sans">Punch-In</span>
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {formatTime(todayStatus?.checkInTime ?? null)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5 font-sans">Punch-Out</span>
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {formatTime(todayStatus?.checkOutTime ?? null)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feedback messages notifications */}
              <AnimatePresence mode="wait">
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 mb-6"
                  >
                    <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-red-200 font-semibold leading-relaxed">{errorMessage}</span>
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3 mb-6"
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-emerald-200 font-semibold leading-relaxed">{successMessage}</span>
                  </motion.div>
                )}

                {geoError && !errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-800/80 border border-white/[0.04] rounded-xl p-4 flex items-start gap-3 mb-6"
                  >
                    <Navigation className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-zinc-300 font-semibold leading-relaxed">{geoError}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Interactive check-in button container */}
            <div className="space-y-4 mt-8">
              {/* Location telemetry display */}
              {coords && office && (
                <div className="bg-[#09090b]/40 border border-white/[0.06] p-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-inner">
                  <span className="text-zinc-500 font-sans">Distance from Office</span>
                  <span className={`font-mono ${isInside ? 'text-emerald-400' : 'text-red-400'}`}>
                    {distance !== null ? `${distance.toFixed(1)} meters` : 'Calculating...'}
                  </span>
                </div>
              )}

              {/* Major Action trigger */}
              {!coords ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAcquireLocation}
                  disabled={geoLoading || loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-sm font-semibold transition-premium flex items-center justify-center gap-2 cursor-pointer shadow-premium-glow"
                >
                  {geoLoading ? (
                    <>
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                      Verifying location...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      Acquire Browser Location
                    </>
                  )}
                </motion.button>
              ) : (
                <div className="flex flex-col gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePunch}
                    disabled={
                      actionLoading ||
                      !todayStatus ||
                      todayStatus.hasCheckedOut ||
                      (!isInside && (todayStatus.hasCheckedIn ? !todayStatus.hasCheckedOut : true))
                    }
                    className={`w-full py-4 rounded-xl text-sm font-semibold transition-premium flex items-center justify-center gap-2 shadow-premium cursor-pointer ${
                      todayStatus?.hasCheckedOut
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/[0.04]'
                        : !isInside
                          ? 'bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20'
                          : todayStatus?.hasCheckedIn
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-premium-glow'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-premium-glow'
                    }`}
                  >
                    {actionLoading ? (
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                    ) : todayStatus?.hasCheckedOut ? (
                      'Daily Attendance Completed'
                    ) : !isInside ? (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        Punch Blocked: Out of Bounds
                      </>
                    ) : todayStatus?.hasCheckedIn ? (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Execute Punch-Out
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Execute Punch-In
                      </>
                    )}
                  </motion.button>

                  <button
                    onClick={handleAcquireLocation}
                    disabled={geoLoading || actionLoading}
                    className="w-full py-2.5 bg-transparent border border-white/[0.08] hover:bg-zinc-800 text-xs font-semibold text-zinc-300 rounded-xl transition-premium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
                    Refresh Coordinates
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PunchPage;
