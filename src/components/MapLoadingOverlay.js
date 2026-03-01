import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * MapLoadingOverlay
 * 
 * Displayed when the app first launches and Leaflet is downloading map tiles.
 * Disappears once the WebView posts a MAP_TILES_LOADED message to React Native.
 * This is real — it is tied to actual tile loading events in Leaflet, not a timer.
 */
export default function MapLoadingOverlay({ visible }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const prevVisible = useRef(true);

  useEffect(() => {
    if (prevVisible.current && !visible) {
      // Fade out smoothly
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
    prevVisible.current = visible;
  }, [visible, opacity]);

  // Once fully faded out, don't render at all
  if (!visible && prevVisible.current === false) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      <View style={styles.card}>
        <Feather name="map" size={28} color="#007AFF" style={styles.icon} />
        <Text style={styles.title}>Preparing Your Map</Text>
        <Text style={styles.subtitle}>Loading live map data for your location...</Text>
        <ActivityIndicator size="small" color="#007AFF" style={styles.spinner} />
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(240, 245, 255, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    width: '78%',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7B9A',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  spinner: {
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: '#EEF2FF',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    width: '70%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
});
