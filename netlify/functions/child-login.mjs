/**
 * Netlify Function: child-login
 *
 * Signs a child in by username + password.
 * Looks up the child's login_email from child_accounts (requires service key
 * since the user has no session yet), then calls Supabase Auth and returns
 * the session to the client.
 *
 * POST body: { username: string, password: string }
 * Response:  { session: { access_token, refresh_token, ... } }
 */
export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: cors });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: cors });
  }

  const { username, password } = body ?? {};
  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'username and password are required' }), { status: 400, headers: cors });
  }

  // Look up the child's login_email via service key
  const lookupRes = await fetch(
    `${SUPABASE_URL}/rest/v1/child_accounts?username=eq.${encodeURIComponent(username.toLowerCase().trim())}&select=login_email&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!lookupRes.ok) {
    console.error('[child-login] lookup failed', await lookupRes.text());
    return new Response(JSON.stringify({ error: 'Service error' }), { status: 500, headers: cors });
  }

  const rows = await lookupRes.json();
  if (!rows.length) {
    // Return the same message as a wrong password to avoid username enumeration
    return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401, headers: cors });
  }

  const { login_email } = rows[0];

  // Sign in via Supabase Auth
  const authRes = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: login_email, password }),
    }
  );

  const authBody = await authRes.json();

  if (!authRes.ok) {
    // Supabase returns 400 with error_description for wrong password
    return new Response(
      JSON.stringify({ error: 'Invalid username or password' }),
      { status: 401, headers: cors }
    );
  }

  return new Response(JSON.stringify({ session: authBody }), { status: 200, headers: cors });
}
