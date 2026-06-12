/**
 * Netlify Scheduled Function: scheduled-sync
 *
 * Runs every hour to keep match results up to date automatically,
 * without needing a user to visit the site.
 *
 * Schedule: "0 * * * *" = top of every hour (UTC)
 * During the World Cup group stage there are ~6 matches/day so
 * hourly is plenty. You can tighten to "*/30 * * * *" (every 30 min)
 * if you want faster result updates during busy match days.
 */

export const config = {
  schedule: '0 * * * *',
};

export default async function handler() {
  const { SYNC_SECRET, URL: siteUrl = 'https://mrssteynworldcuptipping.netlify.app' } = process.env;

  console.log('[scheduled-sync] Running hourly sync…');

  const headers = { 'Content-Type': 'application/json' };
  if (SYNC_SECRET) headers['x-sync-secret'] = SYNC_SECRET;

  try {
    const res = await fetch(`${siteUrl}/.netlify/functions/sync-matches`, { headers });
    const body = await res.json();

    if (res.ok) {
      console.log('[scheduled-sync] ✓', JSON.stringify(body));
    } else {
      console.error('[scheduled-sync] ✗ HTTP', res.status, JSON.stringify(body));
    }
  } catch (err) {
    console.error('[scheduled-sync] Error:', err.message);
  }
}
