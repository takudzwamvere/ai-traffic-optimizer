import { processAndRankRoutes } from '../utils/routeHelpers';
import { getCurrentWeather } from './weatherApi';

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

// --- Alternative Route Discovery via Offset Waypoints ---
export const fetchAlternativeRoutes = async (origin, destination) => {
  // 1. Get base routes from OSRM (may return 1-3)
  let allRoutes = await fetchOSRM(origin, destination);

  // 2. If we already have 3+ unique routes, no need for offsets
  if (allRoutes.length >= 3) {
    return allRoutes.sort((a, b) => a.duration - b.duration).slice(0, 3);
  }

  // 3. Generate offset waypoints to discover different paths
  const offsets = [
    { lat: +0.002, lon: +0.002 },
    { lat: -0.002, lon: -0.002 },
  ];

  const offsetPromises = offsets.map(offset => {
    const waypoint = {
      lat: (origin.lat + destination.lat) / 2 + offset.lat,
      lon: (origin.lon + destination.lon) / 2 + offset.lon,
    };
    // Route via waypoint: origin → waypoint → destination
    const url = `http://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${waypoint.lon},${waypoint.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&annotations=true&steps=true&continue_straight=false`;
    return fetch(url)
      .then(res => res.json())
      .then(data => (data.code === 'Ok' && data.routes.length > 0) ? data.routes[0] : null)
      .catch(() => null);
  });

  const offsetResults = await Promise.all(offsetPromises);

  // 4. Merge offset routes
  for (const route of offsetResults) {
    if (!route) continue;
    // Check for duplicates against existing routes
    const isDuplicate = allRoutes.some(existing => geometrySimilarity(existing, route) > 0.85);
    if (!isDuplicate) {
      allRoutes.push(route);
    }
    if (allRoutes.length >= 3) break;
  }

  return allRoutes.sort((a, b) => a.duration - b.duration).slice(0, 3);
};

// --- Main Route Function ---
export const getRoute = async (start, end) => {
  try {
    const [rawRoutes, weatherData] = await Promise.all([
      fetchAlternativeRoutes(start, end),
      getCurrentWeather(start.lat, start.lon)
    ]);

    if (rawRoutes.length > 0) {
      const { routes: processedRoutes, roadConditions } = processAndRankRoutes(rawRoutes, weatherData);
      return { routes: processedRoutes, weather: weatherData, roadConditions };
    }
    return { routes: [], weather: null, roadConditions: [] };
  } catch (error) {
    console.error("Route Fetch Error:", error);
    return { routes: [], weather: null, roadConditions: [] };
  }
};
