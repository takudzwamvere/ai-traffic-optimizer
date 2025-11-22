import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Keyboard, SafeAreaView, Platform, StatusBar, FlatList, ScrollView, LayoutAnimation, UIManager } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

import locationData from './locations.json';

// Enable Animations
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const BULAWAYO_COMPLETE_LOCATIONS = locationData;
const DEFAULT_COORDS = { lat: -20.1706, lon: 28.5583 };

// --- MAP HTML (Thinner Blue Lines) ---
const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; background-color: #000; }
    #map { height: 100vh; width: 100vw; }
    .leaflet-div-icon { background: transparent; border: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map;
    let routeLayers = [];
    let startMarker;
    let endMarker;
    
    const flagIcon = L.divIcon({
      className: 'custom-flag-icon',
      html: '<div style="font-size: 36px; filter: drop-shadow(1px 2px 3px black);">🏁</div>',
      iconSize: [40, 40],
      iconAnchor: [10, 35]
    });

    function initMap() {
      map = L.map('map', { zoomControl: false, renderer: L.canvas() }).setView([${DEFAULT_COORDS.lat}, ${DEFAULT_COORDS.lon}], 13);
      
      // Satellite View
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri',
        maxZoom: 19
      }).addTo(map);

      // Labels
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(map);
    }

    function setUserLocation(lat, lon) {
      if (startMarker) map.removeLayer(startMarker);
      startMarker = L.circleMarker([lat, lon], {
        radius: 9, fillColor: "#007AFF", color: "#ffffff", weight: 3, opacity: 1, fillOpacity: 1
      }).addTo(map);
      map.setView([lat, lon], 14);
    }

    function drawRoute(geoJson, destLat, destLon, colorHex) {
      if (routeLayers.length > 0) {
        routeLayers.forEach(layer => map.removeLayer(layer));
        routeLayers = [];
      }
      
      if (endMarker) map.removeLayer(endMarker);
      endMarker = L.marker([destLat, destLon], { icon: flagIcon }).addTo(map);

      const layer = L.geoJSON(geoJson, {
        style: { 
          color: colorHex, 
          weight: 5, // THINNER LINE (Previously 8)
          opacity: 0.9, 
          lineCap: 'round',
          lineJoin: 'round'
        }
      }).addTo(map);
      
      routeLayers.push(layer);
      map.fitBounds(layer.getBounds(), { padding: [80, 80] });
    }

    initMap();
  </script>
</body>
</html>
`;

// --- DATA LOGIC ---
const ensureThreeRoutes = (rawRoutes) => {
  let processedRoutes = [...rawRoutes];
  while (processedRoutes.length < 3) {
    const base = processedRoutes[processedRoutes.length - 1];
    const degradation = processedRoutes.length === 1 ? 1.15 : 1.3;
    const newRoute = { ...base, duration: base.duration * degradation, isSimulated: true };
    processedRoutes.push(newRoute);
  }

  return processedRoutes.map((route, index) => {
    let minutes = Math.round(route.duration / 60);
    let color, label, reason;

    // --- UPDATED COLORS: Blue for Best ---
    if (index === 0) {
      color = "#007AFF"; // Standard iOS Blue
      label = "BEST";
      reason = "Fastest";
    } else if (index === 1) {
      color = "#FF9800"; // Orange
      label = "ALT";
      reason = "Traffic";
    } else {
      color = "#F44336"; // Standard Red
      label = "SLOW";
      reason = "Congestion";
    }

    return {
      ...route,
      uiColor: color,
      uiLabel: label,
      uiReason: reason,
      formattedDuration: minutes > 60 ? `${Math.floor(minutes/60)}h ${minutes%60}m` : `${minutes} min`,
      distanceKm: (route.distance / 1000).toFixed(1)
    };
  });
};

const geocodeLocation = async (query) => {
  if (!query) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=zw&limit=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'BulawayoPlannerApp/1.0' } });
    const data = await response.json();
    return (data && data.length > 0) ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
  } catch (error) { return null; }
};

const getRoute = async (start, end) => {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=simplified&geometries=geojson&alternatives=true&steps=true`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes.length > 0) {
      const sorted = data.routes.sort((a, b) => a.duration - b.duration);
      return ensureThreeRoutes(sorted);
    }
    return [];
  } catch (error) { return []; }
};

