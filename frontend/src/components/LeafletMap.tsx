import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Proactively fix Vite asset resolution paths for default leaflet layers if fallback is triggered
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

// 1. Custom divIcon for Office Geocenter with a clean, professional marker
const officeDivIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-6 h-6 bg-blue-600 border-[3px] border-white rounded-full shadow-md flex items-center justify-center">
        <div class="w-2 h-2 bg-white rounded-full"></div>
      </div>
    </div>
  `,
  className: 'custom-map-office-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// 2. Custom divIcon for Success Employee Check-in (Safe / inside geofence)
const successEmployeeIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-5 h-5 bg-emerald-500 border-[3px] border-white rounded-full shadow-md"></div>
    </div>
  `,
  className: 'custom-map-employee-success',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// 3. Custom divIcon for Failed/Blocked Employee Check-in (Out of bounds)
const failedEmployeeIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-5 h-5 bg-red-500 border-[3px] border-white rounded-full shadow-md"></div>
    </div>
  `,
  className: 'custom-map-employee-failed',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

interface LeafletMapProps {
  officeLat: number;
  officeLng: number;
  officeRadius: number;
  userLat?: number;
  userLng?: number;
  isInsideGeofence: boolean;
}

/**
 * Controller sub-component to handle map centering, zooming, and bound calculations dynamically.
 * Standardizes fitBounds logic to show BOTH coordinates on the map at the same time.
 */
const MapViewportController: React.FC<{
  officeCenter: [number, number];
  userCenter?: [number, number];
}> = ({ officeCenter, userCenter }) => {
  const map = useMap();

  useEffect(() => {
    if (userCenter && userCenter[0] !== undefined && userCenter[1] !== undefined) {
      // Calculate bounding box enclosing both pins with padding
      const bounds = L.latLngBounds([officeCenter, userCenter]);
      map.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: 16,
        animate: true,
        duration: 1.2,
      });
    } else {
      // Zoom into office directly if employee telemetry is not captured
      map.setView(officeCenter, 16, {
        animate: true,
        duration: 1.0,
      });
    }
  }, [officeCenter, userCenter, map]);

  return null;
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  officeLat,
  officeLng,
  officeRadius,
  userLat,
  userLng,
  isInsideGeofence,
}) => {
  const officeCenter: [number, number] = [officeLat, officeLng];
  const userCenter: [number, number] | undefined =
    userLat !== undefined && userLng !== undefined ? [userLat, userLng] : undefined;

  const geofenceColor = isInsideGeofence ? '#10b981' : '#ef4444'; // Emerald green if safe, crimson red if out

  return (
    <div className="w-full h-[260px] sm:h-[380px] rounded-2xl overflow-hidden border border-white/[0.08] shadow-premium relative z-0">
      
      {/* 4. Map Container */}
      <MapContainer
        center={officeCenter}
        zoom={16}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', background: '#09090b' }}
      >
        {/* Dark map tile grids */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Handles smooth camera panning and bound fits */}
        <MapViewportController officeCenter={officeCenter} userCenter={userCenter} />

        {/* Shaded geofence ring boundary */}
        <Circle
          center={officeCenter}
          radius={officeRadius}
          pathOptions={{
            color: geofenceColor,
            fillColor: geofenceColor,
            fillOpacity: 0.15,
            weight: 2,
            dashArray: isInsideGeofence ? 'none' : '5, 8', // dashed if out of bounds warning state
          }}
        />

        {/* Corporate HQ coordinates Pin */}
        <Marker position={officeCenter} icon={officeDivIcon}>
          <Popup>
            <div className="text-zinc-800 text-xs font-sans p-1">
              <span className="font-extrabold text-sm block mb-1">Bangalore Central HQ</span>
              <span className="block text-zinc-500 font-semibold mb-1">Corporate HQ Geocenter</span>
              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[9px] uppercase">
                Radius: {officeRadius}m allowed
              </span>
            </div>
          </Popup>
        </Marker>

        {/* Employee captured location Pin */}
        {userCenter && (
          <Marker
            position={userCenter}
            icon={isInsideGeofence ? successEmployeeIcon : failedEmployeeIcon}
          >
            <Popup>
              <div className="text-zinc-800 text-xs font-sans p-1">
                <span className="font-extrabold text-sm block mb-1">Your Location</span>
                <span className="block text-zinc-500 font-semibold mb-1.5">Browser location capture verified</span>
                <span className={`inline-block px-2.5 py-0.5 font-bold rounded text-[9px] uppercase border ${
                  isInsideGeofence
                    ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                    : 'bg-red-100 border-red-200 text-red-800'
                }`}>
                  {isInsideGeofence ? '✓ Verified: In Zone' : '⚠️ Warning: Out of Zone'}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* 5. Minimal map overlay legend panel for superior premium UX styling */}
      <div className="absolute bottom-4 left-4 z-[400] bg-zinc-900/90 backdrop-blur border border-white/[0.08] py-2.5 px-3.5 rounded-xl shadow-premium flex flex-col gap-1.5 text-[10px] font-semibold text-zinc-300 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" />
          <span>Office HQ Center</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full inline-block ${isInsideGeofence ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span>Your Location ({isInsideGeofence ? 'In Zone' : 'Out of Bounds'})</span>
        </div>
      </div>

    </div>
  );
};

export default LeafletMap;
