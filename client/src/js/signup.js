import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, authMessage } from './firebase.js';
import { syncUser } from './api.js';
import { saveSession } from './session.js';
import { homeFor } from './roles.js';

const form    = document.getElementById('signupForm');
const errorEl = document.getElementById('error');

function showError(text) {
  errorEl.textContent = text;
  errorEl.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.classList.add('hidden');

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role     = document.getElementById('role').value;

  // 1. Create the account in Firebase
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    return showError(authMessage(err));
  }

  // 2. Create the matching row in MySQL (this is where the role is saved)
  try {
    const user = await syncUser(role);
    saveSession(user);
    window.location.href = homeFor(user.role);
  } catch (err) {
    // Roll back so the person can simply try again with the same email.
    await credential.user.delete().catch(() => signOut(auth));
    showError(`Could not finish creating your account: ${err.message}`);
  }
});
