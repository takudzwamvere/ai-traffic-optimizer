/**
 * Traffic Prediction Engine
 * 
 * Calculates realistic traffic speeds based on:
 * 1. Road Type (Inferred from OSRM speed data)
 * 2. Time of Day (Hourly curves)
 * 3. Day of Week (Weekend vs Weekday)
 * 4. Weather Conditions (Rain/Wind impact)
 */

import { COLORS } from '../constants/colors.js';

// --- TASK 1: ROAD CLASSIFICATION ---

export const ROAD_TYPES = {
  HIGHWAY: 'HIGHWAY',       // > 80 km/h
  MAIN: 'MAIN_ROAD',        // > 50 km/h
  LOCAL: 'LOCAL_ROAD',      // > 30 km/h
  NARROW: 'NARROW_ROAD'     // <= 30 km/h
};

// Returns { type, baseSpeed }
export const classifyRoad = (osrmConnectSpeed) => {
  const speedKmh = osrmConnectSpeed; 

  if (speedKmh >= 80) return ROAD_TYPES.HIGHWAY;
  if (speedKmh >= 50) return ROAD_TYPES.MAIN;
  if (speedKmh >= 30) return ROAD_TYPES.LOCAL;
  return ROAD_TYPES.NARROW;
};

// --- TASK 2 & 3: TIME & DAY FACTORS ---

const WEEKDAY_CURVE = {
  0: 0.05, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.15, 5: 0.35, // Night
  6: 0.65, 7: 0.95, 8: 1.0, 9: 0.85, // Morning Peak (7-9am Bulawayo)
  10: 0.55, 11: 0.55, 12: 0.6, 13: 0.6, 14: 0.55, 15: 0.7, // Midday
  16: 0.9, 17: 1.0, 18: 0.95, 19: 0.65, // Evening Peak (4-6:30pm Bulawayo)
  20: 0.35, 21: 0.25, 22: 0.15, 23: 0.1 // Night
};

const WEEKEND_CURVE = {
  0: 0.1, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1,
  6: 0.2, 7: 0.3, 8: 0.4, 9: 0.6, // Slow start
  10: 0.7, 11: 0.8, 12: 0.8, 13: 0.8, 14: 0.75, 15: 0.7, // Shopping/Activity
  16: 0.6, 17: 0.6, 18: 0.5, 19: 0.4,
  20: 0.3, 21: 0.2, 22: 0.2, 23: 0.1
};

export const getTimeTrafficFactor = (date = new Date()) => {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const day = date.getDay();
  const isWeekend = (day === 0 || day === 6);

  const curve = isWeekend ? WEEKEND_CURVE : WEEKDAY_CURVE;
  const currentFactor = curve[hour] || 0.1;
  const nextFactor = curve[(hour + 1) % 24] || 0.1;

  // INTERPOLATE between current hour and next hour based on minutes
  // This makes a prediction at 3:50 PM meaningfully different from 4:10 PM
  const minuteProgress = minute / 60;
  let factor = currentFactor + (nextFactor - currentFactor) * minuteProgress;

  // Friday Evening Boost
  if (day === 5 && hour >= 15 && hour <= 19) {
    factor = Math.min(1.0, factor + 0.1);
  }

  return factor;
};

/**
 * Detects how much extra penalty to apply based on approaching rush-hour transitions.
 * Returns a multiplier > 1.0 when near a peak boundary (amplifies the congestion reduction).
 */
export const getTransitionMultiplier = (date = new Date()) => {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const day = date.getDay();
  const isWeekend = (day === 0 || day === 6);
  if (isWeekend) return 1.0; // Weekends have no sharp peak transitions

  const minuteOfDay = hour * 60 + minute;

  // Morning rush: 6:30–9:00 (390–540 mins)
  // Evening rush: 15:45–18:30 (945–1110 mins)
  // Entering rush (approaching peak) → amplify congestion
  // Leaving rush (departing peak) → reduce congestion toward normal

  // Morning approach: 6:30–7:30
  if (minuteOfDay >= 390 && minuteOfDay < 450) {
    const progress = (minuteOfDay - 390) / 60;
    return 1.0 + progress * 0.5; // Up to 1.5× penalty amplification
  }
  // Morning peak: 7:30–9:00
  if (minuteOfDay >= 450 && minuteOfDay < 540) {
    return 1.4; // Strong amplification at peak
  }
  // Morning fade: 9:00–10:00
  if (minuteOfDay >= 540 && minuteOfDay < 600) {
    const progress = (minuteOfDay - 540) / 60;
    return 1.4 - progress * 0.4;
  }
  // Evening approach: 15:45–16:30
  if (minuteOfDay >= 945 && minuteOfDay < 990) {
    const progress = (minuteOfDay - 945) / 45;
    return 1.0 + progress * 0.55;
  }
  // Evening peak: 16:30–18:00
  if (minuteOfDay >= 990 && minuteOfDay < 1080) {
    return 1.45;
  }
  // Evening fade: 18:00–19:00
  if (minuteOfDay >= 1080 && minuteOfDay < 1140) {
    const progress = (minuteOfDay - 1080) / 60;
    return 1.45 - progress * 0.45;
  }
  return 1.0;
};

// --- TASK 4: WEATHER IMPACT ---

