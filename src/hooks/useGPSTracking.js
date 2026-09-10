import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

const DEFAULT_COORDS = { lat: -20.1706, lon: 28.5583 };

/**
 * Custom hook for GPS location tracking.
 *
 * Manages:
 * - Location permissions
 * - Continuous position watching (2s interval, 10m distance)
 * - Origin mode switching (GPS vs manual)
 * - GPS coordinate state
 *
 * @param {Function} onLocationUpdate - Callback fired on each GPS update with { lat, lon }
 * @returns {object} GPS tracking state and controls
 */
export function useGPSTracking(onLocationUpdate) {
  const [originMode, setOriginMode] = useState('gps');       // 'gps' | 'manual'
  const originModeRef = useRef('gps');
  const [gpsCoords, setGpsCoords] = useState(DEFAULT_COORDS);
  const [originCoords, setOriginCoords] = useState(null);
  const locationSubscription = useRef(null);

  // Keep ref in sync so the watcher callback reads the latest mode
  useEffect(() => {
    originModeRef.current = originMode;
  }, [originMode]);

  useEffect(() => {
    let sub;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission is required for navigation.");
        return;
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          const newCoords = { lat: latitude, lon: longitude };

          setGpsCoords(newCoords);

          if (originModeRef.current === 'gps') {
            setOriginCoords(newCoords);
          }

          // Notify parent (e.g. to update blue dot on map)
          onLocationUpdate?.(latitude, longitude);
        }
      );
      locationSubscription.current = sub;
    })();

    return () => {
      sub?.remove();
    };
  }, []); // Empty deps — watcher runs for the app's lifetime

  return {
    gpsCoords,
    originCoords,
    setOriginCoords,
    originMode,
    setOriginMode,
    DEFAULT_COORDS,
  };
}
