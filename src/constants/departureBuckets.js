/**
 * Departure time bucket thresholds (in minutes).
 *
 * Route predictions are computed for three time offsets: now (0 min),
 * 15 min, and 30 min. UI components and the traffic engine use these
 * constants to decide which prediction bucket to display.
 *
 *  departure <= BUCKET_NOW_MAX  → use predictions[0]  ("now")
 *  departure <= BUCKET_15_MAX   → use predictions[15] (~15 min)
 *  departure >  BUCKET_15_MAX   → use predictions[30] (~30 min)
 */
export const BUCKET_NOW_MAX = 7;   // 0–7 min  → "now" bucket
export const BUCKET_15_MAX = 22;   // 8–22 min → 15-min bucket
export const BUCKET_30 = 30;       // Prediction offset for the 30-min bucket
