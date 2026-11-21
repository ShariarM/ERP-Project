import { guard, renderTopbar } from './guard.js';
import { request } from './api.js';

const user = guard(['admin', 'sales', 'accounting', 'marketing']);
if (user) main(user);

function main(user) {
  renderTopbar(user);

  const $ = (id) => document.getElementById(id);
  const isAdmin = user.role === 'admin';
  const api = (path, options) => request(`/attendance${path}`, options);
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  if (isAdmin) $('teamPanel').hidden = false;

  function notice(message, type = 'success') {
    const el = $('notice');
    el.textContent = message;
    el.className = `notice show ${type}`;
    window.setTimeout(() => el.classList.remove('show'), 4500);
  }

  const formatTime = (value) => (value ? String(value).slice(0, 8) : '—');

  function hours(minutes) {
    const value = Number(minutes || 0);
    return `${Math.floor(value / 60)}h ${value % 60}m`;
  }

  function statusPill(value) {
    const classes = { 'Late': 'late', 'Half Day': 'half', 'Partial Day': 'partial', 'In Progress': 'progress' };
    return `<span class="pill ${classes[value] || ''}">${escapeHTML(value || '—')}</span>`;
  }

  async function loadMyAttendance() {
    const [logs, summary] = await Promise.all([api('/my-logs'), api('/summary')]);

    $('days').textContent = Number(summary.total_days || 0);
    $('hours').textContent = Number(summary.total_working_hours || 0).toFixed(2);
    $('late').textContent = Number(summary.late_days || 0);
    $('full').textContent = Number(summary.full_days || 0);

    $('myRows').innerHTML = logs.length ? logs.map((row) => `
      <tr>
        <td>${escapeHTML(row.date)}</td>
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
    $('teamRows').innerHTML = rows.length ? rows.map((row) => `
      <tr>
        <td><strong>${escapeHTML(row.employee_name)}</strong></td>
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
      $('myRows').innerHTML = `<tr><td colspan="5" class="empty">${escapeHTML(error.message)}</td></tr>`;
    }
  }

  async function punch(button, path, fallbackMessage) {
    button.disabled = true;
    try {
      const result = await api(path, { method: 'POST', body: '{}' });
      notice(result.message || fallbackMessage);
      await loadDashboard();
    } catch (error) {
      notice(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }

  $('clockIn').addEventListener('click', () => punch($('clockIn'), '/clock-in', 'Clock-in successful.'));
  $('clockOut').addEventListener('click', () => punch($('clockOut'), '/clock-out', 'Clock-out successful.'));
  $('refresh').addEventListener('click', loadDashboard);

  function updateClock() {
    $('liveClock').textContent = new Intl.DateTimeFormat('en-BD', {
      timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }).format(new Date());
  }
  updateClock();
  window.setInterval(updateClock, 1000);

  loadDashboard();
}
