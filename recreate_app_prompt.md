# Flutter Port Request

I want to recreate this exact React Native application in Flutter. Below is the source code of the existing app. Please write the Flutter code to replicate this functionality and design.

## Technical Requirements

- **Map**: The original app uses Leaflet inside a WebView. Please use `webview_flutter` in Flutter to render the provided HTML string. This is crucial to keep the map styling and route drawing logic identical.
- **Routing**: Keep the OSRM and Nominatim API calls exactly as they are.
- **UI**:
  - Use a `Stack` to overlay the Search Bar on top of the WebView.
  - Implement the Bottom Sheet using `DraggableScrollableSheet` or a similar animated widget to match the expand/collapse behavior.
  - Match the colors (e.g., `#007AFF` for the best route) and icons (use `lucide_icons` or standard Material Icons).
- **Data**: The app loads a local `locations.json`. Please assume this file is placed in `assets/locations.json` and added to `pubspec.yaml`.

## Source Files

### 1. Data (`assets/locations.json`)

Please use this JSON data for the autocomplete suggestions.

```json
[
  { "name": "Bulawayo City Hall", "lat": -20.1558, "lon": 28.5814 },
  {
    "name": "Tredgold Building (Magistrates Court)",
    "lat": -20.1536,
    "lon": 28.5861
  },
  { "name": "Bulawayo High Court", "lat": -20.1589, "lon": 28.585 },
  {
    "name": "Mhlahlandlela Government Complex",
    "lat": -20.1678,
    "lon": 28.5805
  },
  { "name": "Drill Hall (Police HQ)", "lat": -20.1566, "lon": 28.5757 },
  {
    "name": "Southampton House (Passport Office)",
    "lat": -20.1544,
    "lon": 28.5833
  },
  { "name": "Main Post Office", "lat": -20.1547, "lon": 28.5808 },
  { "name": "Bulawayo Public Library", "lat": -20.1553, "lon": 28.5819 },
  { "name": "The Chronicle Building", "lat": -20.1533, "lon": 28.5839 },
  { "name": "Reserve Bank of Zimbabwe (Byo)", "lat": -20.1561, "lon": 28.5842 },
  { "name": "Mpilo Central Hospital", "lat": -20.1433, "lon": 28.5731 },
  {
    "name": "United Bulawayo Hospitals (UBH)",
    "lat": -20.1664,
    "lon": 28.6169
  },
  { "name": "Mater Dei Hospital", "lat": -20.1775, "lon": 28.6072 },
  { "name": "Ingutsheni Central Hospital", "lat": -20.1828, "lon": 28.5767 },
  { "name": "Lady Rodwell Maternity Hospital", "lat": -20.1655, "lon": 28.616 },
  { "name": "Cure Children's Hospital", "lat": -20.1672, "lon": 28.6158 },
  { "name": "Galen House Medical Centre", "lat": -20.1525, "lon": 28.589 },
  { "name": "Bulawayo Eye Clinic", "lat": -20.153, "lon": 28.59 },
  {
    "name": "Thorngrove Infectious Diseases Hospital",
    "lat": -20.1444,
    "lon": 28.5638
  },
  { "name": "NUST University", "lat": -20.1744, "lon": 28.6336 },
  { "name": "Bulawayo Polytechnic", "lat": -20.1604, "lon": 28.5933 },
  { "name": "Hillside Teachers College", "lat": -20.1953, "lon": 28.6097 },
  {
    "name": "United College of Education (UCE)",
    "lat": -20.123,
    "lon": 28.615
  },
  { "name": "Zimbabwe School of Mines", "lat": -20.168, "lon": 28.605 },
  {
    "name": "Christian Brothers College (CBC)",
    "lat": -20.1833,
    "lon": 28.6333
  },
  { "name": "Petra High School", "lat": -20.1757, "lon": 28.6345 },
  { "name": "Falcon College (Esigodini)", "lat": -20.2133, "lon": 28.9383 },
  { "name": "Milton High School", "lat": -20.1624, "lon": 28.6059 },
  { "name": "Eveline High School", "lat": -20.1545, "lon": 28.5855 },
  { "name": "Gifford High School", "lat": -20.175, "lon": 28.58 },
  { "name": "Dominican Convent High School", "lat": -20.1515, "lon": 28.578 },
  { "name": "Girls College", "lat": -20.1622, "lon": 28.5981 },
  { "name": "Northlea High School", "lat": -20.115, "lon": 28.582 },
  { "name": "Masiyephambili College", "lat": -20.185, "lon": 28.555 },
  { "name": "Founders High School", "lat": -20.168, "lon": 28.572 },
  { "name": "Hamilton High School", "lat": -20.165, "lon": 28.575 },
  { "name": "Montrose High School", "lat": -20.182, "lon": 28.568 },
  { "name": "Whitestone School", "lat": -20.2011, "lon": 28.6069 },
  { "name": "Carmel Primary School", "lat": -20.171, "lon": 28.608 },
  { "name": "Petra Primary School", "lat": -20.175, "lon": 28.632 },
  { "name": "Coghlan Primary School", "lat": -20.155, "lon": 28.592 },
  { "name": "Kumalo Primary School", "lat": -20.148, "lon": 28.61 },
  {
    "name": "Rhodes Estate Preparatory School (REPS)",
    "lat": -20.388,
    "lon": 28.515
  },
  { "name": "Belmont Industrial Area (General)", "lat": -20.175, "lon": 28.57 },
  { "name": "Donnington Industrial Area", "lat": -20.185, "lon": 28.565 },
  { "name": "Kelvin North Industrial Site", "lat": -20.14, "lon": 28.55 },
  { "name": "Steeldale Industrial Site", "lat": -20.135, "lon": 28.56 },
  { "name": "Datlabs Pharmaceutical", "lat": -20.181, "lon": 28.572 },
  { "name": "Lobels Biscuits", "lat": -20.1785, "lon": 28.574 },
  { "name": "National Foods", "lat": -20.165, "lon": 28.565 },
  { "name": "Zimplow Holdings", "lat": -20.1655, "lon": 28.568 },
  { "name": "PPC Zimbabwe (Bulawayo Office)", "lat": -20.1555, "lon": 28.587 },
  { "name": "CSC (Cold Storage Company)", "lat": -20.172, "lon": 28.562 },
  { "name": "NRZ Workshops (Raylton)", "lat": -20.16, "lon": 28.57 },
  { "name": "Joshua Mqabuko Nkomo Airport", "lat": -20.0171, "lon": 28.6269 },
  { "name": "Bulawayo Railway Station", "lat": -20.16, "lon": 28.575 },
  { "name": "Renkini Bus Terminus", "lat": -20.1481, "lon": 28.5753 },
  { "name": "Entumbane Bus Terminus", "lat": -20.1325, "lon": 28.5422 },
  { "name": "Egodini Mall (Taxi Rank)", "lat": -20.152, "lon": 28.575 },
  { "name": "TM Hyper Taxi Rank", "lat": -20.155, "lon": 28.579 },
  { "name": "Bulawayo Centre", "lat": -20.1547, "lon": 28.5828 },
  { "name": "ZITF (Trade Fair Grounds)", "lat": -20.1633, "lon": 28.6011 },
  { "name": "Ascot Shopping Centre", "lat": -20.1599, "lon": 28.5942 },
  { "name": "Bradfield Shopping Centre", "lat": -20.1733, "lon": 28.5908 },
  { "name": "Nkulumane Shopping Complex", "lat": -20.1917, "lon": 28.525 },
  { "name": "Entumbane Shopping Complex", "lat": -20.132, "lon": 28.5425 },
  { "name": "Woodlands Shopping Centre", "lat": -20.188, "lon": 28.625 },
  { "name": "Highland Park Shopping Centre", "lat": -20.185, "lon": 28.605 },
  { "name": "Sekusile Shopping Centre", "lat": -20.1925, "lon": 28.522 },
  { "name": "Hillside Shopping Centre", "lat": -20.195, "lon": 28.609 },
  { "name": "Fazak Home & Hyper", "lat": -20.1885, "lon": 28.6245 },
  { "name": "Holiday Inn Bulawayo", "lat": -20.1608, "lon": 28.5961 },
  { "name": "Bulawayo Rainbow Hotel", "lat": -20.1575, "lon": 28.588 },
  { "name": "Cresta Churchill Hotel", "lat": -20.2126, "lon": 28.5821 },
  { "name": "The Bulawayo Club", "lat": -20.1572, "lon": 28.5833 },
  { "name": "Nesbitt Castle", "lat": -20.1867, "lon": 28.6139 },
  { "name": "Selborne Hotel", "lat": -20.154, "lon": 28.585 },
  { "name": "Banff Lodge", "lat": -20.1889, "lon": 28.6097 },
  { "name": "Parrot Lodge", "lat": -20.1853, "lon": 28.6208 },
  { "name": "Granite Park Lodges", "lat": -20.216, "lon": 28.5906 },
  { "name": "Hornung Park Lodge", "lat": -20.205, "lon": 28.615 },
  { "name": "Suburbs (The Suburb)", "lat": -20.1582, "lon": 28.6011 },
  { "name": "Kumalo", "lat": -20.1503, "lon": 28.6186 },
  { "name": "Bradfield", "lat": -20.1771, "lon": 28.5892 },
  { "name": "Hillside", "lat": -20.1953, "lon": 28.6097 },
  { "name": "Burnside", "lat": -20.2036, "lon": 28.6183 },
  { "name": "Morningside", "lat": -20.2005, "lon": 28.5784 },
  { "name": "Malindela", "lat": -20.1835, "lon": 28.6002 },
  { "name": "Four Winds", "lat": -20.215, "lon": 28.61 },
  { "name": "Woodlands", "lat": -20.188, "lon": 28.625 },
  { "name": "Matsheumhlope", "lat": -20.18, "lon": 28.64 },
  { "name": "Riverside", "lat": -20.1944, "lon": 28.6306 },
  { "name": "Waterford", "lat": -20.21, "lon": 28.65 },
  { "name": "Douglasdale", "lat": -20.23, "lon": 28.66 },
  { "name": "Nkulumane", "lat": -20.1917, "lon": 28.525 },
  { "name": "Nketa", "lat": -20.205, "lon": 28.54 },
  { "name": "Emganwini", "lat": -20.22, "lon": 28.51 },
  { "name": "Pumula South", "lat": -20.18, "lon": 28.48 },
  { "name": "Magwegwe", "lat": -20.15, "lon": 28.5 },
  { "name": "Luveve", "lat": -20.13, "lon": 28.52 },
  { "name": "Cowdray Park", "lat": -20.1083, "lon": 28.4917 },
  { "name": "Barbourfields (Suburb)", "lat": -20.1326, "lon": 28.5724 },
  { "name": "Thorngrove", "lat": -20.1444, "lon": 28.5638 },
  { "name": "Mahatshula", "lat": -20.12, "lon": 28.64 },
  { "name": "Killarney", "lat": -20.14, "lon": 28.63 },
  { "name": "Barbourfields Stadium", "lat": -20.1361, "lon": 28.5681 },
  { "name": "Queens Sports Club", "lat": -20.1451, "lon": 28.5889 },
  { "name": "Hartsfield Rugby Ground", "lat": -20.1489, "lon": 28.5917 },
  { "name": "White City Stadium", "lat": -20.1667, "lon": 28.5486 },
  { "name": "Luveve Stadium", "lat": -20.1278, "lon": 28.5156 },
  { "name": "Bulawayo Golf Club", "lat": -20.1683, "lon": 28.5972 },
  { "name": "Harry Allen Golf Club", "lat": -20.1725, "lon": 28.6044 },
  { "name": "Bulawayo Athletic Club (BAC)", "lat": -20.165, "lon": 28.59 },
  { "name": "Highlanders FC Clubhouse", "lat": -20.15, "lon": 28.588 },
  { "name": "Bulawayo Country Club", "lat": -20.21, "lon": 28.62 },
  { "name": "Natural History Museum", "lat": -20.162, "lon": 28.5897 },
  { "name": "Bulawayo Railway Museum", "lat": -20.1636, "lon": 28.5742 },
  {
    "name": "National Gallery of Zimbabwe (Byo)",
    "lat": -20.155,
    "lon": 28.5822
  },
  { "name": "Centenary Park", "lat": -20.1614, "lon": 28.589 },
  { "name": "Central Park", "lat": -20.158, "lon": 28.588 },
  { "name": "Hillside Dams Conservancy", "lat": -20.1983, "lon": 28.6028 },
  { "name": "Tshabalala Game Sanctuary", "lat": -20.2458, "lon": 28.5736 },
  { "name": "Khami Ruins", "lat": -20.1432, "lon": 28.4265 },
  { "name": "Old Bulawayo", "lat": -20.2986, "lon": 28.63 },
  { "name": "Chipangali Wildlife Orphanage", "lat": -20.2631, "lon": 28.7811 },
  { "name": "Matobo National Park (Entrance)", "lat": -20.55, "lon": 28.5 },
  { "name": "Amphitheatre", "lat": -20.16, "lon": 28.59 },
  { "name": "St Mary's Cathedral Basilica", "lat": -20.155, "lon": 28.5781 },
  { "name": "St John's Anglican Cathedral", "lat": -20.153, "lon": 28.5865 },
  { "name": "Bulawayo Central Mosque", "lat": -20.156, "lon": 28.572 },
  { "name": "Word of Life International", "lat": -20.155, "lon": 28.58 },

  { "name": "Chitungwiza Town Centre", "lat": -18.0069, "lon": 31.0543 },
  {
    "name": "Makoni Shopping Centre (Chitungwiza)",
    "lat": -18.0125,
    "lon": 31.0744
  },
  { "name": "Chitungwiza Central Hospital", "lat": -18.0203, "lon": 31.0667 },
  { "name": "Chitungwiza Aquatic Complex", "lat": -18.005, "lon": 31.062 },
  { "name": "Chikwanha Shopping Centre", "lat": -17.9945, "lon": 31.042 },
  {
    "name": "Huruyadzo Shopping Centre (St Marys)",
    "lat": -18.003,
    "lon": 31.025
  },
  { "name": "Zengeza 2 Shopping Centre", "lat": -18.008, "lon": 31.082 },
  { "name": "Citimed Hospital (Chitungwiza)", "lat": -18.009, "lon": 31.085 },
  { "name": "St Mary's Police Station", "lat": -18.001, "lon": 31.028 },
  {
    "name": "Robert Gabriel Mugabe Int Airport",
    "lat": -17.9224,
    "lon": 31.0927
  },
  { "name": "Eastgate Centre (Harare CBD)", "lat": -17.8318, "lon": 31.0526 },
  { "name": "Joina City (Harare CBD)", "lat": -17.8315, "lon": 31.0475 },
  { "name": "Parirenyatwa Group of Hospitals", "lat": -17.8144, "lon": 31.04 },
  { "name": "University of Zimbabwe (UZ)", "lat": -17.7845, "lon": 31.0523 },
  {
    "name": "Sam Levy's Village (Borrowdale)",
    "lat": -17.7567,
    "lon": 31.0833
  },
  { "name": "Avondale Shopping Centre", "lat": -17.7983, "lon": 31.0367 },
  { "name": "Mbare Musika Bus Terminus", "lat": -17.854, "lon": 31.036 },
  { "name": "Roadport International Terminus", "lat": -17.834, "lon": 31.057 },
  { "name": "National Sports Stadium", "lat": -17.8214, "lon": 30.9944 },
  { "name": "Westgate Shopping Mall", "lat": -17.784, "lon": 30.966 },
  { "name": "Msasa Industrial Area", "lat": -17.842, "lon": 31.102 }
]
```

