import pool from '../config/db.js';
import { notifyUsersByRole } from '../services/notification.service.js';

export async function list(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
}

export async function get(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

export async function create(req, res) {
  try {
    const { name, email, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const [result] = await pool.query(
      'INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)',
      [name, email || null, phone || null, address || null]
    );
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);

    try {
      await notifyUsersByRole({
        roles: ['admin', 'sales'],
        excludeUserId: req.user.id,
        eventType: 'customer.created',
        title: 'New Customer Added',
        message: `Customer ${name} was added to the customer records.`,
        link: '/pages/customers/'
      });
    } catch (notificationError) {
      console.error('Customer creation notification failed:', notificationError);
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
}

export async function update(req, res) {
  try {
    const { name, email, phone, address } = req.body;
    const [result] = await pool.query(
      'UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?',
      [name, email || null, phone || null, address || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);

    try {
      await notifyUsersByRole({
        roles: ['admin', 'sales'],
        excludeUserId: req.user.id,
        eventType: 'customer.updated',
        title: 'Customer Information Updated',
        message: `Customer ${name} was updated.`,
        link: '/pages/customers/'
      });
    } catch (notificationError) {
      console.error('Customer update notification failed:', notificationError);
    }

    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update' });
  }
}

export async function remove(req, res) {
  try {
    await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete' });
  }
}