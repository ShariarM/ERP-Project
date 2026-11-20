import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Values come from the .env file in the project root (VITE_FIREBASE_*).
// Firebase console > Project settings > General > Your apps > Web app > Config
const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

const missing = ['apiKey', 'authDomain', 'projectId', 'appId'].filter((k) => !config[k]);
if (missing.length) {
  const msg = `Firebase is not configured. Add VITE_FIREBASE_* values to .env, then restart "npm run dev". Missing: ${missing.join(', ')}`;
  const bar = document.createElement('div');
  bar.textContent = msg;
  bar.className = 'fixed top-0 inset-x-0 bg-red-600 text-white text-sm text-center p-3 z-50';
  document.body.prepend(bar);
  throw new Error(msg);
}

const app = initializeApp(config);
export const auth = getAuth(app);

// Turns Firebase error codes into sentences a person can understand.
export function authMessage(err) {
  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Wrong email or password.';
    case 'auth/invalid-email': return 'That email address is not valid.';
    case 'auth/email-already-in-use': return 'An account with this email already exists. Please log in instead.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed': return 'Network problem. Check your internet connection.';
    case 'auth/operation-not-allowed': return 'Email/password sign-in is turned off in the Firebase console.';
    default: return err?.message || 'Something went wrong.';
  }
}
