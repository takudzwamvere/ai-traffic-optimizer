import { classifyRoad, getTimeTrafficFactor, calculateSegmentSpeed, ROAD_TYPES } from './src/utils/trafficEngine.js';
import { ensureThreeRoutes } from './src/utils/routeHelpers.js';

// Mock Data
const mockWeatherData = { code: 63, rain: 5.0, wind_speed_10m: 10 }; // Rainy
const mockRoute = {
    distance: 10000,
    duration: 600, // 10 mins, 60km/h
    geometry: { coordinates: [[28, -20], [28.1, -20.1]] },
    legs: [{ steps: [{ distance: 5000, duration: 300, geometry: { coordinates: [[28, -20]] } }] }]
};

console.log("=== STARTING TRAFFIC ENGINE TESTS (ESM) ===\n");

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
const result = calculateSegmentSpeed(1000, 60, mockWeatherData, now); 
if (result.predictedSpeed < 60 && result.color !== '#4CAF50') {
    console.log(`✅ Prediction Logic Valid. Speed dropped to ${result.predictedSpeed.toFixed(1)} km/h. Color: ${result.color}`);
} else {
    console.error("❌ Prediction Logic Failed", result);
}

// TEST 4: Forced 3 Routes
console.log("\nTEST 4: Strict Uniqueness Testing");
const singleRouteInput = [mockRoute];
// Mock weather, origin, destination
const processedData = ensureThreeRoutes(singleRouteInput, mockWeatherData, 'Origin', 'Dest');
const processed = processedData.routes;

if (processed.length === 1) {
    console.log("✅ Successfully returned 1 distinct route without fake padding.");
    console.log(`   Route 1: ${processed[0].uiLabel} (${processed[0].uiReason})`);
} else {
    console.error(`❌ Failed route processing. Got ${processed.length}`);
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
