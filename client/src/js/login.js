import { login } from './api.js';
import { homeFor } from './roles.js';
import { startDateTime } from './date-time.js';

startDateTime();

const form    = document.getElementById('loginForm');
const errorEl = document.getElementById('error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.classList.add('hidden');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const { token, user } = await login(username, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    window.location.href = homeFor(user.role);
  } catch (err) {
    errorEl.textContent = err.message || 'Login failed';
    errorEl.classList.remove('hidden');
  }
});