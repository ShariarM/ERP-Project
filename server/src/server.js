import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import attendanceRoutes from './routes/attendance.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import pool from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import customerRoutes from './routes/customer.routes.js';
import salesRoutes from './routes/sales.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import { initDatabase } from './models/init-db.js';

import inventoryRoutes from './routes/inventory.routes.js';
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/accounting', salesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;

// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼ Seed default users (idempotent) ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
async function ensurePresenceColumns() {
  const needed = [
    ['last_seen_at', 'DATETIME NULL'],
    ['is_logged_in', 'TINYINT(1) NOT NULL DEFAULT 0'],
    ['firebase_uid', 'VARCHAR(128) NULL UNIQUE']
  ];
  for (const [col, def] of userColumns) {
    if (!(await hasColumn('users', col))) {
      await pool.query(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
      console.log(`├ó┼ôΓÇ£ Added users.${col}`);
    }
  }
  // Passwords now live in Firebase, so MySQL must allow an empty password column.
  await pool.query('ALTER TABLE users MODIFY password VARCHAR(255) NULL');

  // sales workflow: existing sales keep counting as revenue ('paid'), new ones start as 'draft'
  if (!(await hasColumn('sales', 'status'))) {
    await pool.query(
      "ALTER TABLE sales ADD COLUMN status ENUM('draft','confirmed','invoiced','paid') NOT NULL DEFAULT 'paid'");
    await pool.query("ALTER TABLE sales ALTER COLUMN status SET DEFAULT 'draft'");
    console.log('+ Added sales.status');
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS workflow_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(30) NOT NULL,
    entity_id INT NOT NULL,
    from_status VARCHAR(30) NOT NULL,
    to_status VARCHAR(30) NOT NULL,
    changed_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_workflow_entity (entity_type, entity_id),
    CONSTRAINT fk_workflow_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
    cost_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    stock_quantity DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    reorder_level DECIMAL(12,2) NOT NULL DEFAULT 5.00,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_products_stock (is_active, stock_quantity, reorder_level)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    stock_after DECIMAL(12,2) NOT NULL,
    note VARCHAR(255) NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stock_product_date (product_id, created_at),
    CONSTRAINT fk_stock_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_stock_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  )`);
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
      console.log('Default user ready: ' + username + ' (' + role + ')');
    }
  }
}

app.listen(PORT, async () => {
  console.log('Server running at http://localhost:' + PORT);
  try {
    await ensureDatabase();
    await ensureSchema();
    console.log('Database ready');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
});
