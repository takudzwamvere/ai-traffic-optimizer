import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Keyboard, SafeAreaView, Platform, StatusBar, FlatList, TouchableWithoutFeedback } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// Predefined Bulawayo Locations 
const BULAWAYO_COMPLETE_LOCATIONS = [
  // CITY CENTER & GOVERNMENT
  { name: "Bulawayo City Hall", lat: -20.1558, lon: 28.5814 },
  { name: "Tredgold Building (Magistrates Court)", lat: -20.1536, lon: 28.5861 },
  { name: "Bulawayo High Court", lat: -20.1589, lon: 28.5850 },
  { name: "Mhlahlandlela Government Complex", lat: -20.1678, lon: 28.5805 },
  { name: "Drill Hall (Police HQ)", lat: -20.1566, lon: 28.5757 },
  { name: "Southampton House (Passport Office)", lat: -20.1544, lon: 28.5833 },
  { name: "Main Post Office", lat: -20.1547, lon: 28.5808 },
  { name: "Bulawayo Public Library", lat: -20.1553, lon: 28.5819 },
  { name: "The Chronicle Building", lat: -20.1533, lon: 28.5839 },
  { name: "Reserve Bank of Zimbabwe (Byo)", lat: -20.1561, lon: 28.5842 },

  // HOSPITALS & MEDICAL 
  { name: "Mpilo Central Hospital", lat: -20.1433, lon: 28.5731 },
  { name: "United Bulawayo Hospitals (UBH)", lat: -20.1664, lon: 28.6169 },
  { name: "Mater Dei Hospital", lat: -20.1775, lon: 28.6072 },
  { name: "Ingutsheni Central Hospital", lat: -20.1828, lon: 28.5767 },
  { name: "Lady Rodwell Maternity Hospital", lat: -20.1655, lon: 28.6160 },
  { name: "Cure Children's Hospital", lat: -20.1672, lon: 28.6158 },
  { name: "Galen House Medical Centre", lat: -20.1525, lon: 28.5890 },
  { name: "Bulawayo Eye Clinic", lat: -20.1530, lon: 28.5900 },
  { name: "Thorngrove Infectious Diseases Hospital", lat: -20.1444, lon: 28.5638 },

  // EDUCATION (High Schools & Tertiary) 
  { name: "NUST University", lat: -20.1744, lon: 28.6336 },
  { name: "Bulawayo Polytechnic", lat: -20.1604, lon: 28.5933 },
  { name: "Hillside Teachers College", lat: -20.1953, lon: 28.6097 },
  { name: "United College of Education (UCE)", lat: -20.1230, lon: 28.6150 },
  { name: "Zimbabwe School of Mines", lat: -20.1680, lon: 28.6050 },
  { name: "Christian Brothers College (CBC)", lat: -20.1833, lon: 28.6333 },
  { name: "Petra High School", lat: -20.1757, lon: 28.6345 },
  { name: "Falcon College (Esigodini)", lat: -20.2133, lon: 28.9383 },
  { name: "Milton High School", lat: -20.1624, lon: 28.6059 },
  { name: "Eveline High School", lat: -20.1545, lon: 28.5855 },
  { name: "Gifford High School", lat: -20.1750, lon: 28.5800 },
  { name: "Dominican Convent High School", lat: -20.1515, lon: 28.5780 },
  { name: "Girls College", lat: -20.1622, lon: 28.5981 },
  { name: "Northlea High School", lat: -20.1150, lon: 28.5820 },
  { name: "Masiyephambili College", lat: -20.1850, lon: 28.5550 },
  { name: "Founders High School", lat: -20.1680, lon: 28.5720 },
  { name: "Hamilton High School", lat: -20.1650, lon: 28.5750 },
  { name: "Montrose High School", lat: -20.1820, lon: 28.5680 },

  // EDUCATION (Primary Schools) 
  { name: "Whitestone School", lat: -20.2011, lon: 28.6069 },
  { name: "Carmel Primary School", lat: -20.1710, lon: 28.6080 },
  { name: "Petra Primary School", lat: -20.1750, lon: 28.6320 },
  { name: "Coghlan Primary School", lat: -20.1550, lon: 28.5920 },
  { name: "Kumalo Primary School", lat: -20.1480, lon: 28.6100 },
  { name: "Rhodes Estate Preparatory School (REPS)", lat: -20.3880, lon: 28.5150 }, // Near Matopos

  // INDUSTRY & COMMERCE (The Industrial Sites) 
  { name: "Belmont Industrial Area (General)", lat: -20.1750, lon: 28.5700 },
  { name: "Donnington Industrial Area", lat: -20.1850, lon: 28.5650 },
  { name: "Kelvin North Industrial Site", lat: -20.1400, lon: 28.5500 },
  { name: "Steeldale Industrial Site", lat: -20.1350, lon: 28.5600 },
  { name: "Datlabs Pharmaceutical", lat: -20.1810, lon: 28.5720 },
  { name: "Lobels Biscuits", lat: -20.1785, lon: 28.5740 },
  { name: "National Foods", lat: -20.1650, lon: 28.5650 },
  { name: "Zimplow Holdings", lat: -20.1655, lon: 28.5680 },
  { name: "PPC Zimbabwe (Bulawayo Office)", lat: -20.1555, lon: 28.5870 },
  { name: "CSC (Cold Storage Company)", lat: -20.1720, lon: 28.5620 },
  { name: "NRZ Workshops (Raylton)", lat: -20.1600, lon: 28.5700 },

  // TRANSPORT & TERMINALS 
  { name: "Joshua Mqabuko Nkomo Airport", lat: -20.0171, lon: 28.6269 },
  { name: "Bulawayo Railway Station", lat: -20.1600, lon: 28.5750 },
  { name: "Renkini Bus Terminus", lat: -20.1481, lon: 28.5753 },
  { name: "Entumbane Bus Terminus", lat: -20.1325, lon: 28.5422 },
  { name: "Egodini Mall (Taxi Rank)", lat: -20.1520, lon: 28.5750 },
  { name: "TM Hyper Taxi Rank", lat: -20.1550, lon: 28.5790 },

  // SHOPPING & RETAIL 
  { name: "Bulawayo Centre", lat: -20.1547, lon: 28.5828 },
  { name: "ZITF (Trade Fair Grounds)", lat: -20.1633, lon: 28.6011 },
  { name: "Ascot Shopping Centre", lat: -20.1599, lon: 28.5942 },
  { name: "Bradfield Shopping Centre", lat: -20.1733, lon: 28.5908 },
  { name: "Nkulumane Shopping Complex", lat: -20.1917, lon: 28.5250 },
  { name: "Entumbane Shopping Complex", lat: -20.1320, lon: 28.5425 },
  { name: "Woodlands Shopping Centre", lat: -20.1880, lon: 28.6250 },
  { name: "Highland Park Shopping Centre", lat: -20.1850, lon: 28.6050 },
  { name: "Sekusile Shopping Centre", lat: -20.1925, lon: 28.5220 },
  { name: "Hillside Shopping Centre", lat: -20.1950, lon: 28.6090 },
  { name: "Fazak Home & Hyper", lat: -20.1885, lon: 28.6245 },

  // HOTELS & LODGES 
  { name: "Holiday Inn Bulawayo", lat: -20.1608, lon: 28.5961 },
  { name: "Bulawayo Rainbow Hotel", lat: -20.1575, lon: 28.5880 },
  { name: "Cresta Churchill Hotel", lat: -20.2126, lon: 28.5821 },
  { name: "The Bulawayo Club", lat: -20.1572, lon: 28.5833 },
  { name: "Nesbitt Castle", lat: -20.1867, lon: 28.6139 },
  { name: "Selborne Hotel", lat: -20.1540, lon: 28.5850 },
  { name: "Banff Lodge", lat: -20.1889, lon: 28.6097 },
  { name: "Parrot Lodge", lat: -20.1853, lon: 28.6208 },
  { name: "Granite Park Lodges", lat: -20.2160, lon: 28.5906 },
  { name: "Hornung Park Lodge", lat: -20.2050, lon: 28.6150 },

  // SUBURBS (Center Points) 
  { name: "Suburbs (The Suburb)", lat: -20.1582, lon: 28.6011 },
  { name: "Kumalo", lat: -20.1503, lon: 28.6186 },
  { name: "Bradfield", lat: -20.1771, lon: 28.5892 },
  { name: "Hillside", lat: -20.1953, lon: 28.6097 },
  { name: "Burnside", lat: -20.2036, lon: 28.6183 },
  { name: "Morningside", lat: -20.2005, lon: 28.5784 },
  { name: "Malindela", lat: -20.1835, lon: 28.6002 },
  { name: "Four Winds", lat: -20.2150, lon: 28.6100 },
  { name: "Woodlands", lat: -20.1880, lon: 28.6250 },
  { name: "Matsheumhlope", lat: -20.1800, lon: 28.6400 },
  { name: "Riverside", lat: -20.1944, lon: 28.6306 },
  { name: "Waterford", lat: -20.2100, lon: 28.6500 },
  { name: "Douglasdale", lat: -20.2300, lon: 28.6600 },
  { name: "Nkulumane", lat: -20.1917, lon: 28.5250 },
  { name: "Nketa", lat: -20.2050, lon: 28.5400 },
  { name: "Emganwini", lat: -20.2200, lon: 28.5100 },
  { name: "Pumula South", lat: -20.1800, lon: 28.4800 },
  { name: "Magwegwe", lat: -20.1500, lon: 28.5000 },
  { name: "Luveve", lat: -20.1300, lon: 28.5200 },
  { name: "Cowdray Park", lat: -20.1083, lon: 28.4917 },
  { name: "Barbourfields (Suburb)", lat: -20.1326, lon: 28.5724 },
  { name: "Thorngrove", lat: -20.1444, lon: 28.5638 },
  { name: "Mahatshula", lat: -20.1200, lon: 28.6400 },
  { name: "Killarney", lat: -20.1400, lon: 28.6300 },

  // SPORTS & RECREATION 
  { name: "Barbourfields Stadium", lat: -20.1361, lon: 28.5681 },
  { name: "Queens Sports Club", lat: -20.1451, lon: 28.5889 },
  { name: "Hartsfield Rugby Ground", lat: -20.1489, lon: 28.5917 },
  { name: "White City Stadium", lat: -20.1667, lon: 28.5486 },
  { name: "Luveve Stadium", lat: -20.1278, lon: 28.5156 },
  { name: "Bulawayo Golf Club", lat: -20.1683, lon: 28.5972 },
  { name: "Harry Allen Golf Club", lat: -20.1725, lon: 28.6044 },
  { name: "Bulawayo Athletic Club (BAC)", lat: -20.1650, lon: 28.5900 },
  { name: "Highlanders FC Clubhouse", lat: -20.1500, lon: 28.5880 },
  { name: "Bulawayo Country Club", lat: -20.2100, lon: 28.6200 },

  // CULTURE, HISTORY & NATURE 
  { name: "Natural History Museum", lat: -20.1620, lon: 28.5897 },
  { name: "Bulawayo Railway Museum", lat: -20.1636, lon: 28.5742 },
  { name: "National Gallery of Zimbabwe (Byo)", lat: -20.1550, lon: 28.5822 },
  { name: "Centenary Park", lat: -20.1614, lon: 28.5890 },
  { name: "Central Park", lat: -20.1580, lon: 28.5880 },
  { name: "Hillside Dams Conservancy", lat: -20.1983, lon: 28.6028 },
  { name: "Tshabalala Game Sanctuary", lat: -20.2458, lon: 28.5736 },
  { name: "Khami Ruins", lat: -20.1432, lon: 28.4265 },
  { name: "Old Bulawayo", lat: -20.2986, lon: 28.6300 },
  { name: "Chipangali Wildlife Orphanage", lat: -20.2631, lon: 28.7811 },
  { name: "Matobo National Park (Entrance)", lat: -20.5500, lon: 28.5000 },
  { name: "Amphitheatre", lat: -20.1600, lon: 28.5900 },

  // RELIGIOUS SITES 
  { name: "St Mary's Cathedral Basilica", lat: -20.1550, lon: 28.5781 },
  { name: "St John's Anglican Cathedral", lat: -20.1530, lon: 28.5865 },
  { name: "Bulawayo Central Mosque", lat: -20.1560, lon: 28.5720 },
  { name: "Word of Life International", lat: -20.1550, lon: 28.5800 }
];

const BULAWAYO_COORDS = { lat: -20.1706, lon: 28.5583 };

// Leaflet Map HTML (Satellite Hybrid View)
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

// API Helpers
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

// Main App
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