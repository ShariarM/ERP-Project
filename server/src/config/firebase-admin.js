import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Path to the service-account key you downloaded from Firebase.
// Relative paths are measured from the /server folder.
const keyFile = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json';
const keyPath = path.resolve(__dirname, '../../', keyFile);

if (!fs.existsSync(keyPath)) {
  console.error(`\nFirebase service-account key not found:\n  ${keyPath}\n` +
    'Download it in the Firebase console (Project settings > Service accounts > Generate new private key),\n' +
    'save it as server/serviceAccountKey.json, or set FIREBASE_SERVICE_ACCOUNT in .env.\n');
  process.exit(1);
}

const app = getApps().length
  ? getApp()
  : initializeApp({ credential: cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });

// Used by the middleware to check the login token sent by the browser
export const firebaseAuth = getAuth(app);
export default app;
