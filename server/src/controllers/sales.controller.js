import pool from '../config/db.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function list(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, c.name AS customer_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      ORDER BY s.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
}

export async function create(req, res) {
  try {
    const { customer_id, amount, description, sale_date } = req.body;
    if (amount == null || isNaN(amount) || Number(amount) <= 0)
      return res.status(400).json({ error: 'Amount must be a number greater than 0' });

    const [result] = await pool.query(
      'INSERT INTO sales (customer_id, amount, description, sale_date) VALUES (?, ?, ?, ?)',
      [customer_id || null, Number(amount), description || null, sale_date || today()]
    );
    const [rows] = await pool.query('SELECT * FROM sales WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create sale' });
  }
}

export async function summary(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*)                        AS total_count,
        COALESCE(SUM(amount), 0)        AS total_amount,
        COALESCE(AVG(amount), 0)        AS avg_amount
      FROM sales
    `);
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}

export async function remove(req, res) {
  try {
    await pool.query('DELETE FROM sales WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
}