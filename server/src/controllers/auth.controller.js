import pool from '../config/db.js';

// Departments a person may pick on the signup page. "admin" is NOT here on purpose.
const SIGNUP_ROLES = ['sales', 'marketing', 'accounting'];

// A user counts as "online" if logged in AND the browser pinged within this window.
// The browser pings every 30 s, so 90 s tolerates a missed ping or two.
const ONLINE_WINDOW_SECONDS = 90;

// Presence tracking must never break login, so failures are only logged.
async function markOnline(userId) {
  try {
    await pool.query('UPDATE users SET last_seen_at = NOW(), is_logged_in = 1 WHERE id = ?', [userId]);
  } catch (err) {
    console.warn('presence update failed:', err.message);
  }
}

// Called by the browser right after Firebase signup succeeded: creates the MySQL row that holds the role.
export async function syncUser(req, res) {
  try {
    const { uid, email } = req.firebaseUser;
    if (!email) return res.status(400).json({ error: 'Your Firebase account has no email address' });

    // Already synced (e.g. double click)? Just return it.
    const [existing] = await pool.query('SELECT id, username, role FROM users WHERE firebase_uid = ?', [uid]);
    if (existing.length) return res.json(existing[0]);

    // The FIRST person who signs up with ADMIN_EMAIL (from .env) becomes the admin.
    // Nobody else can ever get "admin" - the signup page cannot ask for it.
    let role = null;
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (adminEmail && email.toLowerCase() === adminEmail) {
      const [[{ n }]] = await pool.query(
        "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND firebase_uid IS NOT NULL");
      if (Number(n) === 0) role = 'admin';
    }
    if (!role) {
      role = String(req.body?.role ?? '');
      if (!SIGNUP_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Choose a valid department' });
      }
    }

    // Username = part before the @ (john@x.com -> john). If taken: john-2, john-3, ...
    const base = email.split('@')[0].replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 40) || 'user';
    for (let i = 1; i <= 50; i++) {
      const username = i === 1 ? base : `${base}-${i}`;
      try {
        const [result] = await pool.query(
          'INSERT INTO users (firebase_uid, username, password, role) VALUES (?, ?, NULL, ?)',
          [uid, username, role]);
        await markOnline(result.insertId);
        return res.status(201).json({ id: result.insertId, username, role });
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') throw err;
        // Same Firebase account inserted by a parallel request? Return that row.
        const [again] = await pool.query('SELECT id, username, role FROM users WHERE firebase_uid = ?', [uid]);
        if (again.length) return res.json(again[0]);
        // otherwise the username was taken: try the next one
      }
    }
    res.status(409).json({ error: 'Could not create a unique username' });
  } catch (err) {
    console.error('syncUser:', err);
    res.status(500).json({ error: 'Server error during user sync' });
  }
}

// Current user (id, username, role) - read from MySQL by verifyToken
export async function me(req, res) {
  res.json(req.user);
}

// Browser calls this every 30 s while any protected page is open
export async function heartbeat(req, res) {
  await markOnline(req.user.id);
  res.json({ ok: true });
}

// Logout button: mark offline but keep "last seen"
export async function logout(req, res) {
  try {
    await pool.query('UPDATE users SET last_seen_at = NOW(), is_logged_in = 0 WHERE id = ?', [req.user.id]);
  } catch (err) {
    console.warn('presence update failed:', err.message);
  }
  res.json({ ok: true });
}

// Admin only: everyone, with online status
export async function activeUsers(_req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, role,
              (is_logged_in = 1 AND last_seen_at IS NOT NULL
                 AND TIMESTAMPDIFF(SECOND, last_seen_at, NOW()) <= ?) AS online,
              TIMESTAMPDIFF(SECOND, last_seen_at, NOW()) AS seconds_ago
         FROM users
        ORDER BY online DESC, last_seen_at DESC, username`,
      [ONLINE_WINDOW_SECONDS]
    );
    res.json(rows.map(r => ({
      id: r.id, username: r.username, role: r.role,
      online: Boolean(Number(r.online)),
      seconds_ago: r.seconds_ago === null ? null : Number(r.seconds_ago)
    })));
  } catch (err) {
    console.error('activeUsers:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
