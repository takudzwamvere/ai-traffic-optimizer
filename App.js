import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Keyboard, SafeAreaView, Platform, StatusBar, FlatList, TouchableWithoutFeedback } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons'; // Expo icons

// --- 1. Predefined Bulawayo Locations (Local Database) ---
const BULAWAYO_PLACES = [
  { name: "Bulawayo City Hall", lat: -20.1558, lon: 28.5814 },
  { name: "Joshua Mqabuko Nkomo Airport", lat: -20.0171, lon: 28.6269 },
  { name: "ZITF (Trade Fair)", lat: -20.1633, lon: 28.6011 },
  { name: "NUST University", lat: -20.1744, lon: 28.6336 },
  { name: "Bulawayo Centre", lat: -20.1547, lon: 28.5828 },
  { name: "Ascot Shopping Centre", lat: -20.1599, lon: 28.5942 },
  { name: "Bradfield Shopping Centre", lat: -20.1733, lon: 28.5908 },
  { name: "Mater Dei Hospital", lat: -20.1775, lon: 28.6072 },
  { name: "Mpilo Central Hospital", lat: -20.1433, lon: 28.5731 },
  { name: "Barbourfields Stadium", lat: -20.1361, lon: 28.5681 },
  { name: "Hartsfield Rugby Ground", lat: -20.1489, lon: 28.5917 },
  { name: "Natural History Museum", lat: -20.1620, lon: 28.5897 },
  { name: "Centenary Park", lat: -20.1614, lon: 28.5890 },
  { name: "Hillside Dams Conservancy", lat: -20.1983, lon: 28.6028 },
  { name: "Khami Ruins", lat: -20.1432, lon: 28.4265 },
  { name: "Chipangali Wildlife Orphanage", lat: -20.2631, lon: 28.7811 },
  { name: "Nesbitt Castle", lat: -20.1867, lon: 28.6139 },
  { name: "The Bulawayo Club", lat: -20.1572, lon: 28.5833 }
];

const BULAWAYO_COORDS = { lat: -20.1706, lon: 28.5583 };

