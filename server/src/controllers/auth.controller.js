import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const SECRET = process.env.JWT_SECRET || 'dev_secret';
const SIGNUP_ROLES = ['sales', 'marketing', 'accounting']; // admin is NOT allowed here

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

export async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      SECRET,
      { expiresIn: '8h' }
    );

    await markOnline(user.id);
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
// ADD THIS BELOW THE login FUNCTION
export async function signup(req, res) {
  try {
    const { password } = req.body;
    const username = String(req.body.username || '').trim();
    const role = String(req.body.role || '');

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    // SECURITY: public signup must never create an admin. Admins are created only by the seed/DB.
    if (!SIGNUP_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Choose a valid department' });
    }
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 letters, numbers, . _ -' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password and insert
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hash, role]
    );

    // Auto-login after signup (generate token)
    const token = jwt.sign(
      { id: result.insertId, username, role },
      SECRET,
      { expiresIn: '8h' }
    );

    await markOnline(result.insertId);
    res.status(201).json({
      token,
      user: { id: result.insertId, username, role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during signup' });
  }
}
export async function me(req, res) {
  res.json({ user: req.user });
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
