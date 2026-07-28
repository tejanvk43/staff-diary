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

    const { role, department } = req.user;
    let filteredConflicts = allConflicts;
    if (role === 'HOD') {
      filteredConflicts = allConflicts.filter(c => {
        const depts = (c.departments || '').split(',').map(d => d.trim());
        return depts.includes(department);
      });
    }

    return res.json({ success: true, data: filteredConflicts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/reports/unassigned ─────────────────────────────────────────────
async function unassignedReport(req, res) {
  const { role, department } = req.user;
  const { format } = req.query;

  try {
    let sql = `SELECT bts.*, 
              bt.education_type AS programme, 
              bt.year, 
              bt.department AS branch, 
              bt.section
       FROM block_timetable_slots bts
       JOIN block_timetables bt ON bts.timetable_id = bt.id`;
    const params = [];
    if (role === 'HOD') {
      sql += ' WHERE bt.department = ?';
      params.push(department);
    }
    sql += ` ORDER BY 
         bt.education_type, 
         bt.year, 
         bt.department, 
         bt.section, 
         FIELD(bts.day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), 
         bts.from_time`;

    const [slots] = await pool.query(sql, params);

    const reportRows = [];

    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
      return timeStr;
    };

    for (const slot of slots) {
      if (slot.subject_type === 'Break') {
        continue;
      }

      // Check if faculty is assigned
      let hasFaculty = false;
      if (slot.faculty_id) {
        hasFaculty = true;
      } else {
        try {
          const flist = slot.faculty_list ? (typeof slot.faculty_list === 'string' ? JSON.parse(slot.faculty_list) : slot.faculty_list) : [];
          if (Array.isArray(flist) && flist.length > 0) {
            hasFaculty = true;
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      // Check if subject is assigned
      const hasSubject = slot.subject_id !== null || 
                         (slot.short_name && slot.short_name.trim() !== '') || 
                         (slot.subject_name && slot.subject_name.trim() !== '');

      // Exclude fully-assigned slots
      if (hasSubject && hasFaculty) {
        continue;
      }

      let status = '';
      if (!hasSubject && !hasFaculty) {
        status = 'not assigned';
      } else if (hasFaculty && !hasSubject) {
        status = 'staff was assigned no subject';
      } else if (hasSubject && !hasFaculty) {
        status = 'only subject added no faculty added';
      }

      const timings = `${formatTime(slot.from_time)} - ${formatTime(slot.to_time)}`;

      reportRows.push({
        programme: slot.programme || '—',
        year: slot.year || '—',
        branch: slot.branch || '—',
        section: slot.section || '—',
        day: slot.day,
        timings: timings,
        status: status
      });
    }

    if (format === 'excel') {
      const buffer = generateExcelBuffer(reportRows.map(r => ({
        Programme: r.programme,
        Year: r.year,
        Branch: r.branch,
        Section: r.section,
        Day: r.day,
        Timings: r.timings,
        Status: r.status,
      })), 'Unassigned Classes');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="unassigned_classes_report.xlsx"');
      return res.send(buffer);
    }

    return res.json({ success: true, data: reportRows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/reports/adjustments ──────────────────────────────────────────────
async function adjustmentsReport(req, res) {
  const { employee_id: selfId, role, department } = req.user;
  const { employee_id, from_date, to_date, format } = req.query;

  if (!from_date || !to_date) {
    return res.status(400).json({ success: false, message: 'from_date and to_date are required.' });
  }

  try {
    let sql = `
      SELECT ca.*, 
             u.full_name AS requester_name, u.department AS requester_dept,
             u2.full_name AS assigned_to_name, u2.department AS assigned_to_dept
      FROM class_adjustments ca
      JOIN users u ON ca.employee_id = u.employee_id
      JOIN users u2 ON ca.assigned_to_employee_id = u2.employee_id
      WHERE ca.adjustment_date BETWEEN ? AND ?
    `;
    const params = [from_date, to_date];

    if (role === 'Faculty') {
      sql += ' AND (ca.employee_id = ? OR ca.assigned_to_employee_id = ?)';
      params.push(selfId, selfId);
    } else if (employee_id) {
      sql += ' AND (ca.employee_id = ? OR ca.assigned_to_employee_id = ?)';
      params.push(employee_id, employee_id);
    } else if (role === 'HOD') {
      sql += ' AND (u.department = ? OR u2.department = ?)';
      params.push(department, department);
    }

    sql += ' ORDER BY ca.adjustment_date ASC, ca.from_time ASC';
    const [rows] = await pool.query(sql, params);

    if (format === 'excel') {
      const buffer = generateExcelBuffer(rows.map(r => ({
        Date: r.adjustment_date,
        'Requester Employee': r.employee_id,
        'Requester Name': r.requester_name,
        'Assigned Faculty Employee': r.assigned_to_employee_id,
        'Assigned Faculty Name': r.assigned_to_name,
        'From Time': r.from_time,
        'To Time': r.to_time,
        'Subject Name': r.subject_name,
        Section: r.section || '',
        'Is Mutual': r.is_mutual ? 'Yes' : 'No',
        'Mutual Date': r.mutual_date || '',
        'Mutual Subject': r.mutual_subject_name || '',
        'Mutual Section': r.mutual_section || '',
        Status: r.status,
      })), 'Class Adjustments Report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="adjustments_report_${from_date}_${to_date}.xlsx"`);
      return res.send(buffer);
    }

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error generating class adjustments report.' });
  }
}

module.exports = { diaryReport, leaveReport, conflictReport, unassignedReport, adjustmentsReport };
