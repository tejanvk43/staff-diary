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

  // ─── PHASE 1: Parse and validate ALL rows ──────────────────────────────────
  const validRows = [];
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
      errorRows.push({ row: i + 2, error: 'Missing roll number, name, department, or year.' });
      continue;
    }

    validRows.push({ rollVal, nameVal, deptVal, yearVal, secVal, counselorVal, _rowIndex: i });
  }

  if (validRows.length === 0) {
    return res.json({
      success: true,
      message: `Processed ${rows.length} rows. Added: 0, Failed: ${errorRows.length}`,
      added: 0,
      failed: errorRows.length,
      errors: errorRows
    });
  }

  // ─── PHASE 2: Resolve existing rolls and optional counselors ─────────────────
  const allRollNumbers = validRows.map(r => r.rollVal);
  const [existingRows] = await pool.query(
    'SELECT roll_number FROM students WHERE roll_number IN (?)',
    [allRollNumbers]
  );
  const existingRolls = new Set(existingRows.map(r => String(r.roll_number).trim().toUpperCase()));

  // counselor_id is optional and must reference users.employee_id.
  // Some legacy files contain department/section labels such as IT, AID, CSE-A,
  // rather than employee IDs. Convert those values to NULL so they do not make
  // the whole INSERT batch fail on the foreign-key constraint.
  const [userRows] = await pool.query('SELECT employee_id FROM users');
  const validCounselorIds = new Set(userRows.map(r => String(r.employee_id).trim().toUpperCase()));
  const unmappedCounselors = new Map();
  for (const row of validRows) {
    if (row.counselorVal) {
      const normalizedCounselor = row.counselorVal.trim().toUpperCase();
      if (validCounselorIds.has(normalizedCounselor)) {
        row.counselorVal = normalizedCounselor;
      } else {
        unmappedCounselors.set(row.counselorVal, (unmappedCounselors.get(row.counselorVal) || 0) + 1);
        row.counselorVal = null;
      }
    }
  }

  // Also check for duplicates within the upload itself
  const seenInBatch = new Set();
  const finalRows = [];

  for (const row of validRows) {
    if (existingRolls.has(row.rollVal)) {
      errorRows.push({ row: row._rowIndex + 2, roll_number: row.rollVal, error: 'Roll number already exists in database.' });
    } else if (seenInBatch.has(row.rollVal)) {
      errorRows.push({ row: row._rowIndex + 2, roll_number: row.rollVal, error: 'Duplicate roll number in upload.' });
    } else {
      seenInBatch.add(row.rollVal);
      finalRows.push(row);
    }
  }

  // ─── PHASE 3: Batch INSERT (100 rows per query) ───────────────────────────
  const BATCH_SIZE = 100;
  const successRows = [];

  for (let batch = 0; batch < finalRows.length; batch += BATCH_SIZE) {
    const batchRows = finalRows.slice(batch, batch + BATCH_SIZE);
    const values = batchRows.map(r => [r.rollVal, r.nameVal, r.deptVal, r.yearVal, r.secVal, r.counselorVal]);

    try {
      await pool.query(
        `INSERT INTO students (roll_number, name, department, year, section, counselor_id) VALUES ?`,
        [values]
      );
      successRows.push(...batchRows.map(r => ({ roll_number: r.rollVal, name: r.nameVal })));
    } catch (err) {
      // Fallback to individual inserts if batch fails
      for (const row of batchRows) {
        try {
          await pool.query(
            `INSERT INTO students (roll_number, name, department, year, section, counselor_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [row.rollVal, row.nameVal, row.deptVal, row.yearVal, row.secVal, row.counselorVal]
          );
          successRows.push({ roll_number: row.rollVal, name: row.nameVal });
        } catch (e2) {
          errorRows.push({ row: row._rowIndex + 2, roll_number: row.rollVal, error: e2.code === 'ER_DUP_ENTRY' ? 'Roll number already exists' : e2.message });
        }
      }
    }
  }

  const warnings = [...unmappedCounselors.entries()].map(([value, count]) => ({
    counselor_id: value,
    rows: count,
    warning: 'Counselor value is not a registered employee_id; student was added as unmapped.'
  }));

  return res.json({
    success: true,
    message: `Processed ${rows.length} rows. Added: ${successRows.length}, Failed: ${errorRows.length}${warnings.length ? `. ${warnings.reduce((sum, w) => sum + w.rows, 0)} rows were added without counselor mapping.` : ''}`,
    processed: rows.length,
    added: successRows.length,
    failed: errorRows.length,
    warnings,
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

// ─── COUNSELING DATA ENTRY (Faculty Counselor / Department HOD) ────────────────

// GET /api/counseling/students/:roll_number/records
async function getStudentCounselingRecords(req, res) {
  const { roll_number } = req.params;
  const { role, department, employee_id } = req.user;

  try {
    const normalizedRoll = String(roll_number || '').trim().toUpperCase();
    // A student row may be gone while the counselling history remains. Use the
    // latest snapshot for access checks in that case.
    const [student] = await pool.query(
      `SELECT department, counselor_id, name, year, section
       FROM students WHERE roll_number = ?`,
      [normalizedRoll]
    );
    const [historyContext] = await pool.query(
      `SELECT student_department_snapshot AS department, counselor_id
       FROM counseling_records
       WHERE student_roll_number = ?
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedRoll]
    );
    const studentContext = student[0] || historyContext[0];
    if (!studentContext) {
      return res.status(404).json({ success: false, message: 'Student or counselling history not found.' });
    }

    if (role === 'HOD' && studentContext.department !== department) {
      return res.status(403).json({ success: false, message: 'Access denied. Student belongs to another department.' });
    }
    if (role === 'Faculty' && studentContext.counselor_id !== employee_id) {
      const [facultyHistory] = await pool.query(
        `SELECT id FROM counseling_records
         WHERE student_roll_number = ? AND counselor_id = ? LIMIT 1`,
        [normalizedRoll, employee_id]
      );
      if (!facultyHistory.length) {
        return res.status(403).json({ success: false, message: 'Access denied. You are not mapped as counselor for this student.' });
      }
    }

    const [records] = await pool.query(
      `SELECT cr.*,
              COALESCE(s.name, cr.student_name_snapshot, '[Deleted student]') AS student_name,
              COALESCE(s.department, cr.student_department_snapshot) AS student_department,
              COALESCE(s.year, cr.student_year_snapshot) AS student_year,
              COALESCE(s.section, cr.student_section_snapshot) AS student_section,
              COALESCE(u.full_name, cr.counselor_name_snapshot, cr.counselor_id, 'Former counselor') AS counselor_name
       FROM counseling_records cr
       LEFT JOIN students s ON cr.student_roll_number = s.roll_number
       LEFT JOIN users u ON cr.counselor_id = u.employee_id
       WHERE cr.student_roll_number = ?
       ORDER BY cr.counseling_date DESC, cr.created_at DESC`,
      [normalizedRoll]
    );

    return res.json({ success: true, data: records });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error loading counseling records.' });
  }
}

// POST /api/counseling/records
async function createCounselingRecord(req, res) {
  const { employee_id, role, department, full_name } = req.user;
  const { student_roll_number, counseling_date, discussion_points, action_taken } = req.body;
  const normalizedRoll = String(student_roll_number || '').trim().toUpperCase();

  if (!student_roll_number || !counseling_date || !discussion_points) {
    return res.status(400).json({ success: false, message: 'Required fields missing: student_roll_number, counseling_date, discussion_points.' });
  }

  try {
    // Faculty may record only for students mapped to them. An HOD may record
    // for any student in the HOD's own department, including students mapped
    // to one of that department's faculty counselors.
    const [student] = await pool.query(
      `SELECT name, department, counselor_id, year, section
       FROM students WHERE roll_number = ?`,
      [normalizedRoll]
    );
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (role === 'Faculty' && student[0].counselor_id !== employee_id) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not the mapped counselor for this student.' });
    }
    if (role === 'HOD' && student[0].department !== department) {
      return res.status(403).json({ success: false, message: 'Access denied. Student belongs to another department.' });
    }
    if (role !== 'Faculty' && role !== 'HOD') {
      return res.status(403).json({ success: false, message: 'Access denied. Only the mapped counselor or department HOD can add counselling reports.' });
    }

    await pool.query(
      `INSERT INTO counseling_records
        (student_roll_number, student_name_snapshot, student_department_snapshot,
         student_year_snapshot, student_section_snapshot, counselor_id,
         counselor_name_snapshot, counseling_date, discussion_points, action_taken)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedRoll,
        student[0].name,
        student[0].department,
        student[0].year,
        student[0].section,
        employee_id,
        full_name || employee_id,
        counseling_date,
        String(discussion_points).trim(),
        action_taken ? String(action_taken).trim() : null,
      ]
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
      SELECT cr.*,
             COALESCE(s.name, cr.student_name_snapshot, '[Deleted student]') AS student_name,
             COALESCE(s.department, cr.student_department_snapshot) AS student_department,
             COALESCE(s.year, cr.student_year_snapshot) AS year,
             COALESCE(s.section, cr.student_section_snapshot) AS section,
             COALESCE(u.full_name, cr.counselor_name_snapshot, cr.counselor_id, 'Former counselor') AS counselor_name
       FROM counseling_records cr
       LEFT JOIN students s ON cr.student_roll_number = s.roll_number
       LEFT JOIN users u ON cr.counselor_id = u.employee_id
       WHERE 1=1
    `;
    const params = [];

    // Enforce role-based department visibility
    if (role === 'HOD') {
      sql += ' AND COALESCE(s.department, cr.student_department_snapshot) = ?';
      params.push(userDept);
    } else if (role === 'Faculty') {
      // HOD and Admin see all, Faculty sees their own mapped records
      sql += ' AND cr.counselor_id = ?';
      params.push(req.user.employee_id);
    } else if (role === 'Admin') {
      if (department) {
        sql += ' AND COALESCE(s.department, cr.student_department_snapshot) = ?';
        params.push(department);
      }
    }

    // Filter criteria
    if (roll_number) {
      sql += ' AND cr.student_roll_number = ?';
      params.push(String(roll_number).trim().toUpperCase());
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
    // Student rows are roster data. Counselling records are historical data
    // and intentionally remain available after the roster is cleared.
    await pool.query('DELETE FROM students');
    return res.json({ success: true, message: 'All students were removed from the roster. Counselling reports were preserved.' });
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
