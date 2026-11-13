const BASE = '/api';

function getToken() { return localStorage.getItem('token'); }

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  let data = null;
  try { data = await res.json(); } catch {}

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/') window.location.href = '/';
  }

  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

export const login          = (username, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const me             = () => request('/auth/me');

export const listCustomers  = () => request('/customers');
export const createCustomer = (c) => request('/customers', { method: 'POST', body: JSON.stringify(c) });
export const updateCustomer = (id, c) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(c) });
export const deleteCustomer = (id) => request(`/customers/${id}`, { method: 'DELETE' });

export const listSales      = () => request('/sales');
export const createSale     = (s) => request('/sales', { method: 'POST', body: JSON.stringify(s) });
export const deleteSale     = (id) => request(`/sales/${id}`, { method: 'DELETE' });
export const salesSummary   = () => request('/sales/summary');
// ADD THIS BELOW THE login EXPORT
export const signup = (username, password, role) =>
  request('/auth/signup', { method: 'POST', body: JSON.stringify({ username, password, role }) });
// Attendance
export const clockIn = () => request('/attendance/clock-in', { method: 'POST' });
export const clockOut = () => request('/attendance/clock-out', { method: 'POST' });
export const getMyAttendance = () => request('/attendance/my-logs');

// Leave
export const applyLeave = (data) => request('/leave/apply', { method: 'POST', body: JSON.stringify(data) });
export const getLeaves = () => request('/leave');
export const updateLeaveStatus = (id, status) => request(`/leave/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });

// Tasks
export const getTasks = () => request('/tasks');
export const getTaskUsers = () => request('/tasks/users');
export const createTask = (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTaskStatus = (id, status) =>
  request(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// Online status (admin dashboard shows who is active)
export const heartbeat = () => request('/auth/heartbeat', { method: 'POST' });
export const logoutServer = () => request('/auth/logout', { method: 'POST' });
export const activeUsers = () => request('/auth/active-users');
