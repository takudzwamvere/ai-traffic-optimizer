import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { generateTrafficNarrative, detectTrend } from '../utils/trafficNarrativeEngine';

/**
 * TrafficForecastSummary
 * 
 * Displays an AI-generated plain-English traffic forecast.
 * The narrative is produced by trafficNarrativeEngine.js —
 * it varies based on time of day, rush-hour phase, weather,
 * route speed trends, and departure offset.
 * 
 * Nothing is hardcoded. Every sentence is context-selected
 * from phrase pools seeded by the current situation.
 */
export default function TrafficForecastSummary({ routes, departureMins, weather }) {
  const bestRoute = routes?.[0];
  if (!bestRoute) return null;

  const narrative = generateTrafficNarrative(bestRoute, departureMins, weather);
  if (!narrative) return null;

  const trend = detectTrend(bestRoute, departureMins);

  // Badge styling by trend
  const trendConfig = {
    improving: { label: '↑ Improving', color: COLORS.primary, bg: '#E8F5E9' },
    worsening: { label: '↓ Worsening', color: COLORS.danger, bg: '#FFEBEE' },
    stable:    { label: '→ Stable',    color: '#777',          bg: '#F5F5F5' },
  };
  const tc = trendConfig[trend] ?? trendConfig.stable;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Feather name="cpu" size={14} color={COLORS.primary} />
        <Text style={styles.headerText}>AI Traffic Forecast</Text>
        <View style={[styles.trendBadge, { backgroundColor: tc.bg }]}>
          <Text style={[styles.trendText, { color: tc.color }]}>{tc.label}</Text>
        </View>
        <View style={[styles.timeBadge, { backgroundColor: '#EEF2FF' }]}>
          <Text style={styles.timeBadgeText}>
            {departureMins === 0 ? 'Live' : `+${departureMins}m`}
          </Text>
        </View>
      </View>
      <Text style={styles.narrativeText}>{narrative}</Text>
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
    flexWrap: 'wrap',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    flex: 1,
  },
  trendBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007AFF',
  },
  narrativeText: {
    fontSize: 13.5,
    color: '#333',
    lineHeight: 21,
    fontWeight: '400',
  },
});
