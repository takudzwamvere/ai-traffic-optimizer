import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getTimeTrafficFactor } from '../utils/trafficEngine';

/**
 * Generate a plain-English traffic forecast summary.
 * Uses: best route's label, corridor name, time factor, weather, departure offset.
 * NOT hardcoded — text is assembled dynamically from route data.
 */
function generateSummary(bestRoute, departureMins, weather) {
  if (!bestRoute) return null;

  const now = new Date();
  const futureTime = new Date(now.getTime() + departureMins * 60000);
  const futureFactor = getTimeTrafficFactor(futureTime);
  const nowFactor = getTimeTrafficFactor(now);

  // Build time phrase
  let timePhrase;
  if (departureMins === 0) {
    timePhrase = 'If you leave now';
  } else if (departureMins < 60) {
    timePhrase = `If you leave in ${departureMins} minutes`;
  } else {
    const h = Math.floor(departureMins / 60);
    const m = departureMins % 60;
    timePhrase = `If you leave in ${h}h ${m > 0 ? `${m}m` : ''}`.trim();
  }

  // Route via phrase
  const viaPhrase = bestRoute.corridorName
    ? `, the fastest route via ${bestRoute.corridorName}`
    : ', the fastest available route';

  // Congestion description for best route
  let bestCondition;
  if (bestRoute.uiColor === COLORS.primary) {
    bestCondition = 'is expected to have clear roads with minimal delays';
  } else if (bestRoute.uiColor === COLORS.warning) {
    bestCondition = 'may experience moderate congestion, adding a few minutes to your trip';
  } else {
    bestCondition = 'is expected to face heavy traffic';
  }

  // Peak hour warning
  let peakNote = '';
  const isPeakNow = nowFactor >= 0.85;
  const isPeakFuture = futureFactor >= 0.85;
  const trafficimp = futureFactor > nowFactor;

  if (departureMins > 0 && isPeakFuture && !isPeakNow) {
    peakNote = ' Rush hour will be in effect by your planned departure, so alternative routes may face heavy congestion.';
  } else if (departureMins > 0 && isPeakNow && !isPeakFuture) {
    peakNote = ' Traffic is expected to ease significantly by the time you plan to leave.';
  } else if (trafficimp && futureFactor > 0.7) {
    peakNote = ' Congestion on alternative routes may worsen as more traffic builds up.';
  }

  // Weather note
  let weatherNote = '';
  if (weather) {
    if (weather.code >= 95) {
      weatherNote = ' ⚠️ Storm conditions are active — all routes will be significantly slower than usual.';
    } else if (weather.code >= 61 || weather.rain > 2.0) {
      weatherNote = ' Rain is reducing speeds across all routes. Allow extra time.';
    } else if (weather.code >= 51 || weather.rain > 0.5) {
      weatherNote = ' Light drizzle may slightly reduce speeds on narrow roads.';
    }
  }

  // Confidence note
  const confidence = bestRoute.confidenceLevel ? ` (${bestRoute.confidenceLevel}% confidence)` : '';

  return `${timePhrase}${viaPhrase} ${bestCondition}${confidence}.${peakNote}${weatherNote}`;
}

/**
 * TrafficForecastSummary
 * 
 * Displays a dynamic plain-language summary of expected traffic conditions
 * for the user's selected departure time. Text is generated from live route
 * and engine data — nothing is hardcoded.
 */
export default function TrafficForecastSummary({ routes, departureMins, weather }) {
  const bestRoute = routes?.[0];
  const summary = generateSummary(bestRoute, departureMins, weather);

  if (!summary) return null;

  const iconColor = bestRoute?.uiColor || COLORS.primary;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Feather name="cpu" size={14} color={iconColor} />
        <Text style={styles.headerText}>AI Traffic Forecast</Text>
        <View style={[styles.badge, { backgroundColor: iconColor + '22' }]}>
          <Text style={[styles.badgeText, { color: iconColor }]}>
            {departureMins === 0 ? 'Live' : `+${departureMins}m`}
          </Text>
        </View>
      </View>
      <Text style={styles.summaryText}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EDF8',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryText: {
    fontSize: 13.5,
    color: '#333',
    lineHeight: 21,
    fontWeight: '400',
  },
});
