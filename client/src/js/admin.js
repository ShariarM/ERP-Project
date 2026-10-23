import '../css/main.css';
import { protect } from './guard.js';
import { getUsers, getCustomers, getSummary } from './api.js';
import { ROLE_LABEL } from './roles.js';
import { esc, money } from './util.js';

async function init() {
  if (!protect([])) return; // admin only (admin always passes)
  const [users, customers, summary] = await Promise.all([getUsers(), getCustomers(), getSummary()]);
  document.getElementById('stat-customers').textContent = customers.length;
  document.getElementById('stat-sales').textContent = summary.salesCount;
  document.getElementById('stat-total').textContent = money(summary.grandTotal);
  document.getElementById('staff').innerHTML = users
    .map((u) => `<tr class="border-t"><td class="p-3">${esc(u.name)}</td><td class="p-3">${esc(u.email)}</td><td class="p-3">${esc(ROLE_LABEL[u.role])}</td><td class="p-3">${esc(u.department)}</td></tr>`)
    .join('');
}
init();
