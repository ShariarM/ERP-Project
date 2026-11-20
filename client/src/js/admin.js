import { guard, renderTopbar } from './guard.js';
import { salesSummary, listCustomers, listSales, activeUsers } from './api.js';
import { esc, money } from './util.js';
import { presenceRows, onlineSummary } from './presence.js';

const user = guard(['admin']);
if (user) {
  renderTopbar(user);
  document.getElementById('welcomeName').textContent = user.username || 'Admin';

  // --- sales + customer numbers ---
  (async () => {
    try {
      const [s, customers, sales] = await Promise.all([salesSummary(), listCustomers(), listSales()]);
      document.getElementById('totalSales').textContent = money(s.total_amount);
      document.getElementById('salesCount').textContent = s.total_count;
      document.getElementById('avgSale').textContent    = money(s.avg_amount);
      document.getElementById('customerCount').textContent = customers.length;
      renderRecentSales(sales);
      renderSalesChart(sales);
    } catch (err) {
      document.getElementById('err').textContent = err.message;
      document.getElementById('salesChart').innerHTML = '<div class="empty">Sales data could not be loaded.</div>';
      document.getElementById('recentSales').innerHTML = '<tr><td class="activity-empty" colspan="4">Transactions could not be loaded.</td></tr>';
    }
  })();

  function renderRecentSales(sales) {
    const rows = sales.slice(0, 6);
    document.getElementById('recentSales').innerHTML = rows.length ? rows.map(sale => `
      <tr>
        <td><strong>Sale #${esc(sale.id)}</strong></td>
        <td>${esc(sale.customer_name || 'No customer')}</td>
        <td>${sale.sale_date ? esc(new Date(sale.sale_date).toLocaleDateString()) : '—'}</td>
        <td><strong>${money(sale.amount)}</strong></td>
      </tr>
    `).join('') : '<tr><td class="activity-empty" colspan="4">No sales recorded yet.</td></tr>';
  }

  function renderSalesChart(sales) {
    const totalsByDate = new Map();
    sales.forEach(sale => {
      if (!sale.sale_date) return;
      const date = String(sale.sale_date).slice(0, 10);
      totalsByDate.set(date, (totalsByDate.get(date) || 0) + Number(sale.amount || 0));
    });
    const points = [...totalsByDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7);
    const chart = document.getElementById('salesChart');
    if (!points.length) {
      chart.innerHTML = '<div class="empty">No dated sales are available to chart.</div>';
      return;
    }

    const width = 720;
    const height = 190;
    const left = 42;
    const right = 12;
    const top = 14;
    const bottom = 31;
    const values = points.map(([, amount]) => amount);
    const min = Math.min(0, ...values);
    const max = Math.max(...values, 1);
    const span = max - min || 1;
    const xAt = index => points.length === 1
      ? (left + width - right) / 2
      : left + index * (width - left - right) / (points.length - 1);
    const yAt = value => top + (max - value) * (height - top - bottom) / span;
    const coords = points.map(([, value], index) => [xAt(index), yAt(value)]);
    const path = coords.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');
    const first = coords[0];
    const last = coords[coords.length - 1];
    const area = `${path} L ${last[0]} ${height - bottom} L ${first[0]} ${height - bottom} Z`;
    const labels = points.map(([date], index) => {
      const parsed = new Date(`${date}T00:00:00`);
      const label = Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `<text class="chart-label" x="${xAt(index)}" y="${height - 7}" text-anchor="middle">${esc(label)}</text>`;
    }).join('');
    const dots = coords.map(([x, y]) => `<circle class="chart-point" cx="${x}" cy="${y}" r="4"/>`).join('');
    const grid = [top, (top + height - bottom) / 2, height - bottom]
      .map(y => `<line class="chart-gridline" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"/>`).join('');
    const tickLabels = [max, (max + min) / 2, min]
      .map((value, index) => `<text class="chart-label" x="${left - 7}" y="${[top, (top + height - bottom) / 2, height - bottom][index] + 3}" text-anchor="end">${esc(money(value))}</text>`).join('');

    chart.innerHTML = `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Sales totals by date">
        <defs><linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#4f46e5" stop-opacity=".18"/><stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/></linearGradient></defs>
        ${grid}${tickLabels}<path class="chart-area" d="${area}"/><path class="chart-line" d="${path}"/>${dots}${labels}
      </svg>`;
  }

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
