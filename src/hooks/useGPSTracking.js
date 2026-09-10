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

  const onLocationUpdateRef = useRef(onLocationUpdate);
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onLocationUpdate]);

  useEffect(() => {
    let isMounted = true;
    let sub;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;

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
            if (!isMounted) return;
            const { latitude, longitude } = location.coords;
            const newCoords = { lat: latitude, lon: longitude };

            setGpsCoords(newCoords);

            if (originModeRef.current === 'gps') {
              setOriginCoords(newCoords);
            }

            // Notify parent (e.g. to update blue dot on map)
            onLocationUpdateRef.current?.(latitude, longitude);
          }
        );

        if (!isMounted) {
          sub?.remove();
          return;
        }
        locationSubscription.current = sub;
      } catch (err) {
        console.warn('[GPSTracking] Failed to start location watcher:', err);
      }
    })();

    return () => {
      isMounted = false;
      sub?.remove();
      locationSubscription.current?.remove();
      locationSubscription.current = null;
    };
  }, []); // Empty deps — watcher runs for the component's lifetime

  return {
    gpsCoords,
    originCoords,
    setOriginCoords,
    originMode,
    setOriginMode,
    DEFAULT_COORDS,
  };
}
