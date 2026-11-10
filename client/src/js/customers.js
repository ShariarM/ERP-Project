import { guard, renderTopbar } from './guard.js';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from './api.js';
import { esc } from './util.js';

const user = guard(['admin', 'sales']);
if (user) {
  renderTopbar(user);

  const form   = document.getElementById('customerForm');
  const tbody  = document.getElementById('tbody');
  const errEl  = document.getElementById('err');
  let cache = [];

  async function refresh() {
    try {
      cache = await listCustomers();
      tbody.innerHTML = cache.map(r => `
        <tr class="border-t">
          <td class="p-2">${r.id}</td>
          <td class="p-2">${esc(r.name)}</td>
          <td class="p-2">${esc(r.email)}</td>
          <td class="p-2">${esc(r.phone)}</td>
          <td class="p-2">${esc(r.address)}</td>
          <td class="p-2">
            <button data-edit="${r.id}"
              class="text-blue-600 hover:underline mr-3">Edit</button>
            <button data-del="${r.id}"
              class="text-red-600 hover:underline">Delete</button>
          </td>
        </tr>`).join('');
    } catch (err) { errEl.textContent = err.message; }
  }

  tbody.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn  = e.target.closest('[data-del]');

    if (editBtn) {
      const r = cache.find(x => String(x.id) === editBtn.dataset.edit);
      if (!r) return;
      document.getElementById('id').value      = r.id;
      document.getElementById('name').value    = r.name || '';
      document.getElementById('email').value   = r.email || '';
      document.getElementById('phone').value   = r.phone || '';
      document.getElementById('address').value = r.address || '';
    } else if (delBtn) {
      if (!confirm('Delete this customer?')) return;
      try { await deleteCustomer(delBtn.dataset.del); await refresh(); }
      catch (err) { errEl.textContent = err.message; }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    const id = document.getElementById('id').value;
    const data = {
      name:    document.getElementById('name').value.trim(),
      email:   document.getElementById('email').value.trim(),
      phone:   document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim()
    };
    try {
      if (id) await updateCustomer(id, data);
      else    await createCustomer(data);
      form.reset();
      document.getElementById('id').value = '';
      await refresh();
    } catch (err) { errEl.textContent = err.message; }
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    form.reset();
    document.getElementById('id').value = '';
  });

  refresh();
}