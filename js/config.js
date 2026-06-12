// ─── Supabase connection ───────────────────────────────────────────────────
// Replace these with your project values from https://supabase.com/dashboard
const SUPABASE_URL     = 'https://blxqvbtsrwjjnatflfrz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseHF2YnRzcndqam5hdGZsZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjEwMDksImV4cCI6MjA5NjgzNzAwOX0.ICrMj2ZpWSlKPM0QU79WuYARVWk68URlPBvg-GKq3kg';

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
