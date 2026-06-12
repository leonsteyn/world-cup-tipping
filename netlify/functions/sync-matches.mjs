/**
 * Netlify Function: sync-matches
 *
 * Fetches the latest FIFA World Cup 2026 fixtures and results from
 * football-data.org and upserts them into Supabase.
 *
 * Called by the client on page load (matches.html). A 5-minute cache
 * is enforced to stay within the free-tier rate limit (10 req/min).
 *
 * Environment variables required (set in Netlify dashboard):
 *   FOOTBALL_DATA_API_KEY   — from football-data.org (free)
 *   SUPABASE_URL            — your Supabase project URL
 *   SUPABASE_SERVICE_KEY    — service_role key (bypasses RLS for writes)
 *   TOURNAMENT_CODE         — DB tournament code, e.g. WC2026
 *   COMPETITION_CODE        — football-data.org code, e.g. WC
 */

const CACHE_SECONDS = 300; // 5 minutes

export default async function handler(req, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const {
    FOOTBALL_DATA_API_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    SYNC_SECRET,
    TOURNAMENT_CODE  = 'WC2026',
    COMPETITION_CODE = 'WC',
  } = process.env;

  if (!FOOTBALL_DATA_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing environment variables. See SETUP.md.' }),
      { status: 500, headers }
    );
  }

  // If SYNC_SECRET is set, server-to-server calls (e.g. scheduled function) must
  // pass it via the x-sync-secret header. Browser calls from the site are always
  // allowed — the 5-minute cache prevents API abuse from that direction.
  if (SYNC_SECRET) {
    const origin = req.headers.get('origin') ?? '';
    const isFromOurSite = origin.includes('netlify.app') || origin.includes('mrssteyn');
    const providedSecret = req.headers.get('x-sync-secret');
    if (!isFromOurSite && providedSecret !== SYNC_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }
  }

  // ── Check last sync time ────────────────────────────────────────────────
  // Read the most recently synced match timestamp to avoid hammering the API.
  const lastSyncRes = await supabaseFetch(SUPABASE_URL, SUPABASE_SERVICE_KEY,
    `matches?tournament_code=eq.${TOURNAMENT_CODE}&order=last_synced.desc&limit=1&select=last_synced`
  );

  if (lastSyncRes.ok) {
    const rows = await lastSyncRes.json();
    if (rows.length > 0 && rows[0].last_synced) {
      const age = (Date.now() - new Date(rows[0].last_synced).getTime()) / 1000;
      if (age < CACHE_SECONDS) {
        return new Response(
          JSON.stringify({ cached: true, next_sync_in: Math.round(CACHE_SECONDS - age) }),
          { status: 200, headers }
        );
      }
    }
  }

  // ── Fetch from football-data.org ────────────────────────────────────────
  const fdRes = await fetch(
    `https://api.football-data.org/v4/competitions/${COMPETITION_CODE}/matches`,
    { headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY } }
  );

  if (!fdRes.ok) {
    const text = await fdRes.text();
    return new Response(
      JSON.stringify({ error: `football-data.org error ${fdRes.status}`, detail: text }),
      { status: 502, headers }
    );
  }

  const { matches } = await fdRes.json();
  if (!Array.isArray(matches)) {
    return new Response(JSON.stringify({ error: 'Unexpected API response' }), { status: 502, headers });
  }

  // ── Transform ───────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const rows = matches.map(m => ({
    tournament_code:     TOURNAMENT_CODE,
    external_id:         m.id,
    match_date:          m.utcDate,
    team1:               m.homeTeam?.name ?? 'TBD',
    team2:               m.awayTeam?.name ?? 'TBD',
    team1_code:          m.homeTeam?.tla  ?? null,
    team2_code:          m.awayTeam?.tla  ?? null,
    team1_country_code:  m.homeTeam?.area?.code ?? null,
    team2_country_code:  m.awayTeam?.area?.code ?? null,
    stage:               m.stage     ?? 'GROUP_STAGE',
    group_name:          m.group     ? m.group.replace('GROUP_', 'Group ') : null,
    status:              mapStatus(m.status),
    result:              mapResult(m.score?.winner),
    team1_score:         m.score?.fullTime?.home ?? null,
    team2_score:         m.score?.fullTime?.away ?? null,
    last_synced:         now,
  }));

  // ── Upsert into Supabase ────────────────────────────────────────────────
  const upsertRes = await fetch(
    `${SUPABASE_URL}/rest/v1/matches?on_conflict=external_id`,
    {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    }
  );

  if (!upsertRes.ok) {
    const text = await upsertRes.text();
    return new Response(
      JSON.stringify({ error: 'Supabase upsert failed', detail: text }),
      { status: 500, headers }
    );
  }

  return new Response(
    JSON.stringify({ synced: rows.length, timestamp: now }),
    { status: 200, headers }
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapStatus(s) {
  if (!s) return 'SCHEDULED';
  if (['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(s)) return 'LIVE';
  if (s === 'FINISHED') return 'FINISHED';
  return 'SCHEDULED'; // SCHEDULED, TIMED, POSTPONED, CANCELLED, SUSPENDED
}

function mapResult(winner) {
  if (winner === 'HOME_TEAM') return 'TEAM1';
  if (winner === 'AWAY_TEAM') return 'TEAM2';
  if (winner === 'DRAW')      return 'DRAW';
  return null;
}

function supabaseFetch(url, key, path) {
  return fetch(`${url}/rest/v1/${path}`, {
    headers: {
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
    },
  });
}
