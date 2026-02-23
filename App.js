import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Alert, Keyboard, Platform, LayoutAnimation, UIManager, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from './src/constants/colors';

import locationData from './src/data/locations.json';
import MapLayer from './src/components/MapLayer';
import RoutePlanner from './src/components/RoutePlanner';
import RouteBottomSheet from './src/components/RouteBottomSheet';
import RoadConditionsPanel from './src/components/RoadConditionsPanel';
import NetworkStatus from './src/components/NetworkStatus';
import WeatherWidget from './src/components/WeatherWidget';
import ErrorBoundary from './src/components/ErrorBoundary';

import LoadingOverlay from './src/components/LoadingOverlay';
import { geocodeLocation, getRoute } from './src/services/trafficApi';

// Enable Animations
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const LOCATIONS = locationData;
const DEFAULT_COORDS = { lat: -20.1706, lon: 28.5583 };

function MainApp() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);

  // --- Dual-Location State ---
  const [originMode, setOriginMode] = useState('gps');       // 'gps' | 'manual'
  const [gpsCoords, setGpsCoords] = useState(DEFAULT_COORDS); // Always-updating GPS
  const [originCoords, setOriginCoords] = useState(null);     // Used for routing
  const [destinationCoords, setDestinationCoords] = useState(null);

  // --- Input Text State ---
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);

  // --- Route & Data State ---
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [weather, setWeather] = useState(null);
  const [roadConditions, setRoadConditions] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- UI State ---
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // --- Recent Searches ---
  const [recentSearches, setRecentSearches] = useState([]);

  // --- Refs ---
  const locationSubscription = useRef(null);

  // ==========================================
  // GPS Location Tracking
  // ==========================================
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission is required for navigation.");
        return;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          const newCoords = { lat: latitude, lon: longitude };

          // Always update GPS reference
          setGpsCoords(newCoords);

          // Only update routing origin if in GPS mode
          if (originMode === 'gps') {
            setOriginCoords(newCoords);
          }

          // Always update blue dot on map
          const script = `
            if (typeof setUserLocation === 'function') {
              setUserLocation(${latitude}, ${longitude});
            }
          `;
          webViewRef.current?.injectJavaScript(script);
        }
      );
    })();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [originMode]);

  // ==========================================
  // Network Connectivity
  // ==========================================
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // ==========================================
  // Autocomplete Filtering
  // ==========================================
  useEffect(() => {
    if (originQuery.length > 2) {
      const filtered = LOCATIONS.filter(loc =>
        loc.name.toLowerCase().includes(originQuery.toLowerCase())
      ).slice(0, 5);
      setOriginSuggestions(filtered);
    } else {
      setOriginSuggestions([]);
    }
  }, [originQuery]);

  useEffect(() => {
    if (destinationQuery.length > 2) {
      const filtered = LOCATIONS.filter(loc =>
        loc.name.toLowerCase().includes(destinationQuery.toLowerCase())
      ).slice(0, 5);
      setDestinationSuggestions(filtered);
    } else {
      setDestinationSuggestions([]);
    }
  }, [destinationQuery]);

  // ==========================================
  // Origin Selection
  // ==========================================
  const handleOriginSelect = (item) => {
    setOriginMode('manual');
    setOriginCoords({ lat: item.lat, lon: item.lon });
    setOriginQuery(item.name);
    setOriginSuggestions([]);
  };

  const handleUseMyLocation = () => {
    setOriginMode('gps');
    setOriginCoords(gpsCoords);
    setOriginQuery('');
    setOriginSuggestions([]);
  };

  // ==========================================
  // Destination Selection
  // ==========================================
  const handleDestinationSelect = (item) => {
    setDestinationCoords({ lat: item.lat, lon: item.lon });
    setDestinationQuery(item.name);
    setDestinationSuggestions([]);
  };

  // ==========================================
  // Swap Locations
  // ==========================================
  const swapLocations = () => {
    const tempCoords = originCoords;
    const tempQuery = originQuery || 'My Location';

    if (destinationCoords) {
      setOriginMode('manual');
      setOriginCoords(destinationCoords);
      setOriginQuery(destinationQuery);
    }

    if (tempCoords) {
      setDestinationCoords(tempCoords);
      setDestinationQuery(tempQuery === 'My Location' ? '' : tempQuery);
    }
  };

  // ==========================================
  // Route Search (CORE)
  // ==========================================
  const handleRouteSearch = async () => {
    Keyboard.dismiss();
    setOriginSuggestions([]);
    setDestinationSuggestions([]);

    // Resolve origin
    let resolvedOrigin = originCoords || gpsCoords;
    if (originMode === 'manual' && !originCoords && originQuery.length > 0) {
      const known = LOCATIONS.find(p => p.name.toLowerCase() === originQuery.toLowerCase());
      if (known) resolvedOrigin = { lat: known.lat, lon: known.lon };
      else resolvedOrigin = await geocodeLocation(originQuery);
    }

    // Resolve destination
    let resolvedDest = destinationCoords;
    if (!resolvedDest && destinationQuery.length > 0) {
      const known = LOCATIONS.find(p => p.name.toLowerCase() === destinationQuery.toLowerCase());
      if (known) resolvedDest = { lat: known.lat, lon: known.lon };
      else resolvedDest = await geocodeLocation(destinationQuery);
    }

    // --- Edge Cases ---
    if (!resolvedOrigin) {
      Alert.alert("Missing Origin", "Please enter a starting location or enable GPS.");
      return;
    }
    if (!resolvedDest) {
      Alert.alert("Missing Destination", "Please enter a destination.");
      return;
    }
    if (
      Math.abs(resolvedOrigin.lat - resolvedDest.lat) < 0.0005 &&
      Math.abs(resolvedOrigin.lon - resolvedDest.lon) < 0.0005
    ) {
      Alert.alert("Same Location", "Origin and destination are the same. Please choose a different destination.");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setRoutes([]);
    setSelectedRoute(null);
    setWeather(null);
    setRoadConditions([]);
    setIsSheetVisible(false);
    setIsSheetExpanded(false);

    try {
      const { routes: processedRoutes, weather: weatherData, roadConditions: conditions } = await getRoute(resolvedOrigin, resolvedDest);

      if (processedRoutes.length === 0) {
        Alert.alert("No Routes", "Could not find any routes between these locations. Try different locations.");
        setLoading(false);
        return;
      }

      setRoutes(processedRoutes);
      setWeather(weatherData);
      setRoadConditions(conditions || []);

      const best = processedRoutes[0];
      setSelectedRoute(best);
      setIsSheetVisible(true);

      // Draw segmented route on map
      drawRouteOnMap(best, resolvedDest);

      // Cache recent search
      if (destinationQuery) {
        setRecentSearches(prev => {
          const filtered = prev.filter(s => s.name !== destinationQuery);
          return [{ name: destinationQuery, coords: resolvedDest }, ...filtered].slice(0, 5);
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch routes. Please try again.");
    }

    setLoading(false);
  };

  // ==========================================
  // Draw Route on Map (with segments)
  // ==========================================
  const drawRouteOnMap = (route, dest) => {
    if (!route || !webViewRef.current) return;

    // Build segmented GeoJSON
    const currentPrediction = route.predictions?.[0];
    const segments = currentPrediction?.segments;

    const geoJson = {
      type: 'Feature',
      geometry: route.geometry,
      properties: segments ? { segments } : {},
    };

    const destLat = dest?.lat || route.geometry.coordinates[route.geometry.coordinates.length - 1][1];
    const destLon = dest?.lon || route.geometry.coordinates[route.geometry.coordinates.length - 1][0];

    const script = `drawRoute(${JSON.stringify(geoJson)}, ${destLat}, ${destLon}, '${route.uiColor}'); true;`;
    webViewRef.current.injectJavaScript(script);
  };

  // ==========================================
  // Route Selection
  // ==========================================
  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    if (route && route.geometry && route.geometry.coordinates) {
      const coords = route.geometry.coordinates;
      const dest = {
        lat: coords[coords.length - 1][1],
        lon: coords[coords.length - 1][0],
      };
      drawRouteOnMap(route, dest);
    }
  };

  // ==========================================
  // UI Helpers
  // ==========================================
  const toggleSheet = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSheetExpanded(!isSheetExpanded);
  };

  const handleLocateMe = () => {
    const script = `
      if (typeof map !== 'undefined') {
        map.setView([${gpsCoords.lat}, ${gpsCoords.lon}], 16, { animate: true, duration: 0.5 });
      }
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  // ==========================================
  // Render
  // ==========================================
  // Recent search quick-select handler
  const handleRecentSelect = useCallback((item) => {
    setDestinationQuery(item.name);
    setDestinationCoords(item.coords);
    setDestinationSuggestions([]);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <NetworkStatus style={{ top: insets.top + 10 }} />

      <MapLayer
        ref={webViewRef}
        origin={gpsCoords}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(`setUserLocation(${gpsCoords.lat}, ${gpsCoords.lon}); true;`);
        }}
      />

      {/* WEATHER WIDGET — positioned dynamically below RoutePlanner */}
      <WeatherWidget weather={weather} topOffset={insets.top + 185} />



      {/* LOADING OVERLAY (during search) */}
      <LoadingOverlay visible={loading} />

      {/* LOCATE ME FAB */}
      <TouchableOpacity
        style={[styles.locateFab, { bottom: isSheetVisible ? (isSheetExpanded ? '70%' : 260) : 100 }]}
        onPress={handleLocateMe}
        activeOpacity={0.85}
      >
        <MaterialIcons name="my-location" size={22} color="#fff" />
        <Text style={styles.locateFabText}>Locate Me</Text>
      </TouchableOpacity>

      {/* ROUTE PLANNER */}
      <RoutePlanner
        originQuery={originQuery}
        setOriginQuery={setOriginQuery}
        destinationQuery={destinationQuery}
        setDestinationQuery={setDestinationQuery}
        originSuggestions={originSuggestions}
        destinationSuggestions={destinationSuggestions}
        onOriginSelect={handleOriginSelect}
        onDestinationSelect={handleDestinationSelect}
        onUseMyLocation={handleUseMyLocation}
        onSwap={swapLocations}
        onSearch={handleRouteSearch}
        loading={loading}
        isConnected={isConnected}
        topInset={insets.top}
        recentSearches={recentSearches}
        onRecentSelect={handleRecentSelect}
      />

      {/* BOTTOM SHEET */}
      <RouteBottomSheet
        selectedRoute={selectedRoute}
        isSheetVisible={isSheetVisible}
        isSheetExpanded={isSheetExpanded}
        toggleSheet={toggleSheet}
        routes={routes}
        handleRouteSelect={handleRouteSelect}
      >
        <RoadConditionsPanel
          roadConditions={roadConditions}
          visible={isSheetExpanded}
        />
      </RouteBottomSheet>
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <MainApp />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  locateFab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
    gap: 8,
  },
  locateFabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});