import { renderTopbar } from './guard.js';

const API = '/api/inventory';
const token = localStorage.getItem('token');
let products = [];
let lowStock = [];
let movements = [];

const $ = (id) => document.getElementById(id);
const money = (n) => '৳ ' + Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 });
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));

const user = (() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); }
  catch { return {}; }
})();

const role = String(user.role || '').toLowerCase();
const canManage = ['admin', 'accounting'].includes(role);
const canAccess = ['admin', 'accounting', 'sales'].includes(role);

if (!token) {
  window.location.href = '/';
}

if (!canAccess) {
  document.body.innerHTML = '<main style="font-family:Arial;padding:50px"><h2>Access denied</h2><p>Your role cannot access inventory.</p><a href="/">Return to login</a></main>';
} else {
  renderTopbar(user);
}

if (!canManage) {
  $('productBtn').hidden = true;
  $('movementBtn').hidden = true;
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  let data;
  try { data = await response.json(); } catch { data = null; }

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}

function showNotice(message, type = 'success') {
  const el = $('notice');
  el.textContent = message;
  el.className = `notice show ${type}`;
  window.setTimeout(() => el.classList.remove('show'), 4500);
}

function renderProducts() {
  const query = $('searchInput').value.trim().toLowerCase();
  const filtered = products.filter(p =>
    `${p.name} ${p.sku} ${p.category || ''}`.toLowerCase().includes(query)
  );

  $('productRows').innerHTML = filtered.length ? filtered.map(p => {
    const qty = Number(p.stock_quantity);
    const reorder = Number(p.reorder_level);
    const status = qty <= reorder
      ? '<span class="pill low">Low Stock</span>'
      : qty <= reorder * 1.5
        ? '<span class="pill medium">Running Low</span>'
        : '<span class="pill">In Stock</span>';

    return `<tr>
      <td><div class="product">${escapeHTML(p.name)}</div><div class="muted">${escapeHTML(p.category || 'Uncategorized')}</div></td>
      <td>${escapeHTML(p.sku)}</td>
      <td><strong>${qty.toLocaleString()} ${escapeHTML(p.unit)}</strong></td>
      <td>${reorder.toLocaleString()} ${escapeHTML(p.unit)}</td>
      <td>${status}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="5" class="empty">No products found. Add your first product.</td></tr>';
}

function renderAlerts() {
  $('alertCount').textContent = `${lowStock.length} Alerts`;
  $('alertList').innerHTML = lowStock.length ? lowStock.map(p => `
    <div class="alert">
      <strong>${escapeHTML(p.name)}</strong>
      <span>SKU: ${escapeHTML(p.sku)} · Available: ${Number(p.stock_quantity)} ${escapeHTML(p.unit)}</span>
      <span>Reorder level: ${Number(p.reorder_level)} ${escapeHTML(p.unit)}</span>
    </div>
  `).join('') : '<div class="empty">✓ All products are above their reorder levels.</div>';
}

function renderMovements() {
  $('movementRows').innerHTML = movements.length ? movements.slice(0, 15).map(m => `
    <tr>
      <td><strong>${escapeHTML(m.product_name)}</strong><div class="muted">${escapeHTML(m.sku)}</div></td>
      <td><span class="pill ${m.movement_type === 'OUT' ? 'low' : ''}">${escapeHTML(m.movement_type)}</span></td>
      <td>${Number(m.quantity).toLocaleString()}</td>
      <td>${Number(m.stock_after).toLocaleString()}</td>
      <td>${m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td>
      <td>${escapeHTML(m.created_by_name || 'System')}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" class="empty">No stock movements recorded yet.</td></tr>';
}

function renderSummary() {
  $('totalProducts').textContent = products.length;
  $('lowProducts').textContent = lowStock.length;
  const units = products.reduce((sum, p) => sum + Number(p.stock_quantity || 0), 0);
  const value = products.reduce((sum, p) => sum + Number(p.stock_quantity || 0) * Number(p.cost_price || 0), 0);
  $('totalUnits').textContent = units.toLocaleString();
  $('stockValue').textContent = money(value);
}

async function loadDashboard() {
  $('productRows').innerHTML = '<tr><td colspan="5" class="empty">Loading products...</td></tr>';
  try {
    const [productData, alertData, movementData] = await Promise.all([
      request('/products'),
      request('/low-stock'),
      canManage ? request('/movements') : Promise.resolve([])
    ]);

    products = productData;
    lowStock = alertData;
    movements = movementData;

    renderSummary();
    renderProducts();
    renderAlerts();
    renderMovements();

    $('movementProduct').innerHTML = products.length
      ? products.map(p => `<option value="${p.id}">${escapeHTML(p.name)} (${escapeHTML(p.sku)})</option>`).join('')
      : '<option value="">Add a product first</option>';
  } catch (error) {
    showNotice(error.message, 'error');
    $('productRows').innerHTML = `<tr><td colspan="5" class="empty">${escapeHTML(error.message)}</td></tr>`;
    $('alertList').innerHTML = '<div class="empty">Could not load alerts.</div>';
  }
}

$('searchInput').addEventListener('input', renderProducts);
$('refreshBtn').addEventListener('click', loadDashboard);
$('productBtn').addEventListener('click', () => $('productDialog').showModal());
$('movementBtn').addEventListener('click', () => {
  if (!products.length) return showNotice('Please add a product first.', 'error');
  $('movementDialog').showModal();
});

document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => $(button.dataset.close).close());
});

$('productForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());

  try {
    await request('/products', { method: 'POST', body: JSON.stringify(payload) });
    event.currentTarget.reset();
    $('productDialog').close();
    showNotice('Product created successfully.');
    await loadDashboard();
  } catch (error) {
    showNotice(error.message, 'error');
  }
});

$('movementForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());

  try {
    await request('/movements', { method: 'POST', body: JSON.stringify(payload) });
    event.currentTarget.reset();
    $('movementDialog').close();
    showNotice('Stock movement saved successfully.');
    await loadDashboard();
  } catch (error) {
    showNotice(error.message, 'error');
  }
});

loadDashboard();