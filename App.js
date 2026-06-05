import locationData from './src/data/locations.json';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Alert, Keyboard, Platform, LayoutAnimation, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { COLORS } from './src/constants/colors';

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
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { processAndRankRoutes } from './src/utils/routeHelpers';
import { getCurrentWeather } from './src/services/weatherApi';
import { saveSearch, getSearchHistory, getProfile } from './src/services/dataService';
import { initMLEngine } from './src/services/mlOptimization';


const LOCATIONS = locationData;
const DEFAULT_COORDS = { lat: -20.1706, lon: 28.5583 };

function MainApp() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const { user } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const c = theme.colors;

  // --- Dual-Location State ---
  const [originMode, setOriginMode] = useState('gps');       // 'gps' | 'manual'
  // Ref so the GPS watcher callback always reads the latest mode without re-subscribing
  const originModeRef = useRef('gps');
  const [gpsCoords, setGpsCoords] = useState(DEFAULT_COORDS); // Always-updating GPS
  const [originCoords, setOriginCoords] = useState(null);     // Used for routing
  const [destinationCoords, setDestinationCoords] = useState(null);
  // True while we're waiting for Google to geocode a typed origin (replaces implicit 'typing' mode)
  const [isFetchingOriginCoords, setIsFetchingOriginCoords] = useState(false);

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
  const [singleRouteMessage, setSingleRouteMessage] = useState(null);

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

  // Inject new map style whenever the theme changes
  useEffect(() => {
    if (webViewRef.current && theme.mapStyle) {
      const js = `applyMapStyle(${JSON.stringify(JSON.stringify(theme.mapStyle))}); true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [theme.key]);

  // --- Refs ---
  const locationSubscription = useRef(null);
  // Flags to prevent autocomplete from re-firing after the user selects a suggestion
  const skipOriginAutocomplete = useRef(false);
  const skipDestAutocomplete = useRef(false);

  // ==========================================
  // Safe WebView messaging (avoids JS string injection)
  // ==========================================
  // Instead of building JS strings with user input, we post a typed JSON
  // message and let the WebView dispatch it to the right function.
  const sendToWebView = useCallback((msg) => {
    const js = `
      (function(){
        var e = new MessageEvent('message', { data: ${JSON.stringify(JSON.stringify(msg))} });
        window.dispatchEvent(e);
      })(); true;
    `;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  // ==========================================
  // Initialise ML engine on mount (loads learned corridor weights)
  // ==========================================
  useEffect(() => {
    initMLEngine().catch(e => console.warn('[ML] Failed to initialise:', e));
  }, []);

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
      }).catch(() => { });
    }
  }, [user?.id]);

  // ==========================================
  // GPS Location Tracking
  // ==========================================
  // Keep originModeRef in sync so the watcher callback can read the latest
  // value without the effect needing originMode as a dependency.
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

          // Always update GPS reference
          setGpsCoords(newCoords);

          // Read the latest mode via ref — no re-subscription needed
          if (originModeRef.current === 'gps') {
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
      locationSubscription.current = sub;
    })();

    return () => {
      sub?.remove();
    };
  }, []); // Empty deps — watcher runs for the app's lifetime

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
  // Autocomplete — Google Places Webview integration
  // ==========================================
  useEffect(() => {
    // Skip if this change came from selecting a suggestion (not user typing)
    if (skipOriginAutocomplete.current) {
      skipOriginAutocomplete.current = false;
      return;
    }
    if (originQuery.length > 2 && originQuery !== "My Location") {
      // Safe: query sent as JSON data, never interpolated into JS
      sendToWebView({ type: 'AUTOCOMPLETE', query: originQuery, reqId: 'from' });
    } else {
      setOriginSuggestions([]);
    }
  }, [originQuery, sendToWebView]);

  useEffect(() => {
    // Skip if this change came from selecting a suggestion (not user typing)
    if (skipDestAutocomplete.current) {
      skipDestAutocomplete.current = false;
      return;
    }
    if (destinationQuery.length > 2) {
      // Safe: query sent as JSON data, never interpolated into JS
      sendToWebView({ type: 'AUTOCOMPLETE', query: destinationQuery, reqId: 'to' });
    } else {
      setDestinationSuggestions([]);
    }
  }, [destinationQuery, sendToWebView]);

  const handleAutocompleteResult = (data) => {
    if (data.reqId === 'from') setOriginSuggestions(data.results);
    if (data.reqId === 'to') setDestinationSuggestions(data.results);
  };

  const handlePlaceDetailsResult = (data) => {
    if (data.error) {
      Alert.alert("Google Maps Error", "Could not fetch coordinates: " + data.error);
      return;
    }
    if (data.reqId === 'from' && data.coords) {
      setOriginMode('manual');
      setOriginCoords(data.coords);
      setIsFetchingOriginCoords(false); // Geocoding complete
    }
    if (data.reqId === 'to' && data.coords) {
      setDestinationCoords(data.coords);
    }
  };

  // ==========================================
  // Origin Selection
  // ==========================================
  const handleOriginSelect = (item) => {
    skipOriginAutocomplete.current = true; // Prevent autocomplete from re-firing
    setOriginQuery(item.name);
    setOriginSuggestions([]);
    setOriginMode('manual');
    if (item.placeId) {
      setOriginCoords(null); // Clear while fetching
      setIsFetchingOriginCoords(true);
      // Safe: placeId is an opaque Google-issued string but we still avoid interpolation
      sendToWebView({ type: 'PLACE_DETAILS', placeId: item.placeId, reqId: 'from' });
    } else if (item.coords) {
      setOriginCoords(item.coords);
      setIsFetchingOriginCoords(false);
    }
  };

  const handleUseMyLocation = () => {
    setOriginMode('gps');
    setOriginCoords(gpsCoords);
    setOriginQuery('');
    setOriginSuggestions([]);
    setIsFetchingOriginCoords(false);
  };

  // ==========================================
  // Destination Selection
  // ==========================================
  const handleDestinationSelect = (item) => {
    skipDestAutocomplete.current = true; // Prevent autocomplete from re-firing
    setDestinationQuery(item.name);
    setDestinationSuggestions([]);
    if (item.placeId) {
      setDestinationCoords(null); // Clear while fetching — coords arrive via handlePlaceDetailsResult
      sendToWebView({ type: 'PLACE_DETAILS', placeId: item.placeId, reqId: 'to' });
    } else if (item.coords) {
      setDestinationCoords(item.coords);
    }
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

    let resolvedOrigin = null;

    if (originQuery === "My Location" || originQuery.trim() === "") {
      resolvedOrigin = gpsCoords;
    } else if (originMode === 'manual') {
      if (originCoords) {
        resolvedOrigin = originCoords;
      } else if (isFetchingOriginCoords) {
        // Still waiting for Google to geocode the typed origin
        Alert.alert("Fetching Coordinates", "Still getting exact location data from Google. Please try again in a second.");
        return;
      } else {
        // User typed manually without selecting from dropdown
        const known = LOCATIONS.find(p => p.name.toLowerCase() === originQuery.toLowerCase());
        if (known) {
          resolvedOrigin = { lat: known.lat, lon: known.lon };
        } else {
          Alert.alert("Unknown Origin", "Please select a valid starting location from the suggestions.");
          return;
        }
      }
    } else {
      // GPS mode but no coords yet
      resolvedOrigin = gpsCoords;
    }

    let resolvedDest = null;

    // Priority 1: We already have coords from a selection or recent search — use them directly.
    // This check must come BEFORE looking at the suggestions array, because the
    // autocomplete useEffect can briefly re-populate suggestions after a selection.
    if (destinationCoords && destinationQuery.length > 0) {
      resolvedDest = destinationCoords;
    } else if (destinationQuery.length > 0) {
      // Priority 2: No coords yet — try the known-locations list (typed or not-yet-geocoded)
      const known = LOCATIONS.find(p => p.name.toLowerCase() === destinationQuery.toLowerCase());
      if (known) {
        resolvedDest = { lat: known.lat, lon: known.lon };
      } else if (destinationSuggestions.length > 0) {
        // Suggestions are still showing — user hasn't selected one yet
        Alert.alert("Select a Destination", "Please select a destination from the suggestions list.");
        return;
      } else {
        // No coords, no known place, no suggestions — still waiting on Google geocoding
        Alert.alert("Fetching Coordinates", "Still getting exact destination data from Google. Please try again in a second.");
        return;
      }
    }

    if (!resolvedOrigin) { Alert.alert("Missing Origin", "Please enter a starting location or enable GPS."); return; }
    if (!resolvedDest) { Alert.alert("Missing Destination", "Please enter a destination."); return; }

    setLoading(true);
    setHasSearched(true);
    setRoutes([]);
    setSelectedRoute(null);
    setWeather(null);
    setRoadConditions([]);
    setIsSheetVisible(false);
    setIsSheetExpanded(false);

    try {
      console.log("[App] Fetching weather data for:", resolvedOrigin.lat, resolvedOrigin.lon);
      const weatherData = await getCurrentWeather(resolvedOrigin.lat, resolvedOrigin.lon);
      console.log("[App] Weather data fetched:", weatherData);
      setWeather(weatherData);

      console.log("[App] Injecting JavaScript to fetch Google Directions...");
      const script = `
        try {
          if (typeof requestGoogleRoute === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'Calling requestGoogleRoute' }));
            requestGoogleRoute(${resolvedOrigin.lat}, ${resolvedOrigin.lon}, ${resolvedDest.lat}, ${resolvedDest.lon});
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'requestGoogleRoute not defined!' }));
          }
        } catch(err) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: 'Error injecting script: ' + err.message }));
        }
        true;
      `;
      webViewRef.current?.injectJavaScript(script);
    } catch (error) {
      console.error("[App] Error in handleRouteSearch:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to initiate route fetch.");
    }
  };

  const handleRouteResult = (data) => {
    console.log("[App] handleRouteResult received data:", data.routes?.length, "routes", "error:", data.error);
    if (data.error || !data.routes || data.routes.length === 0) {
      Alert.alert("No Routes", "Could not find any routes for these locations. " + (data.error || ''));
      setLoading(false);
      return;
    }

    const originName = originQuery || 'My Location';
    const destName = destinationQuery;
    let resolvedDest = destinationCoords;
    if (!resolvedDest && destinationQuery.length > 0) {
      const known = LOCATIONS.find(p => p.name.toLowerCase() === destName.toLowerCase());
      if (known) resolvedDest = { lat: known.lat, lon: known.lon };
    }

    const processingResult = processAndRankRoutes(data.routes, weather, originName, destName);

    setSingleRouteMessage(processingResult.singleRouteMessage || null);

    if (processingResult.routes.length === 0) {
      Alert.alert("No Routes", "Processed routes were empty.");
      setLoading(false);
      return;
    }

    setRoutes(processingResult.routes);
    setRoadConditions(processingResult.roadConditions || []);

    const best = processingResult.routes[0];
    setSelectedRoute(best);
    setIsSheetVisible(true);

    drawRouteOnMap(best, resolvedDest);

    // Persist search history
    if (destinationQuery && user?.id) {
      let resolvedOrigin = originCoords || gpsCoords;
      saveSearch(user.id, {
        originName: originName,
        destinationName: destName,
        originLat: resolvedOrigin.lat,
        originLon: resolvedOrigin.lon,
        destLat: resolvedDest?.lat,
        destLon: resolvedDest?.lon,
        routeCount: processingResult.routes.length,
        bestDurationMin: best.predictions?.[0]?.duration || 0,
      }).catch(() => { });

      setRecentSearches(prev => {
        const filtered = prev.filter(s => s.name !== destinationQuery);
        return [{ name: destinationQuery, coords: resolvedDest }, ...filtered].slice(0, 5);
      });
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
    if (offsetMins <= 7) segments = route.predictions?.[0]?.segments;
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
        map.panTo({ lat: ${gpsCoords.lat}, lng: ${gpsCoords.lon} });
        map.setZoom(16);
      }
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  // ==========================================
  // Render
  // ==========================================
  const TAB_BAR_HEIGHT = 74 + Math.max(insets.bottom, 8);

  // Recent search quick-select handler
  const handleRecentSelect = useCallback((item) => {
    setDestinationQuery(item.name);
    setDestinationCoords(item.coords);
    setDestinationSuggestions([]);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} translucent backgroundColor="transparent" />


      <MapLayer
        ref={webViewRef}
        origin={gpsCoords}
        onTilesLoaded={() => setMapTilesLoaded(true)}
        onRouteResult={handleRouteResult}
        onAutocompleteResult={handleAutocompleteResult}
        onPlaceDetailsResult={handlePlaceDetailsResult}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(`setUserLocation(${gpsCoords.lat}, ${gpsCoords.lon}); true;`);
        }}
      />




      {/* MAP LOADING OVERLAY — real tile-load detection via Leaflet event */}
      <MapLoadingOverlay visible={!mapTilesLoaded} />

      {/* WEATHER WIDGET — moved below the search bar area */}
      <WeatherWidget weather={weather} topOffset={insets.top + 80} />

      {/* LOADING OVERLAY (during search) */}
      <LoadingOverlay visible={loading} />

      {/* LOCATE ME FAB */}
      <TouchableOpacity
        style={[styles.locateFab, {
          bottom: isSheetVisible
            ? (isSheetExpanded ? '72%' : TAB_BAR_HEIGHT + 130)
            : TAB_BAR_HEIGHT + 16
        }]}
        onPress={handleLocateMe}
        activeOpacity={0.85}
      >
        <MaterialIcons name="my-location" size={24} color="#fff" />
      </TouchableOpacity>

      {/* ROUTE PLANNER — floating card below status bar */}
      <RoutePlanner
        originQuery={originQuery}
        setOriginQuery={(text) => {
          setOriginQuery(text);
          // If user starts typing while a manual location was set, clear the
          // cached coords and mark that we're waiting for new geocoding.
          if (originMode === 'manual') {
            setOriginMode('manual');
            setIsFetchingOriginCoords(true);
            setOriginCoords(null);
          }
        }}
        destinationQuery={destinationQuery}
        setDestinationQuery={(text) => {
          setDestinationQuery(text);
          // If user starts typing, invalidate the autocomplete coordinate cache
          if (destinationCoords) {
            setDestinationCoords(null);
          }
        }}
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
        roadConditions={roadConditions}
        singleRouteMessage={singleRouteMessage}
        bottomOffset={TAB_BAR_HEIGHT}
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
      <View style={[styles.tabBar, { 
        paddingBottom: Math.max(insets.bottom, 8),
        backgroundColor: c.tabBg,
        borderTopColor: c.border
      }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => { }}>
          <Feather name="map" size={24} color={c.primary} />
          <Text style={[styles.tabText, { color: c.primary, fontWeight: '700' }]}>Map</Text>
        </TouchableOpacity>

        {/* THEME TOGGLE */}
        <TouchableOpacity style={styles.tabItem} onPress={cycleTheme}>
          <Text style={{ fontSize: 20 }}>{theme.emoji}</Text>
          <Text style={[styles.tabText, { color: c.textSub }]}>{theme.name}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setIsProfileVisible(true)}>
          {profileAvatarUrl ? (
            <Image
              source={{ uri: profileAvatarUrl }}
              style={[styles.tabAvatar, { borderColor: c.primary }]}
              onError={(e) => {
                console.warn('[Avatar] Image failed to load:', e.nativeEvent.error);
                setProfileAvatarUrl(null); // fall back to icon
              }}
            />
          ) : (
            <Feather name="user" size={24} color={c.textMuted} />
          )}
          <Text style={[styles.tabText, { color: c.textSub }]}>Profile</Text>
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

  return (
    <ThemeProvider>
      {isAuthenticated ? <MainApp /> : <AuthScreen />}
    </ThemeProvider>
  );
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
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
    height: 74,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
});