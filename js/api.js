/**
 * Lightweight Supabase REST + Auth wrapper using native fetch.
 * Replaces the @supabase/supabase-js CDN library — no eval, no CSP issues.
 *
 * Depends on: SUPABASE_URL and SUPABASE_ANON_KEY (from js/env-config.js)
 */

const SB = (() => {
  const SESSION_KEY = 'sb_session';

  // ── Session helpers ────────────────────────────────────────────────────

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }

  function saveSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else   localStorage.removeItem(SESSION_KEY);
  }

  function getToken() {
    return getSession()?.access_token ?? null;
  }

  // ── Auth API ───────────────────────────────────────────────────────────

  async function signUp(email, password) {
    const res  = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { user: null, error: data.msg || data.message || 'Sign-up failed' };
    if (data.session) saveSession(data.session);
    return { user: data.user, session: data.session, error: null };
  }

  async function signIn(email, password) {
    const res  = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { user: null, error: data.error_description || data.msg || 'Login failed' };
    saveSession(data);
    return { user: data.user, error: null };
  }

  async function getUser() {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { saveSession(null); return null; }
    return await res.json();
  }

  async function signOut() {
    const token = getToken();
    if (token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    saveSession(null);
  }

  // ── DB helpers ─────────────────────────────────────────────────────────

  function dbHeaders(extra = {}) {
    const token = getToken();
    return {
      apikey:        SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Accept:         'application/json',
      ...extra,
    };
  }

  /** GET rows. `params` is a PostgREST query string, e.g. "select=*&status=eq.FINISHED" */
  async function get(table, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`;
    const res = await fetch(url, { headers: dbHeaders() });
    const data = await res.json();
    if (!res.ok) return { data: null, error: data };
    return { data, error: null };
  }

  /** GET a single row (returns first match or null) */
  async function getOne(table, params = '') {
    const { data, error } = await get(table, params + '&limit=1');
    return { data: data?.[0] ?? null, error };
  }

  /** GET with exact count. Returns { data, count, error } */
  async function getCount(table, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`;
    const res = await fetch(url, {
      headers: dbHeaders({ Prefer: 'count=exact', Accept: 'application/json' }),
    });
    const count = parseInt(res.headers.get('content-range')?.split('/')[1] ?? '0', 10);
    const data  = await res.json();
    if (!res.ok) return { data: null, count: 0, error: data };
    return { data, count, error: null };
  }

  /** INSERT one or many rows */
  async function insert(table, body) {
    const res  = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:  'POST',
      headers: dbHeaders({ Prefer: 'return=representation' }),
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: data };
    return { data, error: null };
  }

  /** UPSERT — merges on the given conflict column */
  async function upsert(table, body, onConflict) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method:  'POST',
      headers: dbHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body:    JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json(); return { error: e }; }
    return { error: null };
  }

  return { getSession, saveSession, getToken, signUp, signIn, getUser, signOut, get, getOne, getCount, insert, upsert };
})();
