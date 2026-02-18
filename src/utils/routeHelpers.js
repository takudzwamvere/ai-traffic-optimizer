import { COLORS } from '../constants/colors';
import { calculateSegmentSpeed } from './trafficEngine';

export const processRouteSegments = (route, weatherData, departureTime, timeOffset = 0) => {
  if (!route.legs) return { segments: [], totalDelay: 0 };
  
  const segments = [];
  const coords = route.geometry.coordinates;
  
  // Set accurate prediction time
  let date = new Date();
  if (departureTime === 'MORNING') date.setHours(8, 0, 0);
  else if (departureTime === 'EVENING') date.setHours(17, 30, 0);
  
  let totalDelay = 0;
  
  route.legs.forEach(leg => {
    leg.steps.forEach(step => {
      const stepCoords = step.geometry.coordinates || []; 
      
      if (stepCoords.length > 0) {
        const metrics = calculateSegmentSpeed(step.distance, step.duration, weatherData, date, timeOffset);
        totalDelay += metrics.delay;
        
        segments.push({
           coordinates: stepCoords.map(c => [c[1], c[0]]), 
           color: metrics.color
        });
      }
    });
  });

  if (segments.length === 0 && coords.length > 0) {
     const metrics = calculateSegmentSpeed(route.distance, route.duration, weatherData, date, timeOffset);
     totalDelay += metrics.delay;
     segments.push({
         coordinates: coords.map(c => [c[1], c[0]]),
         color: metrics.color
     });
  }

  return { segments, totalDelay };
};

export const ensureThreeRoutes = (rawRoutes, weatherData, departureTime = 'NOW') => {
  // FORCE 3 Routes Logic:
  // If we have < 3, duplicate the last one and add "simulated noise" to make it distinct.
  let routesToProcess = [...rawRoutes];
  
  while (routesToProcess.length < 3) {
      // Clone the best/last route
      const base = routesToProcess[routesToProcess.length - 1]; // usually index 0 if length is 1
      // Create a "Simulated" copy
      const simulatedRoute = JSON.parse(JSON.stringify(base)); 
      simulatedRoute.isSimulated = true;
      // Add a slight variance ID so we know it's fake
      simulatedRoute.varianceId = routesToProcess.length; 
      routesToProcess.push(simulatedRoute);
  }

  return routesToProcess.map((route, index) => {
      // Generate predictions for 0, 15, and 30 minutes
      const predictions = {};
      
      [0, 15, 30].forEach(offset => {
          const result = processRouteSegments(route, weatherData, departureTime, offset);
          
          let duration = route.duration + result.totalDelay;
          
          // If simulated, add synthetic variance (e.g. +10% or +20% delay) to make them look different
          if (route.isSimulated) {
             const varianceFactor = 1.0 + (route.varianceId * 0.15); // +15% per variance step
             duration = duration * varianceFactor;
          }

          const minutes = Math.round(duration / 60);
          
          predictions[offset] = {
              duration: minutes,
              formattedDuration: minutes > 60 ? `${Math.floor(minutes/60)}h ${minutes%60}m` : `${minutes} min`,
              segments: result.segments,
              color: result.segments.length > 0 ? result.segments[0].color : COLORS.primary
          };
      });

      // Default to "Now" (offset 0) for the main list
      const current = predictions[0];
      const minutes = current.duration;

      let label = index === 0 ? "BEST" : "ALT";
      let uiColor = index === 0 ? COLORS.primary : COLORS.warning;
      if (minutes > predictions[0].duration * 1.3) {
         label = "SLOW";
         uiColor = COLORS.danger;
      }

      // Reason Generation
      const hasRain = weatherData && (weatherData.rain > 0.5 || weatherData.code >= 51);
      const isPeak = departureTime === 'MORNING' || departureTime === 'EVENING';
      let reason = "Clear Road";
      
      if (uiColor === COLORS.danger) {
          if (hasRain && isPeak) reason = "Rain & Rush Hour";
          else if (hasRain) reason = "Weather Delays";
          else reason = "Heavy Traffic";
      } else if (uiColor === COLORS.warning) {
          reason = "Moderate Traffic";
      }

      return {
          ...route,
          predictions, // { 0: {...}, 15: {...}, 30: {...} }
          formattedDuration: current.formattedDuration,
          uiColor,
          uiLabel: label,
          uiReason: reason,
          distanceKm: (route.distance / 1000).toFixed(1),
          startLat: route.geometry.coordinates[0][1],
          startLon: route.geometry.coordinates[0][0]
      };
  });
};
