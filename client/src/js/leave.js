import { guard, renderTopbar } from './guard.js';
import { applyLeave, getLeaves, updateLeaveStatus } from './api.js';

const user = guard(['admin', 'sales', 'accounting', 'marketing']);
if (user) {
  renderTopbar(user);
  const form = document.getElementById('leaveForm');
  const table = document.getElementById('leaveTable');
  const msg = document.getElementById('msg');
  const loadError = document.getElementById('loadError');
  
  // Show admin action column if user is admin
  if (user.role === 'admin') document.getElementById('adminActionHeader').style.display = 'table-cell';

  async function loadLeaves() {
    try {
      const leaves = await getLeaves();
      loadError.textContent = '';
      table.innerHTML = leaves.map(l => `
        <tr class="border-t">
          <td class="p-3 font-medium">${l.username || user.username}</td>
          <td class="p-3">${l.type}</td>
          <td class="p-3">${l.start_date} to ${l.end_date}</td>
          <td class="p-3">
            <span class="px-2 py-1 rounded text-xs font-bold uppercase
              ${l.status === 'approved' ? 'bg-green-100 text-green-700' : 
                l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}">
              ${l.status}
            </span>
          </td>
          ${user.role === 'admin' ? `
            <td class="p-3">
              ${l.status === 'pending' ? `
                <button data-approve="${l.id}" class="text-green-600 hover:underline mr-2">Approve</button>
                <button data-reject="${l.id}" class="text-red-600 hover:underline">Reject</button>
              ` : '—'}
            </td>
          ` : ''}
        </tr>
      `).join('');
    } catch (err) {
      loadError.textContent = `Unable to load leave requests: ${err.message}`;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await applyLeave({
        type: document.getElementById('type').value,
        start_date: document.getElementById('start_date').value,
        end_date: document.getElementById('end_date').value,
        reason: document.getElementById('reason').value
      });
      msg.textContent = "Leave applied successfully!";
      msg.className = "text-sm mt-2 text-green-600 font-medium";
      form.reset();
      loadLeaves();
    } catch (err) { msg.textContent = err.message; msg.className = "text-sm mt-2 text-red-600 font-medium"; }
  });

  table.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.approve || btn.dataset.reject;
    const status = btn.dataset.approve ? 'approved' : 'rejected';
    try {
      await updateLeaveStatus(id, status);
      loadLeaves();
    } catch (err) { alert(err.message); }
  });

  loadLeaves();
}