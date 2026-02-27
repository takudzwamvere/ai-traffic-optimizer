/**
 * Known Bulawayo Route Corridors
 * 
 * Real-world route data for common origin→destination pairs.
 * Used to label routes with meaningful names and calibrate travel time predictions.
 */

// Canonical route corridors with real-world data
export const KNOWN_CORRIDORS = [
  {
    origin: 'NUST University',
    destination: 'Bulawayo City Hall',
    routes: [
      {
        name: 'via Cecil Ave',
        viaRoads: ['cecil', 'fife'],
        typicalMinutes: 7,
        description: 'Cecil Avenue direct route through suburbs',
      },
      {
        name: 'via Gwanda Rd',
        viaRoads: ['gwanda', 'fort'],
        typicalMinutes: 8,
        description: 'Gwanda Road connecting to CBD from south',
      },
      {
        name: 'via Central Avenues',
        viaRoads: ['3rd ave', '2nd ave', 'lobengula'],
        typicalMinutes: 9,
        description: 'Through central Bulawayo avenues grid',
      },
    ],
    peakHours: {
      morning: { start: 7, end: 9 },
      afternoon: { start: 16, end: 18.5 },
    },
    peakDelayFactor: 1.4, // 40% longer during peak
  },
];

/**
 * Try to match an origin+destination pair to a known corridor.
 * Returns the corridor object or null.
 */
export const findCorridor = (originName, destName) => {
  if (!originName || !destName) return null;
  const oLower = originName.toLowerCase();
  const dLower = destName.toLowerCase();

  return KNOWN_CORRIDORS.find(c => {
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
