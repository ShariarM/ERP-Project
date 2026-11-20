import pool from '../config/db.js';

const DHAKA_NOW = "CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+06:00')";

export async function clockIn(req, res) {
  try {
    await pool.query(
      `INSERT INTO attendance (user_id, date, clock_in)
       VALUES (?, DATE(${DHAKA_NOW}), TIME(${DHAKA_NOW}))`,
      [req.user.id]
    );
    res.json({ message: 'Clocked in successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Already clocked in today' });
    }
    console.error('clockIn:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function clockOut(req, res) {
  try {
    const [result] = await pool.query(
      `UPDATE attendance
       SET clock_out = TIME(${DHAKA_NOW})
       WHERE user_id = ? AND date = DATE(${DHAKA_NOW})
       AND clock_out IS NULL`,
      [req.user.id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        error: 'No active clock-in found for today'
      });
    }

    res.json({ message: 'Clocked out successfully' });
  } catch (err) {
    console.error('clockOut:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

const attendanceFields = `
  DATE_FORMAT(a.date, '%Y-%m-%d') AS date,
  a.clock_in,
  a.clock_out,
  TIMESTAMPDIFF(
    MINUTE,
    TIMESTAMP(a.date, a.clock_in),
    COALESCE(
      TIMESTAMP(a.date, a.clock_out),
      ${DHAKA_NOW}
    )
  ) AS worked_minutes,
  CASE
    WHEN a.clock_out IS NULL THEN 'In Progress'
    WHEN TIMESTAMPDIFF(MINUTE, TIMESTAMP(a.date, a.clock_in), TIMESTAMP(a.date, a.clock_out)) < 240 THEN 'Half Day'
    WHEN TIMESTAMPDIFF(MINUTE, TIMESTAMP(a.date, a.clock_in), TIMESTAMP(a.date, a.clock_out)) >= 480 THEN 'Full Day'
    ELSE 'Partial Day'
  END AS day_status,
  CASE
    WHEN a.clock_in > '09:15:00' THEN 'Late'
    ELSE 'On Time'
  END AS arrival_status
`;

export async function getMyAttendance(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT ${attendanceFields}
       FROM attendance a
       WHERE a.user_id = ?
       ORDER BY a.date DESC LIMIT 30`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getMyAttendance:', err);
    res.status(500).json({ error: 'Could not load attendance' });
  }
}

export async function getAttendanceSummary(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total_days,
         SUM(CASE WHEN clock_in > '09:15:00' THEN 1 ELSE 0 END) AS late_days,
         SUM(CASE WHEN clock_out IS NOT NULL
             AND TIMESTAMPDIFF(MINUTE, TIMESTAMP(date, clock_in), TIMESTAMP(date, clock_out)) < 240
             THEN 1 ELSE 0 END) AS half_days,
         SUM(CASE WHEN clock_out IS NOT NULL
             AND TIMESTAMPDIFF(MINUTE, TIMESTAMP(date, clock_in), TIMESTAMP(date, clock_out)) >= 480
             THEN 1 ELSE 0 END) AS full_days,
         ROUND(SUM(
           CASE WHEN clock_out IS NOT NULL
             THEN TIMESTAMPDIFF(MINUTE, TIMESTAMP(date, clock_in), TIMESTAMP(date, clock_out))
             ELSE 0 END
         ) / 60, 2) AS total_working_hours
       FROM attendance
       WHERE user_id = ?
       AND DATE_FORMAT(date, '%Y-%m') =
           DATE_FORMAT(${DHAKA_NOW}, '%Y-%m')`,
      [req.user.id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('getAttendanceSummary:', err);
    res.status(500).json({ error: 'Could not load monthly summary' });
  }
}

export async function getTeamSummary(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
         u.id AS user_id,
         u.username AS employee_name,
         COUNT(a.id) AS total_days,
         SUM(CASE WHEN a.clock_in > '09:15:00'
             THEN 1 ELSE 0 END) AS late_days,
         SUM(CASE WHEN a.clock_out IS NOT NULL
             AND TIMESTAMPDIFF(MINUTE, TIMESTAMP(a.date, a.clock_in), TIMESTAMP(a.date, a.clock_out)) < 240
             THEN 1 ELSE 0 END) AS half_days,
         SUM(CASE WHEN a.clock_out IS NOT NULL
             AND TIMESTAMPDIFF(MINUTE, TIMESTAMP(a.date, a.clock_in), TIMESTAMP(a.date, a.clock_out)) >= 480
             THEN 1 ELSE 0 END) AS full_days,
         ROUND(SUM(CASE WHEN a.clock_out IS NOT NULL
             THEN TIMESTAMPDIFF(MINUTE, TIMESTAMP(a.date, a.clock_in), TIMESTAMP(a.date, a.clock_out))
             ELSE 0 END) / 60, 2) AS total_working_hours
       FROM users u
       LEFT JOIN attendance a
         ON a.user_id = u.id
         AND DATE_FORMAT(a.date, '%Y-%m') =
             DATE_FORMAT(${DHAKA_NOW}, '%Y-%m')
       WHERE u.role IN ('admin', 'sales', 'accounting', 'marketing')
       GROUP BY u.id, u.username
       ORDER BY u.username`,
      []
    );

    res.json(rows);
  } catch (err) {
    console.error('getTeamSummary:', err);
    res.status(500).json({ error: 'Could not load team attendance' });
  }
}