# AI Traffic Optimizer — Complete App Documentation

> This document describes the **entire codebase** of the AI Traffic Optimizer app. Use it as context to understand, modify, or improve the application.

---

## 1. Overview

**AI Traffic Optimizer** is a React Native (Expo) mobile app that provides **real-time traffic-aware navigation** for cities in Zimbabwe (primarily Bulawayo, with some Harare/Chitungwiza landmarks). It calculates routes between the user's live GPS location and a chosen destination, then applies a custom **Traffic Prediction Engine** that adjusts estimated travel times based on:

- **Road type** (highway, main, local, narrow)
- **Time of day** (rush hour curves)
- **Day of week** (weekday vs weekend)
- **Live weather** (rain/storm data from Open-Meteo)

The app always presents **3 route options** (BEST, ALT, SLOW) and lets users preview how conditions will change in **+15 and +30 minutes**.

---

## 2. Tech Stack

| Layer             | Technology                                                         |
| ----------------- | ------------------------------------------------------------------ |
| Framework         | React Native via **Expo SDK 54**                                   |
| Map               | **Leaflet 1.9.4** rendered inside a `react-native-webview` WebView |
| Routing API       | **OSRM** (Open Source Routing Machine) — free, no API key          |
| Geocoding         | **Nominatim** (OpenStreetMap) — free, no API key                   |
| Weather API       | **Open-Meteo** — free, no API key                                  |
| Location          | `expo-location` with `watchPositionAsync` (real-time GPS)          |
| Network Detection | `@react-native-community/netinfo`                                  |
| Icons             | `@expo/vector-icons` (Feather, MaterialIcons)                      |

---

## 3. Project Structure

```
ai-traffic-optimizer/
├── App.js                         # Root component, main app logic
├── index.js                       # Expo entry point
├── app.json                       # Expo config
├── package.json                   # Dependencies (Expo SDK 54)
├── test_traffic_logic.js          # Manual test script for traffic engine
├── test_traffic_logic.mjs         # ESM version of the test script
│
└── src/
    ├── constants/
    │   └── colors.js              # Color palette (primary, warning, danger, etc.)
    │
    ├── data/
    │   └── locations.json         # ~190 landmarks (name, lat, lon)
    │
    ├── components/
    │   ├── MapLayer.js            # WebView wrapper for Leaflet map
    │   ├── SearchBar.js           # Search input + autocomplete suggestions
    │   ├── RouteBottomSheet.js    # Bottom sheet with route details + alternatives
    │   ├── WeatherWidget.js       # Floating weather badge (icon + temp)
    │   └── NetworkStatus.js       # Offline banner (slides in when no internet)
    │
    ├── services/
    │   ├── trafficApi.js          # Geocoding (Nominatim) + routing (OSRM)
    │   └── weatherApi.js          # Weather fetching (Open-Meteo)
    │
    └── utils/
        ├── mapHtml.js             # Full HTML/JS string for the Leaflet map
        ├── trafficEngine.js       # Traffic prediction engine (speed, delays, colors)
        └── routeHelpers.js        # Route processing: segments, 3-route forcing, predictions
```

---

## 4. Data Flow (End-to-End)

```
User types destination
        │
        ▼
SearchBar.js ──► handleSearch() in App.js
        │
        ├─► 1. Resolve destination coords:
        │      • Check locations.json (local match)
        │      • Fallback: Nominatim geocode API
        │
        ├─► 2. trafficApi.getRoute(origin, target)
        │      Fetches in parallel:
        │      ├── OSRM route (up to 3 alternatives)
        │      └── Open-Meteo weather data
        │
        ├─► 3. routeHelpers.ensureThreeRoutes()
        │      • Forces exactly 3 routes (clones if OSRM returns < 3)
        │      • For each route, calls processRouteSegments() at offsets 0/15/30 min
        │      • processRouteSegments() calls trafficEngine.calculateSegmentSpeed()
        │        for each step in the route
        │      • Assigns labels: BEST / ALT / SLOW
        │      • Assigns colors: Green / Yellow / Red
        │      • Generates reason: "Clear Road" / "Moderate Traffic" / "Rain & Rush Hour"
        │
        ├─► 4. Results stored in state: routes[], selectedRoute, weather
        │
        └─► 5. Map updated via webViewRef.injectJavaScript():
               drawRoute(geometry, destLat, destLon, color)
```

---

## 5. File-by-File Breakdown

### 5.1 `App.js` — Main Application

**Role:** Root component. Orchestrates all state, location tracking, and navigation logic.

