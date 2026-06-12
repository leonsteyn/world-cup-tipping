// ─── Supabase connection ───────────────────────────────────────────────────
// SUPABASE_URL and SUPABASE_ANON_KEY are injected at build time by Netlify
// into js/env-config.js (generated from environment variables, never committed).
// See netlify.toml [build] command and SETUP.md for details.

// ─── Tournament config ─────────────────────────────────────────────────────
// Swap this object to reuse the app for a different tournament.
const TOURNAMENT = {
  code:       'WC2026',
  name:       'FIFA World Cup 2026',
  subtitle:   'USA · Canada · Mexico',
  emoji:      '⚽',
  startDate:  '2026-06-11',
  endDate:    '2026-07-19',
  themeColor: '#1d4ed8',
  stages: {
    GROUP_STAGE:    'Group Stage',
    LAST_32:        'Round of 32',
    LAST_16:        'Round of 16',
    QUARTER_FINALS: 'Quarter-finals',
    SEMI_FINALS:    'Semi-finals',
    THIRD_PLACE:    'Third Place Playoff',
    FINAL:          'Final',
  },
};
