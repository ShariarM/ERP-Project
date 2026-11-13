import { signup } from './api.js';
import { homeFor } from './roles.js';
import { startDateTime } from './date-time.js';

startDateTime();

const form    = document.getElementById('signupForm');
const errorEl = document.getElementById('error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.classList.add('hidden');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const role     = document.getElementById('role').value;

  try {
    const { token, user } = await signup(username, password, role);
    
    // Log the user in immediately after signup
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Redirect to their specific dashboard
    window.location.href = homeFor(user.role);
  } catch (err) {
    errorEl.textContent = err.message || 'Signup failed';
    errorEl.classList.remove('hidden');
  }
});