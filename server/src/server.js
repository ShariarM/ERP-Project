import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import attendanceRoutes from './routes/attendance.routes.js';
import leaveRoutes from './routes/leave.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import pool from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import customerRoutes from './routes/customer.routes.js';
import salesRoutes from './routes/sales.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/accounting', salesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);

const PORT = process.env.PORT || 5000;

// ─── Seed default users (idempotent) ─────────────────────────────
async function ensurePresenceColumns() {
  const needed = [
    ['last_seen_at', 'DATETIME NULL'],
    ['is_logged_in', 'TINYINT(1) NOT NULL DEFAULT 0']
  ];
  for (const [col, def] of needed) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`, [col]);
    if (!rows[0].n) {
      await pool.query(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
      console.log(`✓ Added users.${col}`);
    }
  }
}

async function seedUsers() {
  const defaults = [
    ['admin',      'admin123',      'admin'],
    ['sales',      'sales123',      'sales'],
    ['accounting', 'accounting123', 'accounting'],
    ['marketing',  'marketing123',  'marketing']
  ];
  for (const [username, password, role] of defaults) {
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hash, role]
      );
      console.log(`✓ Seeded user: ${username} / ${password} (${role})`);
    }
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
  try {
    await ensurePresenceColumns();
    await seedUsers();
  } catch (err) {
    console.warn('⚠ Could not seed users — did you import db.sql?', err.message);
  }
});