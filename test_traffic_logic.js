const { classifyRoad, getTimeTrafficFactor, calculateSegmentSpeed, ROAD_TYPES } = require('./src/utils/trafficEngine');
const { ensureThreeRoutes } = require('./src/utils/routeHelpers');

// Mock Data
const mockWeatherData = { code: 63, rain: 5.0, wind_speed_10m: 10 }; // Rainy
const mockRoute = {
    distance: 10000,
    duration: 600, // 10 mins, 60km/h
    geometry: { coordinates: [[28, -20], [28.1, -20.1]] },
    legs: [{ steps: [{ distance: 5000, duration: 300, geometry: { coordinates: [[28, -20]] } }] }]
};

console.log("=== STARTING TRAFFIC ENGINE TESTS ===\n");

// TEST 1: Road Classification
console.log("TEST 1: Road Classification");
const hwy = classifyRoad(100);
const main = classifyRoad(60);
const local = classifyRoad(40);
if (hwy === ROAD_TYPES.HIGHWAY && main === ROAD_TYPES.MAIN && local === ROAD_TYPES.LOCAL) {
    console.log("✅ Road Classification Passed");
} else {
    console.error("❌ Road Classification Failed", { hwy, main, local });
}

// TEST 2: Future Traffic Factor
console.log("\nTEST 2: Future Traffic Factor");
const now = new Date();
now.setHours(8, 0, 0); // 8 AM Rush Hour
const factorNow = getTimeTrafficFactor(now);

const future = new Date(now);
future.setHours(11, 0, 0); // 11 AM Off Peak
const factorFuture = getTimeTrafficFactor(future);

if (factorNow > factorFuture) {
    console.log(`✅ Rush Hour (${factorNow}) > Off Peak (${factorFuture})`);
} else {
    console.error("❌ Time Factor Logic Failed");
}

// TEST 3: Delay Prediction
console.log("\nTEST 3: Delay Prediction (Rain & Rush Hour)");
const result = calculateSegmentSpeed(1000, 60, mockWeatherData, now); // 1km, 1min base (60km/h)
// Expect speed < 60 due to rain + traffic
if (result.predictedSpeed < 60 && result.color !== '#4CAF50') {
    console.log(`✅ Prediction Logic Valid. Speed dropped to ${result.predictedSpeed.toFixed(1)} km/h. Color: ${result.color}`);
} else {
    console.error("❌ Prediction Logic Failed", result);
}

// TEST 4: Forced 3 Routes
console.log("\nTEST 4: Force 3 Routes");
const singleRouteInput = [mockRoute];
const processed = ensureThreeRoutes(singleRouteInput, mockWeatherData, 'NOW');

if (processed.length === 3) {
    console.log("✅ Successfully forced 3 routes from 1 input.");
    console.log(`   Route 1: ${processed[0].uiLabel} (${processed[0].uiReason})`);
    console.log(`   Route 2: ${processed[1].uiLabel} - Simulated: ${processed[1].isSimulated}`);
    console.log(`   Route 3: ${processed[2].uiLabel} - Simulated: ${processed[2].isSimulated}`);
    
    // Check Reasoning
    if (processed[0].uiReason.includes("Rain") || processed[0].uiReason.includes("Traffic")) {
        console.log("✅ UI Reason contains explanation: " + processed[0].uiReason);
    }
} else {
    console.error(`❌ Failed to force 3 routes. Got ${processed.length}`);
}

// TEST 5: Future Predictions Structure
console.log("\nTEST 5: Future Predictions Structure");
const pRoute = processed[0];
if (pRoute.predictions && pRoute.predictions[0] && pRoute.predictions[15] && pRoute.predictions[30]) {
    console.log("✅ Predictions present for 0, 15, 30 mins.");
    console.log(`   Now: ${pRoute.predictions[0].formattedDuration}`);
    console.log(`   +15: ${pRoute.predictions[15].formattedDuration}`);
    console.log(`   +30: ${pRoute.predictions[30].formattedDuration}`);
} else {
    console.error("❌ Missing Prediction Structure", pRoute.predictions);
}

console.log("\n=== TESTS COMPLETED ===");
