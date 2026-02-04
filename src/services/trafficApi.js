import { ensureThreeRoutes } from '../utils/routeHelpers';

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
    const url = `http://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=simplified&geometries=geojson&alternatives=true&steps=true`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes.length > 0) {
      const sorted = data.routes.sort((a, b) => a.duration - b.duration);
      return ensureThreeRoutes(sorted, departureTime);
    }
    return [];
  } catch (error) { return []; }
};