export const getWeatherImpact = (weatherData, roadType) => {
  if (!weatherData) return 1.0; // No change

  // Codes: 0=Clear, 1-3=Cloudy, 51-55=Drizzle, 61-65=Rain, 80-82=Showers, 95+=Storm
  const { code, rain } = weatherData;
  
  let severity = 0; // 0 to 3
  
  if (code >= 95) severity = 3; // Storm
  else if (code >= 61 || rain > 2.0) severity = 2; // Rain
  else if (code >= 51 || rain > 0.5) severity = 1; // Drizzle
  
  // Impact scaling based on road type
  // Highways manage rain better than narrow dirt roads/service roads
  const impactMatrix = {
    [ROAD_TYPES.HIGHWAY]: [1.0, 0.95, 0.85, 0.70], // Speed multiplier
    [ROAD_TYPES.MAIN]:    [1.0, 0.90, 0.80, 0.60],
    [ROAD_TYPES.LOCAL]:   [1.0, 0.90, 0.75, 0.50],
    [ROAD_TYPES.NARROW]:  [1.0, 0.85, 0.65, 0.40],
  };

  const roadImpact = impactMatrix[roadType] || impactMatrix[ROAD_TYPES.MAIN];
  return roadImpact[severity];
};

// --- TASK 5 & 6: CALCULATION & COLORING ---

export const calculateSegmentSpeed = (distance, duration, weatherData, date = new Date(), timeOffset = 0) => {
  // 1. Base Speed (free flow from OSRM)
  // OSRM duration is in seconds, distance in meters.
  // Speed = (dist / dur) * 3.6 for km/h
  if (duration <= 0) return { speed: 0.1, color: COLORS.text, delay: 0, incidentReason: null };
  
  const baseSpeedKmh = (distance / duration) * 3.6;
  const roadType = classifyRoad(baseSpeedKmh);

  // 2. Traffic Factor — interpolated and transition-amplified
  const predictionTime = new Date(date.getTime() + (timeOffset * 60000));
  const timeFactor = getTimeTrafficFactor(predictionTime);
  const transitionMult = getTransitionMultiplier(predictionTime);

  // Specific Road Sensitivity — amplified by transition phase
  let congestionReduction = 1.0;
  if (roadType === ROAD_TYPES.HIGHWAY) {
    congestionReduction = 1.0 - (timeFactor * 0.4 * transitionMult);
  } else if (roadType === ROAD_TYPES.MAIN) {
    congestionReduction = 1.0 - (timeFactor * 0.6 * transitionMult);
  } else {
    congestionReduction = 1.0 - (timeFactor * 0.7 * transitionMult);
  }
  // Clamp so we never get negative reduction
  congestionReduction = Math.max(0.05, congestionReduction);

  // 3. Weather
  const weatherMultiplier = getWeatherImpact(weatherData, roadType);

  // 4. Final Speed
  let predictedSpeed = baseSpeedKmh * congestionReduction * weatherMultiplier;

  // Real-time Congestion Simulation — deterministic seeded randomness
  // Seed uses timeOffset + distance so each time slot + road = unique but stable result
  let incidentReason = null;
  if (distance > 500) {
    const seed = Math.sin((timeOffset * 1000 + distance) * 9301 + 49297) * 233280;
    const randomRoll = seed - Math.floor(seed);
    if (roadType === ROAD_TYPES.MAIN && randomRoll < 0.05) {
      predictedSpeed *= 0.6;
      incidentReason = 'Bottleneck Delay';
    } else if (roadType === ROAD_TYPES.HIGHWAY && timeFactor > 0.6 && randomRoll < 0.02) {
      predictedSpeed *= 0.3;
      incidentReason = 'Accident Reported';
    }
  }

  // Min Speed Thresholds (Traffic never truly stops to 0 usually in models unless blocked)
  const minSpeeds = {
    [ROAD_TYPES.HIGHWAY]: 20,
    [ROAD_TYPES.MAIN]: 10,
    [ROAD_TYPES.LOCAL]: 5,
    [ROAD_TYPES.NARROW]: 5
  };
  predictedSpeed = Math.max(predictedSpeed, minSpeeds[roadType]);

  // 5. Calculate Delay & Proportional Scaling
  // NUST to City Hall is ~6.6km (6600m). We want this to map to 7 minutes (420 seconds) baseline.
  // 420s / 6600m = 0.06363 seconds per meter.
  // Base duration calibrated to the user's explicit request:
  const calibratedBaseDuration = distance * (420 / 6600);
  
  // Apply our speed modifiers proportionally
  // If predictedSpeed is half of baseSpeed, duration doubles.
  const speedRatio = baseSpeedKmh / predictedSpeed;
  const newDuration = calibratedBaseDuration * speedRatio;
  
  const delay = Math.max(0, newDuration - calibratedBaseDuration);

  // 6. Coloring (Ratio of Predicted vs Base)
  const ratio = predictedSpeed / baseSpeedKmh;
  
  let color = COLORS.primary; // Green
  if (ratio < 0.5) color = COLORS.danger; // Red
  else if (ratio < 0.8) color = COLORS.warning; // Yellow

  return {
    predictedSpeed,
    baseSpeed: baseSpeedKmh,
    roadType,
    newDuration,
    originalDuration: duration,
    delay,
    color,
    incidentReason
  };
};
