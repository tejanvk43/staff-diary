const pool = require('../config/db');
const { generateExcelBuffer } = require('../utils/excelParser');

// ─── GET /api/reports/diary ───────────────────────────────────────────────────
async function diaryReport(req, res) {
  const { employee_id: selfId, role, department } = req.user;
  const { employee_id, from_date, to_date, format } = req.query;

  if (!from_date || !to_date) {
    return res.status(400).json({ success: false, message: 'from_date and to_date are required.' });
  }

  try {
    let sql = `SELECT d.*, u.full_name, u.department, u.short_name FROM diary_logs d
               JOIN users u ON d.employee_id = u.employee_id WHERE d.log_date BETWEEN ? AND ?`;
    const params = [from_date, to_date];

    if (role === 'Faculty') {
      sql += ' AND d.employee_id = ?'; params.push(selfId);
    } else if (employee_id) {
      sql += ' AND d.employee_id = ?'; params.push(employee_id);
    } else if (role === 'HOD') {
      sql += ' AND u.department = ?'; params.push(department);
    }

    sql += ' ORDER BY d.log_date ASC, d.from_time ASC';
    const [rows] = await pool.query(sql, params);

    if (format === 'excel') {
      const buffer = generateExcelBuffer(rows.map(r => ({
        Date: r.log_date, Employee: r.full_name, Department: r.department,
        From: r.from_time, To: r.to_time, Activity: r.activity_type,
        Description: r.description, Status: r.status,
      })), 'Diary Report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="diary_report_${from_date}_${to_date}.xlsx"`);
      return res.send(buffer);
    }

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/reports/attendance ─────────────────────────────────────────────
async function attendanceReport(req, res) {
  const { employee_id: selfId, role, department } = req.user;
  const { employee_id, from_date, to_date, format } = req.query;

  try {
    const targetId = role === 'Faculty' ? selfId : (employee_id || null);

    let sql = `SELECT a.*, u.full_name, u.department FROM attendance a
               JOIN users u ON a.employee_id = u.employee_id
               WHERE a.attendance_date BETWEEN ? AND ?`;
    const params = [from_date || '2024-01-01', to_date || '2099-12-31'];

    if (targetId) { sql += ' AND a.employee_id = ?'; params.push(targetId); }
    else if (role === 'HOD') { sql += ' AND u.department = ?'; params.push(department); }

    sql += ' ORDER BY a.attendance_date ASC';
    const [rows] = await pool.query(sql, params);

    const summary = rows.reduce((acc, r) => {
      if (!acc[r.employee_id]) {
        acc[r.employee_id] = { full_name: r.full_name, department: r.department, Present: 0, Absent: 0, Leave: 0, OD: 0, Holiday: 0 };
      }
      acc[r.employee_id][r.status] = (acc[r.employee_id][r.status] || 0) + 1;
      return acc;
    }, {});

    if (format === 'excel') {
      const data = Object.entries(summary).map(([id, s]) => ({ Employee_ID: id, ...s }));
      const buffer = generateExcelBuffer(data, 'Attendance Summary');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance_report.xlsx"');
      return res.send(buffer);
    }

    return res.json({ success: true, data: { summary: Object.entries(summary).map(([id, s]) => ({ employee_id: id, ...s })), daily: rows } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/reports/leave ───────────────────────────────────────────────────
async function leaveReport(req, res) {
  const { employee_id: selfId, role, department } = req.user;
  const { employee_id, from_date, to_date, status, format } = req.query;

  try {
    let sql = `SELECT l.*, u.full_name, u.department FROM leave_requests l
               JOIN users u ON l.employee_id = u.employee_id WHERE 1=1`;
    const params = [];

    if (role === 'Faculty') { sql += ' AND l.employee_id = ?'; params.push(selfId); }
    else if (employee_id)   { sql += ' AND l.employee_id = ?'; params.push(employee_id); }
    else if (role === 'HOD') { sql += ' AND u.department = ?'; params.push(department); }

    if (status)    { sql += ' AND l.status = ?';     params.push(status); }
    if (from_date) { sql += ' AND l.leave_date >= ?'; params.push(from_date); }
    if (to_date)   { sql += ' AND l.leave_date <= ?'; params.push(to_date); }

    sql += ' ORDER BY l.leave_date DESC';
    const [rows] = await pool.query(sql, params);

    if (format === 'excel') {
      const buffer = generateExcelBuffer(rows.map(r => ({
        Date: r.leave_date, Employee: r.full_name, Department: r.department,
        Type: r.leave_type, Session: r.session_type, Reason: r.reason, Status: r.status,
      })), 'Leave Report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="leave_report.xlsx"');
      return res.send(buffer);
    }

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// \u2500\u2500\u2500 GET /api/reports/conflicts \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function conflictReport(req, res) {
  try {
    // Load all active subject types with their per-type max faculty limits
    const [subjectTypes] = await pool.query('SELECT id, name, max_faculty FROM subject_types ORDER BY name');

    const allConflicts = [];

    for (const st of subjectTypes) {
      // Use parameterised query so max_faculty is never interpolated as raw SQL
      const [rows] = await pool.query(
        `SELECT t.day, t.from_time, t.to_time, t.room_number, t.subject_type,
                COUNT(DISTINCT t.employee_id) AS faculty_count,
                GROUP_CONCAT(u.full_name   ORDER BY u.full_name SEPARATOR ', ') AS faculty_names,
                GROUP_CONCAT(t.employee_id ORDER BY t.employee_id SEPARATOR ', ') AS employee_ids,
                GROUP_CONCAT(u.department  ORDER BY u.full_name SEPARATOR ', ')  AS departments
         FROM timetables t
         JOIN users u ON t.employee_id = u.employee_id
         WHERE t.subject_type = ? AND t.room_number IS NOT NULL
         GROUP BY t.day, t.from_time, t.to_time, t.room_number, t.subject_type
         HAVING faculty_count > ?
         ORDER BY FIELD(t.day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), t.from_time`,
        [st.name, st.max_faculty]
      );
      allConflicts.push(...rows);
    }

    return res.json({ success: true, data: allConflicts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { diaryReport, attendanceReport, leaveReport, conflictReport };
