import pool from '../config/db.js';

export async function clockIn(req, res) {
  try {
    // The table has UNIQUE(user_id, date), so a second clock-in on the same day is refused by MySQL itself
    await pool.query(
      'INSERT INTO attendance (user_id, date, clock_in) VALUES (?, CURDATE(), CURTIME())',
      [req.user.id]
    );
    res.json({ message: 'Clocked in successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Already clocked in today' });
    console.error('clockIn:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function clockOut(req, res) {
  try {
    const [result] = await pool.query(
      'UPDATE attendance SET clock_out = CURTIME() WHERE user_id = ? AND date = CURDATE() AND clock_out IS NULL',
      [req.user.id]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ error: 'No active clock-in found for today' });
    }
    res.json({ message: 'Clocked out successfully' });
  } catch (err) {
    console.error('clockOut:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getMyAttendance(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, clock_in, clock_out
         FROM attendance WHERE user_id = ? ORDER BY attendance.date DESC LIMIT 30`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getMyAttendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