// --- 2. Leaflet Map HTML (Satellite Hybrid View) ---
const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { height: 100vh; width: 100vw; }
    /* Remove default marker shadow for cleaner look */
    .leaflet-div-icon { background: transparent; border: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map;
    let routeLayer;
    let startMarker;
    let endMarker;

    // Custom Flag Icon Definition
    const flagIcon = L.divIcon({
      className: 'custom-flag-icon',
      html: '<div style="font-size: 32px; filter: drop-shadow(2px 4px 6px black);">🏁</div>',
      iconSize: [40, 40],
      iconAnchor: [5, 35] // Adjust anchor to point correctly
    });

    function initMap() {
      map = L.map('map', { zoomControl: false }).setView([${BULAWAYO_COORDS.lat}, ${BULAWAYO_COORDS.lon}], 13);
      
      // 1. Add Satellite Imagery Layer (Esri World Imagery)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(map);

      // 2. Add Labels/Roads Overlay (Esri World Boundaries and Places)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(map);
    }

    function setUserLocation(lat, lon) {
      if (startMarker) map.removeLayer(startMarker);
      // Bright blue circle with white border for high contrast on satellite
      startMarker = L.circleMarker([lat, lon], {
        radius: 8,
        fillColor: "#00BFFF", 
        color: "#ffffff",
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      }).addTo(map);
      map.setView([lat, lon], 14);
    }

    function drawRoute(geoJson, destLat, destLon) {
      if (routeLayer) map.removeLayer(routeLayer);
      if (endMarker) map.removeLayer(endMarker);

      // Add custom flag marker at destination
      endMarker = L.marker([destLat, destLon], { icon: flagIcon }).addTo(map);

      // Draw route line - Bright Neon Blue for visibility against dark satellite map
      routeLayer = L.geoJSON(geoJson, {
        style: { color: '#00FFFF', weight: 6, opacity: 0.9 } // Cyan/Neon Blue
      }).addTo(map);

      map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
    }

    initMap();
  </script>
</body>
</html>
`;

// --- API Helpers ---
const geocodeLocation = async (query) => {
  if (!query) return null;
  try {
    // Fallback API search if location isn't in our predefined list
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=zw&limit=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'BulawayoPlannerApp/1.0' } });
    const data = await response.json();
    return (data && data.length > 0) ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
  } catch (error) {
    console.error("Geocode Error:", error);
    return null;
  }
};

const getRoute = async (start, end) => {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.code === 'Ok' && data.routes.length > 0) {
      const route = data.routes[0];
      const minutes = Math.round(route.duration / 60);
      return { 
        geometry: route.geometry, 
        duration: minutes > 60 ? `${Math.floor(minutes/60)} hr ${minutes%60} min` : `${minutes} min`,
      };
    }
    return null;
  } catch (error) {
    console.error("Routing Error:", error);
    return null;
  }
};

// --- Main App ---
export default function App() {
  const webViewRef = useRef(null);
  const [origin, setOrigin] = useState(BULAWAYO_COORDS);
  const [destinationQuery, setDestinationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      const userLoc = { lat: location.coords.latitude, lon: location.coords.longitude };
      setOrigin(userLoc);
      if (webViewRef.current) webViewRef.current.injectJavaScript(`setUserLocation(${userLoc.lat}, ${userLoc.lon}); true;`);
    })();
  }, []);

  // Handle text changes and filter suggestions
  const handleTextChange = (text) => {
    setDestinationQuery(text);
    if (text.length > 1) {
      const filtered = BULAWAYO_PLACES.filter(place => 
        place.name.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  // Triggered when a user clicks a suggestion
  const handleSuggestionSelect = async (place) => {
    setDestinationQuery(place.name);
    setSuggestions([]); // Hide list
    Keyboard.dismiss();
    
    await calculateRoute({ lat: place.lat, lon: place.lon }, place.name);
  };

  // Triggered when user hits "GO" (might be a custom address not in list)
  const handleManualSearch = async () => {
    setSuggestions([]);
    Keyboard.dismiss();
    
    // Check if it matches a known place exactly first
    const knownPlace = BULAWAYO_PLACES.find(p => p.name.toLowerCase() === destinationQuery.toLowerCase());
    if (knownPlace) {
      await calculateRoute({ lat: knownPlace.lat, lon: knownPlace.lon }, knownPlace.name);
      return;
    }

    // Otherwise use API
    setLoading(true);
    const destCoords = await geocodeLocation(destinationQuery);
    if (destCoords) {
      await calculateRoute(destCoords, destinationQuery);
    } else {
      Alert.alert("Not Found", "Could not find that place in Zimbabwe.");
    }
    setLoading(false);
  };

  const calculateRoute = async (destCoords, label) => {
    setLoading(true);
    setRouteInfo(null);
    const route = await getRoute(origin, destCoords);
    
    if (route) {
      setRouteInfo({ duration: route.duration, label: label });
      const script = `drawRoute(${JSON.stringify(route.geometry)}, ${destCoords.lat}, ${destCoords.lon}); true;`;
      webViewRef.current.injectJavaScript(script);
    } else {
      Alert.alert("Routing Failed", "Could not calculate route.");
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={{ flex: 1 }}
          onLoadEnd={() => webViewRef.current?.injectJavaScript(`setUserLocation(${origin.lat}, ${origin.lon}); true;`)}
        />
      </View>

      <View style={styles.uiLayer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#888" style={{marginLeft: 10}} />
          <TextInput 
            style={styles.input}
            placeholder="Search in Bulawayo..."
            placeholderTextColor="#888"
            value={destinationQuery}
            onChangeText={handleTextChange}
            onSubmitEditing={handleManualSearch}
          />
          {destinationQuery.length > 0 && (
            <TouchableOpacity onPress={() => {setDestinationQuery(''); setSuggestions([]);}}>
               <Ionicons name="close-circle" size={20} color="#ccc" style={{marginRight: 5}} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleManualSearch} style={styles.searchButton}>
             {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.goText}>GO</Text>}
          </TouchableOpacity>
        </View>

        {/* Autocomplete Suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.suggestionItem} 
                  onPress={() => handleSuggestionSelect(item)}
                >
                  <Ionicons name="location-outline" size={18} color="#666" style={{marginRight: 10}} />
                  <Text style={styles.suggestionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {routeInfo && (
        <View style={styles.infoCard}>
          <Text style={styles.durationTitle}>{routeInfo.duration}</Text>
          <Text style={styles.destinationText}>to {routeInfo.label}</Text>
          <View style={styles.flagRow}>
             <Text style={{fontSize: 16}}>🏁 Destination</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  mapContainer: { flex: 1 },
  
  // UI Layer for absolute positioning over map
  uiLayer: { position: 'absolute', top: 50, left: 15, right: 15, zIndex: 10 },
  
  searchContainer: { 
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 8,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
    height: 50, marginBottom: 5 
  },
  input: { flex: 1, fontSize: 16, paddingHorizontal: 10, color: '#333' },
  searchButton: { 
    width: 50, height: 50, backgroundColor: '#1E88E5', 
    borderTopRightRadius: 8, borderBottomRightRadius: 8, 
    justifyContent: 'center', alignItems: 'center' 
  },
  goText: { color: 'white', fontWeight: 'bold' },

  // Autocomplete Styles
  suggestionsContainer: {
    backgroundColor: 'white', borderRadius: 8, elevation: 5,
    maxHeight: 200, overflow: 'hidden'
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  suggestionText: { fontSize: 15, color: '#333' },

  // Info Card Styles
  infoCard: { 
    position: 'absolute', bottom: 30, left: 15, right: 15, 
    backgroundColor: 'white', borderRadius: 12, padding: 20, 
    elevation: 10, borderLeftWidth: 5, borderLeftColor: '#1E88E5' 
  },
  durationTitle: { fontSize: 28, fontWeight: 'bold', color: '#1E88E5' },
  destinationText: { fontSize: 18, fontWeight: '600', color: '#333' },
  flagRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center' }
});