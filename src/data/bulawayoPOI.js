/**
 * bulawayoPOI.js
 *
 * Local Bulawayo Points of Interest with typo-tolerant fuzzy search.
 *
 * Why local search instead of relying only on Nominatim?
 * Nominatim is strict about spelling. A user typing "nust" or "citiy hall"
 * or "bul museum" won't get useful results. This module provides immediate,
 * offline suggestions for Bulawayo landmarks that survive typical typos.
 *
 * Exports:
 *   fuzzySearchPOI(query) → array of { name, display, coords, category }
 */

// ─── BULAWAYO LANDMARK DATABASE ───────────────────────────────────────────────
// Each entry lists aliases the user might type (including common typos/shorthand)
const BULAWAYO_POIS = [
  {
    name: 'NUST University',
    display: 'NUST - National University of Science & Technology',
    coords: { lat: -20.16504573651969, lon: 28.641947045699503 },
    category: 'University',
    aliases: ['nust', 'national university', 'science technology', 'nust university', 'university nust', 'bulawayo uni'],
  },
  {
    name: 'Bulawayo City Hall',
    display: 'Bulawayo City Hall, City Centre',
    coords: { lat: -20.1494, lon: 28.5806 },
    category: 'Government',
    aliases: ['city hall', 'cityhall', 'city center', 'city centre', 'byo city hall', 'bulawayo city', 'cbd', 'town hall'],
  },
  {
    name: 'Bulawayo Railway Station',
    display: 'Bulawayo Railway Station, City Centre',
    coords: { lat: -20.1501, lon: 28.5791 },
    category: 'Transport',
    aliases: ['railway', 'train station', 'railway station', 'nrz', 'bulawayo station', 'train', 'station'],
  },
  {
    name: 'Bulawayo Central Hospital',
    display: 'Bulawayo Central Hospital',
    coords: { lat: -20.1467, lon: 28.5921 },
    category: 'Hospital',
    aliases: ['central hospital', 'bch', 'hospital', 'bulawayo hospital', 'central hosp'],
  },
  {
    name: 'Mpilo Central Hospital',
    display: 'Mpilo Central Hospital',
    coords: { lat: -20.1735, lon: 28.5659 },
    category: 'Hospital',
    aliases: ['mpilo', 'mpilo hospital', 'mpillo'],
  },
  {
    name: 'Joshua Mqabuko Nkomo International Airport',
    display: 'Joshua M. Nkomo International Airport (BUQ)',
    coords: { lat: -20.0173, lon: 28.6178 },
    category: 'Airport',
    aliases: ['airport', 'byo airport', 'bulawayo airport', 'nkomo airport', 'jm nkomo', 'jmn', 'buq'],
  },
  {
    name: 'Bulawayo Natural History Museum',
    display: 'Natural History Museum of Zimbabwe, Bulawayo',
    coords: { lat: -20.1553, lon: 28.5896 },
    category: 'Attraction',
    aliases: ['museum', 'natural history museum', 'history museum', 'bul museum', 'nhm', 'natural museum'],
  },
  {
    name: 'Centenary Park',
    display: 'Centenary Park, Bulawayo',
    coords: { lat: -20.1512, lon: 28.5915 },
    category: 'Park',
    aliases: ['centenary park', 'centenary', 'century park', 'central park byo'],
  },
  {
    name: 'Leopard Rock (State House)',
    display: 'State House Area, Hillside, Bulawayo',
    coords: { lat: -20.1671, lon: 28.6168 },
    category: 'Government',
    aliases: ['state house', 'leopard rock', 'hillside'],
  },
  {
    name: 'Raylton Sports Club',
    display: 'Raylton Sports Club, Bulawayo',
    coords: { lat: -20.1448, lon: 28.5945 },
    category: 'Sports',
    aliases: ['raylton', 'raylton sports', 'raylton club'],
  },
  {
    name: 'Queens Sports Club',
    display: 'Queens Sports Club (Cricket), Bulawayo',
    coords: { lat: -20.1457, lon: 28.5949 },
    category: 'Sports',
    aliases: ['queens', 'queens sports', 'queens club', 'cricket ground', 'bulawayo cricket'],
  },
  {
    name: 'Hlalani Flats',
    display: 'Hlalani Flats, Bulawayo',
    coords: { lat: -20.1499, lon: 28.5832 },
    category: 'Area',
    aliases: ['hlalani', 'hlalani flats'],
  },
  {
    name: 'Entumbane',
    display: 'Entumbane, Bulawayo',
    coords: { lat: -20.1825, lon: 28.5590 },
    category: 'Suburb',
    aliases: ['entumbane', 'entumbani'],
  },
  {
    name: 'Emakhandeni',
    display: 'Emakhandeni, Bulawayo',
    coords: { lat: -20.1950, lon: 28.5581 },
    category: 'Suburb',
    aliases: ['emakhandeni', 'makhandeni'],
  },
  {
    name: 'Nkulumane',
    display: 'Nkulumane, Bulawayo',
    coords: { lat: -20.1737, lon: 28.5442 },
    category: 'Suburb',
    aliases: ['nkulumane', 'nkulu'],
  },
  {
    name: 'Pumula',
    display: 'Pumula, Bulawayo',
    coords: { lat: -20.2117, lon: 28.5700 },
    category: 'Suburb',
    aliases: ['pumula'],
  },
  {
    name: 'Cowdray Park',
    display: 'Cowdray Park, Bulawayo',
    coords: { lat: -20.2181, lon: 28.5945 },
    category: 'Suburb',
    aliases: ['cowdray', 'cowdray park', 'cowdrey park'],
  },
  {
    name: 'Tshabalala Game Sanctuary',
    display: 'Tshabalala Game Sanctuary, Bulawayo',
    coords: { lat: -20.2003, lon: 28.5522 },
    category: 'Attraction',
    aliases: ['tshabalala', 'game sanctuary', 'tshabalala sanctuary'],
  },
  {
    name: 'Bulawayo Show Grounds',
    display: 'Zimbabwe International Trade Fair, Bulawayo',
    coords: { lat: -20.1394, lon: 28.5971 },
    category: 'Venue',
    aliases: ['show grounds', 'showgrounds', 'trade fair', 'zitf', 'exhibition', 'zimbabwe show'],
  },
  {
    name: 'Robert Tredgold Building',
    display: 'Robert Tredgold Building (Magistrates Court), CBD',
    coords: { lat: -20.1534, lon: 28.5853 },
    category: 'Government',
    aliases: ['tredgold', 'magistrates court', 'court', 'tredgold building'],
  },
  {
    name: 'Large City Hall Park',
    display: 'City Hall Gardens, Bulawayo CBD',
    coords: { lat: -20.1500, lon: 28.5810 },
    category: 'Park',
    aliases: ['city hall park', 'cbd park', 'city park', 'main park'],
  },
];