**Key State:**

- `origin` — User's live GPS coordinates `{ lat, lon }` (updated via `watchPositionAsync`)
- `destinationQuery` — Text in the search box
- `suggestions` — Autocomplete matches from `locations.json`
- `routes` — Array of 3 processed route objects
- `selectedRoute` — Currently highlighted route
- `weather` — Current weather data object
- `isSheetVisible` / `isSheetExpanded` — Bottom sheet visibility

**Key Functions:**

- `handleLocateMe()` — Pans map to user's current location (zoom 16, animated)
- `handleSearch(coords?, name?)` — Full search flow: resolve → route → display
- `handleTextChange(text)` — Filters `locations.json` for autocomplete (max 5 results, min 3 chars)
- `handleRouteSelect(route)` — Redraws map when user picks a different route

**Location Tracking:**

- Uses `Location.watchPositionAsync` with `Accuracy.High`, 2s interval, 10m distance filter
- Updates both the `origin` state and the map marker in real-time
- Cleans up subscription on unmount

**UI Layout (Stack order):**

1. `<MapLayer>` — Full-screen WebView map
2. `<NetworkStatus>` — Offline banner (top, slides in)
3. `<WeatherWidget>` — Weather badge (top-left)
4. `<SearchBar>` — Search pill (top, floating)
5. Locate Me FAB — Blue pill button (right side)
6. `<RouteBottomSheet>` — Route details (bottom)

---

### 5.2 `src/components/MapLayer.js`

**Role:** Thin wrapper around `react-native-webview`. Renders the Leaflet map HTML.

- Uses `forwardRef` so `App.js` can call `webViewRef.current.injectJavaScript()`
- Generates map HTML via `getMapHtml(origin)` from `mapHtml.js`
- Fires `onLoadEnd` callback to set initial user location marker

---

### 5.3 `src/utils/mapHtml.js`

**Role:** Generates the complete HTML string for the Leaflet map (loaded inside the WebView).

**Map Layers (5 tile layers):**

1. **Google Streets** — Default, Google Maps-like street view
2. **Google Hybrid** — Satellite + road labels
3. **Midnight Commander** — CartoDB dark mode
4. **Voyager** — CartoDB clean pastel style
5. **Esri Satellite** — High-quality satellite imagery

**JavaScript Functions (callable via `injectJavaScript`):**

- `initMap()` — Creates the Leaflet map, adds layers and layer control
- `setUserLocation(lat, lon)` — Places/updates the blue circle marker for user position
- `drawRoute(geoJson, destLat, destLon, colorHex)` — Draws a route on the map
  - Supports two formats:
    - **Custom segments format** (`geoJson.properties.segments`): draws multi-colored polylines (green/yellow/red per segment based on traffic)
    - **Standard GeoJSON**: draws a single-color route as fallback

**Map Config:**

- `zoomControl: false` (hidden — mobile context)
- `renderer: L.canvas()` (performance)
- Destination marker: 🏁 flag emoji
- User marker: Blue circle with white border (`#007AFF`)

---

### 5.4 `src/components/SearchBar.js`

**Role:** Floating search input with autocomplete dropdown.

**Features:**

- Pill-shaped white search bar with search icon + go button
- Clear button (X) appears when text is entered
- Autocomplete dropdown shows matching locations from `locations.json`
- Tapping a suggestion triggers `handleSearch()` immediately with exact coordinates
- Pressing Enter on keyboard also triggers search
- Positioned below the safe area inset

---

### 5.5 `src/components/RouteBottomSheet.js`

**Role:** Bottom sheet showing route details and alternatives.

**Features:**

- **Header** (always visible, 240px): Shows selected route's label, reason, duration, distance
- **Prediction Tabs**: "Now", "+15 min", "+30 min" — switches time prediction
- **Expand/Collapse**: Chevron button + tap header to toggle (65% height when expanded)
- **Alternative Routes** (expanded view): Lists all 3 routes, tap to switch

**Data Structure per Route:**

```javascript
{
  uiLabel: "BEST" | "ALT" | "SLOW",
  uiColor: "#4CAF50" | "#FFC107" | "#F44336",
  uiReason: "Clear Road" | "Moderate Traffic" | "Rain & Rush Hour" | etc,
  formattedDuration: "12 min" | "1h 5m",
  distanceKm: "8.3",
  predictions: {
    0:  { duration, formattedDuration, segments, color },
    15: { duration, formattedDuration, segments, color },
    30: { duration, formattedDuration, segments, color }
  }
}
```

