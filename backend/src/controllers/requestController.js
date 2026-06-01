const pool = require('../config/db');

// ─── Leave Requests ───────────────────────────────────────────────────────────

// helper: get a system config value
async function getCfg(key, fallback) {
  const [rows] = await pool.query(
    'SELECT config_value FROM system_configs WHERE config_key = ?', [key]
  );
  return rows.length ? rows[0].config_value : fallback;
}

// helper: notify every Admin about a threshold breach
async function notifyAdmins(pool, senderEmpId, title, message, type) {
  const [admins] = await pool.query(
    `SELECT employee_id FROM users WHERE role = 'Admin'`
  );
  if (!admins.length) return;
  const values = admins.map(a => [
    senderEmpId, a.employee_id, title, message, type
  ]);
  await pool.query(
    `INSERT INTO notifications
       (sender_employee_id, receiver_employee_id, title, message, notification_type)
     VALUES ?`,
    [values]
  );
}

// POST /api/leave
async function createLeave(req, res) {
  const { employee_id } = req.user;
  const { leave_date, reason, session_type, leave_type } = req.body;

  if (!leave_date || !reason || !session_type || !leave_type) {
    return res.status(400).json({ success: false, message: 'leave_date, reason, session_type, leave_type are required.' });
  }

  try {
    const [check] = await pool.query(
      'SELECT DATEDIFF(?, CURDATE()) AS diff',
      [leave_date]
    );
    if (parseInt(check[0].diff) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Leave requests must be for future dates only.',
      });
    }

    await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_date, reason, session_type, leave_type, status)
       VALUES (?, ?, ?, ?, ?, 'Approved')`,
      [employee_id, leave_date, reason, session_type, leave_type]
    );

    // ── Threshold check (current calendar month) ──────────────────────────────
    const threshold = parseInt(await getCfg('leave_alert_threshold', '3'));
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM leave_requests
       WHERE employee_id = ?
         AND MONTH(leave_date) = MONTH(CURDATE())
         AND YEAR(leave_date)  = YEAR(CURDATE())`,
      [employee_id]
    );
    const cnt = parseInt(countRows[0].cnt);
    if (cnt >= threshold) {
      await notifyAdmins(
        pool, employee_id,
        `⚠️ Leave Alert: ${req.user.full_name}`,
        `${req.user.full_name} has applied for ${cnt} leave day(s) this month (threshold: ${threshold}).`,
        'Leave'
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    return res.status(201).json({ success: true, message: 'Leave request recorded.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/leave  (own requests or admin/HOD all)
async function getLeaves(req, res) {
  const { employee_id, role, department } = req.user;
  const { status, from_date, to_date } = req.query;

  try {
    let sql = `SELECT l.*, u.full_name, u.department FROM leave_requests l
               JOIN users u ON l.employee_id = u.employee_id WHERE 1=1`;
    const params = [];

    if (role === 'Faculty') {
      sql += ' AND l.employee_id = ?'; params.push(employee_id);
    } else if (role === 'HOD') {
      sql += ' AND u.department = ?'; params.push(department);
    }

    if (status)    { sql += ' AND l.status = ?';     params.push(status); }
    if (from_date) { sql += ' AND l.leave_date >= ?'; params.push(from_date); }
    if (to_date)   { sql += ' AND l.leave_date <= ?'; params.push(to_date); }

    sql += ' ORDER BY l.created_at DESC';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── OD Requests ──────────────────────────────────────────────────────────────

// POST /api/od
async function createOD(req, res) {
  const { employee_id } = req.user;
  const { od_date, place, session_type, purpose } = req.body;

  if (!od_date || !place || !session_type || !purpose) {
    return res.status(400).json({ success: false, message: 'od_date, place, session_type, purpose are required.' });
  }

  try {
    const [check] = await pool.query('SELECT DATEDIFF(?, CURDATE()) AS diff', [od_date]);
    if (parseInt(check[0].diff) <= 0) {
      return res.status(400).json({
        success: false, message: 'OD requests must be for future dates only.',
      });
    }

    await pool.query(
      `INSERT INTO on_duty_requests (employee_id, od_date, place, session_type, purpose, status)
       VALUES (?, ?, ?, ?, ?, 'Approved')`,
      [employee_id, od_date, place, session_type, purpose]
    );

    // ── Threshold check (current calendar month) ──────────────────────────────
    const threshold = parseInt(await getCfg('od_alert_threshold', '3'));
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM on_duty_requests
       WHERE employee_id = ?
         AND MONTH(od_date) = MONTH(CURDATE())
         AND YEAR(od_date)  = YEAR(CURDATE())`,
      [employee_id]
    );
    const cnt = parseInt(countRows[0].cnt);
    if (cnt >= threshold) {
      await notifyAdmins(
        pool, employee_id,
        `⚠️ OD Alert: ${req.user.full_name}`,
        `${req.user.full_name} has applied for ${cnt} OD day(s) this month (threshold: ${threshold}).`,
        'OD'
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    return res.status(201).json({ success: true, message: 'OD request recorded.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/od
async function getODs(req, res) {
  const { employee_id, role, department } = req.user;
  const { status, from_date, to_date } = req.query;

  try {
    let sql = `SELECT o.*, u.full_name, u.department FROM on_duty_requests o
               JOIN users u ON o.employee_id = u.employee_id WHERE 1=1`;
    const params = [];

    if (role === 'Faculty') { sql += ' AND o.employee_id = ?'; params.push(employee_id); }
    else if (role === 'HOD') { sql += ' AND u.department = ?'; params.push(department); }

    if (status)    { sql += ' AND o.status = ?';   params.push(status); }
    if (from_date) { sql += ' AND o.od_date >= ?'; params.push(from_date); }
    if (to_date)   { sql += ' AND o.od_date <= ?'; params.push(to_date); }

    sql += ' ORDER BY o.created_at DESC';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── Extra Hours ──────────────────────────────────────────────────────────────

async function createExtra(req, res) {
  const { employee_id } = req.user;
  const { purpose, description, from_time, to_time } = req.body;

  if (!purpose || !from_time || !to_time) {
    return res.status(400).json({ success: false, message: 'purpose, from_time, to_time are required.' });
  }

  try {
    await pool.query(
      `INSERT INTO extra_hours (employee_id, purpose, description, from_time, to_time, status)
       VALUES (?, ?, ?, ?, ?, 'Approved')`,
      [employee_id, purpose, description||null, from_time, to_time]
    );
    return res.status(201).json({ success: true, message: 'Extra hours recorded.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function getExtras(req, res) {
  const { employee_id, role, department } = req.user;
  try {
    let sql = `SELECT e.*, u.full_name, u.department FROM extra_hours e
               JOIN users u ON e.employee_id = u.employee_id WHERE 1=1`;
    const params = [];
    if (role === 'Faculty') { sql += ' AND e.employee_id = ?'; params.push(employee_id); }
    else if (role === 'HOD') { sql += ' AND u.department = ?'; params.push(department); }
    sql += ' ORDER BY e.created_at DESC';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── Edit Requests ────────────────────────────────────────────────────────────
async function getEditRequests(req, res) {
  const { employee_id, role, department } = req.user;
  try {
    let sql = `SELECT r.*, u.full_name, u.department FROM request_detail_changes r
               JOIN users u ON r.employee_id = u.employee_id WHERE 1=1`;
    const params = [];
    if (role === 'Faculty') { sql += ' AND r.employee_id = ?'; params.push(employee_id); }
    else if (role === 'HOD') { sql += ' AND u.department = ?'; params.push(department); }
    sql += ' ORDER BY r.created_at DESC';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { createLeave, getLeaves, createOD, getODs, createExtra, getExtras, getEditRequests };
