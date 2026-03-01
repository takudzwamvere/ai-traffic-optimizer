import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

/**
 * Determine traffic trend by comparing current vs future predicted route color.
 * Colors: COLORS.primary (green) = good, COLORS.warning (yellow) = moderate, COLORS.danger (red) = bad
 */
function getTrend(nowColor, futureColor) {
  const rank = {
    [COLORS.primary]: 0,   // green = best
    [COLORS.warning]: 1,   // yellow = moderate
    [COLORS.danger]: 2,    // red = worst
  };

  const nowRank = rank[nowColor] ?? 0;
  const futureRank = rank[futureColor] ?? 0;

  if (futureRank < nowRank) return 'improving';
  if (futureRank > nowRank) return 'worsening';
  return 'stable';
}

const TREND_CONFIG = {
  improving: {
    icon: 'trending-up',
    label: 'Improving',
    color: COLORS.primary,
    bg: '#E8F5E9',
  },
  worsening: {
    icon: 'trending-down',
    label: 'Worsening',
    color: COLORS.danger,
    bg: '#FFEBEE',
  },
  stable: {
    icon: 'minus',
    label: 'Stable',
    color: '#777',
    bg: '#F5F5F5',
  },
};

/**
 * TrafficTrendIndicator
 * 
 * Compares current traffic color vs future departure traffic color to show
 * whether conditions are improving, worsening, or stable.
 * 
 * Props:
 *  - nowColor: the current route UI color (COLORS.primary/warning/danger)
 *  - futureColor: the predicted route UI color at the departure offset
 *  - departureMins: number of minutes until departure (0 = now)
 */
export default function TrafficTrendIndicator({ nowColor, futureColor, departureMins }) {
  // Only show indicator when a future departure is selected
  if (!nowColor || departureMins === 0) return null;

  const trend = getTrend(nowColor, futureColor || nowColor);
  const config = TREND_CONFIG[trend];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Feather name={config.icon} size={13} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
