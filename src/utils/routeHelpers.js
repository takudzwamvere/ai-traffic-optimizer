import { COLORS } from '../constants/colors.js';
import { calculateSegmentSpeed } from './trafficEngine.js';
import { findCorridor, matchRouteToCorridorRoute, isInPeakHours } from '../data/corridors.js';

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
        totalDelay += metrics.delay; // We will keep total delay for metrics tracking
        // But for the actual route duration, we need the true calibrated time
        
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
          incidentReason: metrics.incidentReason
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
       incidentReason: metrics.incidentReason
     });
  }

  return { segments, totalDelay, roadConditions };
};

// --- Route Score (lower = better) ---
export const calculateRouteScore = (route, weatherData) => {
  const result = processRouteSegments(route, weatherData, 0);
  
  // NUST to City Hall baseline (420 seconds per 6600 meters)
  const baseCalibratedSeconds = route.distance * (420 / 6600);
  const predictedDuration = baseCalibratedSeconds + result.totalDelay;
  
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

// --- Extract road names from route for corridor matching ---
const extractRoadNames = (route) => {
  const names = [];
  if (route.legs) {
    route.legs.forEach(leg => {
      leg.steps?.forEach(step => {
        if (step.name && step.name !== 'Unnamed Road') {
          names.push(step.name);
        }
        if (step.ref) {
          names.push(step.ref);
        }
      });
    });
  }
  return names;
};

// --- Main Processing Pipeline ---
import { applyMLScoring } from '../services/mlOptimization.js';

export const processAndRankRoutes = (rawRoutes, weatherData, originName, destName) => {
  // 1. Initial Scoring
  let scored = rawRoutes.map(route => ({
    route,
    score: calculateRouteScore(route, weatherData),
  }));

  // 2. Find matching corridor for name labeling BEFORE applying ML
  const corridor = findCorridor(originName, destName);
  const isPeak = corridor ? isInPeakHours(corridor) : false;

  // 3. Apply ML Adjustments & Confidence Levels
  scored = scored.map(({ route, score }) => {
    let corridorRouteName = null;
    if (corridor) {
      const roadNames = extractRoadNames(route);
      const match = matchRouteToCorridorRoute(roadNames, corridor.routes);
      if (match) {
        corridorRouteName = match.name;
      }
    }
    const mlAnalysis = applyMLScoring(route, score, corridorRouteName);
    return {
      route,
      score: mlAnalysis.score,
      confidenceLevel: mlAnalysis.confidenceLevel, // E.g. "85%"
      corridorRouteName
    };
  });

  // Sort by ML Adjusted Score
  scored.sort((a, b) => a.score - b.score);

  // 4. Process each route with predictions + road conditions
  let allRoadConditions = [];
  const hasRain = weatherData && (weatherData.rain > 0.5 || weatherData.code >= 51);
  const routeCount = Math.min(scored.length, 3);

  const processedRoutes = scored.slice(0, routeCount).map(({ route, score, confidenceLevel, corridorRouteName }, index) => {
    const predictions = {};
    let routeRoadConditions = [];

    [0, 15, 30].forEach(offset => {
      const result = processRouteSegments(route, weatherData, offset);

      // Calibrated baseline: NUST to City Hall = 7 min per 6.6km
      const calibratedBaseSeconds = route.distance * (420 / 6600);

      // *** THE REAL FIX: apply the computed delay to each time slot ***
      // Each offset now produces a genuinely different ETA based on:
      //   - Time-of-day traffic factor (interpolated to the minute)
      //   - Rush-hour transition amplifier
      //   - Deterministic seeded incident randomness
      //   - Weather multiplier
      const duration = calibratedBaseSeconds + result.totalDelay;
      const minutes = Math.max(1, Math.round(duration / 60));

      // Compute avg predicted speed for summary context
      const avgSpeed = result.roadConditions.length > 0
        ? result.roadConditions.reduce((a, c) => a + c.predictedSpeed, 0) / result.roadConditions.length
        : 0;

      predictions[offset] = {
        duration: minutes,
        formattedDuration: minutes > 60
          ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
          : `${minutes} min`,
        segments: result.segments,
        color: result.segments.length > 0 ? result.segments[0].color : COLORS.primary,
        totalDelay: result.totalDelay,
        avgPredictedSpeed: Math.round(avgSpeed),
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
    if (isPeak) {
      reason = reason === "Clear Road" ? "Peak Hours" : `${reason} • Peak`;
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
      corridorName: corridorRouteName, // e.g. "via Cecil Ave"
      distanceKm: (route.distance / 1000).toFixed(1),
      score: Math.round(score),
      confidenceLevel,
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
