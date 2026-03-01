/**
 * trafficNarrativeEngine.js
 * 
 * Generates dynamic, context-aware traffic forecasts in natural language.
 * 
 * Inputs:
 *  - bestRoute: the highest-ranked route object with predictions[]
 *  - departureMins: how far in the future the user plans to leave
 *  - weather: current weather object { code, temp, rain }
 *  - routes: all route objects (for trend detection)
 * 
 * Output: a plain-English narrative paragraph that changes based on:
 *  - Time of day / rush hour transitions
 *  - Weather conditions
 *  - Speed trends between Now and departure time
 *  - Route type (highway vs local)
 */

import { getTimeTrafficFactor, getTransitionMultiplier } from './trafficEngine';
import { COLORS } from '../constants/colors';

// ─── PHRASE POOLS ────────────────────────────────────────────────────────────
// Multiple variants for each context so summaries never sound identical.

const CURRENT_CLEAR = [
  'Traffic is currently flowing freely with no significant delays.',
  'Roads are clear and moving well right now.',
  'Conditions are good — vehicles are moving without obstruction at the moment.',
  'Current traffic is light, allowing smooth travel across all routes.',
];

const CURRENT_MODERATE = [
  'Moderate congestion is present on several roads right now.',
  'Traffic is somewhat busy at the moment, with occasional slowdowns.',
  'Roads are experiencing moderate flow, with some delays on key stretches.',
  'There is noticeable activity on the road network, causing minor delays.',
];

const CURRENT_HEAVY = [
  'Heavy congestion is currently affecting most routes.',
  'Traffic is very busy right now — expect significant delays.',
  'Road conditions are difficult, with heavy traffic slowing movement considerably.',
  'High congestion across the network is causing substantial delays at this time.',
];

const FUTURE_RUSH_APPROACH = [
  'Congestion is expected to build sharply as rush hour begins.',
  'Traffic will likely worsen as the evening commute gets underway.',
  'Expect increasing delays as peak-hour traffic ramps up in the coming minutes.',
  'Rush hour is approaching — congestion will intensify significantly.',
];

const FUTURE_RUSH_PEAK = [
  'Full peak-hour congestion is expected by your departure time.',
  'Traffic will be at its heaviest by the time you plan to leave.',
  'Rush hour will be in full effect — route times will increase considerably.',
  'Conditions will be severely congested by your departure window.',
];

const FUTURE_CLEARING = [
  'Traffic is expected to ease noticeably by the time you leave.',
  'Road conditions should improve significantly by your planned departure.',
  'Congestion will likely dissipate as rush hour winds down.',
  'The roads should be clearing up by the time you depart.',
];

const FUTURE_STABLE_CLEAR = [
  'No major changes are expected — traffic should remain clear.',
  'Conditions are forecast to stay light and unobstructed.',
  'Traffic levels are not expected to change significantly before your departure.',
  'Roads are projected to remain flowing freely throughout this period.',
];

const FUTURE_STABLE_MODERATE = [
  'Conditions are expected to remain similar to current levels.',
  'Moderate traffic is forecast to continue without significant change.',
  'Traffic density should stay at current levels during this period.',
  'No major improvement or worsening is expected in the next window.',
];

const WEATHER_RAIN_NOW = [
  'Current rainfall is reducing speeds, particularly on narrower roads.',
  'Rain is active and affecting driving conditions across the network.',
  'Wet road surfaces are slowing vehicles, especially on local streets.',
];

const WEATHER_RAIN_FUTURE = [
  'Rain is forecast around your departure time, which may slow traffic further.',
  'Precipitation is expected by the time you plan to leave — allow extra time.',
  'Wet conditions are likely at departure — narrow roads will be most affected.',
];

const WEATHER_STORM = [
  'Storm conditions are severely impacting all routes. Allow substantial extra time.',
  'Dangerous weather is active — all routes will face significant delays.',
  'Severe weather is affecting the road network. Plan for major disruptions.',
];

const WEATHER_CLEAR = [
  'Weather conditions are good and not adding to travel times.',
  'Clear skies mean no weather-related penalties on any route.',
  'Dry and clear conditions are supporting normal traffic flow.',
];

const ROUTE_REASON_BEST = [
  'This route uses major roads that handle congestion more effectively.',
  'This option stays on wider corridors, which are less vulnerable to peak-hour slowdowns.',
  'Major arterials on this route reduce sensitivity to peak traffic buildup.',
  'This route is optimised for current and forecast conditions.',
];

const ROUTE_REASON_IMPROVING = [
  'By the time you leave, conditions on this route are projected to improve.',
  'Traffic on the recommended route is trending toward lighter congestion at your departure.',
  'This route benefits most from the anticipated easing of traffic.',
];

