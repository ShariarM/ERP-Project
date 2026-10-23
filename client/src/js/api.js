// DATA LAYER.
// Every page talks to the data ONLY through these functions.
// Today they read the mock data. Later, replace the body of each function
// with a fetch('/api/...') call to the MySQL backend; no page needs to change.

import { USERS, db } from './data/mockData.js';
import { ROLE_HOME } from './roles.js';

const wait = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 120));

// The "automatic calculation": total = quantity x unit price
export const calcTotal = (quantity, unitPrice) =>
  Math.round(Number(quantity) * Number(unitPrice) * 100) / 100;

// ---- session ----
export const getSession = () => JSON.parse(sessionStorage.getItem('erp_user') || 'null');
export const logout = () => sessionStorage.removeItem('erp_user');

export async function login(email, password) {
  const found = USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
  );
  if (!found) throw new Error('Wrong email or password');
  const { password: _hidden, ...user } = found; // never keep the password in the session
  sessionStorage.setItem('erp_user', JSON.stringify(user));
  return wait({ user, redirect: ROLE_HOME[user.role] });
}

// ---- users ----
export const getUsers = () => wait(USERS.map(({ password, ...u }) => u));

// ---- customers ----
export const getCustomers = () => wait([...db.get().customers]);

export async function addCustomer({ name, email, phone, company }) {
  if (!name.trim()) throw new Error('Customer name is required');
  const list = db.get().customers;
  const customer = { id: Math.max(0, ...list.map((c) => c.id)) + 1, name: name.trim(), email, phone, company };
  list.push(customer);
  db.save();
  return wait(customer);
}

// ---- sales ----
export async function getSales() {
  const { sales, customers } = db.get();
  return wait(
    sales
      .map((s) => ({
        ...s,
        customerName: customers.find((c) => c.id === s.customerId)?.name ?? 'Unknown',
        total: calcTotal(s.quantity, s.unitPrice),
      }))
      .sort((a, b) => b.id - a.id)
  );
}

export async function addSale({ customerId, product, quantity, unitPrice }) {
  if (!customerId) throw new Error('Choose a customer');
  if (!product.trim()) throw new Error('Product is required');
  if (!(Number(quantity) > 0)) throw new Error('Quantity must be more than 0');
  if (!(Number(unitPrice) >= 0)) throw new Error('Unit price cannot be negative');
  const list = db.get().sales;
  const sale = {
    id: Math.max(0, ...list.map((s) => s.id)) + 1,
    customerId: Number(customerId),
    product: product.trim(),
    quantity: Number(quantity),
    unitPrice: Number(unitPrice),
    date: new Date().toISOString().slice(0, 10),
  };
  list.push(sale);
  db.save();
  return wait(sale);
}

export async function getSummary() {
  const sales = await getSales();
  return {
    salesCount: sales.length,
    grandTotal: sales.reduce((sum, s) => sum + s.total, 0),
  };
}
