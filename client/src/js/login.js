import '../css/main.css';
import { login, getSession } from './api.js';
import { ROLE_HOME } from './roles.js';
import { USERS } from './data/mockData.js';
import { esc } from './util.js';

// already logged in? go straight to your page
const session = getSession();
if (session) window.location.href = ROLE_HOME[session.role];

const form = document.getElementById('login-form');
const errorBox = document.getElementById('error');

// demo buttons (temporary, remove when real users exist)
document.getElementById('demo').innerHTML = USERS.map(
  (u) => `<button type="button" data-email="${esc(u.email)}" data-pass="${esc(u.password)}"
            class="border rounded-lg px-2 py-1 text-left hover:bg-slate-50">
            <span class="block font-medium capitalize">${esc(u.role)}</span>
            <span class="block text-xs text-slate-500">${esc(u.email)}</span>
          </button>`
).join('');

document.getElementById('demo').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-email]');
  if (!btn) return;
  form.email.value = btn.dataset.email;
  form.password.value = btn.dataset.pass;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.textContent = '';
  try {
    const { redirect } = await login(form.email.value, form.password.value);
    window.location.href = redirect;
  } catch (err) {
    errorBox.textContent = err.message;
  }
});
