import pool from '../config/db.js';
import { validateTransition, httpError } from '../services/workflow.service.js';

// Today's date in Dhaka (UTC+6), the same clock the attendance page uses
const today = () => new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);

const COLUMNS = `s.id, s.customer_id, c.name AS customer_name, s.amount, s.description,
                 DATE_FORMAT(s.sale_date, '%Y-%m-%d') AS sale_date, s.status, s.created_at`;

export async function list(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT ${COLUMNS} FROM sales s LEFT JOIN customers c ON c.id = s.customer_id ORDER BY s.id DESC`);
    res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
  } catch (err) {
    console.error('sales list:', err);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
}

export async function create(req, res) {
  try {
    const { customer_id, description, sale_date } = req.body ?? {};
    const amount = Number(req.body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a number greater than 0' });
    }
    if (customer_id) {
      const [c] = await pool.query('SELECT id FROM customers WHERE id = ?', [customer_id]);
      if (!c.length) return res.status(400).json({ error: 'Customer does not exist' });
    }
    if (sale_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(sale_date))) {
      return res.status(400).json({ error: 'Date is not valid' });
    }
    const text = description ? String(description).trim().slice(0, 255) : null;

    // New sales start as 'draft' (default in the database)
    const [result] = await pool.query(
      'INSERT INTO sales (customer_id, amount, description, sale_date) VALUES (?, ?, ?, ?)',
      [customer_id || null, amount, text, sale_date || today()]);
    const [rows] = await pool.query(
      `SELECT ${COLUMNS} FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?`,
      [result.insertId]);
    res.status(201).json({ ...rows[0], amount: Number(rows[0].amount) });
  } catch (err) {
    console.error('sales create:', err);
    res.status(500).json({ error: 'Failed to create sale' });
  }
}

// Revenue numbers: drafts are not counted yet
export async function summary(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT COUNT(*) AS total_count,
             COALESCE(SUM(amount), 0) AS total_amount,
             COALESCE(AVG(amount), 0) AS avg_amount
        FROM sales WHERE status != 'draft'`);
    res.json(rows[0]);
  } catch (err) {
    console.error('sales summary:', err);
    res.status(500).json({ error: 'Failed' });
  }
}

// Moves a sale to the next step. The rules (who may do which step) live in workflow.service.js
export async function updateStatus(req, res) {
  const id = Number(req.params.id);
  const nextStatus = String(req.body?.status ?? '');
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid sale id' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT status FROM sales WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) throw httpError(404, 'Sale not found');
    const currentStatus = rows[0].status;

    validateTransition('sales', currentStatus, nextStatus, req.user.role);

    await connection.query('UPDATE sales SET status = ? WHERE id = ?', [nextStatus, id]);
    await connection.query(
      'INSERT INTO workflow_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES (?, ?, ?, ?, ?)',
      ['sales', id, currentStatus, nextStatus, req.user.id]);

    await connection.commit();
    res.json({ message: `Sale marked as ${nextStatus}`, status: nextStatus });
  } catch (err) {
    await connection.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('sales updateStatus:', err);
    res.status(500).json({ error: 'Could not update the sale' });
  } finally {
    connection.release();
  }
}
