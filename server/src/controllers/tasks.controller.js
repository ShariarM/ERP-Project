import pool from '../config/db.js';

const STATUSES = ['pending', 'in_progress', 'completed'];
const isValidDeadline = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
};

export async function list(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const [rows] = await pool.query(
      `SELECT t.id, t.title, t.description,
              DATE_FORMAT(t.deadline, '%Y-%m-%d') AS deadline,
              t.status, t.assigned_to, u.username AS assignee
         FROM tasks t
         JOIN users u ON u.id = t.assigned_to
        ${isAdmin ? '' : 'WHERE t.assigned_to = ?'}
        ORDER BY t.deadline, t.id`,
      isAdmin ? [] : [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('listTasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

export async function listUsers(_req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, role FROM users WHERE role <> 'admin' ORDER BY username"
    );
    res.json(rows);
  } catch (err) {
    console.error('listTaskUsers:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function create(req, res) {
  try {
    const title = String(req.body?.title ?? '').trim();
    const description = String(req.body?.description ?? '').trim();
    const deadline = req.body?.deadline;
    const assignedTo = Number(req.body?.assigned_to);

    if (!title || title.length > 150) {
      return res.status(400).json({ error: 'Title is required (max 150 characters)' });
    }
    if (description.length > 65535) {
      return res.status(400).json({ error: 'Description is too long' });
    }
    if (!isValidDeadline(deadline)) {
      return res.status(400).json({ error: 'Enter a valid deadline' });
    }
    if (!Number.isInteger(assignedTo) || assignedTo < 1) {
      return res.status(400).json({ error: 'Choose a valid assignee' });
    }

    const [users] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role <> 'admin'",
      [assignedTo]
    );
    if (!users.length) return res.status(400).json({ error: 'Choose a valid assignee' });

    const [result] = await pool.query(
      'INSERT INTO tasks (title, description, deadline, assigned_to, assigned_by) VALUES (?, ?, ?, ?, ?)',
      [title, description || null, deadline, assignedTo, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Task assigned successfully' });
  } catch (err) {
    console.error('createTask failed:', {
      code: err.code || err.name,
      message: err.sqlMessage || err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Failed to create task' });
  }
}

export async function updateStatus(req, res) {
  try {
    const { status } = req.body ?? {};
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid task status' });

    const isAdmin = req.user.role === 'admin';
    const [result] = await pool.query(
      `UPDATE tasks SET status = ? WHERE id = ? ${isAdmin ? '' : 'AND assigned_to = ?'}`,
      isAdmin ? [status, req.params.id] : [status, req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task status updated' });
  } catch (err) {
    console.error('updateTaskStatus:', err);
    res.status(500).json({ error: 'Failed to update task status' });
  }
}
