import pool from '../config/db.js';
import { sendEmail } from './mailer.js';

/** Create an in-app notification and optionally deliver an email. */
export async function notifyUser({ userId, eventType, title, message, link = null, email = false, emailSubject = title, emailText = message }) {
  if (!userId || !eventType || !title || !message) throw new Error('userId, eventType, title and message are required.');
  await pool.query(
    'INSERT INTO notifications (user_id, event_type, title, message, link) VALUES (?, ?, ?, ?, ?)',
    [userId, eventType, title, message, link]
  );
  if (!email) return { inApp: true, email: 'not_requested' };

  const [users] = await pool.query(
    `SELECT u.email, COALESCE(p.enabled, 1) AS email_enabled
       FROM users u LEFT JOIN email_preferences p ON p.user_id = u.id WHERE u.id = ? LIMIT 1`,
    [userId]
  );
  const recipient = users[0]?.email;
  if (!recipient || !Number(users[0].email_enabled)) return { inApp: true, email: 'skipped' };

  const [log] = await pool.query(
    'INSERT INTO email_logs (user_id, recipient, subject, event_type, status) VALUES (?, ?, ?, ?, ?)',
    [userId, recipient, emailSubject, eventType, 'queued']
  );
  try {
    await sendEmail({ to: recipient, subject: emailSubject, text: emailText });
    await pool.query('UPDATE email_logs SET status = ?, sent_at = NOW() WHERE id = ?', ['sent', log.insertId]);
    return { inApp: true, email: 'sent' };
  } catch (error) {
    await pool.query('UPDATE email_logs SET status = ?, error_message = ? WHERE id = ?', ['failed', String(error.message).slice(0, 1000), log.insertId]);
    return { inApp: true, email: 'failed' };
  }
}

export async function listMyNotifications(userId, limit = 30) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const [rows] = await pool.query(
    `SELECT id, event_type, title, message, link, is_read, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [userId, safeLimit]
  );
  return rows;
}

export async function markNotificationRead(userId, notificationId) {
  const [result] = await pool.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  return result.affectedRows > 0;
}


// Notify all users with selected roles. Email is opt-in per call.
export async function notifyUsersByRole({
  roles,
  excludeUserId = null,
  eventType,
  title,
  message,
  link = null,
  email = false
}) {
  const safeRoles = [...new Set(
    (roles || []).filter(role => typeof role === 'string' && role.trim())
  )];

  if (!safeRoles.length) return { notified: 0 };

  const placeholders = safeRoles.map(() => '?').join(', ');
  const [users] = await pool.query(
    `SELECT id FROM users WHERE role IN (${placeholders})`,
    safeRoles
  );

  const recipients = users.filter(
    user => excludeUserId == null || Number(user.id) !== Number(excludeUserId)
  );

  const results = await Promise.allSettled(
    recipients.map(user => notifyUser({
      userId: user.id,
      eventType,
      title,
      message,
      link,
      email
    }))
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Role notification delivery failed:', result.reason);
    }
  }

  return {
    notified: results.filter(result => result.status === 'fulfilled').length
  };
}