export default function App() {
  const webViewRef = useRef(null);
  const [origin, setOrigin] = useState(DEFAULT_COORDS);
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
      setOrigin({ lat: location.coords.latitude, lon: location.coords.longitude });
    })();
  }, []);

  const toggleSheet = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSheetExpanded(!isSheetExpanded);
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
      const processedRoutes = await getRoute(origin, target);
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
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#555" style={{marginLeft: 15}} />
            <TextInput 
              style={styles.input}
              placeholder="Search destination..."
              placeholderTextColor="#888"
              value={destinationQuery}
              onChangeText={handleTextChange}
              onSubmitEditing={() => handleSearch()}
            />
            {destinationQuery.length > 0 && (
              <TouchableOpacity onPress={() => {setDestinationQuery(''); setSuggestions([]); setRoutes([]); setIsSheetVisible(false);}}>
                <Feather name="x" size={20} color="#ccc" style={{marginRight: 10}} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleSearch()} style={styles.searchButton}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="arrow-right" size={20} color="white" />}
            </TouchableOpacity>
          </View>
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestionItem} onPress={() => {
                  setDestinationQuery(item.name);
                  handleSearch({lat: item.lat, lon: item.lon}, item.name);
                }}>
                  <Feather name="map-pin" size={18} color="#666" style={{marginRight: 10}} />
                  <Text style={styles.suggestionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Bottom Sheet */}
      {isSheetVisible && selectedRoute && (
        <View style={[styles.bottomSheet, { height: isSheetExpanded ? '60%' : 190 }]}>
          
          {/* CLICKABLE HEADER */}
          <TouchableOpacity onPress={toggleSheet} activeOpacity={0.9} style={styles.headerArea}>
            <View style={styles.sheetHandle} />
            
            <View style={styles.mainCard}>
              <View style={styles.routeRow}>
                  <View style={styles.routeInfo}>
                    {/* Route Info Row */}
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                      <Text style={[styles.cardTitle, {color: selectedRoute.uiColor}]}>{selectedRoute.uiLabel}</Text>
                      <View style={styles.dotSeparator}/>
                      <Text style={styles.cardReason}>{selectedRoute.uiReason}</Text>
                    </View>
                    
                    {/* Time & Distance */}
                    <View style={{flexDirection: 'row', alignItems: 'baseline', marginTop: 2}}>
                        <Text style={styles.duration}>{selectedRoute.formattedDuration}</Text>
                        <Text style={styles.distance}> {selectedRoute.distanceKm} km</Text>
                    </View>
                  </View>
                  
                  {/* TOGGLE INDICATOR (Chevron) */}
                  <View style={styles.toggleButton}>
                    <Feather 
                        name={isSheetExpanded ? "chevron-down" : "chevron-up"} 
                        size={28} 
                        color="#007AFF" 
                    />
                  </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* SCROLLABLE CONTENT (Visible when expanded) */}
          {isSheetExpanded && (
             <ScrollView style={styles.expandedContent} contentContainerStyle={{paddingBottom: 40}}>
                <View style={styles.separator} />
                
                <Text style={styles.sectionTitle}>Alternative Routes</Text>
                
                {routes.map((route, index) => {
                    const isSelected = selectedRoute === route;
                    return (
                    <TouchableOpacity 
                        key={index} 
                        style={[styles.altRouteCard, isSelected && {backgroundColor: '#F5F5F5', borderColor: '#ccc', borderWidth: 1}]}
                        onPress={() => handleRouteSelect(route)}
                    >
                        <View style={styles.routeRow}>
                            <View>
                                <Text style={[styles.altDuration, {color: isSelected ? '#333' : '#666'}]}>{route.formattedDuration}</Text>
                                <Text style={styles.altDistance}>{route.distanceKm} km</Text>
                            </View>
                            <View style={{alignItems:'flex-end'}}>
                                <Text style={[styles.altLabel, {color: route.uiColor}]}>{route.uiLabel}</Text>
                                {isSelected && <Feather name="check" size={16} color="#333" style={{marginTop:4}} />}
                            </View>
                        </View>
                    </TouchableOpacity>
                    );
                })}
             </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { flex: 1 },
  uiLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  
  // Search (Pill Shape)
  searchWrapper: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 50 : 60 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 30, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, height: 55, padding: 4 },
  input: { flex: 1, fontSize: 16, paddingHorizontal: 10, color: '#333' },
  searchButton: { width: 48, height: 48, backgroundColor: '#333', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  
  suggestionsContainer: { marginHorizontal: 20, marginTop: 8, backgroundColor: 'white', borderRadius: 20, elevation: 5, maxHeight: 220, overflow: 'hidden' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  suggestionText: { fontSize: 15, color: '#333' },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', 
    borderTopLeftRadius: 25, borderTopRightRadius: 25,
    elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
    overflow: 'hidden'
  },
  headerArea: { width: '100%', backgroundColor: 'white', paddingBottom: 15 },
  sheetHandle: { width: 50, height: 5, backgroundColor: '#E0E0E0', borderRadius: 10, alignSelf: 'center', marginTop: 12, marginBottom: 15 },
  
  mainCard: { paddingHorizontal: 25 },
  dotSeparator: { width:4, height:4, borderRadius:2, backgroundColor:'#999', marginHorizontal:8 },
  cardTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  cardReason: { fontSize: 13, color: '#666', fontWeight: '500' },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeInfo: { flex: 1 },
  duration: { fontSize: 30, fontWeight: '300', color: '#222', letterSpacing: -1 },
  distance: { fontSize: 16, color: '#777', fontWeight: '400', marginBottom: 4 },
  
  // Toggle Button (Chevron)
  toggleButton: { 
    width: 48, height: 48, borderRadius: 24, 
    backgroundColor: '#F5F7FA', 
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 10
  },

  expandedContent: { flex: 1, paddingHorizontal: 25 },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#444', marginBottom: 15, marginTop: 5 },
  
  altRouteCard: { padding: 16, backgroundColor: '#fff', borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  altDuration: { fontSize: 18, fontWeight: '600' },
  altDistance: { fontSize: 13, color: '#888', marginTop: 2 },
  altLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }
});