---

### 5.6 `src/components/WeatherWidget.js`

**Role:** Small floating badge showing current weather conditions.

- Only visible when weather data exists (after a route search)
- Maps WMO weather codes to icons:
  - 0: ☀️ Clear (sun icon, orange)
  - 1-3: ☁️ Cloudy (cloud icon, gray)
  - 45-48: 🌫️ Foggy (menu icon, light blue)
  - 51-55: 🌦️ Drizzle (cloud-drizzle, sky blue)
  - 61-65, 80-82: 🌧️ Rain (cloud-rain, blue)
  - 95+: ⛈️ Storm (cloud-lightning, red)
- Shows temperature in °C

---

### 5.7 `src/components/NetworkStatus.js`

**Role:** Animated offline banner.

- Subscribes to `NetInfo` for connectivity changes
- Slides in from top when internet is lost
- Slides out when connection is restored
- Uses `Animated.timing` with `translateY` for smooth animation

---

### 5.8 `src/services/trafficApi.js`

**Role:** External API calls for geocoding and routing.

**`geocodeLocation(query)`:**

- Calls Nominatim: `https://nominatim.openstreetmap.org/search?format=json&q=...&countrycodes=zw&limit=1`
- Returns `{ lat, lon }` or `null`

**`getRoute(start, end)`:**

- Fetches OSRM route and weather data **in parallel** using `Promise.all`
- OSRM URL: `http://router.project-osrm.org/route/v1/driving/{lon},{lat};{lon},{lat}?overview=simplified&geometries=geojson&alternatives=true&steps=true`
- Passes raw routes to `ensureThreeRoutes()` for processing
- Returns `{ routes: [...], weather: {...} }`

---

### 5.9 `src/services/weatherApi.js`

**Role:** Fetches current weather from Open-Meteo.

- URL: `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m&forecast_days=1`
- Returns: `{ temp, precip, rain, code, wind, isDay }` or `null`

---

### 5.10 `src/utils/trafficEngine.js` — The Core Brain

**Role:** The traffic prediction engine. Calculates realistic traffic speeds.

**Step 1 — Road Classification (`classifyRoad`):**

```
Speed ≥ 80 km/h → HIGHWAY
Speed ≥ 50 km/h → MAIN_ROAD
Speed ≥ 30 km/h → LOCAL_ROAD
Speed < 30 km/h → NARROW_ROAD
```

Base speed is inferred from OSRM's free-flow speed (distance/duration).

**Step 2 & 3 — Time-of-Day Factor (`getTimeTrafficFactor`):**

- Uses hour-by-hour traffic curves (0.0 = empty roads, 1.0 = gridlock potential)
- **Weekday curve**: Peaks at 8 AM (1.0) and 5-6 PM (1.0), low at night (0.1)
- **Weekend curve**: Peaks at 11 AM-1 PM (0.8), generally lower
- **Friday evening boost**: +0.1 factor from 3-7 PM

**Step 4 — Weather Impact (`getWeatherImpact`):**

- Severity scale: 0 (clear) → 1 (drizzle) → 2 (rain) → 3 (storm)
- Impact varies by road type (highways handle rain better than narrow roads)
- Example: Storm on a narrow road → speed multiplied by 0.40 (60% reduction)

**Step 5 & 6 — Speed Calculation & Coloring (`calculateSegmentSpeed`):**

```
predictedSpeed = baseSpeed × congestionReduction × weatherMultiplier
```

- Congestion reduction based on road type:
  - Highway: max 40% slowdown
  - Main road: max 60% slowdown
  - Local/Narrow: max 70% slowdown
- Minimum speed floors (never truly 0): Highway=20, Main=10, Local/Narrow=5 km/h
- **Color coding**: ratio of predicted vs base speed:
  - ≥ 80% → Green (primary) — flowing
  - 50-80% → Yellow (warning) — moderate
  - < 50% → Red (danger) — congested

---

### 5.11 `src/utils/routeHelpers.js`

**Role:** Route processing pipeline.

**`processRouteSegments(route, weather, departureTime, timeOffset)`:**

- Iterates through each step of each leg
- Calls `calculateSegmentSpeed()` for every step
- Accumulates total delay
- Returns `{ segments: [{coordinates, color}], totalDelay }`

**`ensureThreeRoutes(rawRoutes, weather, departureTime)`:**

