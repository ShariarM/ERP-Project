import '../css/main.css';
import { protect } from './guard.js';
import { getCustomers, addCustomer } from './api.js';
import { esc } from './util.js';

const rows = document.getElementById('rows');
const form = document.getElementById('customer-form');
const formError = document.getElementById('form-error');

async function render() {
  const customers = await getCustomers();
  rows.innerHTML = customers
    .map((c) => `<tr class="border-t"><td class="p-3">${esc(c.name)}</td><td class="p-3">${esc(c.email)}</td><td class="p-3">${esc(c.phone)}</td><td class="p-3">${esc(c.company)}</td></tr>`)
    .join('');
}

async function init() {
  const user = protect(['sales', 'marketing']);
  if (!user) return;

  // Only sales (and admin) may add customers. Marketing is read-only.
  const canEdit = user.role === 'admin' || user.role === 'sales';
  form.classList.toggle('hidden', !canEdit);
  document.getElementById('readonly-note').classList.toggle('hidden', canEdit);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    try {
      await addCustomer({
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        company: form.company.value,
      });
      form.reset();
      render();
    } catch (err) {
      formError.textContent = err.message;
    }
  });

  render();
}
init();
