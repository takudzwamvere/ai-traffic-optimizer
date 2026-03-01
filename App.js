import profileData from './src/data/locations.json'; // using this to offset line diff safely
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Alert, Keyboard, Platform, LayoutAnimation, UIManager, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { MaterialIcons, Feather } from '@expo/vector-icons';
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
import MapLoadingOverlay from './src/components/MapLoadingOverlay';
import AuthScreen from './src/components/AuthScreen';
import ProfileScreen from './src/components/ProfileScreen';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { geocodeLocation, getRoute } from './src/services/trafficApi';
import { saveSearch, getSearchHistory, getProfile } from './src/services/dataService';

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
  const { user } = useAuth();

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
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [mapTilesLoaded, setMapTilesLoaded] = useState(false);

  // --- Departure Planning State ---
  const [departureMins, setDepartureMins] = useState(0);

  // --- Recent Searches (Supabase-backed) ---
  const [recentSearches, setRecentSearches] = useState([]);

  // --- Profile Avatar (for tab bar) ---
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);

  const loadProfileAvatar = useCallback(async () => {
    if (!user?.id) return;
    const p = await getProfile(user.id);
    console.log('[Avatar] getProfile returned:', JSON.stringify(p));
    setProfileAvatarUrl(p?.avatar_url || null);
  }, [user?.id]);

  useEffect(() => {
    loadProfileAvatar();
  }, [loadProfileAvatar]);

  // --- Refs ---
  const locationSubscription = useRef(null);

  // ==========================================
  // Load search history from Supabase on mount
  // ==========================================
  useEffect(() => {
    if (user?.id) {
      getSearchHistory(user.id, 5).then(history => {
        const recent = history.map(h => ({
          name: h.destination_name,
          coords: { lat: h.dest_lat, lon: h.dest_lon },
          searchedAt: h.searched_at,
        }));
        setRecentSearches(recent);
      }).catch(() => {});
    }
  }, [user?.id]);

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
      // Pass origin/destination names for corridor matching
      const originName = originQuery || 'My Location';
      const destName = destinationQuery;

      const { routes: processedRoutes, weather: weatherData, roadConditions: conditions } = await getRoute(
        resolvedOrigin, resolvedDest, originName, destName
      );

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

      // Save search to Supabase and update local recent searches
      if (destinationQuery && user?.id) {
        saveSearch(user.id, {
          originName: originName,
          destinationName: destName,
          originLat: resolvedOrigin.lat,
          originLon: resolvedOrigin.lon,
          destLat: resolvedDest.lat,
          destLon: resolvedDest.lon,
          routeCount: processedRoutes.length,
          bestDurationMin: best.predictions?.[0]?.duration || 0,
        }).catch(() => {}); // fire-and-forget

        // Update local cache
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
  const drawRouteOnMap = (route, dest, offsetMins = 0) => {
    if (!route || !webViewRef.current) return;

    // Build segmented GeoJSON — use the departure offset bucket
    let segments;
    if (offsetMins <= 7)  segments = route.predictions?.[0]?.segments;
    else if (offsetMins <= 22) segments = route.predictions?.[15]?.segments;
    else segments = route.predictions?.[30]?.segments;

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
      drawRouteOnMap(route, dest, departureMins);
    }
  };

  // ==========================================
  // Departure Time Change Handler
  // ==========================================
  const handleDepartureChange = (mins) => {
    setDepartureMins(mins);
    // Redraw the map with future traffic colors
    if (selectedRoute) {
      const coords = selectedRoute.geometry?.coordinates;
      const dest = coords ? { lat: coords[coords.length - 1][1], lon: coords[coords.length - 1][0] } : null;
      drawRouteOnMap(selectedRoute, dest, mins);
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
      <StatusBar style="dark" translucent backgroundColor="transparent" />


      <MapLayer
        ref={webViewRef}
        origin={gpsCoords}
        onTilesLoaded={() => setMapTilesLoaded(true)}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(`setUserLocation(${gpsCoords.lat}, ${gpsCoords.lon}); true;`);
        }}
      />

      {/* MAP LOADING OVERLAY — real tile-load detection via Leaflet event */}
      <MapLoadingOverlay visible={!mapTilesLoaded} />

      {/* WEATHER WIDGET — below RoutePlanner card */}
      <WeatherWidget weather={weather} topOffset={insets.top + 260} />

      {/* LOADING OVERLAY (during search) */}
      <LoadingOverlay visible={loading} />

      {/* LOCATE ME FAB */}
      <TouchableOpacity
        style={[styles.locateFab, { bottom: isSheetVisible ? (isSheetExpanded ? '70%' : 260) : 80 }]}
        onPress={handleLocateMe}
        activeOpacity={0.85}
      >
        <MaterialIcons name="my-location" size={22} color="#fff" />
        <Text style={styles.locateFabText}>Locate Me</Text>
      </TouchableOpacity>

      {/* ROUTE PLANNER — floating card below status bar */}
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
        recentSearches={recentSearches}
        onRecentSelect={handleRecentSelect}
        topInset={insets.top}
      />

      {/* BOTTOM SHEET */}
      <RouteBottomSheet
        selectedRoute={selectedRoute}
        isSheetVisible={isSheetVisible}
        isSheetExpanded={isSheetExpanded}
        toggleSheet={toggleSheet}
        routes={routes}
        handleRouteSelect={handleRouteSelect}
        departureMins={departureMins}
        onDepartureChange={handleDepartureChange}
        weather={weather}
      >
        <RoadConditionsPanel
          roadConditions={roadConditions}
          visible={isSheetExpanded}
        />
      </RouteBottomSheet>

      {/* PROFILE MODULE */}
      <ProfileScreen 
        visible={isProfileVisible} 
        onClose={() => {
          setIsProfileVisible(false);
          loadProfileAvatar(); // Refresh avatar in tab bar after editing
        }} 
      />

      {/* BOTTOM TAB BAR — respects home indicator on iPhone */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => {}}>
          <Feather name="map" size={24} color={COLORS.primary} />
          <Text style={[styles.tabText, styles.tabTextActive]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setIsProfileVisible(true)}>
          {profileAvatarUrl ? (
            <Image
              source={{ uri: profileAvatarUrl }}
              style={styles.tabAvatar}
              onError={(e) => {
                console.warn('[Avatar] Image failed to load:', e.nativeEvent.error);
                setProfileAvatarUrl(null); // fall back to icon
              }}
            />
          ) : (
            <Feather name="user" size={24} color="#999" />
          )}
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Auth gate — show AuthScreen if not logged in
function AuthGate() {
  const { isAuthenticated, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return isAuthenticated ? <MainApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A1628',
  },
  loadingText: {
    color: '#6B7B9A',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8ECF0',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
  tabAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
});