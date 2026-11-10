import { guard, renderTopbar } from './guard.js';
import { listCustomers } from './api.js';

const user = guard(['admin', 'marketing']);

if (user) {
  renderTopbar(user);

  // Fetch total customers to show a real metric on the marketing page
  (async () => {
    try {
      const customers = await listCustomers();
      document.getElementById('customerCount').textContent = customers.length;
    } catch (err) {
      console.error('Failed to load customer metrics', err);
    }
  })();
}