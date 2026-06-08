import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Known Bulawayo Route Corridors
 * 
 * Real-world route data for common origin→destination pairs.
 * Used to label routes with meaningful names and calibrate travel time predictions.
 */

const CALIBRATION_STORAGE_KEY = '@route_calibrations';
let customCorridors = [];

// Canonical route corridors with real-world data
export const KNOWN_CORRIDORS = [
  {
    origin: 'NUST University',
    destination: 'Bulawayo City Hall',
    // Correct real-world NUST coordinates
    originCoords: { lat: -20.16504573651969, lon: 28.641947045699503 },
    routes: [
      {
        name: 'via Cecil Ave',
        viaRoads: ['cecil', 'fife'],
        typicalMinutes: 6,       // Clear conditions
        peakMinutes: 7,          // Moderate/peak
        description: 'Cecil Avenue direct route through suburbs',
      },
      {
        name: 'via Gwanda Rd',
        viaRoads: ['gwanda', 'fort'],
        typicalMinutes: 7,
        peakMinutes: 8,
        description: 'Gwanda Road connecting to CBD from south',
      },
      {
        name: 'via Central Avenues',
        viaRoads: ['3rd ave', '2nd ave', 'lobengula'],
        typicalMinutes: 8,
        peakMinutes: 9,
        description: 'Through central Bulawayo avenues grid',
      },
    ],
    peakHours: {
      morning: { start: 7, end: 9 },
      afternoon: { start: 16, end: 18.5 },
    },
    peakDelayFactor: 1.167, // 7/6 = exactly 1 extra minute at peak
  },
];

/**
 * Load custom corridor overrides from AsyncStorage
 */
export const loadCustomCorridors = async () => {
  try {
    const data = await AsyncStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (data) {
      customCorridors = JSON.parse(data);
    } else {
      customCorridors = [];
    }
  } catch (e) {
    console.warn('Failed to load custom corridors:', e);
    customCorridors = [];
  }
};

/**
 * Save custom corridor overrides to AsyncStorage
 */
export const saveCustomCorridors = async (updated) => {
  try {
    customCorridors = updated;
    await AsyncStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save custom corridors:', e);
  }
};

/**
 * Merge default corridors with user-customized overrides
 */
export const getActiveCorridors = () => {
  if (!customCorridors || customCorridors.length === 0) {
    return KNOWN_CORRIDORS;
  }

  // Deep clone default corridors to avoid mutating
  const merged = JSON.parse(JSON.stringify(KNOWN_CORRIDORS));

  customCorridors.forEach(custom => {
    const matchIdx = merged.findIndex(c => 
      c.origin.toLowerCase() === custom.origin.toLowerCase() &&
      c.destination.toLowerCase() === custom.destination.toLowerCase()
    );

    if (matchIdx !== -1) {
      // Merge routes one by one
      custom.routes.forEach(cr => {
        const routeIdx = merged[matchIdx].routes.findIndex(r => r.name === cr.name);
        if (routeIdx !== -1) {
          merged[matchIdx].routes[routeIdx].typicalMinutes = cr.typicalMinutes;
          merged[matchIdx].routes[routeIdx].peakMinutes = cr.peakMinutes;
        } else {
          merged[matchIdx].routes.push(cr);
        }
      });
      // Merge other properties if needed
      if (custom.peakHours) merged[matchIdx].peakHours = custom.peakHours;
    } else {
      merged.push(custom);
    }
  });

  return merged;
};

/**
 * Try to match an origin+destination pair to a known corridor.
 * Returns the corridor object or null.
 */
export const findCorridor = (originName, destName) => {
  if (!originName || !destName) return null;
  const oLower = originName.toLowerCase();
  const dLower = destName.toLowerCase();

  const active = getActiveCorridors();
  return active.find(c => {
    const oMatch = oLower.includes(c.origin.toLowerCase()) || c.origin.toLowerCase().includes(oLower);
    const dMatch = dLower.includes(c.destination.toLowerCase()) || c.destination.toLowerCase().includes(dLower);
    // Also check reverse direction
    const oMatchRev = oLower.includes(c.destination.toLowerCase()) || c.destination.toLowerCase().includes(oLower);
    const dMatchRev = dLower.includes(c.origin.toLowerCase()) || c.origin.toLowerCase().includes(dLower);
    return (oMatch && dMatch) || (oMatchRev && dMatchRev);
  }) || null;
};

/**
 * Try to match a route's road names to a known corridor route.
 * roadNames: array of road name strings from OSRM steps.
 * corridorRoutes: array of corridor route objects.
 * Returns the best matching corridor route or null.
 */
export const matchRouteToCorridorRoute = (roadNames, corridorRoutes) => {
  if (!roadNames || !corridorRoutes) return null;

  const roadNamesLower = roadNames.map(n => n.toLowerCase());
  let bestMatch = null;
  let bestScore = 0;

  for (const cr of corridorRoutes) {
    let score = 0;
    for (const via of cr.viaRoads) {
      if (roadNamesLower.some(rn => rn.includes(via.toLowerCase()))) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cr;
    }
  }

  return bestScore > 0 ? bestMatch : null;
};

/**
 * Check if current time is within peak hours for a corridor.
 */
export const isInPeakHours = (corridor, date = new Date()) => {
  if (!corridor?.peakHours) return false;
  const hour = date.getHours() + date.getMinutes() / 60;
  const { morning, afternoon } = corridor.peakHours;
  return (hour >= morning.start && hour <= morning.end) ||
         (hour >= afternoon.start && hour <= afternoon.end);
};
