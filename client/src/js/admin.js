import { guard, renderTopbar } from './guard.js';
import { salesSummary, listCustomers, activeUsers } from './api.js';
import { money } from './util.js';
import { presenceRows, onlineSummary } from './presence.js';

const user = guard(['admin']);
if (user) {
  renderTopbar(user);

  // --- sales + customer numbers ---
  (async () => {
    try {
      const [s, customers] = await Promise.all([salesSummary(), listCustomers()]);
      document.getElementById('totalSales').textContent = money(s.total_amount);
      document.getElementById('salesCount').textContent = s.total_count;
      document.getElementById('avgSale').textContent    = money(s.avg_amount);
      document.getElementById('customerCount').textContent = customers.length;
    } catch (err) {
      document.getElementById('err').textContent = err.message;
    }
  })();

  // --- who is online (refreshes every 15 seconds) ---
  async function loadActivity() {
    try {
      const users = await activeUsers();
      document.getElementById('activeTable').innerHTML = presenceRows(users);
      document.getElementById('onlineSummary').textContent = onlineSummary(users);
      document.getElementById('activeErr').textContent = '';
    } catch (err) {
      document.getElementById('activeErr').textContent = err.message;
    }
  }
  loadActivity();
  setInterval(loadActivity, 15000);
}
