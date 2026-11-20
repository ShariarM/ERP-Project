import { homeFor, menuFor } from './roles.js';
import { heartbeat, logoutServer } from './api.js';

export function guard(requiredRoles) {
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('user');
  if (!token || !raw) { window.location.href = '/'; return null; }

  let user;
  try { user = JSON.parse(raw); } catch { window.location.href = '/'; return null; }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    window.location.href = homeFor(user.role);
    return null;
  }
  return user;
}

export function renderTopbar(user) {
  const mount = document.getElementById('topbar');
  if (!mount) return;

  const iconPaths = {
    Dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    Customers: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14a5 5 0 0 1 3 5v1"/>',
    Accounting: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 3h8"/>',
    Marketing: '<path d="m3 11 18-5-5 18-4-8-9-5Z"/><path d="m12 16 4-5"/>',
    Inventory: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5M12 13v8"/>',
    Attendance: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    Leave: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 5h6"/>'
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const initials = String(user.username || 'U').trim().slice(0, 2);
  const links = menuFor(user.role).map(item => {
    const active = window.location.pathname === item.href;
    return `<a href="${item.href}" class="sidebar-link${active ? ' is-active' : ''}"${active ? ' aria-current="page"' : ''}>
      <span class="sidebar-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${iconPaths[item.label] || ''}</svg></span>
      <span>${item.label}</span>
    </a>`;
  }).join('');
  const currentPage = menuFor(user.role).find(item => window.location.pathname === item.href);
  const name = escape(user.username || 'User');
  const role = escape(user.role || '');
  const avatar = escape(initials);

  mount.innerHTML = `
    <button class="sidebar-overlay" id="sidebarOverlay" type="button" aria-label="Close navigation"></button>
    <aside class="app-sidebar" aria-label="Main navigation">
      <a class="sidebar-brand" href="${currentPage ? currentPage.href : '/'}" aria-label="TaskMatrix home">
        <span class="brand-mark">T</span>
        <span><span class="brand-name">TaskMatrix</span><span class="brand-caption">Business suite</span></span>
      </a>
      <div class="sidebar-section-label">Workspace</div>
      <nav class="sidebar-nav">${links}</nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <span class="user-avatar">${avatar}</span>
          <span><span class="user-name">${name}</span><span class="user-role">${role}</span></span>
        </div>
        <button id="logoutBtn" class="logout-button" type="button">Log out</button>
      </div>
    </aside>
    <header class="app-topbar">
      <div class="topbar-left">
        <button class="topbar-toggle" id="sidebarToggle" type="button" aria-label="Open navigation" aria-expanded="false">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div class="topbar-context">Workspace${currentPage ? ` <span aria-hidden="true">/</span> <strong>${currentPage.label}</strong>` : ''}</div>
      </div>
      <div class="topbar-profile">
        <span class="user-avatar">${avatar}</span>
        <span><span class="user-name">${name}</span><span class="user-role">${role}</span></span>
      </div>
    </header>
  `;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await logoutServer(); } catch { /* still log out locally */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  });

  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');
  const closeMenu = () => {
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  overlay.addEventListener('click', closeMenu);
  mount.querySelectorAll('.sidebar-link').forEach(link => link.addEventListener('click', closeMenu));

  startHeartbeat();
}

// "I'm still here" signal: lets the admin dashboard show who is online
let beat = null;
function startHeartbeat() {
  if (beat) return;
  const ping = () => heartbeat().catch(() => { /* offline or server restarting: try again next time */ });
  ping();
  beat = setInterval(ping, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') ping(); // e.g. laptop woke up
  });
}