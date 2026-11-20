import { signOut } from 'firebase/auth';
import { auth } from './firebase.js';
import { homeFor, menuFor } from './roles.js';
import { authReady, me, heartbeat, logoutServer } from './api.js';
import { getSession, saveSession, clearSession } from './session.js';

// Call at the top of every protected page:  const user = guard(['admin']);  if (user) { ... }
// Instant check from the remembered login, then a background check with the server.
export function guard(requiredRoles) {
  const user = getSession();
  if (!user) { window.location.href = '/'; return null; }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    window.location.href = homeFor(user.role);
    return null;
  }
  verifyWithServer(user);
  return user;
}

async function verifyWithServer(cached) {
  const firebaseUser = await authReady;
  if (!firebaseUser) { clearSession(); window.location.href = '/'; return; }
  try {
    const fresh = await me();
    if (fresh.role !== cached.role) {           // role changed in the database
      saveSession(fresh);
      window.location.href = homeFor(fresh.role);
    }
  } catch (err) {
    if (err.code === 'NO_PROFILE') {            // Firebase account without a role row
      clearSession();
      await signOut(auth).catch(() => {});
      window.location.href = '/';
    }
    // other errors (server restarting, offline): stay on the page
  }
}

export function renderTopbar(user) {
  // Find the div. We keep the ID 'topbar' so the HTML pages don't change.
  const sidebar = document.getElementById('topbar');
  if (!sidebar) return;

  const links = menuFor(user.role)
    .map(m => `<a href="${m.href}" class="block px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded transition-colors mb-1 font-medium">${m.label}</a>`)
    .join('');

  sidebar.innerHTML = `
    <div class="fixed inset-y-0 left-0 w-64 bg-slate-800 text-white shadow-xl flex flex-col z-50">
      <div class="p-6 border-b border-slate-700 bg-slate-900">
        <h1 class="text-2xl font-bold tracking-wider text-blue-400">ERP System</h1>
      </div>
      <nav class="flex-1 px-4 py-6 overflow-y-auto">
        ${links}
      </nav>
      <div class="p-4 border-t border-slate-700 bg-slate-900">
        <div class="text-sm font-bold text-white mb-1 capitalize">${user.username}</div>
        <div class="text-xs text-slate-400 mb-3 uppercase tracking-wider">${user.role}</div>
        <button id="logoutBtn" class="w-full bg-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-700 transition">Logout</button>
      </div>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await logoutServer(); } catch { /* still log out locally */ }
    clearSession();
    await signOut(auth).catch(() => {});
    window.location.href = '/';
  });

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
