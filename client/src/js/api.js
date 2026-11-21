import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase.js';
import { clearSession } from './session.js';

// Firebase restores a saved login asynchronously when a page opens; wait for that once.
export const authReady = new Promise((resolve) => {
  const stop = onAuthStateChanged(auth, (user) => { stop(); resolve(user); });
});

export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  await authReady;
  if (auth.currentUser) {
    // getIdToken() returns a fresh token (Firebase renews it automatically every hour)
    headers['Authorization'] = `Bearer ${await auth.currentUser.getIdToken()}`;
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

  let data = null;
  try { data = await res.json(); } catch {}

  if (res.status === 401) {
    clearSession();
    await signOut(auth).catch(() => {});
    if (window.location.pathname !== '/') window.location.href = '/';
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.code = data && data.code;
    throw err;
  }
  return data;
}

// Signup/login are done by Firebase in the browser. After signup we create the MySQL row (role).
export const syncUser = (role) =>
  request('/auth/sync-user', { method: 'POST', body: JSON.stringify({ role }) });
export const me             = () => request('/auth/me');

export const listCustomers  = () => request('/customers');
export const createCustomer = (c) => request('/customers', { method: 'POST', body: JSON.stringify(c) });
export const updateCustomer = (id, c) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(c) });
export const deleteCustomer = (id) => request(`/customers/${id}`, { method: 'DELETE' });

export const listSales      = () => request('/sales');
export const createSale     = (s) => request('/sales', { method: 'POST', body: JSON.stringify(s) });
export const salesSummary   = () => request('/sales/summary');
// Attendance
export const clockIn = () => request('/attendance/clock-in', { method: 'POST' });
export const clockOut = () => request('/attendance/clock-out', { method: 'POST' });
export const getMyAttendance = () => request('/attendance/my-logs');

// Leave
export const applyLeave = (data) => request('/leave/apply', { method: 'POST', body: JSON.stringify(data) });
export const getLeaves = () => request('/leave');
export const updateLeaveStatus = (id, status) => request(`/leave/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });

// Online status (admin dashboard shows who is active)
export const heartbeat = () => request('/auth/heartbeat', { method: 'POST' });
export const logoutServer = () => request('/auth/logout', { method: 'POST' });
export const activeUsers = () => request('/auth/active-users');

// Sales workflow: draft > confirmed > invoiced > paid
export const updateSaleStatus = (id, status) => 
  request(`/sales/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
