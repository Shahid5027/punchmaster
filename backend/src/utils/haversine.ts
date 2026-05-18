/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the mathematically rigorous Haversine formula.
 * All inputs must be double-precision coordinates in decimal degrees.
 * Returns the distance in meters.
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const EARTH_RADIUS_METERS = 6371000; // Mean radius of the Earth

  // Convert decimal degrees to radians
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  // Haversine formulation
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100; // Return distance rounded to 2 decimal places
};
