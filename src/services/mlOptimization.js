/**
 * Route Machine Learning Optimization Engine
 *
 * Simulates an ML heuristic model that continuously improves routing predictions
 * by storing corridor performance scores based on historical data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const ML_STORAGE_KEY = '@ai_traffic_ml_weights';

// Default corridor weights
let corridorWeights = {};

/**
 * Initialize the ML engine by loading learned weights from local storage
 * (In a real backend, this would fetch from Supabase/PostgreSQL)
 */
export const initMLEngine = async () => {
  try {
    const data = await AsyncStorage.getItem(ML_STORAGE_KEY);
    if (data) {
      corridorWeights = JSON.parse(data);
    }
  } catch (e) {
    console.warn("Failed to load ML weights", e);
  }
};

/**
 * Apply ML adjustments to a route's base score
 * 
 * @param {Object} route Route object to score
 * @param {Number} originalScore The original heuristic score calculated by rule engine
 * @returns {Number} ML-adjusted score (lower is better)
 */
export const applyMLScoring = (route, originalScore, corridorName = null) => {
  let mlScore = originalScore;
  let confidence = 0.50; // Base 50% confidence without historical data
  
  // 1. If we recognize the corridor format, apply its learned weight
  if (corridorName) {
    const weight = corridorWeights[corridorName];
    if (weight) {
      // weight > 1 means the corridor is historically worse than predicted
      // weight < 1 means the corridor is historically better than predicted
      mlScore = originalScore * weight.multiplier;
      // Increase confidence based on number of historical data points (up to 95%)
      confidence = Math.min(0.95, 0.50 + (weight.dataPoints * 0.05));
    }
  }

  // 2. Fallback heuristic: Extract specific known bottlenecks from road names
  const roadNames = extractRoadNames(route);
  if (roadNames.includes('Masiyephambili Drive')) {
    mlScore *= 1.15; // Historically very bad during peaks, penalty
  }
  if (roadNames.includes('Leopold Takawira Avenue')) {
    mlScore *= 1.05; // Slightly congested usually
  }

  return { 
    score: mlScore, 
    confidenceLevel: Math.round(confidence * 100) 
  };
};

/**
 * "Train" the model by providing feedback on a chosen route
 * Over time, it adjusts the multiplier for a corridor.
 * 
 * @param {String} corridorName The named corridor (e.g. "via Cecil Ave")
 * @param {Number} predictedMinutes What the app predicted
 * @param {Number} actualMinutes What the user actually experienced (simulated feedback)
 */
export const trainModelOffFeedback = async (corridorName, predictedMinutes, actualMinutes) => {
  if (!corridorName) return;

  if (!corridorWeights[corridorName]) {
    corridorWeights[corridorName] = { multiplier: 1.0, dataPoints: 0 };
  }

  const current = corridorWeights[corridorName];
  
  // Calculate the error ratio
  const errorRatio = actualMinutes / Math.max(predictedMinutes, 1);
  
  // Exponential moving average to update the multiplier smoothly
  // Alpha = 0.2 means new data has 20% weight, history has 80%
  const alpha = 0.2;
  current.multiplier = (current.multiplier * (1 - alpha)) + (errorRatio * alpha);
  current.dataPoints += 1;

  // Persist it
  try {
    await AsyncStorage.setItem(ML_STORAGE_KEY, JSON.stringify(corridorWeights));
  } catch (e) {
    console.warn("Failed to save ML weights", e);
  }
};

/**
 * Utility to extract road names from the pure OSRM route object
 */
const extractRoadNames = (route) => {
  const names = [];
  if (route.legs) {
    route.legs.forEach(leg => {
      leg.steps?.forEach(step => {
        if (step.name && step.name !== 'Unnamed Road') {
          names.push(step.name);
        }
      });
    });
  }
  return names;
};
