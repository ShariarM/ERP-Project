import '../css/main.css';
import { protect } from './guard.js';
import { getSales, getSummary, getCustomers, addSale, calcTotal } from './api.js';
import { esc, money } from './util.js';

const form = document.getElementById('sale-form');
const formError = document.getElementById('form-error');
const liveTotal = document.getElementById('live-total');

async function render() {
  const [summary, sales] = await Promise.all([getSummary(), getSales()]);
  document.getElementById('grand-total').textContent = money(summary.grandTotal);
  document.getElementById('sales-count').textContent = summary.salesCount;
  document.getElementById('rows').innerHTML = sales
    .map((s) => `<tr class="border-t">
      <td class="p-3">${esc(s.date)}</td><td class="p-3">${esc(s.customerName)}</td><td class="p-3">${esc(s.product)}</td>
      <td class="p-3">${s.quantity}</td><td class="p-3">${money(s.unitPrice)}</td><td class="p-3 font-medium">${money(s.total)}</td></tr>`)
    .join('');
}

async function init() {
  if (!protect(['accountant'])) return;

  const customers = await getCustomers();
  form.customerId.innerHTML =
    '<option value="">Choose...</option>' +
    customers.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

  // live automatic total while typing
  const updateTotal = () => (liveTotal.textContent = money(calcTotal(form.quantity.value || 0, form.unitPrice.value || 0)));
  form.quantity.addEventListener('input', updateTotal);
  form.unitPrice.addEventListener('input', updateTotal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    try {
      await addSale({
        customerId: form.customerId.value,
        product: form.product.value,
        quantity: form.quantity.value,
        unitPrice: form.unitPrice.value,
      });
      form.reset();
      updateTotal();
      render();
    } catch (err) {
      formError.textContent = err.message;
    }
  });

  render();
}
init();
