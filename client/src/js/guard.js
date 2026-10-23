// Call protect([...roles]) at the top of every protected page.
// - not logged in / wrong role  -> sent back to the login page
// - allowed                     -> draws the top bar with role-based menu
import { getSession, logout } from './api.js';
import { NAV, ROLE_LABEL } from './roles.js';
import { esc } from './util.js';

export function protect(allowedRoles) {
  const user = getSession();
  const allowed = user && (user.role === 'admin' || allowedRoles.includes(user.role));
  if (!allowed) {
    window.location.href = '/index.html';
    return null;
  }

  const here = window.location.pathname;
  const links = NAV.filter((n) => n.roles.includes(user.role))
    .map((n) => {
      const active = here === n.href;
      return `<a href="${n.href}" class="px-3 py-1 rounded ${active ? 'bg-white/25' : 'hover:bg-white/15'}">${n.label}</a>`;
    })
    .join('');

  document.getElementById('app-header').innerHTML = `
    <div class="bg-indigo-700 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-6">
        <span class="font-bold text-lg">ERP System</span>
        <nav class="flex gap-1 text-sm">${links}</nav>
      </div>
      <div class="text-sm flex items-center gap-4">
        <span>${esc(user.name)} <span class="opacity-70">(${esc(ROLE_LABEL[user.role])})</span></span>
        <button id="logout" class="bg-white/20 hover:bg-white/30 rounded px-3 py-1">Logout</button>
      </div>
    </div>`;

  document.getElementById('logout').addEventListener('click', () => {
    logout();
    window.location.href = '/index.html';
  });
  return user;
}
