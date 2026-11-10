import { guard, renderTopbar } from './guard.js';
import { listSales, createSale, deleteSale, salesSummary, listCustomers } from './api.js';
import { esc, money } from './util.js';

const user = guard(['admin', 'accounting']);
if (user) {
  renderTopbar(user);

  const tbody     = document.getElementById('tbody');
  const errEl     = document.getElementById('err');
  const form      = document.getElementById('saleForm');
  const custSelect = document.getElementById('customer_id');

  async function loadCustomers() {
    try {
      const rows = await listCustomers();
      custSelect.innerHTML =
        '<option value="">— No customer —</option>' +
        rows.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    } catch {}
  }

  async function refresh() {
    try {
      const [sales, summary] = await Promise.all([listSales(), salesSummary()]);
      document.getElementById('total').textContent = money(summary.total_amount);
      document.getElementById('count').textContent = summary.total_count;
      document.getElementById('avg').textContent   = money(summary.avg_amount);

      tbody.innerHTML = sales.map(s => `
        <tr class="border-t">
          <td class="p-2">${s.id}</td>
          <td class="p-2">${s.sale_date ? new Date(s.sale_date).toLocaleDateString() : '—'}</td>
          <td class="p-2">${esc(s.customer_name || '—')}</td>
          <td class="p-2">${esc(s.description)}</td>
          <td class="p-2 text-right">${money(s.amount)}</td>
          <td class="p-2">
            <button data-del="${s.id}"
              class="text-red-600 hover:underline">Delete</button>
          </td>
        </tr>`).join('');
    } catch (err) { errEl.textContent = err.message; }
  }

  tbody.addEventListener('click', async (e) => {
    const delBtn = e.target.closest('[data-del]');
    if (!delBtn) return;
    if (!confirm('Delete this sale?')) return;
    try { await deleteSale(delBtn.dataset.del); await refresh(); }
    catch (err) { errEl.textContent = err.message; }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    const data = {
      customer_id: custSelect.value || null,
      amount: parseFloat(document.getElementById('amount').value),
      description: document.getElementById('description').value.trim()
    };
    try {
      await createSale(data);
      form.reset();
      await refresh();
    } catch (err) { errEl.textContent = err.message; }
  });

  loadCustomers();
  refresh();
}