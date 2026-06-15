/**
 * Complete lookup for all 48 FIFA World Cup 2026 teams.
 * Provides flag emoji and FIFA world ranking (June 2026) for each nation.
 *
 * Rankings source: FIFA Men's World Rankings, June 2026.
 * Team names match football-data.org API response values (incl. common aliases).
 */

const TEAMS = {
  // ── UEFA (16) ────────────────────────────────────────────────────────────
  'France':                   { rank: 1,   flag: '🇫🇷' },
  'Spain':                    { rank: 2,   flag: '🇪🇸' },
  'England':                  { rank: 4,   flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'Portugal':                 { rank: 5,   flag: '🇵🇹' },
  'Netherlands':              { rank: 7,   flag: '🇳🇱' },
  'Belgium':                  { rank: 9,   flag: '🇧🇪' },
  'Germany':                  { rank: 10,  flag: '🇩🇪' },
  'Croatia':                  { rank: 11,  flag: '🇭🇷' },
  'Switzerland':              { rank: 19,  flag: '🇨🇭' },
  'Denmark':                  { rank: 20,  flag: '🇩🇰' },
  'Turkey':                   { rank: 23,  flag: '🇹🇷' },
  'Türkiye':                  { rank: 23,  flag: '🇹🇷' },
  'Austria':                  { rank: 25,  flag: '🇦🇹' },
  'Norway':                   { rank: 32,  flag: '🇳🇴' },
  'Sweden':                   { rank: 39,  flag: '🇸🇪' },
  'Czechia':                  { rank: 41,  flag: '🇨🇿' },
  'Czech Republic':           { rank: 41,  flag: '🇨🇿' },
  'Scotland':                 { rank: 43,  flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  'Bosnia and Herzegovina':   { rank: 64,  flag: '🇧🇦' },
  'Bosnia & Herzegovina':     { rank: 64,  flag: '🇧🇦' },
  'Bosnia and Herzegovinia':  { rank: 64,  flag: '🇧🇦' },
  'Bosnia & Herzegovinia':    { rank: 64,  flag: '🇧🇦' },

  // ── CONMEBOL (6) ─────────────────────────────────────────────────────────
  'Argentina':                { rank: 3,   flag: '🇦🇷' },
  'Brazil':                   { rank: 6,   flag: '🇧🇷' },
  'Colombia':                 { rank: 13,  flag: '🇨🇴' },
  'Uruguay':                  { rank: 17,  flag: '🇺🇾' },
  'Ecuador':                  { rank: 24,  flag: '🇪🇨' },
  'Paraguay':                 { rank: 42,  flag: '🇵🇾' },

  // ── CONCACAF (6) ─────────────────────────────────────────────────────────
  'Mexico':                   { rank: 15,  flag: '🇲🇽' },
  'United States':            { rank: 16,  flag: '🇺🇸' },
  'USA':                      { rank: 16,  flag: '🇺🇸' },
  'Canada':                   { rank: 31,  flag: '🇨🇦' },
  'Panama':                   { rank: 35,  flag: '🇵🇦' },
  'Honduras':                 { rank: 77,  flag: '🇭🇳' },
  'Haiti':                    { rank: 83,  flag: '🇭🇹' },
  'Curaçao':                  { rank: 85,  flag: '🇨🇼' },
  'Curacao':                  { rank: 85,  flag: '🇨🇼' },

  // ── CAF (9) ──────────────────────────────────────────────────────────────
  'Morocco':                  { rank: 8,   flag: '🇲🇦' },
  'Nigeria':                  { rank: 27,  flag: '🇳🇬' },
  'Algeria':                  { rank: 29,  flag: '🇩🇿' },
  'Egypt':                    { rank: 30,  flag: '🇪🇬' },
  'Cameroon':                 { rank: 45,  flag: '🇨🇲' },
  'Tunisia':                  { rank: 46,  flag: '🇹🇳' },
  'DR Congo':                 { rank: 47,  flag: '🇨🇩' },
  'Congo DR':                 { rank: 47,  flag: '🇨🇩' },
  'Democratic Republic of Congo': { rank: 47, flag: '🇨🇩' },
  'Ghana':                    { rank: 73,  flag: '🇬🇭' },
  "Côte d'Ivoire":            { rank: 58,  flag: '🇨🇮' },
  'Ivory Coast':              { rank: 58,  flag: '🇨🇮' },
  'Cape Verde':               { rank: 67,  flag: '🇨🇻' },
  'Cape Verde Islands':       { rank: 67,  flag: '🇨🇻' },
  'South Africa':             { rank: 66,  flag: '🇿🇦' },
  'Senegal':                  { rank: 14,  flag: '🇸🇳' },

  // ── AFC (8 + Iraq via playoff) ───────────────────────────────────────────
  'Japan':                    { rank: 18,  flag: '🇯🇵' },
  'Iran':                     { rank: 21,  flag: '🇮🇷' },
  'IR Iran':                  { rank: 21,  flag: '🇮🇷' },
  'South Korea':              { rank: 26,  flag: '🇰🇷' },
  'Korea Republic':           { rank: 26,  flag: '🇰🇷' },
  'Australia':                { rank: 28,  flag: '🇦🇺' },
  'Saudi Arabia':             { rank: 55,  flag: '🇸🇦' },
  'Qatar':                    { rank: 58,  flag: '🇶🇦' },
  'Jordan':                   { rank: 63,  flag: '🇯🇴' },
  'Uzbekistan':               { rank: 50,  flag: '🇺🇿' },
  'Iraq':                     { rank: 70,  flag: '🇮🇶' },

  // ── OFC (1) ──────────────────────────────────────────────────────────────
  'New Zealand':              { rank: 100, flag: '🇳🇿' },
};

/**
 * Returns the flag emoji for a team.
 * Tries the TEAMS lookup first (by name), then falls back to generating
 * the emoji from an ISO alpha-2 country code.
 */
function getFlag(teamName, countryCode) {
  if (teamName && TEAMS[teamName]) return TEAMS[teamName].flag;
  if (countryCode && countryCode.length === 2) {
    // Generate flag emoji from ISO 3166-1 alpha-2 code
    return [...countryCode.toUpperCase()]
      .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
      .join('');
  }
  return '🏳️';
}

/**
 * Returns the FIFA world ranking for a team, or null if unknown.
 */
function getRank(teamName) {
  return TEAMS[teamName]?.rank ?? null;
}

/**
 * Returns a formatted rank string, e.g. "#3" or "" if unknown.
 */
function rankLabel(teamName) {
  const r = getRank(teamName);
  return r ? `#${r}` : '';
}
