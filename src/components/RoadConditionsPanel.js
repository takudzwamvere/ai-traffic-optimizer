import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const SEVERITY_CONFIG = {
  heavy:    { label: 'Congested',  color: COLORS.danger,  icon: 'alert-triangle', bg: '#FFF0F0' },
  moderate: { label: 'Moderate',   color: COLORS.warning, icon: 'alert-circle',   bg: '#FFFBF0' },
  clear:    { label: 'Clear',      color: COLORS.primary, icon: 'check-circle',   bg: '#F0FFF4' },
};

const RoadRow = ({ road }) => {
  const config = SEVERITY_CONFIG[road.severity] || SEVERITY_CONFIG.clear;
  return (
    <View style={[styles.roadRow, { backgroundColor: config.bg }]}>
      <View style={styles.roadInfo}>
        <View style={styles.nameRow}>
          <Feather name={config.icon} size={14} color={config.color} />
          <Text style={styles.roadName} numberOfLines={1}>{road.roadName}</Text>
        </View>
        <Text style={styles.speedText}>
          {road.predictedSpeed} / {road.baseSpeed} km/h
        </Text>
      </View>
      <View style={styles.badgeArea}>
        <View style={[styles.badge, { backgroundColor: config.color }]}>
          <Text style={styles.badgeText}>{config.label}</Text>
        </View>
        {road.delayMinutes > 0.1 && (
          <Text style={styles.delayText}>+{road.delayMinutes.toFixed(1)}m</Text>
        )}
      </View>
    </View>
  );
};

export default function RoadConditionsPanel({ roadConditions = [], visible = false }) {
  if (!visible || roadConditions.length === 0) return null;

  const heavy = roadConditions.filter(r => r.severity === 'heavy');
  const moderate = roadConditions.filter(r => r.severity === 'moderate');
  const clear = roadConditions.filter(r => r.severity === 'clear');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="activity" size={16} color={COLORS.text} />
        <Text style={styles.headerText}>
          {roadConditions.length} Roads Monitored
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {heavy.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>
              Congested ({heavy.length})
            </Text>
            {heavy.map((road, i) => <RoadRow key={`h-${i}`} road={road} />)}
          </View>
        )}

        {moderate.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.warning }]}>
              Moderate ({moderate.length})
            </Text>
            {moderate.map((road, i) => <RoadRow key={`m-${i}`} road={road} />)}
          </View>
        )}

        {clear.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>
              Clear ({clear.length})
            </Text>
            {clear.map((road, i) => <RoadRow key={`c-${i}`} road={road} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 220,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  scroll: {
    maxHeight: 190,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  roadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  roadInfo: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roadName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  speedText: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    marginLeft: 20,
  },
  badgeArea: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  delayText: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    fontWeight: '600',
  },
});
