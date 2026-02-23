import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

const ShimmerBar = ({ width, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.shimmerBar, { width, opacity: anim }]} />
  );
};

export default function LoadingOverlay({ visible }) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Feather name="loader" size={18} color="#007AFF" />
          <Text style={styles.headerText}>Finding best routes...</Text>
        </View>

        <View style={styles.shimmerGroup}>
          <ShimmerBar width="85%" delay={0} />
          <ShimmerBar width="65%" delay={200} />
          <ShimmerBar width="75%" delay={400} />
        </View>

        <Text style={styles.subtext}>Analyzing traffic, weather & road conditions</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 15,
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  shimmerGroup: {
    gap: 10,
    marginBottom: 14,
  },
  shimmerBar: {
    height: 12,
    backgroundColor: '#E8F0FE',
    borderRadius: 6,
  },
  subtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },
});
