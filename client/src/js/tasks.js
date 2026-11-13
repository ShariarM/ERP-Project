import { guard, renderTopbar } from './guard.js';
import { createTask, getTaskUsers, getTasks, updateTaskStatus } from './api.js';

const user = guard(['admin', 'sales', 'accounting', 'marketing']);
if (user) {
  renderTopbar(user);

  const form = document.getElementById('taskForm');
  const table = document.getElementById('taskTable');
  const error = document.getElementById('taskError');
  const message = document.getElementById('taskMessage');
  const isAdmin = user.role === 'admin';

  if (isAdmin) {
    document.getElementById('createTaskSection').classList.remove('hidden');
    document.getElementById('assigneeHeader').classList.remove('hidden');
  }

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  async function loadTasks() {
    try {
      const tasks = await getTasks();
      table.innerHTML = tasks.map((task) => `
        <tr class="border-t">
          <td class="p-3 font-medium">${escapeHtml(task.title)}</td>
          <td class="p-3 whitespace-pre-wrap">${escapeHtml(task.description || '—')}</td>
          <td class="p-3">${escapeHtml(task.deadline.replace('T', ' '))}</td>
          ${isAdmin ? `<td class="p-3">${escapeHtml(task.assignee)}</td>` : ''}
          <td class="p-3">
            <select data-status-for="${task.id}" aria-label="Status for ${escapeHtml(task.title)}"
              class="px-2 py-1 border rounded">
              <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>To Do</option>
              <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
          </td>
        </tr>
      `).join('');
      document.getElementById('emptyTasks').classList.toggle('hidden', tasks.length > 0);
      error.textContent = '';
    } catch (err) {
      error.textContent = err.message;
    }
  }

  if (isAdmin) {
    async function loadUsers() {
      try {
        const users = await getTaskUsers();
        const select = document.getElementById('taskAssignee');
        select.innerHTML = '<option value="" disabled selected>Select an employee</option>' +
          users.map((employee) =>
            `<option value="${employee.id}">${escapeHtml(employee.username)} (${escapeHtml(employee.role)})</option>`
          ).join('');
      } catch (err) {
        error.textContent = err.message;
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      message.textContent = '';
      try {
        await createTask({
          title: document.getElementById('taskTitle').value,
          description: document.getElementById('taskDescription').value,
          deadline: document.getElementById('taskDeadline').value,
          assigned_to: document.getElementById('taskAssignee').value
        });
        form.reset();
        message.textContent = 'Task assigned successfully.';
        message.className = 'text-sm mt-2 text-green-600 font-medium';
        await loadTasks();
      } catch (err) {
        message.textContent = err.message;
        message.className = 'text-sm mt-2 text-red-600 font-medium';
      }
    });

    loadUsers();
  }

  table.addEventListener('change', async (event) => {
    const select = event.target.closest('select[data-status-for]');
    if (!select) return;
    try {
      await updateTaskStatus(select.dataset.statusFor, select.value);
    } catch (err) {
      error.textContent = err.message;
      await loadTasks();
    }
  });

  loadTasks();
}
