import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// The service-account key can come from:
//  1. FIREBASE_SERVICE_ACCOUNT_JSON : the whole JSON pasted into an environment variable (used on Render)
//  2. a file: FIREBASE_SERVICE_ACCOUNT (default ./serviceAccountKey.json, relative to /server) (used on your PC)
function loadServiceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline && inline.trim()) {
    try {
      return JSON.parse(inline);
    } catch {
      console.error('\nFIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the WHOLE contents of the key file.\n');
      process.exit(1);
    }
  }

  const keyFile = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json';
  const keyPath = path.resolve(__dirname, '../../', keyFile);
  if (!fs.existsSync(keyPath)) {
    console.error(`\nFirebase service-account key not found:\n  ${keyPath}\n` +
      'Download it in the Firebase console (Project settings > Service accounts > Generate new private key),\n' +
      'save it as server/serviceAccountKey.json, or set FIREBASE_SERVICE_ACCOUNT in .env.\n' +
      'On a hosting service, set FIREBASE_SERVICE_ACCOUNT_JSON instead.\n');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}

const app = getApps().length ? getApp() : initializeApp({ credential: cert(loadServiceAccount()) });

// Used by the middleware to check the login token sent by the browser
export const firebaseAuth = getAuth(app);
export default app;
