import { COLORS } from '../constants/colors';
import { calculateSegmentSpeed } from './trafficEngine';

// --- Road Conditions Extraction ---
export const processRouteSegments = (route, weatherData, timeOffset = 0) => {
  if (!route.legs) return { segments: [], totalDelay: 0, roadConditions: [] };
  
  const segments = [];
  const roadConditions = [];
  const coords = route.geometry.coordinates;
  const date = new Date();
  let totalDelay = 0;
  
  route.legs.forEach(leg => {
    leg.steps.forEach(step => {
      const stepCoords = step.geometry?.coordinates || [];
      
      if (stepCoords.length > 0) {
        const metrics = calculateSegmentSpeed(step.distance, step.duration, weatherData, date, timeOffset);
        totalDelay += metrics.delay;
        
        segments.push({
           coordinates: stepCoords.map(c => [c[1], c[0]]), 
           color: metrics.color
        });

        // Extract road condition data
        const roadName = step.name || step.ref || 'Unnamed Road';
        const ratio = metrics.baseSpeed > 0 ? metrics.predictedSpeed / metrics.baseSpeed : 1;
        let severity;
        if (ratio < 0.5) severity = 'heavy';
        else if (ratio < 0.8) severity = 'moderate';
        else severity = 'clear';

        roadConditions.push({
          roadName,
          delayMinutes: Math.round(metrics.delay / 60 * 10) / 10,
          severity,
          predictedSpeed: Math.round(metrics.predictedSpeed * 10) / 10,
          baseSpeed: Math.round(metrics.baseSpeed * 10) / 10,
          color: metrics.color,
          distance: step.distance,
        });
      }
    });
  });

  // Fallback if no steps parsed
  if (segments.length === 0 && coords.length > 0) {
     const metrics = calculateSegmentSpeed(route.distance, route.duration, weatherData, date, timeOffset);
     totalDelay += metrics.delay;
     segments.push({
         coordinates: coords.map(c => [c[1], c[0]]),
         color: metrics.color
     });
     roadConditions.push({
       roadName: 'Route',
       delayMinutes: Math.round(metrics.delay / 60 * 10) / 10,
       severity: 'clear',
       predictedSpeed: Math.round(metrics.predictedSpeed * 10) / 10,
       baseSpeed: Math.round(metrics.baseSpeed * 10) / 10,
       color: metrics.color,
       distance: route.distance,
     });
  }

  return { segments, totalDelay, roadConditions };
};

// --- Route Score (lower = better) ---
export const calculateRouteScore = (route, weatherData) => {
  const result = processRouteSegments(route, weatherData, 0);
  const predictedDuration = route.duration + result.totalDelay;
  const totalDelayMinutes = result.totalDelay / 60;

  // Weather severity penalty
  let weatherPenalty = 0;
  if (weatherData) {
    if (weatherData.code >= 95) weatherPenalty = 300;       // Storm
    else if (weatherData.code >= 61 || weatherData.rain > 2.0) weatherPenalty = 120; // Rain
    else if (weatherData.code >= 51 || weatherData.rain > 0.5) weatherPenalty = 40;  // Drizzle
  }

  return predictedDuration + (totalDelayMinutes * 60) + weatherPenalty;
};

// --- Deduplicate roads by name (merge conditions) ---
const deduplicateRoadConditions = (conditions) => {
  const map = new Map();
  for (const road of conditions) {
    if (road.roadName === 'Unnamed Road' || !road.roadName) continue;
    const existing = map.get(road.roadName);
    if (existing) {
      // Merge: sum delays & distance, keep worst severity
      existing.delayMinutes += road.delayMinutes;
      existing.distance += road.distance;
      const severityRank = { heavy: 3, moderate: 2, clear: 1 };
      if (severityRank[road.severity] > severityRank[existing.severity]) {
        existing.severity = road.severity;
        existing.color = road.color;
        existing.predictedSpeed = road.predictedSpeed;
        existing.baseSpeed = road.baseSpeed;
      }
    } else {
      map.set(road.roadName, { ...road });
    }
  }
  return Array.from(map.values());
};

// --- Main Processing Pipeline (replaces ensureThreeRoutes) ---
export const processAndRankRoutes = (rawRoutes, weatherData) => {
  // 1. Score & sort
  const scored = rawRoutes.map(route => ({
    route,
    score: calculateRouteScore(route, weatherData),
  }));
  scored.sort((a, b) => a.score - b.score);

  // 2. If less than 3 routes, pad with simulated copies
  while (scored.length < 3) {
    const base = scored[scored.length - 1];
    const simulatedRoute = JSON.parse(JSON.stringify(base.route));
    simulatedRoute.isSimulated = true;
    simulatedRoute.varianceId = scored.length;
    scored.push({
      route: simulatedRoute,
      score: base.score * (1.0 + scored.length * 0.15),
    });
  }

  // 3. Process each route with predictions + road conditions
  let allRoadConditions = [];
  const hasRain = weatherData && (weatherData.rain > 0.5 || weatherData.code >= 51);

  const processedRoutes = scored.slice(0, 3).map(({ route, score }, index) => {
    const predictions = {};
    let routeRoadConditions = [];

    [0, 15, 30].forEach(offset => {
      const result = processRouteSegments(route, weatherData, offset);

      let duration = route.duration + result.totalDelay;
      if (route.isSimulated) {
        duration = duration * (1.0 + route.varianceId * 0.15);
      }

      const minutes = Math.round(duration / 60);
      predictions[offset] = {
        duration: minutes,
        formattedDuration: minutes > 60 ? `${Math.floor(minutes/60)}h ${minutes%60}m` : `${minutes} min`,
        segments: result.segments,
        color: result.segments.length > 0 ? result.segments[0].color : COLORS.primary,
      };

      if (offset === 0) {
        routeRoadConditions = result.roadConditions;
      }
    });

    // Assign labels by rank (already sorted by score)
    const current = predictions[0];
    const minutes = current.duration;

    let label, uiColor;
    if (index === 0) { label = "BEST"; uiColor = COLORS.primary; }
    else if (index === 1) { label = "ALT"; uiColor = COLORS.warning; }
    else { label = "SLOW"; uiColor = COLORS.danger; }

    // Reason generation
    let reason = "Clear Road";
    if (uiColor === COLORS.danger) {
      if (hasRain) reason = "Weather Delays";
      else reason = "Heavy Traffic";
    } else if (uiColor === COLORS.warning) {
      reason = "Moderate Traffic";
    }

    // Collect road conditions from the best route
    if (index === 0) {
      allRoadConditions = routeRoadConditions;
    }

    return {
      ...route,
      predictions,
      formattedDuration: current.formattedDuration,
      uiColor,
      uiLabel: label,
      uiReason: reason,
      distanceKm: (route.distance / 1000).toFixed(1),
      score: Math.round(score),
      startLat: route.geometry.coordinates[0][1],
      startLon: route.geometry.coordinates[0][0],
    };
  });

  return {
    routes: processedRoutes,
    roadConditions: deduplicateRoadConditions(allRoadConditions),
  };
};

// Keep backward compat export name
export const ensureThreeRoutes = processAndRankRoutes;