// ─── FUZZY MATCHING ───────────────────────────────────────────────────────────

/**
 * Simple Levenshtein distance — counts minimum single-character edits
 * needed to turn string `a` into string `b`.
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Score a query against an alias or POI name.
 * Lower score = better match.
 * Returns null if the match is too poor to show.
 */
function scoreMatch(query, candidate) {
  const q = query.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();

  if (q.length < 2) return null;

  // Exact or substring win
  if (c === q) return 0;
  if (c.startsWith(q)) return 1;
  if (c.includes(q)) return 2;
  if (q.includes(c) && q.length - c.length <= 3) return 2;

  // Word-level: check if any word in the query appears in the candidate
  const queryWords = q.split(/\s+/);
  const candidateWords = c.split(/\s+/);
  for (const qw of queryWords) {
    if (qw.length >= 3 && candidateWords.some(cw => cw.startsWith(qw))) return 3;
  }

  // Fuzzy: tolerate up to 2 character edits for short words, 3 for longer
  const maxDist = q.length <= 5 ? 1 : q.length <= 8 ? 2 : 3;
  const dist = levenshtein(q, c);
  if (dist <= maxDist) return 4 + dist;

  // Token-by-token fuzzy: split query words and check against candidate words
  for (const qw of queryWords) {
    if (qw.length < 3) continue;
    for (const cw of candidateWords) {
      const d = levenshtein(qw, cw);
      if (d <= Math.min(2, Math.floor(qw.length / 3))) return 5 + d;
    }
  }

  return null;
}

/**
 * Search Bulawayo POI database for a query.
 * Returns up to `limit` results sorted best-first.
 *
 * @param {string} query - What the user typed (may have typos)
 * @param {number} limit - Max results to return (default 5)
 * @returns {Array<{ name, display, coords, category }>}
 */
export function fuzzySearchPOI(query, limit = 5) {
  if (!query || query.trim().length < 2) return [];

  const results = [];

  for (const poi of BULAWAYO_POIS) {
    let bestScore = null;

    // Check the primary name
    const nameScore = scoreMatch(query, poi.name);
    if (nameScore !== null) bestScore = nameScore;

    // Check every alias
    for (const alias of poi.aliases) {
      const s = scoreMatch(query, alias);
      if (s !== null && (bestScore === null || s < bestScore)) {
        bestScore = s;
      }
    }

    if (bestScore !== null) {
      results.push({ ...poi, _score: bestScore });
    }
  }

  return results
    .sort((a, b) => a._score - b._score)
    .slice(0, limit)
    .map(({ _score, aliases, ...poi }) => poi); // Strip internal fields
}
