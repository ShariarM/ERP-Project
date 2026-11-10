import { guard, renderTopbar } from './guard.js';
import { clockIn, clockOut, getMyAttendance } from './api.js';

const user = guard(['admin', 'sales', 'accounting', 'marketing']);
if (user) {
  renderTopbar(user);
  const msgEl = document.getElementById('msg');
  const table = document.getElementById('logTable');

  async function loadLogs() {
    try {
      const logs = await getMyAttendance();
      table.innerHTML = logs.map(l => `
        <tr class="border-t">
          <td class="p-3">${l.date}</td>
          <td class="p-3 text-green-600 font-medium">${l.clock_in}</td>
          <td class="p-3 text-red-600 font-medium">${l.clock_out || 'Working...'}</td>
        </tr>
      `).join('');
    } catch (err) { console.error(err); }
  }

  document.getElementById('btnClockIn').addEventListener('click', async () => {
    try {
      await clockIn();
      msgEl.textContent = "Clocked in successfully!";
      msgEl.className = "text-sm font-medium ml-4 text-green-600";
      loadLogs();
    } catch (err) { msgEl.textContent = err.message; msgEl.className = "text-sm font-medium ml-4 text-red-600"; }
  });

  document.getElementById('btnClockOut').addEventListener('click', async () => {
    try {
      await clockOut();
      msgEl.textContent = "Clocked out successfully!";
      msgEl.className = "text-sm font-medium ml-4 text-blue-600";
      loadLogs();
    } catch (err) { msgEl.textContent = err.message; msgEl.className = "text-sm font-medium ml-4 text-red-600"; }
  });

  loadLogs();
}