const ROUTE_REASON_WORSENING = [
  'Despite expected congestion, this route remains the most efficient option at your departure time.',
  'Even with increasing traffic, this is the best-performing route at your planned departure.',
  'Alternative routes are expected to worsen more — this option holds up best.',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Pick a phrase from a pool deterministically (stable across renders, varies per context). */
function pick(pool, seed = 0) {
  return pool[Math.abs(Math.floor(seed)) % pool.length];
}

/** Color rank: 0 = green (best), 1 = yellow, 2 = red (worst). */
function colorRank(color) {
  if (color === COLORS.danger) return 2;
  if (color === COLORS.warning) return 1;
  return 0;
}

/** Describe the current congestion level from a route color. */
function currentConditionPhrase(color, seed) {
  if (color === COLORS.primary) return pick(CURRENT_CLEAR, seed);
  if (color === COLORS.warning) return pick(CURRENT_MODERATE, seed);
  return pick(CURRENT_HEAVY, seed);
}

/** Describe weather impact given a weather object. */
function weatherPhrase(weather, departureMins, seed) {
  if (!weather) return pick(WEATHER_CLEAR, seed);

  const { code, rain } = weather;
  if (code >= 95) return pick(WEATHER_STORM, seed);
  if (code >= 61 || rain > 2.0) {
    return departureMins > 5 ? pick(WEATHER_RAIN_FUTURE, seed) : pick(WEATHER_RAIN_NOW, seed);
  }
  if (code >= 51 || rain > 0.5) return pick(WEATHER_RAIN_NOW, seed + 1);
  return pick(WEATHER_CLEAR, seed);
}

// ─── TREND DETECTION ─────────────────────────────────────────────────────────

/**
 * Compare now vs future conditions.
 * Returns: 'improving' | 'worsening' | 'stable'
 */
export function detectTrend(bestRoute, departureMins) {
  const nowColor = bestRoute?.predictions?.[0]?.color;
  const futureColor = departureMins > 7
    ? (departureMins > 22 ? bestRoute?.predictions?.[30]?.color : bestRoute?.predictions?.[15]?.color)
    : nowColor;

  const nowRank = colorRank(nowColor);
  const futureRank = colorRank(futureColor);

  if (futureRank < nowRank) return 'improving';
  if (futureRank > nowRank) return 'worsening';
  return 'stable';
}

// ─── MAIN NARRATIVE GENERATOR ─────────────────────────────────────────────────

/**
 * Generates a natural-language traffic forecast paragraph.
 * The output changes based on time phase, weather, and route trend.
 * 
 * @param {object} bestRoute - Highest-ranked processed route
 * @param {number} departureMins - Departure offset in minutes (0 = now)
 * @param {object} weather - Current weather { code, temp, rain }
 * @returns {string} A plain-English summary paragraph
 */
export function generateTrafficNarrative(bestRoute, departureMins, weather) {
  if (!bestRoute) return '';

  const now = new Date();
  const futureTime = new Date(now.getTime() + departureMins * 60000);

  const nowFactor = getTimeTrafficFactor(now);
  const futureFactor = getTimeTrafficFactor(futureTime);
  const futureTransition = getTransitionMultiplier(futureTime);
  const nowTransition = getTransitionMultiplier(now);

  const nowColor = bestRoute.predictions?.[0]?.color ?? COLORS.primary;
  const futureColor = (departureMins <= 7)
    ? nowColor
    : (departureMins <= 22 ? bestRoute.predictions?.[15]?.color : bestRoute.predictions?.[30]?.color)
    ?? nowColor;

  const trend = detectTrend(bestRoute, departureMins);

  // Use time + departure as seed for phrase variation
  const seed = now.getHours() * 100 + now.getMinutes() + departureMins;

  const sentences = [];

  // 1. CURRENT CONDITIONS
  sentences.push(currentConditionPhrase(nowColor, seed));

  // 2. FUTURE CHANGE (only if departure is in the future)
  if (departureMins > 0) {
    const approachingPeak = futureTransition > 1.2 && nowTransition < 1.2;
    const leavingPeak = nowTransition > 1.2 && futureTransition < 1.1;
    const atPeak = futureTransition >= 1.4;

    if (atPeak && futureFactor > 0.7) {
      sentences.push(pick(FUTURE_RUSH_PEAK, seed + 1));
    } else if (approachingPeak) {
      sentences.push(pick(FUTURE_RUSH_APPROACH, seed + 2));
    } else if (leavingPeak || (futureFactor < nowFactor - 0.15)) {
      sentences.push(pick(FUTURE_CLEARING, seed + 3));
    } else if (colorRank(futureColor) === 0) {
      sentences.push(pick(FUTURE_STABLE_CLEAR, seed + 4));
    } else {
      sentences.push(pick(FUTURE_STABLE_MODERATE, seed + 5));
    }
  }

  // 3. WEATHER CONTEXT
  const wPhrase = weatherPhrase(weather, departureMins, seed + 6);
  sentences.push(wPhrase);

  // 4. ROUTE REASONING (for departure > now)
  if (departureMins > 0 && bestRoute.corridorName) {
    const viaText = `The recommended route via ${bestRoute.corridorName}`;
    if (trend === 'improving') {
      sentences.push(`${viaText} — ${pick(ROUTE_REASON_IMPROVING, seed + 7)}`);
    } else if (trend === 'worsening') {
      sentences.push(`${viaText} — ${pick(ROUTE_REASON_WORSENING, seed + 8)}`);
    } else {
      sentences.push(`${viaText} — ${pick(ROUTE_REASON_BEST, seed + 9)}`);
    }
  } else if (departureMins === 0) {
    sentences.push(pick(ROUTE_REASON_BEST, seed + 9));
  }

  return sentences.join(' ');
}
