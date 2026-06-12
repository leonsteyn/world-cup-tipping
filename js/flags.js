// Converts an ISO 3166-1 alpha-2 country code to a flag emoji.
// football-data.org returns area.countryCode (alpha-2) on each team object.
function flagFromCode(alpha2) {
  if (!alpha2 || alpha2.length !== 2) return '🏳️';
  const offset = 127397;
  return [...alpha2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + offset)).join('');
}

// Fallback map for team names that don't map cleanly to a country code
// (e.g. England/Scotland/Wales have GB- codes that don't produce standard flags)
const FLAG_OVERRIDES = {
  'England':              '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Scotland':             '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Wales':                '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Kosovo':               '🇽🇰',
  'Chinese Taipei':       '🇹🇼',
  'DR Congo':             '🇨🇩',
  "Côte d'Ivoire":        '🇨🇮',
  'Ivory Coast':          '🇨🇮',
  'Cape Verde':           '🇨🇻',
  'Trinidad and Tobago':  '🇹🇹',
  'South Korea':          '🇰🇷',
  'North Korea':          '🇰🇵',
  'Czech Republic':       '🇨🇿',
  'Tahiti':               '🇵🇫',
};

function getFlag(teamName, countryCode) {
  if (FLAG_OVERRIDES[teamName]) return FLAG_OVERRIDES[teamName];
  if (countryCode) return flagFromCode(countryCode);
  return '🏳️';
}
