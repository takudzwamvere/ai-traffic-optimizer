import { COLORS } from '../constants/colors';

// Helper to chunk coordinates and assign colors
const generateTrafficSegments = (coordinates, type, departureTime) => {
  const segments = [];
  const totalPoints = coordinates.length;
  if (totalPoints < 2) return [];

  // Logic: Peak hours = More congestion (More Red/Orange)
  const isPeak = departureTime === 'MORNING' || departureTime === 'EVENING';

  let colorPattern; 
  if (type === 'BEST') {
      // Best route usually avoids worst traffic, but in peak time it might get some
      colorPattern = isPeak 
        ? [COLORS.primary, COLORS.warning, COLORS.primary, COLORS.primary] 
        : [COLORS.primary, COLORS.primary, COLORS.primary, COLORS.primary];
  } else if (type === 'ALT') {
      colorPattern = isPeak 
        ? [COLORS.warning, COLORS.danger, COLORS.warning, COLORS.primary] 
        : [COLORS.primary, COLORS.warning, COLORS.warning, COLORS.primary];
  } else {
      // SLOW route gets hammered in peak time
      colorPattern = isPeak 
        ? [COLORS.danger, COLORS.danger, COLORS.danger, COLORS.warning] 
        : [COLORS.primary, COLORS.danger, COLORS.danger, COLORS.primary];
  }

  // Divide route into 4 chunks for simplicity
  const chunkSize = Math.floor(totalPoints / 4);
  
  for(let i=0; i<4; i++) {
     const start = i * chunkSize;
     const end = (i === 3) ? totalPoints : (start + chunkSize + 1); // +1 to connect segments
     const chunkCoords = coordinates.slice(start, end);
     
     if (chunkCoords.length > 1) {
         segments.push({
             coordinates: chunkCoords.map(c => [c[1], c[0]]), // Leaflet needs [lat, lon], OSRM gives [lon, lat]
             color: colorPattern[i] || COLORS.primary
         });
     }
  }
  return segments;
};

export const ensureThreeRoutes = (rawRoutes, departureTime = 'NOW') => {
  let processedRoutes = [...rawRoutes];
  
  // Adjust degradation based on time
  const isPeak = departureTime === 'MORNING' || departureTime === 'EVENING';
  const peakFactor = isPeak ? 1.5 : 1.0; // 50% slower in peak time

  while (processedRoutes.length < 3) {
    const base = processedRoutes[processedRoutes.length - 1];
    const degradation = (processedRoutes.length === 1 ? 1.15 : 1.3) * peakFactor;
    const newRoute = { ...base, duration: base.duration * degradation, isSimulated: true };
    processedRoutes.push(newRoute);
  }

  return processedRoutes.map((route, index) => {
    // Apply peak factor to duration for ALL routes (even the real OSRM one if we want to simulate prediction on top)
    // But usually OSRM gives free-flow or current. We'll add penalty to "simulated" ones or all?
    // Let's add simulated penalty to all if peak.
    let duration = route.duration;
    if (isPeak) duration *= 1.25; // Base traffic penalty for entire city

    let minutes = Math.round(duration / 60);
    let color, label, reason, type;

    if (index === 0) {
      color = COLORS.primary; 
      label = "BEST";
      reason = isPeak ? "Fastest (Peak)" : "Fastest";
      type = 'BEST';
    } else if (index === 1) {
      color = COLORS.warning; 
      label = "ALT";
      reason = isPeak ? "Heavy Traffic" : "Traffic";
      type = 'ALT';
    } else {
      color = COLORS.danger; 
      label = "SLOW";
      reason = "Congestion";
      type = 'SLOW';
    }

    // Generate segments for visualization if geometry exists
    let enhancedGeometry = route.geometry;
    if (route.geometry && route.geometry.coordinates) {
        const segments = generateTrafficSegments(route.geometry.coordinates, type, departureTime);
        enhancedGeometry = {
            ...route.geometry,
            properties: {
                ...route.geometry.properties,
                segments: segments
            }
        };
    }

    return {
      ...route,
      duration: duration, // Update duration
      geometry: enhancedGeometry, // Override with segmented geometry
      uiColor: color,
      uiLabel: label,
      uiReason: reason,
      formattedDuration: minutes > 60 ? `${Math.floor(minutes/60)}h ${minutes%60}m` : `${minutes} min`,
      distanceKm: (route.distance / 1000).toFixed(1)
    };
  });
};
