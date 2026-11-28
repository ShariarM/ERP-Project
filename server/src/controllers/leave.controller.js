import pool from '../config/db.js';
import { notifyUser, notifyUsersByRole } from '../services/notification.service.js';

const TYPES = ['Sick', 'Vacation', 'Personal', 'Other'];
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export async function applyLeave(req, res) {
  try {
    const type = String(req.body?.type ?? '');
    const start = String(req.body?.start_date ?? '');
    const end = String(req.body?.end_date ?? '');
    const reason = String(req.body?.reason ?? '').trim();

    if (!type || !start || !end || !reason) return res.status(400).json({ error: 'All fields are required' });
    if (!TYPES.includes(type)) return res.status(400).json({ error: 'Choose a valid leave type' });
    if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Dates are not valid' });
    if (end < start) return res.status(400).json({ error: 'End date cannot be before the start date' });
    if (reason.length > 255) return res.status(400).json({ error: 'Reason is too long (max 255 characters)' });

    await pool.query(
      'INSERT INTO leave_requests (user_id, type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, type, start, end, reason]
    );

    try {
      await notifyUsersByRole({
        roles: ['admin'],
        excludeUserId: req.user.id,
        eventType: 'leave.submitted',
        title: 'New Leave Application',
        message: `${req.user.username || 'An employee'} submitted a ${type} leave application.`,
        link: '/pages/leave/'
      });
    } catch (notificationError) {
      console.error('Leave submission notification failed:', notificationError);
    }

    res.status(201).json({ message: 'Leave applied successfully' });
  } catch (err) {
    console.error('applyLeave:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getLeaves(req, res) {
  try {
    // Admin sees everyone's requests; everyone else sees only their own
    const onlyMine = req.user.role !== 'admin';
    const [rows] = await pool.query(
      `SELECT l.id, l.user_id, u.username, l.type, l.reason, l.status,
              DATE_FORMAT(l.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(l.end_date, '%Y-%m-%d') AS end_date, l.created_at
         FROM leave_requests l JOIN users u ON u.id = l.user_id
        ${onlyMine ? 'WHERE l.user_id = ?' : ''}
        ORDER BY l.created_at DESC, l.id DESC`,
      onlyMine ? [req.user.id] : []
    );
    res.json(rows);
  } catch (err) {
    console.error('getLeaves:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Route is restricted to admin (leave.routes.js); the workflow allows pending -> approved/rejected only
export async function updateLeaveStatus(req, res) {
  const id = Number(req.params.id);
  const nextStatus = String(req.body?.status ?? '');
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid leave id' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT status FROM leave_requests WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) throw httpError(404, 'Leave request not found');
    const currentStatus = rows[0].status;

    validateTransition('leave', currentStatus, nextStatus, req.user.role);

    await connection.query('UPDATE leave_requests SET status = ? WHERE id = ?', [nextStatus, id]);
    await connection.query(
      'INSERT INTO workflow_logs (entity_type, entity_id, from_status, to_status, changed_by) VALUES (?, ?, ?, ?, ?)',
      ['leave', id, currentStatus, nextStatus, req.user.id]
    );

    const [leaveRows] = await pool.query(
      'SELECT user_id, type FROM leave_requests WHERE id = ?',
      [req.params.id]
    );

    const [result] = await pool.query(
      'UPDATE leave_requests SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    if (!result.affectedRows) return res.status(404).json({ error: 'Leave request not found' });

    if (leaveRows.length) {
      try {
        await notifyUser({
          userId: leaveRows[0].user_id,
          eventType: `leave.${status}`,
          title: `Leave ${status}`,
          message: `Your ${leaveRows[0].type} leave application has been ${status}.`,
          link: '/pages/leave/'
        });
      } catch (notificationError) {
        console.error('Leave status notification failed:', notificationError);
      }
    }

    res.json({ message: `Leave ${status}` });
  } catch (err) {
    await connection.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('updateLeaveStatus:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
}
