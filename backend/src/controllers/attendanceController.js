const pool = require('../config/db');

// GET /api/attendance?date=YYYY-MM-DD&department=X&employee_id=X
async function getAttendance(req, res) {
  const { employee_id: selfId, role, department } = req.user;
  const { date, department: deptFilter, employee_id } = req.query;

  try {
    let sql = `SELECT a.*, u.full_name, u.department, u.designation FROM attendance a
               JOIN users u ON a.employee_id = u.employee_id WHERE 1=1`;
    const params = [];

    if (date)       { sql += ' AND a.attendance_date = ?'; params.push(date); }
    if (role === 'Faculty') { sql += ' AND a.employee_id = ?'; params.push(selfId); }
    else {
      if (employee_id) { sql += ' AND a.employee_id = ?'; params.push(employee_id); }
      if (role === 'HOD') { sql += ' AND u.department = ?'; params.push(department); }
      else if (deptFilter) { sql += ' AND u.department = ?'; params.push(deptFilter); }
    }

    sql += ' ORDER BY a.attendance_date DESC, u.full_name ASC';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// POST /api/attendance — mark attendance manually
async function markAttendance(req, res) {
  const { employee_id: adminId } = req.user;
  const { employee_id, attendance_date, status, check_in, check_out, remarks } = req.body;

  if (!employee_id || !attendance_date || !status) {
    return res.status(400).json({ success: false, message: 'employee_id, attendance_date, and status are required.' });
  }

  const validStatuses = ['Present', 'Absent', 'Leave', 'OD', 'Holiday'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    await pool.query(
      `INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE check_in=VALUES(check_in), check_out=VALUES(check_out),
       status=VALUES(status), remarks=VALUES(remarks)`,
      [employee_id, attendance_date, check_in||null, check_out||null, status, remarks||null]
    );
    return res.status(201).json({ success: true, message: 'Attendance recorded.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// PUT /api/attendance/:id
async function updateAttendance(req, res) {
  const { status, check_in, check_out, remarks } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE attendance SET status=COALESCE(?,status), check_in=COALESCE(?,check_in),
       check_out=COALESCE(?,check_out), remarks=COALESCE(?,remarks) WHERE id=?`,
      [status||null, check_in||null, check_out||null, remarks||null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Record not found.' });
    return res.json({ success: true, message: 'Attendance updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/attendance/summary?from_date=X&to_date=X — summary per employee
async function getAttendanceSummary(req, res) {
  const { employee_id: selfId, role, department } = req.user;
  const { from_date, to_date, department: deptFilter } = req.query;

  try {
    let sql = `SELECT u.employee_id, u.full_name, u.department,
               SUM(a.status='Present') AS present,
               SUM(a.status='Absent') AS absent,
               SUM(a.status='Leave') AS leave_days,
               SUM(a.status='OD') AS od_days,
               SUM(a.status='Holiday') AS holidays,
               COUNT(*) AS total
               FROM attendance a
               JOIN users u ON a.employee_id = u.employee_id
               WHERE 1=1`;
    const params = [];

    if (from_date) { sql += ' AND a.attendance_date >= ?'; params.push(from_date); }
    if (to_date)   { sql += ' AND a.attendance_date <= ?'; params.push(to_date); }
    if (role === 'Faculty') { sql += ' AND a.employee_id = ?'; params.push(selfId); }
    else if (role === 'HOD') { sql += ' AND u.department = ?'; params.push(department); }
    else if (deptFilter)    { sql += ' AND u.department = ?'; params.push(deptFilter); }

    sql += ' GROUP BY u.employee_id, u.full_name, u.department ORDER BY u.full_name';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getAttendance, markAttendance, updateAttendance, getAttendanceSummary };
