import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function WeatherWidget({ weather }) {
  if (!weather) return null;

  // Weather Codes (WMO) -> Icons & Text
  // 0: Clear, 1-3: Cloudy, 45-48: Fog, 51-55: Drizzle, 61-65: Rain, 71-77: Snow, 80-82: Showers, 95+: Storm
  let iconName = 'sun';
  let label = 'Clear';
  let color = '#FFA500'; // Orange Sun

  const { code, temp } = weather;

  if (code >= 95) {
    iconName = 'cloud-lightning';
    label = 'Storm';
    color = COLORS.danger;
  } else if (code >= 61 || (code >= 80 && code <= 82)) {
    iconName = 'cloud-rain';
    label = 'Rain';
    color = '#4A90E2';
  } else if (code >= 51) {
    iconName = 'cloud-drizzle';
    label = 'Drizzle';
    color = '#87CEEB';
  } else if (code >= 45) {
    iconName = 'menu'; // Fog representation
    label = 'Foggy';
    color = '#B0C4DE';
  } else if (code >= 1) {
    iconName = 'cloud';
    label = 'Cloudy';
    color = '#A9A9A9';
  }

  return (
    <View style={styles.container}>
      <Feather name={iconName} size={18} color={color} style={{ marginRight: 6 }} />
      <Text style={styles.text}>{label} {Math.round(temp)}°C</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 110, // Below Search Bar
    left: 20,
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 5,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  }
});
