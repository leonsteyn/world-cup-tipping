// Initialise the Supabase client (config.js must be loaded first)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Auth helpers ──────────────────────────────────────────────────────────

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ─── Nav ───────────────────────────────────────────────────────────────────

async function renderNav(activePage) {
  const user = await getUser();
  const nav = document.getElementById('nav');
  if (!nav) return;

  const pages = [
    { href: 'index.html',   label: '🏆 Leaderboard', key: 'leaderboard' },
    { href: 'matches.html', label: '📅 Fixtures',     key: 'fixtures' },
  ];

  const links = pages.map(p =>
    `<a href="${p.href}" class="nav-link${activePage === p.key ? ' active' : ''}">${p.label}</a>`
  ).join('');

  const authSection = user
    ? `<a href="profile.html" class="nav-link${activePage === 'profile' ? ' active' : ''}">👤 My Picks</a>
       <button onclick="signOut()" class="btn-ghost">Sign out</button>`
    : `<a href="auth.html" class="btn-primary-sm">Register / Login</a>`;

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="https://mrssteyns-games.netlify.app" class="nav-home" title="Back to Mrs Steyn's Games">
        🎮 <span>Mrs Steyn's Games</span>
      </a>
      <div class="nav-center">
        <span class="nav-title">${TOURNAMENT.emoji} ${TOURNAMENT.name}</span>
      </div>
      <div class="nav-links">
        ${links}
        ${authSection}
      </div>
    </div>
  `;
}
