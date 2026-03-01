# Important Code Snippets for Supervisors

This document contains the most critical code snippets from the AI Traffic Optimizer project. These highlight the core logic, algorithms, and integrations that power the application. Supervisors will likely want to see the traffic prediction logic, the ML optimization, and how real-time GPS is acquired.

## File Locations Quick Reference

1. **Traffic Prediction Algorithm:** `src/utils/trafficEngine.js`
2. **ML Heuristic Scoring & Training:** `src/services/mlOptimization.js`
3. **Route Selection & Analysis:** `src/utils/routeHelpers.js`
4. **Live GPS Tracking (Frontend):** `App.js`
5. **Map Segment Injection:** `App.js`

---

## 1. The Traffic Prediction Algorithm (The "Brain")

**Location:** `src/utils/trafficEngine.js` (around line 95)

**Context for Supervisors:** This is the core mathematical engine. Since the app lacks real-time traffic API feeds, it dynamically calculates congestion penalties. It takes the base free-flow speed of a road, applies a time-of-day curve penalty, and a weather penalty. It also simulates realistic city traffic events like random bottlenecks.

```javascript
export const calculateSegmentSpeed = (distance, duration, weatherData, date = new Date(), timeOffset = 0) => {
  // 1. Calculate Base Speed (free flow from OSRM) in km/h
  const baseSpeedKmh = (distance / duration) * 3.6;
  const roadType = classifyRoad(baseSpeedKmh);

  // 2. Fetch Time & Day Traffic Factor (e.g., 0.9 during Rush Hour)
  const predictionTime = new Date(date.getTime() + (timeOffset * 60000));
  const timeFactor = getTimeTrafficFactor(predictionTime);

  // 3. Apply Congestion Resistance (Highways resist traffic better than narrow roads)
  let congestionReduction = 1.0;
  if (roadType === ROAD_TYPES.HIGHWAY) {
    congestionReduction = 1.0 - (timeFactor * 0.4); // Max 40% slowdown
  } else if (roadType === ROAD_TYPES.MAIN) {
    congestionReduction = 1.0 - (timeFactor * 0.6); // Max 60% slowdown
  } else {
    congestionReduction = 1.0 - (timeFactor * 0.7); // Max 70% slowdown
  }

  // 4. Apply Weather Reductions (e.g., Storm drops speed significantly)
  const weatherMultiplier = getWeatherImpact(weatherData, roadType);

  // 5. Final Speed Calculation
  let predictedSpeed = baseSpeedKmh * congestionReduction * weatherMultiplier;

  // Real-time Congestion Simulation (Random Bottlenecks/Accidents)
  if (distance > 500) {
    const randomRoll = Math.random();
    if (roadType === ROAD_TYPES.MAIN && randomRoll < 0.05) {
      predictedSpeed *= 0.6; // 40% drop for bottleneck
    }
  }

  // Enforce minimum speed floors so traffic never hits 0 km/h
  predictedSpeed = Math.max(predictedSpeed, minSpeeds[roadType]);
```

---

## 2. Machine Learning Heuristics (Learning from Feedback)

**Location:** `src/services/mlOptimization.js` (around line 67)

**Context for Supervisors:** This snippet demonstrates an attempt at adaptive software. It uses an **Exponential Moving Average** (EMA) to adjust a corridor's routing weight over time as the app "learns" from user feedback on whether a route was faster or slower than initially predicted.

```javascript
/**
 * "Train" the model by providing feedback on a chosen route
 * Over time, it adjusts the multiplier for a corridor.
 */
export const trainModelOffFeedback = async (
  corridorName,
  predictedMinutes,
  actualMinutes,
) => {
  if (!corridorName) return;

  // Initialize weights if they do not exist
  if (!corridorWeights[corridorName]) {
    corridorWeights[corridorName] = { multiplier: 1.0, dataPoints: 0 };
  }

  const current = corridorWeights[corridorName];

  // Calculate the error ratio based on actual feedback
  const errorRatio = actualMinutes / Math.max(predictedMinutes, 1);

  // Exponential moving average to update the multiplier smoothly
  // Alpha = 0.2 means new incoming data holds 20% weight, history holds 80%
  const alpha = 0.2;
  current.multiplier = current.multiplier * (1 - alpha) + errorRatio * alpha;
  current.dataPoints += 1; // Increase confidence metric

  // Persist learned weights to local storage
  await AsyncStorage.setItem(ML_STORAGE_KEY, JSON.stringify(corridorWeights));
};
```

---

## 3. Route Ranking & Formatting Pipeline

**Location:** `src/utils/routeHelpers.js` (around line 140)

**Context for Supervisors:** This orchestrates the data before UI rendering. It takes the mathematical calculation from the traffic engine, applies the ML weights, ranks the routes, and processes them at +15 and +30 minute intervals to offer predictive routing capabilities to the user.

```javascript
export const processAndRankRoutes = (
  rawRoutes,
  weatherData,
  originName,
  destName,
) => {
  // 1. Initial heuristic scoring based on predicted ETA + Weather penalties
  let scored = rawRoutes.map((route) => ({
    route,
    score: calculateRouteScore(route, weatherData),
  }));

  // 2. Apply Machine Learning Adjustments based on historical corridor weights
  scored = scored.map(({ route, score }) => {
    // ... logic to match route against historical named corridors ...
    const mlAnalysis = applyMLScoring(route, score, corridorRouteName);
    return {
      route,
      score: mlAnalysis.score,
      confidenceLevel: mlAnalysis.confidenceLevel,
    };
  });

  // Sort by the newly adjusted ML Score
  scored.sort((a, b) => a.score - b.score);

  // 3. Process time-travel predictions for the top 3 chosen routes
  const processedRoutes = scored.slice(0, 3).map(({ route, score }, index) => {
    const predictions = {};

    // Simulate what this route looks like right now, in 15 mins, and in 30 mins
    [0, 15, 30].forEach((offset) => {
      const result = processRouteSegments(route, weatherData, offset);
      // ... saves predicted ETA and maps out exact road bottleneck segments ...
    });

    // Assign dynamic user-friendly labels depending on their ranking
    let label, uiColor;
    if (index === 0) {
      label = "BEST";
      uiColor = COLORS.primary;
    } else if (index === 1) {
      label = "ALT";
      uiColor = COLORS.warning;
    } else {
      label = "SLOW";
      uiColor = COLORS.danger;
    }

    return { ...route, predictions, uiColor, uiLabel };
  });

  return { routes: processedRoutes };
};
```

---

## 4. Live GPS Tracking & Frontend Subscriptions

**Location:** `App.js` (around line 93)

**Context for Supervisors:** This shows native device interaction. The app reliably tracks the user's location via satellite, sets the internal React state for accurate routing calculations, and asynchronously loops Javascript injection into the Leaflet layer to update a blue dot on the map in real-time.

```javascript
// Start watching the GPS position of the user
locationSubscription.current = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.High, // Use high accuracy GPS chips
    timeInterval: 2000, // Poll every 2 seconds
    distanceInterval: 10, // Only trigger if they moved > 10 meters
  },
  (location) => {
    const { latitude, longitude } = location.coords;
    const newCoords = { lat: latitude, lon: longitude };

    // Update the internal state used for querying routes
    setGpsCoords(newCoords);
    if (originMode === "gps") {
      setOriginCoords(newCoords);
    }

    // Instantly inject JavaScript into the WebView to move the map marker
    const script = `
      if (typeof setUserLocation === 'function') {
        setUserLocation(${latitude}, ${longitude});
      }
    `;
    webViewRef.current?.injectJavaScript(script);
  },
);
```
