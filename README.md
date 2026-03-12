# AI Traffic Optimizer 🚗

*AI Traffic Optimizer* is a React Native (Expo) mobile application that provides **real-time, traffic-aware navigation** tailored for cities in Zimbabwe (primarily Bulawayo, with coverage extending to Harare and Chitungwiza). 

Unlike standard navigation apps, this application uses a custom **Traffic Prediction Engine** to calculate routes and adjust estimated travel times based on road types, rush hour curves, day of the week, and live weather conditions.

## ✨ Features

- **Live GPS Tracking**: Real-time location tracking using `expo-location`.
- **Smart Routing Options**: Always presents 3 customized route options: BEST, ALT, and SLOW.
- **Traffic Prediction Engine**: Adjusts ETAs intelligently based on time of day, road classification, and weather.
- **Future Predictions**: Previews traffic and travel time for +15 and +30 minutes into the future.
- **Live Weather Integration**: Factors in live weather data (from Open-Meteo) for safer and more accurate ETA calculations.
- **Customizable Base Maps**: Offers 5 map tile layers (Google Streets, Google Hybrid, Midnight Commander, Voyager, Esri Satellite) using Leaflet.
- **Offline Network Detection**: Alerts users seamlessly when the internet connection is lost.

## 🛠 Tech Stack

| Component | Technology |
| --- | --- |
| **Framework** | [React Native (Expo SDK 54)](https://expo.dev/) |
| **Map Rendering** | [Leaflet](https://leafletjs.com/) rendered inside a `react-native-webview` |
| **Routing API** | [OSRM (Open Source Routing Machine)](http://project-osrm.org/) |
| **Geocoding** | [Nominatim (OpenStreetMap)](https://nominatim.org/) |
| **Weather API** | [Open-Meteo](https://open-meteo.com/) |
| **Icons** | `@expo/vector-icons` (Feather, MaterialIcons) |
| **Location & Network** | `expo-location`, `@react-native-community/netinfo` |

## 🚀 Getting Started

### Prerequisites

- Node.js installed (v18 or higher recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) installed globally
- Expo Go app installed on your physical device (iOS / Android) or a configured emulator/simulator.

### Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <your-repo-url>
   cd ai-traffic-optimizer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm start
   # or
   npx expo start
   ```

4. **Open the App**:
   - Open the **Expo Go** app on your phone and scan the QR code displayed in your terminal.
   - Or press `a` to open in Android Emulator, or `i` for iOS Simulator.

## 🧠 How the Traffic Prediction Engine Works

The core of the application relies on `src/utils/trafficEngine.js` to simulate realistic traffic without expensive paid APIs:

1. **Road Classification**: Sorts roads into HIGHWAY, MAIN_ROAD, LOCAL_ROAD, or NARROW_ROAD based on physical attributes and free-flow speed.
2. **Time-of-Day Factors**: Applies historical rush-hour curves (e.g., peaks at 8 AM and 5 PM on weekdays).
3. **Weather Impact**: Fetches live weather (e.g., rain, storms) and slows down expected speeds proportionately (narrow roads are penalized more heavily by rain than highways).
4. **Calculated Segment Speed**: Computes a final speed = `Base Speed × Congestion Reduction × Weather Multiplier`. 
5. **Color Coding**: Routes are dynamically color-coded: **Green** (Flowing), **Yellow** (Moderate), and **Red** (Congested).

## 📂 Project Structure

```text
ai-traffic-optimizer/
├── App.js                     # Root component, orchestrates state and Map
├── package.json               # Expo & npm dependencies
├── src/
│   ├── components/            # Reusable UI (SearchBar, BottomSheet, MapLayer, WeatherWidget)
│   ├── constants/             # App-wide constants (colors.js)
│   ├── data/                  # Preloaded landmarks (locations.json)
│   ├── services/              # External API callers (trafficApi.js, weatherApi.js)
│   └── utils/                 # Core logic engines (trafficEngine.js, routeHelpers.js, mapHtml.js)
└── ...
```

## ⚠️ Known Limitations

- **Simulated Traffic**: The app uses predictive algorithms rather than real-time crowdsourced incident data (like Waze).
- **Public OSRM Server**: Relies on the free OSRM demo server, which may be slow or rate-limited during high traffic.
- **Turn-by-Turn Limitations**: Does not currently provide live voice-guided turn-by-turn navigation or dynamic route recalculation if you miss a turn.

## 📝 License

This project is created for demonstration and portfolio purposes. Feel free to fork and modify!
