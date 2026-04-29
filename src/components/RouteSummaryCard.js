import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function RouteSummaryCard({ route, departureMins, weather, roadConditions, bottomOffset }) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideAnim.setValue(50);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [route]);

  if (!route) return null;

  const currentData = route.predictions ? (
    departureMins <= 7 ? route.predictions[0] :
    departureMins <= 22 ? route.predictions[15] :
    route.predictions[30]
  ) : null;

  if (!currentData) return null;

  const delayMins = Math.round((currentData.totalDelay || 0) / 60);

  // Active conditions parsing
  const conditions = [];
  if (route.uiReason?.includes('Peak')) conditions.push('Evening peak');
  if (weather) {
    if (weather.code >= 95) conditions.push('Storm conditions');
    else if (weather.code >= 61 || weather.rain > 2.0) conditions.push('Heavy rain');
    else if (weather.code >= 51 || weather.rain > 0.5) conditions.push('Light rain');
  }
  if (roadConditions && roadConditions.some(r => r.incidentReason)) {
    conditions.push('Incident detected');
  }
  if (conditions.length === 0) conditions.push('Standard condition');

  // Overall Color badge calculation
  let badgeText = 'Clear';
  let badgeColor = COLORS.primary;
  
  const routeColor = currentData.color
    ? currentData.color.toLowerCase()
    : (route.uiColor || '').toLowerCase();
  
  if (routeColor.includes('warning') || routeColor === '#fbbc04' || routeColor === '#fb8c00') {
    badgeText = 'Moderate';
    badgeColor = '#FBBC04';
  } else if (routeColor.includes('danger') || routeColor === '#ea4335' || routeColor === '#ff3b30') {
    badgeText = 'Heavy';
    badgeColor = '#EA4335';
  }

  // Adjust Animated.View style dynamically
  // Ensures we handle the % strings vs number types correctly
  return (
    <Animated.View style={[
      styles.card, 
      { 
        bottom: bottomOffset, 
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim
      }
    ]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Feather name="cpu" size={16} color="#007AFF" />
          <Text style={styles.aiTitle}>AI Route Analysis</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
          <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View>
          <Text style={styles.metricLabel}>Predicted Travel Time</Text>
          <Text style={styles.metricValue}>{currentData.formattedDuration}</Text>
        </View>
        <View style={styles.divider} />
        <View>
          <Text style={styles.metricLabel}>AI Delay Parameter</Text>
          <Text style={[styles.metricValue, { color: delayMins > 0 ? '#EA4335' : COLORS.text }]}>
            {delayMins > 0 ? `+${delayMins} min` : 'None'}
          </Text>
        </View>
      </View>

      <View style={styles.conditionsBox}>
        {conditions.map((cond, idx) => (
          <View key={idx} style={styles.conditionPill}>
            <Text style={styles.conditionText}>{cond}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    zIndex: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#EEEEEE',
  },
  metricLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  conditionsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionPill: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  conditionText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },
});
