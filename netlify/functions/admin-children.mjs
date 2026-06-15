/**
 * Netlify Function: admin-children
 *
 * CRUD for child accounts. All requests require a valid parent JWT in the
 * Authorization header.
 *
 * GET    /admin-children           → list this parent's children
 * POST   /admin-children           → create child { username, display_name, password }
 * PATCH  /admin-children           → update child { id, display_name?, username?, password? }
 * DELETE /admin-children?id=<uuid> → delete child
 *
 * Children get synthetic Supabase Auth accounts with email:
 *   <username>@child.mrssteynsgames.local
 * This lets them use RLS-protected tables with a real auth.uid().
 */

const CHILD_EMAIL_DOMAIN = 'child.mrssteynsgames.local';

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: cors });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: cors });
  }

  // ── Authenticate the caller ──────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: cors });
  }

  const meRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: cors });
  }
  const me = await meRes.json();
  const parentId = me.id;

  // Confirm they are a parent
  const profileRes = await sb(SUPABASE_URL, SUPABASE_SERVICE_KEY,
    `profiles?id=eq.${parentId}&select=account_type&limit=1`
  );
  const profiles = await profileRes.json();
  if (!profiles.length || profiles[0].account_type !== 'parent') {
    return new Response(JSON.stringify({ error: 'Forbidden: parent account required' }), { status: 403, headers: cors });
  }

  // ── Route by method ──────────────────────────────────────────────────────
  switch (req.method) {
    case 'GET':    return listChildren(SUPABASE_URL, SUPABASE_SERVICE_KEY, parentId, cors);
    case 'POST':   return createChild(SUPABASE_URL, SUPABASE_SERVICE_KEY, parentId, req, cors);
    case 'PATCH':  return updateChild(SUPABASE_URL, SUPABASE_SERVICE_KEY, parentId, req, cors);
    case 'DELETE': return deleteChild(SUPABASE_URL, SUPABASE_SERVICE_KEY, parentId, req, cors);
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function listChildren(url, key, parentId, cors) {
  const res = await sb(url, key,
    `child_accounts?parent_id=eq.${parentId}&select=id,username,display_name,created_at&order=display_name`
  );
  const data = await res.json();
  return new Response(JSON.stringify(data), { status: 200, headers: cors });
}

async function createChild(url, key, parentId, req, cors) {
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: cors });
  }

  const { username, display_name, password } = body ?? {};
  if (!username || !display_name || !password) {
    return new Response(
      JSON.stringify({ error: 'username, display_name and password are required' }),
      { status: 400, headers: cors }
    );
  }
  if (password.length < 6) {
    return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400, headers: cors });
  }

  const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '');
  if (!cleanUsername) {
    return new Response(JSON.stringify({ error: 'Invalid username' }), { status: 400, headers: cors });
  }
  const loginEmail = `${cleanUsername}@${CHILD_EMAIL_DOMAIN}`;

  // Create Supabase Auth user
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: loginEmail,
      password,
      email_confirm: true,  // skip email confirmation for child accounts
      user_metadata: { display_name, account_type: 'child' },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    // Surface username-already-taken clearly
    if (err.msg?.includes('already been registered') || err.message?.includes('already')) {
      return new Response(JSON.stringify({ error: 'Username is already taken' }), { status: 409, headers: cors });
    }
    console.error('[admin-children] create user failed', err);
    return new Response(JSON.stringify({ error: 'Failed to create account' }), { status: 500, headers: cors });
  }

  const { id: childId } = await createRes.json();

  // Insert into profiles
  await fetch(`${url}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify({ id: childId, display_name, account_type: 'child' }),
  });

  // Insert into child_accounts
  const caRes = await fetch(`${url}/rest/v1/child_accounts`, {
    method: 'POST',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify({ id: childId, parent_id: parentId, username: cleanUsername, display_name, login_email: loginEmail }),
  });

  if (!caRes.ok) {
    // Rollback: delete the auth user
    await fetch(`${url}/auth/v1/admin/users/${childId}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return new Response(JSON.stringify({ error: 'Failed to save child account' }), { status: 500, headers: cors });
  }

  return new Response(
    JSON.stringify({ id: childId, username: cleanUsername, display_name }),
    { status: 201, headers: cors }
  );
}

async function updateChild(url, key, parentId, req, cors) {
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: cors });
  }

  const { id, display_name, username, password } = body ?? {};
  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400, headers: cors });
  }

  // Verify ownership
  const owned = await isOwnedByParent(url, key, id, parentId);
  if (!owned) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors });
  }

  // Update auth user if password or username changed
  const authUpdate = {};
  if (password) {
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400, headers: cors });
    }
    authUpdate.password = password;
  }

  let newLoginEmail;
  if (username) {
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '');
    newLoginEmail = `${cleanUsername}@${CHILD_EMAIL_DOMAIN}`;
    authUpdate.email = newLoginEmail;
  }

  if (Object.keys(authUpdate).length) {
    const updRes = await fetch(`${url}/auth/v1/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authUpdate),
    });
    if (!updRes.ok) {
      const err = await updRes.json();
      if (err.msg?.includes('already') || err.message?.includes('already')) {
        return new Response(JSON.stringify({ error: 'Username is already taken' }), { status: 409, headers: cors });
      }
      return new Response(JSON.stringify({ error: 'Failed to update account' }), { status: 500, headers: cors });
    }
  }

  // Update child_accounts row
  const caFields = {};
  if (display_name) caFields.display_name = display_name;
  if (username)     caFields.username = username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '');
  if (newLoginEmail) caFields.login_email = newLoginEmail;

  if (Object.keys(caFields).length) {
    await fetch(`${url}/rest/v1/child_accounts?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify(caFields),
    });
  }

  // Update profiles row
  if (display_name) {
    await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify({ display_name }),
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
}

async function deleteChild(url, key, parentId, req, cors) {
  const childId = new URL(req.url).searchParams.get('id');
  if (!childId) {
    return new Response(JSON.stringify({ error: 'id query param required' }), { status: 400, headers: cors });
  }

  const owned = await isOwnedByParent(url, key, childId, parentId);
  if (!owned) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: cors });
  }

  // Delete Supabase Auth user — cascades to profiles + child_accounts via FK
  const delRes = await fetch(`${url}/auth/v1/admin/users/${childId}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  if (!delRes.ok) {
    return new Response(JSON.stringify({ error: 'Failed to delete account' }), { status: 500, headers: cors });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function isOwnedByParent(url, key, childId, parentId) {
  const res = await sb(url, key,
    `child_accounts?id=eq.${childId}&parent_id=eq.${parentId}&select=id&limit=1`
  );
  const rows = await res.json();
  return rows.length > 0;
}

function sb(url, key, path) {
  return fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
}
