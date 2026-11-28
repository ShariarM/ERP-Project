import { signOut } from 'firebase/auth';
import { auth } from './firebase.js';
import { homeFor, menuFor } from './roles.js';
import { heartbeat, logoutServer, listNotifications, markNotificationRead } from './api.js';

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
      <div class="mt-4">
        <button id="notificationToggle" type="button"
          class="w-full flex items-center justify-between rounded-lg bg-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-600">
          <span>Notifications</span>
          <span id="notificationCount" class="rounded-full bg-red-600 px-2 py-1 text-xs">0</span>
        </button>
        <div id="notificationPanel" class="hidden mt-2 rounded-lg bg-white text-slate-800 shadow-lg overflow-hidden">
          <div class="flex items-center justify-between border-b px-3 py-2">
            <span class="text-sm font-semibold">Your notifications</span>
            <button id="notificationRefresh" type="button" class="text-xs text-blue-600 hover:underline">Refresh</button>
          </div>
          <div id="notificationList" class="max-h-72 overflow-y-auto p-2">
            <p class="p-3 text-sm text-slate-500">Loading notifications...</p>
          </div>
        </div>
      </div>
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

  initNotificationCenter();
  startHeartbeat();
}

// Shared notification center. Uses the authenticated notification API.
let notificationRefreshTimer = null;

function escapeNotificationText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function initNotificationCenter() {
  const toggle = document.getElementById('notificationToggle');
  const panel = document.getElementById('notificationPanel');
  const list = document.getElementById('notificationList');
  const count = document.getElementById('notificationCount');
  const refresh = document.getElementById('notificationRefresh');

  if (!toggle || !panel || !list || !count || !refresh) return;

  async function loadNotifications() {
    try {
      const notifications = await listNotifications();
      const items = Array.isArray(notifications) ? notifications : [];
      const unread = items.filter(item => Number(item.is_read) === 0).length;

      count.textContent = String(unread);
      count.classList.toggle('hidden', unread === 0);

      if (items.length === 0) {
        list.innerHTML = '<p class="p-3 text-sm text-slate-500">No notifications yet.</p>';
        return;
      }

      list.innerHTML = items.map(item => {
        const isUnread = Number(item.is_read) === 0;
        const date = item.created_at ? new Date(item.created_at).toLocaleString() : '';
        return `
          <article class="mb-2 rounded-lg border p-3 ${isUnread ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-sm font-semibold">${escapeNotificationText(item.title)}</h3>
              ${isUnread ? '<span class="text-xs font-semibold text-blue-600">New</span>' : ''}
            </div>
            <p class="mt-1 text-sm text-slate-600">${escapeNotificationText(item.message)}</p>
            <div class="mt-2 flex items-center justify-between gap-2">
              <time class="text-xs text-slate-400">${escapeNotificationText(date)}</time>
              ${isUnread ? `<button type="button" data-notification-id="${Number(item.id)}" class="text-xs font-semibold text-blue-600 hover:underline">Mark as read</button>` : '<span class="text-xs text-slate-400">Read</span>'}
            </div>
          </article>`;
      }).join('');
    } catch (error) {
      list.innerHTML = `<p class="p-3 text-sm text-red-600">${escapeNotificationText(error.message || 'Could not load notifications.')}</p>`;
    }
  }

  toggle.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) loadNotifications();
  });

  refresh.addEventListener('click', loadNotifications);

  list.addEventListener('click', async event => {
    const button = event.target.closest('[data-notification-id]');
    if (!button) return;

    button.disabled = true;
    try {
      await markNotificationRead(button.dataset.notificationId);
      await loadNotifications();
    } catch (error) {
      button.disabled = false;
      alert(error.message || 'Could not mark notification as read.');
    }
  });

  loadNotifications();
  if (notificationRefreshTimer) clearInterval(notificationRefreshTimer);
  notificationRefreshTimer = setInterval(loadNotifications, 30000);
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
