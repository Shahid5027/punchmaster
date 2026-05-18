import { useState, useCallback } from 'react';

interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface GeolocationState {
  coords: GeolocationCoords | null;
  error: string | null;
  loading: boolean;
  requestLocation: () => Promise<GeolocationCoords>;
}

export const useGeolocation = (): GeolocationState => {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const requestLocation = useCallback((): Promise<GeolocationCoords> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errMsg = 'Geolocation is not supported by your browser.';
        setError(errMsg);
        reject(new Error(errMsg));
        return;
      }

      setLoading(true);
      setError(null);

      // Secure capture options (High accuracy for precise geofence checking)
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const fetchedCoords: GeolocationCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCoords(fetchedCoords);
          setLoading(false);
          resolve(fetchedCoords);
        },
        (err) => {
          let errMsg = 'An unknown geolocation error occurred.';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errMsg = 'Location access denied. Please enable location permissions in your browser to check in/out.';
              break;
            case err.POSITION_UNAVAILABLE:
              errMsg = 'Location information is unavailable. Ensure your GPS is enabled.';
              break;
            case err.TIMEOUT:
              errMsg = 'Location request timed out. Please try again.';
              break;
          }
          setError(errMsg);
          setLoading(false);
          reject(new Error(errMsg));
        },
        options
      );
    });
  }, []);

  return { coords, error, loading, requestLocation };
};
export default useGeolocation;
