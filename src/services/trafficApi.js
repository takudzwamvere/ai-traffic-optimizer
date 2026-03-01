import { processAndRankRoutes } from '../utils/routeHelpers.js';
import { getCurrentWeather } from './weatherApi.js';

// --- Retry Wrapper (Exponential Backoff) ---
const fetchWithRetry = async (url, options = {}, retries = 3) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      // Non-retryable status codes
      if (res.status >= 400 && res.status < 500) return res;
    } catch (error) {
      if (attempt === retries - 1) throw error;
    }
    // Exponential backoff: 1s, 2s, 4s
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
  }
  throw new Error('Max retries reached');
};

// --- Geocoding ---
export const geocodeLocation = async (query) => {
  if (!query) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=zw&limit=1`;
    const response = await fetchWithRetry(url, { headers: { 'User-Agent': 'BulawayoPlannerApp/1.0' } });
    const data = await response.json();
    return (data && data.length > 0) ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
  } catch (error) { return null; }
};

// --- Geometry Similarity (for deduplication) ---
const sampleCoordinates = (coords, n = 20) => {
  if (coords.length <= n) return coords;
  const step = Math.floor(coords.length / n);
  return coords.filter((_, i) => i % step === 0).slice(0, n);
};

const geometrySimilarity = (routeA, routeB) => {
  const coordsA = sampleCoordinates(routeA.geometry.coordinates);
  const coordsB = sampleCoordinates(routeB.geometry.coordinates);
  const threshold = 0.001; // ~111m
  let matches = 0;
  for (const [lonA, latA] of coordsA) {
    for (const [lonB, latB] of coordsB) {
      if (Math.abs(lonA - lonB) < threshold && Math.abs(latA - latB) < threshold) {
        matches++;
        break;
      }
    }
  }
  return matches / coordsA.length;
};

// --- Route Bearing (initial heading for diversity check) ---
const getRouteBearing = (route) => {
  const coords = route.geometry.coordinates;
  if (coords.length < 2) return 0;
  // Use a point ~20% into the route for a more representative bearing
  const startIdx = 0;
  const endIdx = Math.min(Math.floor(coords.length * 0.2), coords.length - 1);
  const [lon1, lat1] = coords[startIdx];
  const [lon2, lat2] = coords[Math.max(endIdx, 1)];
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return Math.atan2(y, x) * 180 / Math.PI;
};

// --- Check if route is truly different from existing routes ---
const isRouteDifferent = (newRoute, existingRoutes) => {
  for (const existing of existingRoutes) {
    // Tightened threshold: 75% geometry similarity = same route
    const similarity = geometrySimilarity(existing, newRoute);
    if (similarity > 0.75) return false;

    // Bearing diversity check
    const bearingDiff = Math.abs(getRouteBearing(existing) - getRouteBearing(newRoute));
    const normalizedBearing = Math.min(bearingDiff, 360 - bearingDiff);
    if (normalizedBearing < 15 && similarity > 0.50) return false;

    // Duration similarity check: if routes are within 5% duration they're effectively the same
    const durationRatio = Math.abs(existing.duration - newRoute.duration) / Math.max(existing.duration, 1);
    if (durationRatio < 0.05 && similarity > 0.50) return false;
  }
  return true;
};

// --- Fetch OSRM Route ---
const fetchOSRM = async (start, end) => {
  const url = `http://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson&alternatives=true&annotations=true&steps=true&continue_straight=false`;
  try {
    const res = await fetchWithRetry(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes.length > 0) return data.routes;
    return [];
  } catch { return []; }
};

// --- Fetch route via waypoint ---
const fetchViaWaypoint = async (origin, waypoint, destination) => {
  const url = `http://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${waypoint.lon},${waypoint.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&annotations=true&steps=true&continue_straight=false`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes.length > 0) return data.routes[0];
    return null;
  } catch { return null; }
};

// --- Alternative Route Discovery via Diverse Offset Waypoints ---
// --- Main Route Fetcher: returns 1–3 genuinely different routes from OSRM ---
// NEVER fabricates or clones routes. If OSRM returns only 1 valid route,
// 1 route is returned and the UI handles it honestly.
export const fetchAlternativeRoutes = async (origin, destination) => {
  let allRoutes = await fetchOSRM(origin, destination);

  // Deduplicate what OSRM itself returned (it sometimes returns near-identical alternatives)
  const uniqueRoutes = [allRoutes[0]];
  for (let i = 1; i < allRoutes.length; i++) {
    if (isRouteDifferent(allRoutes[i], uniqueRoutes)) {
      uniqueRoutes.push(allRoutes[i]);
    }
    if (uniqueRoutes.length >= 3) break;
  }

  // Return whatever genuine routes exist (1, 2, or 3) — sorted by OSRM duration.
  // Never pad with synthetic routes.
  return uniqueRoutes.sort((a, b) => a.duration - b.duration);
};

// --- Main Route Function ---
export const getRoute = async (start, end, originName, destName) => {
  try {
    const [rawRoutes, weatherData] = await Promise.all([
      fetchAlternativeRoutes(start, end),
      getCurrentWeather(start.lat, start.lon)
    ]);

    if (rawRoutes.length > 0) {
      const { routes: processedRoutes, roadConditions, singleRouteMessage } = processAndRankRoutes(rawRoutes, weatherData, originName, destName);
      return { routes: processedRoutes, weather: weatherData, roadConditions, singleRouteMessage };
    }
    return { routes: [], weather: null, roadConditions: [], singleRouteMessage: null };
  } catch (error) {
    console.error("Route Fetch Error:", error);
    return { routes: [], weather: null, roadConditions: [] };
  }
};
