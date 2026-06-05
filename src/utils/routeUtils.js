/**
 * Shared route utility helpers used by both routeHelpers.js and mlOptimization.js.
 */

/**
 * Extract all named road segments from a raw OSRM route object.
 * Returns an array of road name strings, excluding 'Unnamed Road'.
 */
export const extractRoadNames = (route) => {
  const names = [];
  if (route.legs) {
    route.legs.forEach(leg => {
      leg.steps?.forEach(step => {
        if (step.name && step.name !== 'Unnamed Road') {
          names.push(step.name);
        }
        if (step.ref) {
          names.push(step.ref);
        }
      });
    });
  }
  return names;
};
