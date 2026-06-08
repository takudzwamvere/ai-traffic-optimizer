import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function NetworkStatus(props) {
  const [isConnected, setIsConnected] = useState(true);
  const [slideAnim] = useState(new Animated.Value(-50)); // Start off-screen

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      // NetInfo sometimes returns null for isInternetReachable initially, treat null as true to avoid false positive
      const status = state.isConnected && (state.isInternetReachable !== false);
      setIsConnected(status);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isConnected) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }, props.style]}>
      <Feather name="wifi-off" size={15} color="white" style={{ marginRight: 8 }} />
      <Text style={styles.text}>No Connection. Off-line backups active.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Below status bar
    left: 20,
    right: 20,
    backgroundColor: COLORS.danger,
    padding: 10,
    borderRadius: 8,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  }
});