### 2. Main Logic (`App.js`)

Here is the React Native code. Please port this logic to Dart (Flutter).

```javascript
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList,
  ScrollView,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

import locationData from "./locations.json";

// Enable Animations
if (Platform.OS === "android") {
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
    const newRoute = {
      ...base,
      duration: base.duration * degradation,
      isSimulated: true,
    };
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
      formattedDuration:
        minutes > 60
          ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
          : `${minutes} min`,
      distanceKm: (route.distance / 1000).toFixed(1),
    };
  });
};

const geocodeLocation = async (query) => {
  if (!query) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=zw&limit=1`;
    const response = await fetch(url, {
      headers: { "User-Agent": "BulawayoPlannerApp/1.0" },
    });
    const data = await response.json();
    return data && data.length > 0
      ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
      : null;
  } catch (error) {
    return null;
  }
};

const getRoute = async (start, end) => {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=simplified&geometries=geojson&alternatives=true&steps=true`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === "Ok" && data.routes.length > 0) {
      const sorted = data.routes.sort((a, b) => a.duration - b.duration);
      return ensureThreeRoutes(sorted);
    }
    return [];
  } catch (error) {
    return [];
  }
};

export default function App() {
  const webViewRef = useRef(null);
  const [origin, setOrigin] = useState(DEFAULT_COORDS);
  const [destinationQuery, setDestinationQuery] = useState("");
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
      if (status !== "granted") return;
      let location = await Location.getCurrentPositionAsync({});
      setOrigin({
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      });
    })();
  }, []);

  const toggleSheet = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSheetExpanded(!isSheetExpanded);
  };

  const handleTextChange = (text) => {
    setDestinationQuery(text);
    if (text.length > 1) {
      const filtered = BULAWAYO_COMPLETE_LOCATIONS.filter((place) =>
        place.name.toLowerCase().includes(text.toLowerCase()),
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
      const known = BULAWAYO_COMPLETE_LOCATIONS.find(
        (p) => p.name.toLowerCase() === destinationQuery.toLowerCase(),
      );
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
    const dest =
      route.geometry.coordinates[route.geometry.coordinates.length - 1];
    const script = `drawRoute(${JSON.stringify(route.geometry)}, ${dest[1]}, ${dest[0]}, '${route.uiColor}'); true;`;
    webViewRef.current.injectJavaScript(script);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: mapHtml }}
          style={{ flex: 1 }}
          onLoadEnd={() =>
            webViewRef.current?.injectJavaScript(
              `setUserLocation(${origin.lat}, ${origin.lon}); true;`,
            )
          }
        />
      </View>

      <View style={styles.uiLayer}>
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Feather
              name="search"
              size={20}
              color="#555"
              style={{ marginLeft: 15 }}
            />
            <TextInput
              style={styles.input}
              placeholder="Search destination..."
              placeholderTextColor="#888"
              value={destinationQuery}
              onChangeText={handleTextChange}
              onSubmitEditing={() => handleSearch()}
            />
            {destinationQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setDestinationQuery("");
                  setSuggestions([]);
                  setRoutes([]);
                  setIsSheetVisible(false);
                }}
              >
                <Feather
                  name="x"
                  size={20}
                  color="#ccc"
                  style={{ marginRight: 10 }}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => handleSearch()}
              style={styles.searchButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="arrow-right" size={20} color="white" />
              )}
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
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => {
                    setDestinationQuery(item.name);
                    handleSearch({ lat: item.lat, lon: item.lon }, item.name);
                  }}
                >
                  <Feather
                    name="map-pin"
                    size={18}
                    color="#666"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.suggestionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Bottom Sheet */}
      {isSheetVisible && selectedRoute && (
        <View
          style={[
            styles.bottomSheet,
            { height: isSheetExpanded ? "60%" : 190 },
          ]}
        >
          {/* CLICKABLE HEADER */}
          <TouchableOpacity
            onPress={toggleSheet}
            activeOpacity={0.9}
            style={styles.headerArea}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.mainCard}>
              <View style={styles.routeRow}>
                <View style={styles.routeInfo}>
                  {/* Route Info Row */}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: selectedRoute.uiColor },
                      ]}
                    >
                      {selectedRoute.uiLabel}
                    </Text>
                    <View style={styles.dotSeparator} />
                    <Text style={styles.cardReason}>
                      {selectedRoute.uiReason}
                    </Text>
                  </View>

                  {/* Time & Distance */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      marginTop: 2,
                    }}
                  >
                    <Text style={styles.duration}>
                      {selectedRoute.formattedDuration}
                    </Text>
                    <Text style={styles.distance}>
                      {" "}
                      {selectedRoute.distanceKm} km
                    </Text>
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
            <ScrollView
              style={styles.expandedContent}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={styles.separator} />

              <Text style={styles.sectionTitle}>Alternative Routes</Text>

              {routes.map((route, index) => {
                const isSelected = selectedRoute === route;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.altRouteCard,
                      isSelected && {
                        backgroundColor: "#F5F5F5",
                        borderColor: "#ccc",
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleRouteSelect(route)}
                  >
                    <View style={styles.routeRow}>
                      <View>
                        <Text
                          style={[
                            styles.altDuration,
                            { color: isSelected ? "#333" : "#666" },
                          ]}
                        >
                          {route.formattedDuration}
                        </Text>
                        <Text style={styles.altDistance}>
                          {route.distanceKm} km
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={[styles.altLabel, { color: route.uiColor }]}
                        >
                          {route.uiLabel}
                        </Text>
                        {isSelected && (
                          <Feather
                            name="check"
                            size={16}
                            color="#333"
                            style={{ marginTop: 4 }}
                          />
                        )}
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
  container: { flex: 1, backgroundColor: "#fff" },
  mapContainer: { flex: 1 },
  uiLayer: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },

  // Search (Pill Shape)
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 50 : 60,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    height: 55,
    padding: 4,
  },
  input: { flex: 1, fontSize: 16, paddingHorizontal: 10, color: "#333" },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: "#333",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  suggestionsContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: "white",
    borderRadius: 20,
    elevation: 5,
    maxHeight: 220,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  suggestionText: { fontSize: 15, color: "#333" },

  // Bottom Sheet
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    overflow: "hidden",
  },
  headerArea: { width: "100%", backgroundColor: "white", paddingBottom: 15 },
  sheetHandle: {
    width: 50,
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 15,
  },

  mainCard: { paddingHorizontal: 25 },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#999",
    marginHorizontal: 8,
  },
  cardTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  cardReason: { fontSize: 13, color: "#666", fontWeight: "500" },
  routeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeInfo: { flex: 1 },
  duration: {
    fontSize: 30,
    fontWeight: "300",
    color: "#222",
    letterSpacing: -1,
  },
  distance: { fontSize: 16, color: "#777", fontWeight: "400", marginBottom: 4 },

  // Toggle Button (Chevron)
  toggleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  expandedContent: { flex: 1, paddingHorizontal: 25 },
  separator: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 10 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#444",
    marginBottom: 15,
    marginTop: 5,
  },

  altRouteCard: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  altDuration: { fontSize: 18, fontWeight: "600" },
  altDistance: { fontSize: 13, color: "#888", marginTop: 2 },
  altLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
});
```
