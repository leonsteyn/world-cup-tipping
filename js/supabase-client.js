// Shared helpers used by all pages.
// Depends on js/api.js being loaded first.

async function getUser()           { return SB.getUser(); }
async function getProfile(userId)  {
  const { data } = await SB.getOne('profiles', `id=eq.${userId}`);
  return data;
}
async function signOut() {
  await SB.signOut();
  window.location.href = 'index.html';
}

// ── Nav ───────────────────────────────────────────────────────────────────

async function renderNav(activePage) {
  const user = await getUser();
  const nav  = document.getElementById('nav');
  if (!nav) return;

  const pages = [
    { href: 'index.html',   label: '🏆 Leaderboard', key: 'leaderboard' },
    { href: 'matches.html', label: '📅 Fixtures',     key: 'fixtures'    },
    { href: 'groups.html',  label: '📊 Groups',       key: 'groups'      },
    { href: 'bracket.html', label: '🥊 Bracket',      key: 'bracket'     },
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
      <a href="https://mrssteynsgames.netlify.app" class="nav-home" title="Back to Mrs Steyn's Games">
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
