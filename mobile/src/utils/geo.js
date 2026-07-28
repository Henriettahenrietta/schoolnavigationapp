// Small geographic helpers used for the route/distance features.
// These implement, in a simplified form, the "process" step from the Systems
// Theory model in Chapter Two: turning a current location + destination into
// a distance and an estimated walking time.

const EARTH_RADIUS_M = 6371000;
const AVERAGE_WALK_SPEED_MPS = 1.35; // ~4.9 km/h, a comfortable walking pace

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Haversine distance in metres between two {latitude, longitude} points.
export function distanceMeters(a, b) {
  if (!a || !b) return null;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters) {
  if (meters == null) return '--';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

// Rough walking time estimate, in whole minutes (minimum 1).
export function walkingMinutes(meters) {
  if (meters == null) return null;
  return Math.max(1, Math.round(meters / AVERAGE_WALK_SPEED_MPS / 60));
}

// A map region that comfortably frames two points (user + destination).
export function regionForPoints(a, b) {
  const minLat = Math.min(a.latitude, b.latitude);
  const maxLat = Math.max(a.latitude, b.latitude);
  const minLon = Math.min(a.longitude, b.longitude);
  const maxLon = Math.max(a.longitude, b.longitude);
  const padding = 1.6;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * padding, 0.004),
    longitudeDelta: Math.max((maxLon - minLon) * padding, 0.004),
  };
}
