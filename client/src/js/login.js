import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, authMessage } from './firebase.js';
import { me, authReady } from './api.js';
import { saveSession, clearSession } from './session.js';
import { homeFor } from './roles.js';

// Already signed in (Firebase remembers you)? Skip the form and go straight to your page.
authReady.then(async (firebaseUser) => {
  if (!firebaseUser) return;
  try {
    const user = await me();
    saveSession(user);
    window.location.href = homeFor(user.role);
  } catch { /* not usable: show the normal login form */ }
});

const form    = document.getElementById('loginForm');
const errorEl = document.getElementById('error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.classList.add('hidden');

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    // 1. Firebase checks the email + password
    await signInWithEmailAndPassword(auth, email, password);

    // 2. Our server tells us the person's role (stored in MySQL)
    let user;
    try {
      user = await me();
    } catch (err) {
      await signOut(auth).catch(() => {});
      clearSession();
      throw new Error(err.code === 'NO_PROFILE'
        ? 'This account has no department yet. Please sign up again or ask the admin.'
        : err.message);
    }

    saveSession(user);
    window.location.href = homeFor(user.role);
  } catch (err) {
    errorEl.textContent = err.code ? authMessage(err) : (err.message || 'Login failed');
    errorEl.classList.remove('hidden');
  }
});
