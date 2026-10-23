// MOCK DATABASE (temporary).
// Data lives in the browser's localStorage so changes survive a page refresh.
// When the real MySQL backend is added, this file is no longer needed.

export const USERS = [
  { id: 1, name: 'System Admin',    email: 'admin@erp.com',     password: 'admin123',     role: 'admin',      department: 'Administration' },
  { id: 2, name: 'Sara Sales',      email: 'sales@erp.com',     password: 'sales123',     role: 'sales',      department: 'Customer Information Management' },
  { id: 3, name: 'Mark Marketing',  email: 'marketing@erp.com', password: 'marketing123', role: 'marketing',  department: 'Customer Information Management' },
  { id: 4, name: 'Alex Accountant', email: 'accounts@erp.com',  password: 'accounts123',  role: 'accountant', department: 'Accounting' },
];

const SEED = {
  customers: [
    { id: 1, name: 'Rahim Traders',   email: 'rahim@example.com',  phone: '01711-000001', company: 'Rahim Traders Ltd' },
    { id: 2, name: 'Nadia Islam',     email: 'nadia@example.com',  phone: '01811-000002', company: 'Blue Fashion' },
    { id: 3, name: 'Karim Enterprise', email: 'karim@example.com', phone: '01911-000003', company: 'Karim Enterprise' },
  ],
  sales: [
    { id: 1, customerId: 1, product: 'Office Chair', quantity: 10, unitPrice: 85.5,  date: '2026-10-01' },
    { id: 2, customerId: 2, product: 'Laptop Bag',   quantity: 25, unitPrice: 12.75, date: '2026-10-05' },
    { id: 3, customerId: 3, product: 'Desk Lamp',    quantity: 40, unitPrice: 9.99,  date: '2026-10-09' },
  ],
};

const KEY = 'erp_mock_db_v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage blocked: fall back to seed */ }
  return JSON.parse(JSON.stringify(SEED));
}

let cache = load();

export const db = {
  get: () => cache,
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  },
  reset() {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    cache = JSON.parse(JSON.stringify(SEED));
  },
};
