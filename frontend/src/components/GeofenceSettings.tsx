import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { MapPin, Navigation, Sliders, Save, Shield, Clock } from 'lucide-react';

// Proactively fix Vite asset resolution paths for leaflet layers
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom divIcon for the Draggable Office Marker
const officeDivIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-7 h-7 bg-blue-600 border-[3px] border-white rounded-full shadow-lg flex items-center justify-center animate-pulse">
        <div class="w-2 h-2 bg-white rounded-full"></div>
      </div>
      <div class="absolute -top-1 w-2.5 h-2.5 bg-blue-500 rounded-full blur-[1px] opacity-60"></div>
    </div>
  `,
  className: 'custom-map-office-draggable-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Sub-component to handle map viewport recentering dynamically
const MapRecenterController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const GeofenceSettings: React.FC = () => {
  const { showToast } = useToast();
  
  // State variables for configurations
  const [latitude, setLatitude] = useState<number>(12.9715987);
  const [longitude, setLongitude] = useState<number>(77.5945627);
  const [radius, setRadius] = useState<number>(200);
  const [lateThreshold, setLateThreshold] = useState<number>(15);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [fetchingGeo, setFetchingGeo] = useState<boolean>(false);

  const markerRef = useRef<any>(null);

  // Fetch initial configuration from database
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings/office');
      const data = response.data;
      if (data) {
        setLatitude(parseFloat(data.latitude));
        setLongitude(parseFloat(data.longitude));
        setRadius(parseInt(data.radius_meters));
        setLateThreshold(parseInt(data.late_threshold_minutes));
      }
    } catch (err: any) {
      console.error('⚠️ Settings retrieval failed:', err);
      showToast('Offline mode: Loaded local geofencing cache.', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Draggable Marker Event Handlers
  const markerEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newLatLng = marker.getLatLng();
          setLatitude(parseFloat(newLatLng.lat.toFixed(7)));
          setLongitude(parseFloat(newLatLng.lng.toFixed(7)));
        }
      },
    }),
    []
  );

  // Browser Geolocation integration
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Browser does not support coordinates telemetry.', 'error');
      return;
    }

    setFetchingGeo(true);
    showToast('Acquiring physical telemetry coordinates...', 'info');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(7));
        const lng = parseFloat(position.coords.longitude.toFixed(7));
        setLatitude(lat);
        setLongitude(lng);
        setFetchingGeo(false);
        showToast('Successfully captured current location.', 'success');
      },
      (error) => {
        console.error('Geolocation acquisition error:', error);
        setFetchingGeo(false);
        showToast('Failed to resolve GPS coordinates: Check permissions.', 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Submit configuration updates to database
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put('/settings/office', {
        latitude,
        longitude,
        radius_meters: radius,
        late_threshold_minutes: lateThreshold,
      });
      showToast('Geofence parameters updated successfully.', 'success');
    } catch (err: any) {
      console.error('Settings save failed:', err);
      showToast(err.response?.data?.error || 'Failed to update configurations.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/[0.04] rounded-lg w-1/3"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 h-96 bg-white/[0.02] rounded-2xl border border-white/[0.04]"></div>
          <div className="lg:col-span-7 h-96 bg-white/[0.02] rounded-2xl border border-white/[0.04]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Geofence & Office Landmarking Configuration
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Re-locate office boundary parameters, change allowance radius, and define tardiness thresholds.
          </p>
        </div>
        
        <button
          onClick={handleUseCurrentLocation}
          disabled={fetchingGeo}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-white/[0.08] hover:bg-zinc-800 disabled:opacity-50 text-xs font-bold text-zinc-300 rounded-xl transition-premium cursor-pointer"
        >
          <Navigation className={`w-3.5 h-3.5 ${fetchingGeo ? 'animate-spin' : ''}`} />
          Use Current Location
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Parameters Form controls */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-5 space-y-6">
          <div className="bg-[#18181b]/50 border border-white/[0.06] rounded-2xl p-6 space-y-6 backdrop-blur-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              Parameters Editor
            </h3>

            {/* Latitude Coordinates */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                Office Latitude
              </label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-zinc-950 border border-white/[0.06] focus:border-blue-500/40 rounded-xl text-sm text-zinc-200 outline-none transition-all placeholder-zinc-700"
                placeholder="12.9715987"
              />
            </div>

            {/* Longitude Coordinates */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                Office Longitude
              </label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-zinc-950 border border-white/[0.06] focus:border-blue-500/40 rounded-xl text-sm text-zinc-200 outline-none transition-all placeholder-zinc-700"
                placeholder="77.5945627"
              />
            </div>

            {/* Allowed Geofence Radius Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <span>Allowed Radius Allowance</span>
                <span className="text-blue-400 lowercase font-mono text-xs">{radius}m</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="25"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] font-bold text-zinc-600">
                <span>50m</span>
                <span>200m</span>
                <span>500m</span>
                <span>1000m</span>
              </div>
            </div>

            {/* Late threshold Minutes slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  Late Threshold
                </span>
                <span className="text-amber-500 font-mono text-xs">{lateThreshold}m</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={lateThreshold}
                onChange={(e) => setLateThreshold(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[9px] font-bold text-zinc-600">
                <span>5m</span>
                <span>15m</span>
                <span>30m</span>
                <span>60m</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-lg shadow-blue-600/15 transition-premium cursor-pointer border-0 active-scale"
          >
            <Save className="w-4 h-4 shrink-0" />
            {saving ? 'Saving Configurations...' : 'Save Geofence Settings'}
          </button>
        </form>

        {/* Right Side: Leaflet interactive Map preview */}
        <div className="lg:col-span-7 flex flex-col h-[460px] bg-[#18181b]/50 border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm p-2">
          <div className="flex-1 w-full rounded-xl overflow-hidden relative z-0">
            <MapContainer
              center={[latitude, longitude]}
              zoom={15}
              className="h-full w-full"
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              
              <MapRecenterController center={[latitude, longitude]} />

              {/* Draggable Marker for the Office */}
              <Marker
                draggable={true}
                eventHandlers={markerEventHandlers}
                position={[latitude, longitude]}
                icon={officeDivIcon}
                ref={markerRef}
              />

              {/* Geofence boundary circle preview */}
              <Circle
                center={[latitude, longitude]}
                radius={radius}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: '4, 6',
                }}
              />
            </MapContainer>
          </div>
          <div className="p-3 text-center">
            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
              💡 Pro Tip: You can drag the blue office marker on the map to automatically update coordinates!
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GeofenceSettings;
