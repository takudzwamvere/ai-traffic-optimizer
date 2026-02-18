import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, Keyboard, Platform, LayoutAnimation, UIManager, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { COLORS } from './src/constants/colors';

import locationData from './src/data/locations.json';
import MapLayer from './src/components/MapLayer';
import SearchBar from './src/components/SearchBar';
import RouteBottomSheet from './src/components/RouteBottomSheet';
import NetworkStatus from './src/components/NetworkStatus';
import WeatherWidget from './src/components/WeatherWidget';
import { geocodeLocation, getRoute } from './src/services/trafficApi';

// Enable Animations
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const BULAWAYO_COMPLETE_LOCATIONS = locationData;
const DEFAULT_COORDS = { lat: -20.1706, lon: 28.5583 };

function MainApp() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);
  const [origin, setOrigin] = useState(DEFAULT_COORDS);
  const [departureTime, setDepartureTime] = useState('NOW');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  
  // Sheet State
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  // Location Subscription
  const locationSubscription = useRef(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission is required for navigation.");
        return;
      }

      // Start Watching Position
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, 
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          
          // Check for mocked location outside bounds (Optional, but kept for consistency)
          const isOutsideBulawayo = latitude > -19.0;
          if (isOutsideBulawayo) {
             // Only alert once or handle gracefully. For now, we trust the watch.
             // If we want to mock, we'd override here. 
             // Let's stick to real location for "Real-time" feature unless specific testing.
             // We'll just update origin.
          }
          
          setOrigin({ lat: latitude, lon: longitude });
          
          // Update Map Marker
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
  }, []);

  const toggleSheet = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSheetExpanded(!isSheetExpanded);
  };

  const handleRecenter = () => {
    const script = `
      if (typeof map !== 'undefined') {
        map.setView([${origin.lat}, ${origin.lon}], 15);
      }
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  const handleSearch = async (coords = null, name = null) => {
    setSuggestions([]);
    Keyboard.dismiss();
    setLoading(true);
    // Keep existing search logic...
    setRoutes([]);
    setSelectedRoute(null);
    setWeather(null);
    setIsSheetVisible(false);
    setIsSheetExpanded(false);

    let target = coords;
    if (!target) {
      const known = BULAWAYO_COMPLETE_LOCATIONS.find(p => p.name.toLowerCase() === destinationQuery.toLowerCase());
      if (known) target = { lat: known.lat, lon: known.lon };
      else target = await geocodeLocation(destinationQuery);
    }

    if (target) {
      const { routes: processedRoutes, weather: weatherData } = await getRoute(origin, target, departureTime);
      setRoutes(processedRoutes);
      setWeather(weatherData);

      if (processedRoutes.length > 0) {
        const best = processedRoutes[0];
        setSelectedRoute(best);
        setIsSheetVisible(true);
        const script = `drawRoute(${JSON.stringify(best.geometry)}, ${target.lat}, ${target.lon}, '${best.uiColor}'); true;`;
        webViewRef.current.injectJavaScript(script);
      }
    } else {
      Alert.alert("Not Found", "Location not found.");
    }
    setLoading(false);
  };

  // ... (handleRouteSelect, handleTextChange remain same)

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <NetworkStatus style={{ top: insets.top + 10 }} />
      <WeatherWidget weather={weather} />
      <MapLayer 
        ref={webViewRef} 
        origin={origin}
        onLoadEnd={() => {
           // Initial set
           webViewRef.current?.injectJavaScript(`setUserLocation(${origin.lat}, ${origin.lon}); true;`);
        }}
      />
      
      {/* RECENTER BUTTON */}
      <TouchableOpacity 
        style={[styles.recenterBtn, { bottom: isSheetVisible ? (isSheetExpanded ? '70%' : 260) : 100 }]} 
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <Feather name="crosshair" size={24} color={COLORS.primary} />
      </TouchableOpacity>

      <SearchBar 
        // ... (props remain same)
        destinationQuery={destinationQuery}
        setDestinationQuery={handleTextChange} 
        suggestions={suggestions}
        setSuggestions={setSuggestions}
        setRoutes={setRoutes}
        setIsSheetVisible={setIsSheetVisible}
        handleSearch={handleSearch}
        loading={loading}
        departureTime={departureTime}
        setDepartureTime={setDepartureTime}
        topInset={insets.top} 
      />

      <RouteBottomSheet 
        selectedRoute={selectedRoute}
        isSheetVisible={isSheetVisible}
        isSheetExpanded={isSheetExpanded}
        toggleSheet={toggleSheet}
        routes={routes}
        handleRouteSelect={handleRouteSelect}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  recenterBtn: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  }
});