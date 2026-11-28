// Remembers who is logged in (id, username, role) so pages can show the right menu instantly.
// This is only a convenience: the server re-checks the role on EVERY request.
const KEY = 'user';

export function getSession() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
export function saveSession(u) {
  localStorage.setItem(KEY, JSON.stringify({ id: u.id, username: u.username, role: u.role }));
}
export function clearSession() {
  localStorage.removeItem(KEY);
}
