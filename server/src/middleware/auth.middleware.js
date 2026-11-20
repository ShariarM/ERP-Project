import { firebaseAuth } from '../config/firebase-admin.js';
import pool from '../config/db.js';

function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Step 1 only: the Firebase token is valid. Used by /sync-user, because a brand-new
// account does not have a MySQL row yet.  Sets req.firebaseUser = { uid, email, ... }
export async function verifyFirebaseToken(req, res, next) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.firebaseUser = await firebaseAuth.verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Steps 1 + 2: valid Firebase token AND the person exists in MySQL (that is where the role lives).
// Sets req.user = { id, username, role }
export async function verifyToken(req, res, next) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, username, role FROM users WHERE firebase_uid = ?', [decoded.uid]);
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Your account has no role yet', code: 'NO_PROFILE' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    console.error('verifyToken (database):', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}
