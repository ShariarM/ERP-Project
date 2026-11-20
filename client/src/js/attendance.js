import { guard, renderTopbar } from './guard.js';

guard();

const user = (() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); }
  catch { return {}; }
})();

renderTopbar(user);

const token = localStorage.getItem('token');
const role = String(user.role || '').toLowerCase();
const $ = id => document.getElementById(id);
const isAdmin = role === 'admin';

if (!token) window.location.href = '/';
if (isAdmin) $('teamPanel').hidden = false;

async function api(path, options = {}) {
  const response = await fetch(`/api/attendance${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  let data;
  try { data = await response.json(); } catch { data = null; }

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Session expired. Please sign in again.');
  }

  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}

function notice(message, type = 'success') {
  const el = $('notice');
  el.textContent = message;
  el.className = `notice show ${type}`;
  window.setTimeout(() => el.classList.remove('show'), 4500);
}

function formatTime(value) {
  if (!value) return '—';
  return String(value).slice(0, 8);
}

function hours(minutes) {
  const value = Number(minutes || 0);
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

function statusPill(value) {
  const classes = {
    'Late': 'late',
    'Half Day': 'half',
    'Partial Day': 'partial',
    'In Progress': 'progress'
  };
  return `<span class="pill ${classes[value] || ''}">${value || '—'}</span>`;
}

async function loadMyAttendance() {
  const [logs, summary] = await Promise.all([
    api('/my-logs'),
    api('/summary')
  ]);

  $('days').textContent = Number(summary.total_days || 0);
  $('hours').textContent = Number(summary.total_working_hours || 0).toFixed(2);
  $('late').textContent = Number(summary.late_days || 0);
  $('full').textContent = Number(summary.full_days || 0);

  $('myRows').innerHTML = logs.length ? logs.map(row => `
    <tr>
      <td>${row.date}</td>
      <td>${formatTime(row.clock_in)}</td>
      <td>${formatTime(row.clock_out)}</td>
      <td>${hours(row.worked_minutes)}</td>
      <td>${statusPill(row.day_status)} ${row.arrival_status === 'Late' ? statusPill('Late') : ''}</td>
    </tr>
  `).join('') : '<tr><td colspan="5" class="empty">No attendance records yet.</td></tr>';
}

async function loadTeamAttendance() {
  if (!isAdmin) return;

  const rows = await api('/team-summary');
  $('teamRows').innerHTML = rows.length ? rows.map(row => `
    <tr>
      <td><strong>${String(row.employee_name || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong></td>
      <td>${Number(row.total_days || 0)}</td>
      <td>${Number(row.late_days || 0)}</td>
      <td>${Number(row.half_days || 0)}</td>
      <td>${Number(row.full_days || 0)}</td>
      <td>${Number(row.total_working_hours || 0).toFixed(2)}h</td>
    </tr>
  `).join('') : '<tr><td colspan="6" class="empty">No employee records found.</td></tr>';
}

async function loadDashboard() {
  $('myRows').innerHTML = '<tr><td colspan="5" class="empty">Loading...</td></tr>';
  try {
    await loadMyAttendance();
    await loadTeamAttendance();
  } catch (error) {
    notice(error.message, 'error');
    $('myRows').innerHTML = `<tr><td colspan="5" class="empty">${error.message}</td></tr>`;
  }
}

$('clockIn').addEventListener('click', async () => {
  $('clockIn').disabled = true;
  try {
    const result = await api('/clock-in', { method: 'POST', body: '{}' });
    notice(result.message || 'Clock-in successful.');
    await loadDashboard();
  } catch (error) {
    notice(error.message, 'error');
  } finally {
    $('clockIn').disabled = false;
  }
});

$('clockOut').addEventListener('click', async () => {
  $('clockOut').disabled = true;
  try {
    const result = await api('/clock-out', { method: 'POST', body: '{}' });
    notice(result.message || 'Clock-out successful.');
    await loadDashboard();
  } catch (error) {
    notice(error.message, 'error');
  } finally {
    $('clockOut').disabled = false;
  }
});

$('refresh').addEventListener('click', loadDashboard);

function updateClock() {
  $('liveClock').textContent = new Intl.DateTimeFormat('en-BD', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date());
}
updateClock();
window.setInterval(updateClock, 1000);

loadDashboard();