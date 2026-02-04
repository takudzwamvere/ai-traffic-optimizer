import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, Keyboard, Platform, LayoutAnimation, UIManager } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';

import locationData from './src/data/locations.json';
import MapLayer from './src/components/MapLayer';
import SearchBar from './src/components/SearchBar';
import RouteBottomSheet from './src/components/RouteBottomSheet';
import NetworkStatus from './src/components/NetworkStatus';
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
  
  // Sheet State
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      
      const userLat = location.coords.latitude;
      const userLon = location.coords.longitude;

      const isOutsideBulawayo = userLat > -19.0; 

      if (isOutsideBulawayo) {
        setOrigin({ lat: -20.1744, lon: 28.6336 });
        Alert.alert("Location Mocked", "You appear to be outside Bulawayo. Location set to NUST University for testing.");
      } else {
        setOrigin({ lat: userLat, lon: userLon });
      }
    })();
  }, []);

  const toggleSheet = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSheetExpanded(!isSheetExpanded);
  };

  const handleSearch = async (coords = null, name = null) => {
    setSuggestions([]);
    Keyboard.dismiss();
    setLoading(true);
    setRoutes([]);
    setSelectedRoute(null);
    setIsSheetVisible(false);
    setIsSheetExpanded(false);

    let target = coords;
    if (!target) {
      const known = BULAWAYO_COMPLETE_LOCATIONS.find(p => p.name.toLowerCase() === destinationQuery.toLowerCase());
      if (known) target = { lat: known.lat, lon: known.lon };
      else target = await geocodeLocation(destinationQuery);
    }

    if (target) {
      const processedRoutes = await getRoute(origin, target, departureTime);
      setRoutes(processedRoutes);
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

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    const dest = route.geometry.coordinates[route.geometry.coordinates.length - 1];
    const script = `drawRoute(${JSON.stringify(route.geometry)}, ${dest[1]}, ${dest[0]}, '${route.uiColor}'); true;`;
    webViewRef.current.injectJavaScript(script);
  };

  const handleTextChange = (text) => {
    setDestinationQuery(text);
    if (text.length > 1) {
      const filtered = BULAWAYO_COMPLETE_LOCATIONS.filter(place => 
        place.name.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <NetworkStatus style={{ top: insets.top + 10 }} />
      <MapLayer 
        ref={webViewRef} 
        origin={origin}
        onLoadEnd={() => webViewRef.current?.injectJavaScript(`setUserLocation(${origin.lat}, ${origin.lon}); true;`)}
      />

      <SearchBar 
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
});