const pool = require('../config/db');
const { parseExcelBuffer } = require('../utils/excelParser');

// GET /api/admin/config
async function getConfig(req, res) {
  try {
    const [rows] = await pool.query('SELECT config_key, config_value, description FROM system_configs');
    const config = rows.reduce((acc, r) => { acc[r.config_key] = r; return acc; }, {});
    return res.json({ success: true, data: config });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// PUT /api/admin/config
async function updateConfig(req, res) {
  const updates = req.body; // { key: value, ... }
  const { employee_id } = req.user;

  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ success: false, message: 'Body must be an object of key-value pairs.' });
  }

  try {
    for (const [key, value] of Object.entries(updates)) {
      await pool.query(
        `UPDATE system_configs SET config_value = ?, updated_by = ?, updated_at = NOW() WHERE config_key = ?`,
        [String(value), employee_id, key]
      );
    }
    return res.json({ success: true, message: 'Configuration updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── Holidays ─────────────────────────────────────────────────────────────────

async function getHolidays(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM holidays ORDER BY holiday_date ASC');
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function addHoliday(req, res) {
  const { holiday_date, holiday_name, description } = req.body;
  if (!holiday_date || !holiday_name) {
    return res.status(400).json({ success: false, message: 'holiday_date and holiday_name are required.' });
  }
  try {
    await pool.query(
      'INSERT INTO holidays (holiday_date, holiday_name, description) VALUES (?, ?, ?)',
      [holiday_date, holiday_name, description||null]
    );
    return res.status(201).json({ success: true, message: 'Holiday added.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Holiday already exists for this date.' });
    }
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteHoliday(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM holidays WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Holiday not found.' });
    return res.json({ success: true, message: 'Holiday removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── Departments ──────────────────────────────────────────────────────────────
async function getDepartments(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY department_name');
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── Subjects ─────────────────────────────────────────────────────────────────
async function getSubjects(req, res) {
  const { department, education_type, branch_sname, q } = req.query;
  try {
    let sql = 'SELECT * FROM subjects WHERE 1=1';
    const params = [];
    if (department)     { sql += ' AND department = ?';                    params.push(department); }
    if (branch_sname)   { sql += ' AND branch_sname = ?';                  params.push(branch_sname); }
    if (education_type) { sql += ' AND education_type = ?';                params.push(education_type); }
    if (q)              { sql += ' AND (subject_name LIKE ? OR subject_code LIKE ? OR short_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    sql += ' ORDER BY subject_type, subject_name';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── Faculty list (for timetable pickers) ──────────────────────────────────────
async function getFacultyList(req, res) {
  const { department } = req.query;
  try {
    let sql = `SELECT employee_id, full_name, short_name, department, designation, role
               FROM users WHERE role IN ('Faculty','HOD','Admin')`;
    const params = [];
    if (department) { sql += ' AND department = ?'; params.push(department); }
    sql += ' ORDER BY full_name';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function createSubject(req, res) {
  const { subject_code, branch_sname, regulation, subject_name, short_name, subject_type, education_type, year, semester, department } = req.body;
  try {
    await pool.query(
      `INSERT INTO subjects (subject_code, branch_sname, regulation, subject_name, short_name, subject_type, education_type, year, semester, department)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [subject_code, branch_sname||null, regulation||null, subject_name, short_name||null, subject_type, education_type, year, semester, department]
    );
    return res.status(201).json({ success: true, message: 'Subject created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: `Subject code '${subject_code}' already exists for this branch.` });
    }
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function createDepartment(req, res) {
  const { department_name, department_code } = req.body;
  if (!department_name || !department_code) {
    return res.status(400).json({ success: false, message: 'department_name and department_code are required.' });
  }
  try {
    await pool.query(
      'INSERT INTO departments (department_name, department_code) VALUES (?, ?)',
      [department_name.trim(), department_code.trim().toUpperCase()]
    );
    return res.status(201).json({ success: true, message: 'Department created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Department code already exists.' });
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateDepartment(req, res) {
  const { department_name, department_code } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE departments SET department_name=COALESCE(?,department_name), department_code=COALESCE(?,department_code) WHERE id=?',
      [department_name||null, department_code||null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Department not found.' });
    return res.json({ success: true, message: 'Department updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteDepartment(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Department not found.' });
    return res.json({ success: true, message: 'Department deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateSubject(req, res) {
  const { subject_code, branch_sname, regulation, subject_name, short_name, subject_type, education_type, year, semester, department } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE subjects SET
         subject_code=COALESCE(?,subject_code),
         branch_sname=COALESCE(?,branch_sname),
         regulation=COALESCE(?,regulation),
         subject_name=COALESCE(?,subject_name),
         short_name=COALESCE(?,short_name),
         subject_type=COALESCE(?,subject_type),
         education_type=COALESCE(?,education_type),
         year=COALESCE(?,year),
         semester=COALESCE(?,semester),
         department=COALESCE(?,department)
       WHERE id=?`,
      [subject_code||null, branch_sname||null, regulation||null, subject_name||null, short_name||null,
       subject_type||null, education_type||null, year||null, semester||null, department||null,
       req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Subject not found.' });
    return res.json({ success: true, message: 'Subject updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function resetSubjects(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM subjects');
    return res.json({ success: true, deleted: result.affectedRows, message: `All ${result.affectedRows} subjects deleted.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteSubject(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Subject not found.' });
    return res.json({ success: true, message: 'Subject deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── Subjects Bulk Upload ─────────────────────────────────────────────────────

async function bulkUploadSubjects(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  let rows;
  try {
    rows = parseExcelBuffer(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Excel parse error: ${err.message}` });
  }

  if (!rows.length) {
    return res.status(400).json({ success: false, message: 'The uploaded file has no data rows.' });
  }

  // Load valid subject types and programs once for cross-validation
  const [validTypes]    = await pool.query('SELECT name, short_name FROM subject_types');
  const [validPrograms] = await pool.query('SELECT name FROM programs');
  const [validDepts]    = await pool.query('SELECT department_name, department_code FROM departments');

  // Subject type lookup: keyed by lower-case full name AND short_name → canonical row
  // e.g. 'theory' → {name:'Theory',...}, 'th' → {name:'Theory',...}, 't' → {name:'Theory',...}
  const typeByKey = {};
  validTypes.forEach(t => {
    typeByKey[t.name.toLowerCase()] = t;
    if (t.short_name) typeByKey[t.short_name.toLowerCase()] = t;
  });

  // Helper: normalise a programme string for fuzzy matching
  // Strips dots, hyphens, spaces and lower-cases → 'M.Tech' = 'M-Tech' = 'mtech'
  const normProg = (s) => String(s).toLowerCase().replace(/[.\-\s]/g, '');
  const programMap = {};  // normalised key → canonical name
  validPrograms.forEach(p => { programMap[normProg(p.name)] = p.name; });

  // Build short-code → full name map for departments (Branch Sname fallback)
  const deptShortMap = {};
  validDepts.forEach(d => { deptShortMap[d.department_code.toLowerCase()] = d.department_name; });

  const successRows = [];
  const errorRows   = [];

  for (let i = 0; i < rows.length; i++) {
    const raw    = rows[i];
    const rowNum = i + 2; // Excel row (1-indexed header + 1)

    // ─── Read exact column headers from the user's Excel format ───────────
    // Col order: Programme | Regulation | Branch Name | Branch Sname | Year | Semester | Sub Code | Sub Sname | Sub Name | Sub Type
    const education_type = String(
      raw['Programme'] || raw['programme'] || raw['Program'] || raw['program'] ||
      raw['Education Type'] || raw['education_type'] || ''
    ).trim();

    const regulation = String(
      raw['Regulation'] || raw['regulation'] || raw['Reg'] || raw['reg'] || ''
    ).trim();

    // Branch Sname: read directly from Excel — used as part of the unique key
    const branch_sname = String(
      raw['Branch Sname'] || raw['branch sname'] || raw['Branch sname'] ||
      raw['Branch_Sname'] || raw['dept_code'] || ''
    ).trim().toUpperCase() || null;

    // Branch Name: full department name
    let department = String(
      raw['Branch Name'] || raw['branch name'] || raw['Branch name'] ||
      raw['department'] || raw['Department'] || ''
    ).trim();
    // Fallback: resolve branch_sname → full dept name via deptShortMap
    if (!department && branch_sname) {
      department = deptShortMap[branch_sname.toLowerCase()] || branch_sname;
    }

    const year = raw['Year'] || raw['year'];
    const semester = raw['Semester'] || raw['semester'] ||
                     raw['Sem ester'] || raw['Sem\nester'] || raw['SemEster'] || raw['SEMESTER'];

    const subject_code = String(
      raw['Sub Code'] || raw['sub code'] || raw['Sub code'] ||
      raw['subject_code'] || raw['Subject Code'] || raw['SubCode'] || ''
    ).trim();

    // Sub Sname = subject short name
    const short_name = String(
      raw['Sub Sname'] || raw['sub sname'] || raw['Sub sname'] ||
      raw['Sub Name Short'] || raw['short_name'] || raw['Short Name'] || ''
    ).trim();

    const subject_name = String(
      raw['Sub Name'] || raw['sub name'] || raw['Sub name'] ||
      raw['subject_name'] || raw['Subject Name'] || ''
    ).trim();

    const subject_type = String(
      raw['Sub Type'] || raw['sub type'] || raw['Sub type'] ||
      raw['subject_type'] || raw['Subject Type'] || raw['Type'] || ''
    ).trim();

    // ─── Validation ───────────────────────────────────────────────────────
    const errs = [];
    if (!subject_code)   errs.push('Sub Code is required');
    if (!subject_name)   errs.push('Sub Name is required');
    if (!department)     errs.push('Branch Name is required');
    if (!education_type) errs.push('Programme is required');

    // ── Subject type: match by short_name first, then full name ─────────────
    const matchedType = subject_type ? typeByKey[subject_type.toLowerCase()] : null;
    if (!subject_type) {
      errs.push('Sub Type is required');
    } else if (!matchedType) {
      const knownKeys = validTypes.map(t => t.short_name ? `${t.name} (${t.short_name})` : t.name).join(', ');
      errs.push(`Unknown Sub Type '${subject_type}' — known types: ${knownKeys}`);
    }

    // ── Programme: fuzzy match (M.Tech = M-Tech = MTech) ─────────────────────
    const canonicalProg = education_type ? programMap[normProg(education_type)] : null;
    if (!education_type) {
      errs.push('Programme is required');
    } else if (!canonicalProg) {
      errs.push(`Unknown Programme '${education_type}' — must match a configured program`);
    }

    const yr  = year     !== undefined && year     !== null && year     !== '' ? parseInt(year)     : NaN;
    const sem = semester !== undefined && semester !== null && semester !== '' ? parseInt(semester) : null;

    if (isNaN(yr) || yr < 1 || yr > 6)         errs.push(`Invalid Year '${year}' — must be 1–6`);
    if (sem !== null && (isNaN(sem) || sem < 1 || sem > 12)) errs.push(`Invalid Semester '${semester}'`);

    if (errs.length) {
      errorRows.push({ row: rowNum, subject_code: subject_code || '(blank)', reasons: errs });
      continue;
    }

    const canonicalType = matchedType.name;

    try {
      await pool.query(
        `INSERT INTO subjects (subject_code, branch_sname, regulation, subject_name, short_name, subject_type, education_type, year, semester, department)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          subject_code,
          branch_sname || null,
          regulation || null,
          subject_name,
          short_name || null,
          canonicalType,
          canonicalProg,
          yr,
          sem,
          department,
        ]
      );
      successRows.push(subject_code);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        errorRows.push({ row: rowNum, subject_code, reasons: [`Sub Code '${subject_code}' already exists for branch '${branch_sname || '?'}' — skipped.`] });
      } else {
        errorRows.push({ row: rowNum, subject_code, reasons: [err.message] });
      }
    }
  }

  return res.json({
    success: true,
    data: { total: rows.length, created: successRows.length, failed: errorRows.length, errorRows },
  });
}

// ─── Sections CRUD ───────────────────────────────────────────────────────────
async function getSections(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT cs.*, bt.name AS block_name 
       FROM class_sections cs
       LEFT JOIN block_timetables bt ON cs.block_id = bt.id
       ORDER BY cs.education_type, cs.year, cs.section_name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function createSection(req, res) {
  const { section_name, education_type, year, department, block_id } = req.body;
  if (!section_name || !education_type || !year) {
    return res.status(400).json({ success: false, message: 'section_name, education_type, and year are required.' });
  }
  try {
    await pool.query(
      'INSERT INTO class_sections (section_name, education_type, year, department, block_id) VALUES (?, ?, ?, ?, ?)',
      [section_name.trim(), education_type, year, department || null, block_id || null]
    );
    return res.status(201).json({ success: true, message: 'Section created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Section already exists.' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateSection(req, res) {
  const { section_name, education_type, year, department, block_id } = req.body;
  try {
    const [existing] = await pool.query('SELECT * FROM class_sections WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Section not found.' });

    const updName = section_name !== undefined ? section_name.trim() : existing[0].section_name;
    const updEdu  = education_type !== undefined ? education_type : existing[0].education_type;
    const updYear = year !== undefined ? year : existing[0].year;
    const updDept = department !== undefined ? (department ? department.trim() : null) : existing[0].department;
    const updBlock = block_id !== undefined ? (block_id ? parseInt(block_id) : null) : existing[0].block_id;

    await pool.query(
      `UPDATE class_sections SET section_name=?, education_type=?, year=?, department=?, block_id=? WHERE id=?`,
      [updName, updEdu, updYear, updDept, updBlock, req.params.id]
    );
    return res.json({ success: true, message: 'Section updated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteSection(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM class_sections WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Section not found.' });
    return res.json({ success: true, message: 'Section deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── Sections Bulk Upload ───────────────────────────────────────────────────

function validateSectionRow(row, index) {
  const errors = [];
  if (!row.section_name || String(row.section_name).trim() === '') {
    errors.push(`Row ${index}: missing section_name`);
  }
  if (!row.education_type || String(row.education_type).trim() === '') {
    errors.push(`Row ${index}: missing education_type`);
  } else {
    const et = String(row.education_type).trim();
    if (!['B-Tech', 'Diploma', 'M-Tech'].includes(et)) {
      errors.push(`Row ${index}: invalid education_type '${et}' (must be 'B-Tech', 'Diploma', or 'M-Tech')`);
    }
  }
  if (row.year === undefined || row.year === null || String(row.year).trim() === '') {
    errors.push(`Row ${index}: missing year`);
  } else {
    const yr = parseInt(row.year);
    if (isNaN(yr) || yr < 1 || yr > 4) {
      errors.push(`Row ${index}: invalid year '${row.year}' (must be 1, 2, 3, or 4)`);
    }
  }
  return errors;
}

async function bulkUploadSections(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  let rows;
  try {
    rows = parseExcelBuffer(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Excel parse error: ${err.message}` });
  }

  const successRows = [];
  const errorRows   = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Normalize keys to support varied casing/naming conventions
    const normalizedRow = {
      section_name:   row.section_name || row.Section_Name || row.section || row.Section || row.name || row.Name,
      education_type: row.education_type || row.Education_Type || row.programme || row.Programme || row.program || row.Program,
      year:           row.year || row.Year,
      department:     row.department || row.Department || null,
      block_name:     row.block_name || row.Block_Name || row.block || row.Block || null
    };

    const errs = validateSectionRow(normalizedRow, i + 2);
    if (errs.length) {
      errorRows.push({ row: i + 2, reasons: errs });
      continue;
    }

    try {
      let blockId = null;
      if (normalizedRow.block_name) {
        const cleanBlockName = String(normalizedRow.block_name).trim();
        const [blockRows] = await pool.query(
          'SELECT id FROM block_timetables WHERE name = ?',
          [cleanBlockName]
        );
        if (blockRows.length) {
          blockId = blockRows[0].id;
        }
      }

      await pool.query(
        `INSERT INTO class_sections (section_name, education_type, year, department, block_id) VALUES (?, ?, ?, ?, ?)`,
        [
          String(normalizedRow.section_name).trim(),
          String(normalizedRow.education_type).trim(),
          parseInt(normalizedRow.year),
          normalizedRow.department ? String(normalizedRow.department).trim() : null,
          blockId
        ]
      );
      successRows.push(normalizedRow);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        errorRows.push({ row: i + 2, reasons: [`Section '${normalizedRow.section_name}' for '${normalizedRow.education_type}' Yr ${normalizedRow.year} already exists.`] });
      } else {
        errorRows.push({ row: i + 2, reasons: [err.message] });
      }
    }
  }

  return res.json({
    success: true,
    data: {
      created: successRows.length,
      failed:  errorRows.length,
      errorRows
    }
  });
}

// ─── Dynamic Programs, Years, & Branches CRUD ───────────────────────────────

async function getPrograms(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM programs ORDER BY name');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function createProgram(req, res) {
  const { name } = req.body;
  if (!name || String(name).trim() === '') {
    return res.status(400).json({ success: false, message: 'Program name is required.' });
  }
  try {
    const [result] = await pool.query('INSERT INTO programs (name) VALUES (?)', [String(name).trim()]);
    return res.status(201).json({ success: true, id: result.insertId, message: 'Program created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Program name already exists.' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteProgram(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM programs WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Program not found.' });
    return res.json({ success: true, message: 'Program deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function addProgramYear(req, res) {
  const { year_number, year_name } = req.body;
  if (!year_number || !year_name || String(year_name).trim() === '') {
    return res.status(400).json({ success: false, message: 'year_number and year_name are required.' });
  }
  try {
    await pool.query(
      'INSERT INTO program_years (program_id, year_number, year_name) VALUES (?, ?, ?)',
      [req.params.id, parseInt(year_number), String(year_name).trim()]
    );
    return res.status(201).json({ success: true, message: 'Program year added.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'This year number already exists for this program.' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteProgramYear(req, res) {
  try {
    const [result] = await pool.query(
      'DELETE FROM program_years WHERE program_id = ? AND id = ?',
      [req.params.id, req.params.yearId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Year not found.' });
    return res.json({ success: true, message: 'Program year deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function addProgramBranch(req, res) {
  const { branch_name } = req.body;
  if (!branch_name || String(branch_name).trim() === '') {
    return res.status(400).json({ success: false, message: 'branch_name is required.' });
  }
  try {
    await pool.query(
      'INSERT INTO program_branches (program_id, branch_name) VALUES (?, ?)',
      [req.params.id, String(branch_name).trim()]
    );
    return res.status(201).json({ success: true, message: 'Program branch added.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'This branch already exists for this program.' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteProgramBranch(req, res) {
  try {
    const [result] = await pool.query(
      'DELETE FROM program_branches WHERE program_id = ? AND id = ?',
      [req.params.id, req.params.branchId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Branch not found.' });
    return res.json({ success: true, message: 'Program branch deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function getAllProgramDetails(req, res) {
  try {
    const [progs] = await pool.query('SELECT * FROM programs ORDER BY name');
    const [years] = await pool.query('SELECT * FROM program_years ORDER BY program_id, year_number');
    const [branches] = await pool.query('SELECT * FROM program_branches ORDER BY program_id, branch_name');

    const result = progs.map(p => {
      return {
        ...p,
        years: years.filter(y => y.program_id === p.id),
        branches: branches.filter(b => b.program_id === p.id)
      };
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateProgram(req, res) {
  const { name } = req.body;
  if (!name || String(name).trim() === '') {
    return res.status(400).json({ success: false, message: 'Program name is required.' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE programs SET name = ? WHERE id = ?',
      [String(name).trim(), req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Program not found.' });
    return res.json({ success: true, message: 'Program updated.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Program name already exists.' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateProgramYear(req, res) {
  const { year_name } = req.body;
  if (!year_name || String(year_name).trim() === '') {
    return res.status(400).json({ success: false, message: 'year_name is required.' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE program_years SET year_name = ? WHERE program_id = ? AND id = ?',
      [String(year_name).trim(), req.params.id, req.params.yearId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Year not found.' });
    return res.json({ success: true, message: 'Program year updated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateProgramBranch(req, res) {
  const { branch_name } = req.body;
  if (!branch_name || String(branch_name).trim() === '') {
    return res.status(400).json({ success: false, message: 'branch_name is required.' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE program_branches SET branch_name = ? WHERE program_id = ? AND id = ?',
      [String(branch_name).trim(), req.params.id, req.params.branchId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Branch not found.' });
    return res.json({ success: true, message: 'Program branch updated.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'This branch already exists for this program.' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function getWorkingSundays(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM working_sundays ORDER BY working_date ASC');
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function addWorkingSunday(req, res) {
  const { working_date, notes } = req.body;
  if (!working_date) {
    return res.status(400).json({ success: false, message: 'working_date is required.' });
  }

  // Validate that the date is actually a Sunday
  const d = new Date(working_date + 'T00:00:00');
  if (d.getDay() !== 0) {
    return res.status(400).json({ success: false, message: 'Selected date must be a Sunday.' });
  }

  try {
    await pool.query(
      'INSERT INTO working_sundays (working_date, notes) VALUES (?, ?)',
      [working_date, notes || null]
    );
    return res.status(201).json({ success: true, message: 'Working Sunday configured.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'This date is already configured as a working Sunday.' });
    }
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteWorkingSunday(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM working_sundays WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Configuration not found.' });
    return res.json({ success: true, message: 'Working Sunday removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── Subject Types CRUD ───────────────────────────────────────────────────────

async function getSubjectTypes(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM subject_types ORDER BY name');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function addSubjectType(req, res) {
  const { name, short_name, max_faculty } = req.body;
  if (!name || String(name).trim() === '') {
    return res.status(400).json({ success: false, message: 'Subject type name is required.' });
  }
  if (!short_name || String(short_name).trim() === '') {
    return res.status(400).json({ success: false, message: 'Short name (abbreviation) is required.' });
  }
  const shortClean = String(short_name).trim().toUpperCase();
  if (shortClean.length > 10) {
    return res.status(400).json({ success: false, message: 'Short name must be 10 characters or fewer.' });
  }
  const maxFac = parseInt(max_faculty);
  if (isNaN(maxFac) || maxFac < 1) {
    return res.status(400).json({ success: false, message: 'max_faculty must be a positive integer.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO subject_types (name, short_name, max_faculty) VALUES (?, ?, ?)',
      [String(name).trim(), shortClean, maxFac]
    );
    return res.status(201).json({ success: true, id: result.insertId, message: 'Subject type created.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A subject type with this name already exists.' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function updateSubjectType(req, res) {
  const { name, short_name, max_faculty } = req.body;
  const updates = [];
  const params  = [];

  if (name !== undefined) {
    if (String(name).trim() === '') {
      return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
    }
    updates.push('name = ?');
    params.push(String(name).trim());
  }
  if (short_name !== undefined) {
    const shortClean = String(short_name).trim().toUpperCase();
    if (shortClean === '') {
      return res.status(400).json({ success: false, message: 'Short name cannot be empty.' });
    }
    if (shortClean.length > 10) {
      return res.status(400).json({ success: false, message: 'Short name must be 10 characters or fewer.' });
    }
    updates.push('short_name = ?');
    params.push(shortClean);
  }
  if (max_faculty !== undefined) {
    const maxFac = parseInt(max_faculty);
    if (isNaN(maxFac) || maxFac < 1) {
      return res.status(400).json({ success: false, message: 'max_faculty must be a positive integer.' });
    }
    updates.push('max_faculty = ?');
    params.push(maxFac);
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'Nothing to update.' });
  }

  params.push(req.params.id);
  try {
    const [result] = await pool.query(
      `UPDATE subject_types SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Subject type not found.' });
    return res.json({ success: true, message: 'Subject type updated.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A subject type with this name already exists.' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function deleteSubjectType(req, res) {
  try {
    // Prevent deleting a type that is in use by subjects
    const [inUse] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM subjects WHERE subject_type = (SELECT name FROM subject_types WHERE id = ?)',
      [req.params.id]
    );
    if (inUse[0].cnt > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: ${inUse[0].cnt} subject(s) are assigned this type. Reassign them first.`
      });
    }
    const [result] = await pool.query('DELETE FROM subject_types WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Subject type not found.' });
    return res.json({ success: true, message: 'Subject type deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = {
  getConfig, updateConfig,
  getHolidays, addHoliday, deleteHoliday,
  getWorkingSundays, addWorkingSunday, deleteWorkingSunday,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getSubjects, createSubject, updateSubject, deleteSubject, resetSubjects, bulkUploadSubjects,
  getFacultyList,
  getSections, createSection, updateSection, deleteSection, bulkUploadSections,
  getPrograms, createProgram, deleteProgram, addProgramYear, deleteProgramYear,
  addProgramBranch, deleteProgramBranch, getAllProgramDetails,
  updateProgram, updateProgramYear, updateProgramBranch,
  getSubjectTypes, addSubjectType, updateSubjectType, deleteSubjectType,
};
