import { guard, renderTopbar } from './guard.js';
import { listSales, createSale, salesSummary, listCustomers, updateSaleStatus } from './api.js';
import { esc, money } from './util.js';

const user = guard(['admin', 'accounting', 'sales']);

if (user) {
  renderTopbar(user);

  const tbody = document.getElementById('tbody');
  const errEl = document.getElementById('err');
  const form = document.getElementById('saleForm');
  const custSelect = document.getElementById('customer_id');

  // Helper to generate the correct action button based on state & role
  function getActionButton(sale) {
    const { id, status } = sale;
    const role = user.role;

    if (status === 'draft' && (role === 'admin' || role === 'sales')) {
      return `<button data-id="${id}" data-next="confirmed" class="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Confirm Order</button>`;
    }
    if (status === 'confirmed' && (role === 'admin' || role === 'accounting')) {
      return `<button data-id="${id}" data-next="invoiced" class="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700">Generate Invoice</button>`;
    }
    if (status === 'invoiced' && (role === 'admin' || role === 'accounting')) {
      return `<button data-id="${id}" data-next="paid" class="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">Mark Paid</button>`;
    }
    return '—'; // No action available
  }

  // Helper for status badge colors
  function getStatusBadge(status) {
    const colors = {
      draft: 'bg-slate-200 text-slate-700',
      confirmed: 'bg-blue-100 text-blue-700',
      invoiced: 'bg-purple-100 text-purple-700',
      paid: 'bg-green-100 text-green-700'
    };
    return `<span class="px-2 py-1 rounded text-xs font-bold uppercase ${colors[status] || ''}">${esc(status)}</span>`;
  }

  async function refresh() {
    try {
      const [sales, summary] = await Promise.all([listSales(), salesSummary()]);
      document.getElementById('total').textContent = money(summary.total_amount);
      document.getElementById('count').textContent = summary.total_count;
      document.getElementById('avg').textContent   = money(summary.avg_amount);

      tbody.innerHTML = sales.map(s => `
        <tr class="border-t hover:bg-slate-50">
          <td class="p-2">${s.id}</td>
          <td class="p-2">${esc(s.sale_date || '—')}</td>
          <td class="p-2">${esc(s.customer_name || '—')}</td>
          <td class="p-2">${esc(s.description)}</td>
          <td class="p-2 text-right">${money(s.amount)}</td>
          <td class="p-2">${getStatusBadge(s.status)}</td>
          <td class="p-2">${getActionButton(s)}</td>
        </tr>`).join('');
    } catch (err) { errEl.textContent = err.message; }
  }

  // Handle action button clicks
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn || !btn.dataset.id) return;
    
    btn.disabled = true;
    btn.textContent = 'Wait...';

    try {
      await updateSaleStatus(btn.dataset.id, btn.dataset.next);
      await refresh();
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled = false;
      await refresh(); // Reset button state
    }
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

  async function loadCustomers() {
    try {
      const rows = await listCustomers();
      custSelect.innerHTML = '<option value="">— No customer —</option>' +
        rows.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    } catch { /* the form still works without the list */ }
  }

  loadCustomers();
  refresh();
}