- If OSRM returns < 3 routes, clones the last one with variance
- For each of the 3 routes, generates predictions at 0, 15, 30 minute offsets
- Simulated routes get +15% delay per clone level
- Assigns UI labels (BEST/ALT/SLOW), colors, and reason strings
- Reason logic:
  - Red + Rain + Peak → "Rain & Rush Hour"
  - Red + Rain → "Weather Delays"
  - Red → "Heavy Traffic"
  - Yellow → "Moderate Traffic"
  - Green → "Clear Road"

---

### 5.12 `src/constants/colors.js`

```javascript
{
  primary: '#4CAF50',   // Green (good traffic)
  warning: '#FFC107',   // Amber (moderate traffic)
  danger: '#F44336',    // Red (heavy traffic / storms)
  text: '#333333',
  grayLight: '#F5F5F5',
  grayMedium: '#E0E0E0',
  border: '#DDDDDD'
}
```

---

### 5.13 `src/data/locations.json`

- ~190 pre-defined landmarks across Zimbabwe
- Primarily Bulawayo locations: government buildings, hospitals, schools, shopping centres, hotels, suburbs, sports venues, cultural sites, places of worship
- Some Harare/Chitungwiza locations (airport, CBD, hospitals, malls, bus termini)
- Format: `[{ "name": "...", "lat": -20.xxx, "lon": 28.xxx }, ...]`

---

## 6. External API Details

### OSRM (Routing)

- **Endpoint:** `http://router.project-osrm.org/route/v1/driving/{startLon},{startLat};{endLon},{endLat}`
- **Params:** `overview=simplified`, `geometries=geojson`, `alternatives=true`, `steps=true`
- **Returns:** Up to 3 alternative routes with geometry, distance (meters), duration (seconds), and step-by-step legs
- **Note:** This is the free public demo server. It has rate limits and may be slow.

### Nominatim (Geocoding)

- **Endpoint:** `https://nominatim.openstreetmap.org/search`
- **Params:** `format=json`, `countrycodes=zw`, `limit=1`
- **Headers:** `User-Agent: BulawayoPlannerApp/1.0`
- **Returns:** Latitude and longitude for a text query

### Open-Meteo (Weather)

- **Endpoint:** `https://api.open-meteo.com/v1/forecast`
- **Params:** `latitude`, `longitude`, `current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m`, `forecast_days=1`
- **Returns:** Current temperature, precipitation, rain amount, WMO weather code, wind speed

---

## 7. Current Features Summary

✅ Real-time GPS tracking (`watchPositionAsync`)  
✅ Autocomplete search with 190 local landmarks  
✅ Nominatim fallback geocoding for any Zimbabwe address  
✅ 3 route alternatives (BEST / ALT / SLOW)  
✅ Traffic prediction engine (road type × time × day × weather)  
✅ Future predictions at +15 and +30 minutes  
✅ Weather-aware ETA adjustments  
✅ Live weather badge widget  
✅ 5 map tile layers (Google Streets, Google Hybrid, Dark Mode, Voyager, Esri Satellite)  
✅ Locate Me FAB  
✅ Offline detection banner  
✅ Expandable bottom sheet with route comparison

---

## 8. Known Limitations & Areas for Improvement

1. **No real-time traffic data** — Traffic is predicted from time curves and weather, not from actual traffic feeds (Google/Waze-style). No historical incident data.
2. **OSRM public server** — The free demo server can be slow/unreliable under load. No guaranteed uptime.
3. **No turn-by-turn navigation** — The app shows routes on the map but doesn't provide step-by-step voice/visual navigation guidance.
4. **No route recalculation** — If the user deviates from the route, the app doesn't automatically recalculate.
5. **Simulated routes** — When OSRM returns fewer than 3 alternatives, fake routes are generated by cloning. These aren't real alternative paths.
6. **Limited location data** — Only ~190 landmarks. Many streets, residential addresses, and businesses are not in the local database (Nominatim fallback handles some of these).
7. **WebView map** — The map runs in a WebView (Leaflet), not a native map SDK. This adds overhead and limits native gesture integration.
8. **No user accounts / history** — No saved routes, favorites, or route history.
9. **No ETA sharing** — Cannot share arrival time with others.
10. **Weather is fetch-once** — Weather is only fetched when a route is searched, not continuously updated.
11. **No dark mode** — The app UI itself is light-only (the map has a dark tile layer option though).
12. **Color-coded route segments** — The infrastructure exists in `drawRoute()` and `processRouteSegments()` to draw multi-colored routes (green/yellow/red per segment), but this isn't fully connected in the current flow (`drawRoute` receives standard GeoJSON, not the segmented format).
