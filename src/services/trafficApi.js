import { ensureThreeRoutes } from '../utils/routeHelpers';
import { getCurrentWeather } from './weatherApi';

export const geocodeLocation = async (query) => {
  if (!query) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=zw&limit=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'BulawayoPlannerApp/1.0' } });
    const data = await response.json();
    return (data && data.length > 0) ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
  } catch (error) { return null; }
};

export const getRoute = async (start, end, departureTime = 'NOW') => {
  try {
    // Fetch OSRM Route and Weather Data in parallel
    const routeUrl = `http://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=simplified&geometries=geojson&alternatives=true&steps=true`;
    
    const [routeResponse, weatherData] = await Promise.all([
      fetch(routeUrl).then(res => res.json()),
      getCurrentWeather(start.lat, start.lon)
    ]);
    
    if (routeResponse.code === 'Ok' && routeResponse.routes.length > 0) {
      const sorted = routeResponse.routes.sort((a, b) => a.duration - b.duration);
      const processedRoutes = ensureThreeRoutes(sorted, weatherData, departureTime);
      return { routes: processedRoutes, weather: weatherData };
    }
    return { routes: [], weather: null };
  } catch (error) { 
    console.error("Route Fetch Error:", error);
    return { routes: [], weather: null }; 
  }
};
