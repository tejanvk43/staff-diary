const pool = require('../config/db');
const { parseExcelBuffer } = require('../utils/excelParser');

// ─── STUDENT MANAGEMENT (Admin / HOD / Faculty) ────────────────────────────────

// GET /api/counseling/students
async function listStudents(req, res) {
  const { role, department, employee_id } = req.user;
  const { search, counselor_id, unmapped } = req.query;

  try {
    let sql = `
      SELECT s.*, u.full_name AS counselor_name 
      FROM students s
      LEFT JOIN users u ON s.counselor_id = u.employee_id
      WHERE 1=1
    `;
    const params = [];

    // Filter by role scope
    if (role === 'HOD') {
      sql += ' AND s.department = ?';
      params.push(department);
    } else if (role === 'Faculty') {
      sql += ' AND s.counselor_id = ?';
      params.push(employee_id);
    }

    // Additional query filters
    if (search) {
      sql += ' AND (s.name LIKE ? OR s.roll_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (counselor_id) {
      sql += ' AND s.counselor_id = ?';
      params.push(counselor_id);
    }

    if (unmapped === 'true') {
      sql += ' AND s.counselor_id IS NULL';
    }

    sql += ' ORDER BY s.roll_number ASC';

    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error listing students.' });
  }
}

// POST /api/counseling/students (Admin only)
async function createStudent(req, res) {
  const { roll_number, name, department, year, section, counselor_id } = req.body;

  if (!roll_number || !name || !department || !year) {
    return res.status(400).json({ success: false, message: 'Required fields missing: roll_number, name, department, year.' });
  }

  try {
    // Check if roll_number already exists
    const [exist] = await pool.query('SELECT id FROM students WHERE roll_number = ?', [roll_number.trim().toUpperCase()]);
    if (exist.length > 0) {
      return res.status(400).json({ success: false, message: 'Student with this roll number already exists.' });
    }

    await pool.query(
      `INSERT INTO students (roll_number, name, department, year, section, counselor_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        roll_number.trim().toUpperCase(),
        name.trim(),
        department.trim(),
        parseInt(year),
        section ? section.trim().toUpperCase() : null,
        counselor_id ? counselor_id.trim() : null
      ]
    );

    return res.status(201).json({ success: true, message: 'Student added successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error adding student.' });
  }
}

// DELETE /api/counseling/students/:id (Admin only)
async function deleteStudent(req, res) {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    return res.json({ success: true, message: 'Student deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error deleting student.' });
  }
}

// POST /api/counseling/students/bulk (Admin only)
async function bulkCreateStudents(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No Excel file uploaded.' });
  }

  let rows;
  try {
    rows = parseExcelBuffer(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Excel parse error: ${err.message}` });
  }

  const successRows = [];
  const errorRows = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawRoll = row.roll_number || row.Roll_Number || row['roll number'] || row['Roll Number'] || row.roll || row.Roll || row.RollNo || row.rollno;
    const rawName = row.name || row.Name || row.full_name || row['student name'] || row['Student Name'];
    const rawDept = row.department || row.Department || row.dept || row.Dept;
    const rawYear = row.year || row.Year || row.course_year || row.class_year;
    const rawSec = row.section || row.Section || row.sec || row.Sec;
    const rawCounselor = row.counselor_id || row.counselor || row.counselor_employee_id;

    const rollVal = rawRoll ? String(rawRoll).trim().toUpperCase() : '';
    const nameVal = rawName ? String(rawName).trim() : '';
    const deptVal = rawDept ? String(rawDept).trim() : '';
    const yearVal = rawYear ? parseInt(rawYear) : null;
    const secVal = rawSec ? String(rawSec).trim().toUpperCase() : null;
    const counselorVal = rawCounselor ? String(rawCounselor).trim() : null;

    if (!rollVal || !nameVal || !deptVal || !yearVal) {
      errorRows.push({ row: i + 1, data: row, error: 'Missing roll number, name, department, or year.' });
      continue;
    }

    try {
      // Check duplicate in db
      const [dup] = await pool.query('SELECT id FROM students WHERE roll_number = ?', [rollVal]);
      if (dup.length > 0) {
        errorRows.push({ row: i + 1, roll_number: rollVal, error: 'Roll number already exists.' });
        continue;
      }

      await pool.query(
        `INSERT INTO students (roll_number, name, department, year, section, counselor_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [rollVal, nameVal, deptVal, yearVal, secVal, counselorVal]
      );
      successRows.push({ roll_number: rollVal, name: nameVal });
    } catch (err) {
      errorRows.push({ row: i + 1, roll_number: rollVal, error: err.message });
    }
  }

  return res.json({
    success: true,
    message: `Processed ${rows.length} rows. Added: ${successRows.length}, Failed: ${errorRows.length}`,
    added: successRows.length,
    failed: errorRows.length,
    errors: errorRows
  });
}

// ─── COUNSELOR MAPPING (HOD only) ─────────────────────────────────────────────

// PUT /api/counseling/students/map
async function mapStudentsToCounselor(req, res) {
  const { department } = req.user;
  const { counselor_id, student_roll_numbers } = req.body;

  if (!student_roll_numbers || !Array.isArray(student_roll_numbers) || student_roll_numbers.length === 0) {
    return res.status(400).json({ success: false, message: 'Please select one or more students.' });
  }

  // counselor_id can be null to unmap
  try {
    if (counselor_id) {
      // Validate counselor belongs to HOD department
      const [counselor] = await pool.query('SELECT department FROM users WHERE employee_id = ?', [counselor_id]);
      if (counselor.length === 0) {
        return res.status(404).json({ success: false, message: 'Counselor not found.' });
      }
      if (counselor[0].department !== department) {
        return res.status(403).json({ success: false, message: 'Cannot assign students to counselors of other departments.' });
      }
    }

    // Perform bulk update
    await pool.query(
      'UPDATE students SET counselor_id = ? WHERE roll_number IN (?) AND department = ?',
      [counselor_id || null, student_roll_numbers, department]
    );

    return res.json({ success: true, message: 'Students successfully mapped to counselor.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error updating student counselor mapping.' });
  }
}

// ─── COUNSELING DATA ENTRY (Faculty Counselor only) ───────────────────────────

// GET /api/counseling/students/:roll_number/records
async function getStudentCounselingRecords(req, res) {
  const { roll_number } = req.params;
  const { role, department, employee_id } = req.user;

  try {
    // Validate accessibility
    const [student] = await pool.query('SELECT department, counselor_id FROM students WHERE roll_number = ?', [roll_number]);
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (role === 'HOD' && student[0].department !== department) {
      return res.status(403).json({ success: false, message: 'Access denied. Student belongs to another department.' });
    }
    if (role === 'Faculty' && student[0].counselor_id !== employee_id) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not mapped as counselor for this student.' });
    }

    const [records] = await pool.query(
      `SELECT cr.*, u.full_name AS counselor_name 
       FROM counseling_records cr
       JOIN users u ON cr.counselor_id = u.employee_id
       WHERE cr.student_roll_number = ?
       ORDER BY cr.counseling_date DESC, cr.created_at DESC`,
      [roll_number]
    );

    return res.json({ success: true, data: records });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error loading counseling records.' });
  }
}

// POST /api/counseling/records
async function createCounselingRecord(req, res) {
  const { employee_id } = req.user;
  const { student_roll_number, counseling_date, discussion_points, action_taken } = req.body;

  if (!student_roll_number || !counseling_date || !discussion_points) {
    return res.status(400).json({ success: false, message: 'Required fields missing: student_roll_number, counseling_date, discussion_points.' });
  }

  try {
    // Validate mapping (counselor must be this faculty)
    const [student] = await pool.query('SELECT counselor_id FROM students WHERE roll_number = ?', [student_roll_number]);
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    if (student[0].counselor_id !== employee_id) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not the mapped counselor for this student.' });
    }

    await pool.query(
      `INSERT INTO counseling_records (student_roll_number, counselor_id, counseling_date, discussion_points, action_taken)
       VALUES (?, ?, ?, ?, ?)`,
      [student_roll_number, employee_id, counseling_date, discussion_points.trim(), action_taken ? action_taken.trim() : null]
    );

    return res.status(201).json({ success: true, message: 'Counseling record saved successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error saving counseling record.' });
  }
}

// ─── REPORTS (Admin & HOD / Counselor / Combined) ────────────────────────────

// GET /api/counseling/reports
async function getCounselingReports(req, res) {
  const { role, department: userDept } = req.user;
  const { roll_number, counselor_id, from_date, to_date, department } = req.query;

  try {
    let sql = `
      SELECT cr.*, s.name AS student_name, s.department AS student_department, s.year, s.section,
             u.full_name AS counselor_name
       FROM counseling_records cr
       JOIN students s ON cr.student_roll_number = s.roll_number
       JOIN users u ON cr.counselor_id = u.employee_id
       WHERE 1=1
    `;
    const params = [];

    // Enforce role-based department visibility
    if (role === 'HOD') {
      sql += ' AND s.department = ?';
      params.push(userDept);
    } else if (role === 'Faculty') {
      // HOD and Admin see all, Faculty sees their own mapped records
      sql += ' AND cr.counselor_id = ?';
      params.push(req.user.employee_id);
    } else if (role === 'Admin') {
      if (department) {
        sql += ' AND s.department = ?';
        params.push(department);
      }
    }

    // Filter criteria
    if (roll_number) {
      sql += ' AND cr.student_roll_number = ?';
      params.push(roll_number.trim().toUpperCase());
    }

    if (counselor_id) {
      sql += ' AND cr.counselor_id = ?';
      params.push(counselor_id);
    }

    if (from_date) {
      sql += ' AND cr.counseling_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      sql += ' AND cr.counseling_date <= ?';
      params.push(to_date);
    }

    sql += ' ORDER BY cr.counseling_date DESC, cr.created_at DESC';

    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error generating reports.' });
  }
}

// DELETE /api/counseling/students-reset/all
async function resetAllStudents(req, res) {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admins can reset the student list.' });
  }

  try {
    // Delete all students (cascades to delete counseling records)
    await pool.query('DELETE FROM students');
    return res.json({ success: true, message: 'All students and their counseling records have been cleared.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error resetting student list.' });
  }
}

module.exports = {
  listStudents,
  createStudent,
  deleteStudent,
  bulkCreateStudents,
  mapStudentsToCounselor,
  getStudentCounselingRecords,
  createCounselingRecord,
  getCounselingReports,
  resetAllStudents
};
