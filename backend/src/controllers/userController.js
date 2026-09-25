const bcrypt = require('bcrypt');
const pool    = require('../config/db');
const { parseExcelBuffer, generateExcelBuffer } = require('../utils/excelParser');

// ─── helpers ──────────────────────────────────────────────────────────────────

function validateUserRow(row, index) {
  const errors = [];
  const required = ['employee_id','full_name','education_type','department','role'];
  required.forEach(f => {
    if (!row[f] || String(row[f]).trim() === '') errors.push(`Row ${index}: missing ${f}`);
  });
  if (row.education_type && !['B-Tech','B.Tech','Diploma','M-Tech','M.Tech','Ph.D','M.Sc','M.Phil','MCA','MBA','BCA','B.Sc'].includes(row.education_type)) {
    errors.push(`Row ${index}: invalid education_type (allowed: B-Tech, B.Tech, M-Tech, Ph.D, M.Sc, M.Phil, MCA, MBA, Diploma, etc.)`);
  }
  if (row.role && !['Admin','HOD','Faculty'].includes(row.role)) {
    errors.push(`Row ${index}: invalid role`);
  }
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push(`Row ${index}: invalid email`);
  }
  return errors;
}

// Education type normalization map
const eduMap = {
  'btech': 'B-Tech', 'b.tech': 'B-Tech', 'be': 'B-Tech', 'bsc': 'B.Tech',
  'mtech': 'M-Tech', 'm.tech': 'M-Tech', 'me': 'M-Tech', 'msc': 'M.Sc',
  'phd': 'Ph.D', 'ph.d': 'Ph.D', 'mphil': 'M.Phil',
  'diploma': 'Diploma', 'dipl': 'Diploma',
  'masters': 'M-Tech', 'mca': 'MCA', 'mba': 'MBA', 'bca': 'BCA',
};

function normalizeEducationType(raw) {
  let eduType = raw ? String(raw).trim() : '';
  const cleanEdu = eduType.toLowerCase().replace(/[\s\.-]/g, '');
  if (eduMap[cleanEdu]) return eduMap[cleanEdu];
  if (cleanEdu.startsWith('btech')) return 'B-Tech';
  if (cleanEdu.startsWith('mtech')) return 'M-Tech';
  if (cleanEdu.startsWith('msc')) return 'M.Sc';
  if (cleanEdu.startsWith('phd')) return 'Ph.D';
  if (cleanEdu.startsWith('mphil')) return 'M.Phil';
  if (cleanEdu.startsWith('diploma') || cleanEdu.startsWith('dipl')) return 'Diploma';
  if (cleanEdu === 'mca') return 'MCA';
  if (cleanEdu === 'mba') return 'MBA';
  if (cleanEdu === 'bca') return 'BCA';
  return eduType;
}

// Department short-code mapping
const deptShortMap = {
  'cse': 'Computer Science & Engineering',
  'ece': 'Electronics & Communication Engineering',
  'mech': 'Mechanical Engineering',
  'civil': 'Civil Engineering',
  'it': 'Information Technology',
  'eee': 'Electrical & Electronics Engineering',
  'ai': 'Artificial Intelligence',
  'ai&ds': 'Artificial Intelligence',
  'aids': 'Artificial Intelligence',
  's&h': 'Science & Humanities',
  'sh': 'Science & Humanities',
  'scih': 'Science & Humanities',
  'mathematics': 'Science & Humanities',
  'math': 'Science & Humanities',
  'english': 'Science & Humanities',
  'physics': 'Science & Humanities',
  'chemistry': 'Science & Humanities',
  'library': 'Science & Humanities',
  'physical education': 'Science & Humanities',
  'phy ed': 'Science & Humanities',
  't&p': 'Training & Placement',
  'tp': 'Training & Placement',
  'training': 'Training & Placement',
  'diploma cse': 'Diploma CSE',
  'diploma ece': 'Diploma ECE',
  'diploma eee': 'Diploma EEE',
  'diploma mech': 'Diploma Mechanical',
  'diploma civil': 'Diploma Civil',
};

function normalizeDepartment(raw, depts) {
  const deptStr = raw ? String(raw).trim() : '';
  const cleanDept = deptStr.toLowerCase();

  // Check compound codes first (e.g. "Diploma ECE")
  if (deptShortMap[cleanDept]) {
    return deptShortMap[cleanDept];
  }

  // Try DB match
  if (depts.length > 0) {
    const matchedDept = depts.find(d =>
      d.department_name.toLowerCase() === cleanDept ||
      d.department_code.toLowerCase() === cleanDept ||
      d.department_name.toLowerCase().includes(cleanDept) ||
      cleanDept.includes(d.department_code.toLowerCase())
    );
    if (matchedDept) return matchedDept.department_name;
  }

  return deptStr;
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
async function listUsers(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT employee_id,full_name,short_name,highest_qualification,department,designation,phone_number,bank_name,bank_account_no,bank_ifsc,bank_details_submitted,email,role,is_first_login,created_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/admin/users/bulk ───────────────────────────────────────────────
async function bulkCreateUsers(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  let rows;
  try {
    rows = parseExcelBuffer(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Excel parse error: ${err.message}` });
  }

  // Load all departments from DB for normalization
  let depts = [];
  try {
    const [deptRows] = await pool.query('SELECT department_name, department_code FROM departments');
    depts = deptRows;
  } catch (err) {
    console.error('Failed to load departments:', err);
  }

  // ─── PHASE 1: Parse, normalize, validate ALL rows ────────────────────────────
  const validRows = [];
  const errorRows = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const rawEmpId = row.employee_id || row.Employee_ID || row['employee id'] || row['Employee ID'] || row['User_ID/Employee_id'] || row['User_ID/Employee_Id'] || row['User_ID/employee_id'] || row.user_id || row.User_ID || row['User ID'];
    const empIdVal = rawEmpId ? String(rawEmpId).trim() : '';

    const rawFullName = row.full_name || row.Full_Name || row['full name'] || row['Full Name'] || row.name || row.Name;
    const fullNameVal = rawFullName ? String(rawFullName).trim() : '';

    const rawEmail = row.email || row.Email || row['Email ID'] || row['email id'] || row['Email_ID'] || row['email_id'] || row['email ID'] || row['email_Id'];
    const emailVal = rawEmail && String(rawEmail).trim() !== '' ? String(rawEmail).trim() : (empIdVal ? `${empIdVal.toLowerCase()}@college.edu` : '');

    const rawPassword = row.password || row.Password || row.default_password || row.Default_Password || row['default password'] || row['Default Password'];
    const passwordVal = rawPassword ? String(rawPassword).trim() : null;

    const normalizedRow = {
      employee_id:    empIdVal,
      full_name:      fullNameVal,
      short_name:     row.short_name || row.Short_Name || row['short name'] || row['Short Name'] || row['ShortName'] || row.short || row.Short || null,
      education_type: row.education_type || row.Education_Type || row['education type'] || row['Education Type'] || row['B-Tech/Diploma'] || row['B-Tech/diploma'] || row['B-Tech/Diploma '] || row['B-Tech/diploma '] || row.programme || row.Programme || row.program || row.Program || row.education || row.Education,
      department:     row.department || row.Department || row.dept || row.Dept || row.DEPT,
      designation:    row.designation || row.Designation || null,
      phone_number:   row.phone_number || row.Phone_Number || row['phone number'] || row['Phone Number'] || row.phone || row.Phone || row['Phone No'] || row['Phone no'] || row['Phone_no'] || row['Phone_No'] || null,
      email:          emailVal,
      role:           row.role || row.Role || 'Faculty',
      password:       passwordVal
    };

    // Normalize education type
    normalizedRow.education_type = normalizeEducationType(normalizedRow.education_type);

    // Normalize department
    const rawDeptVal = row.department || row.Department || row.dept || row.Dept || row.DEPT;
    normalizedRow.department = normalizeDepartment(rawDeptVal, depts);

    // Validate
    const errs = validateUserRow(normalizedRow, i + 2);
    if (errs.length) {
      errorRows.push({ row: i + 2, employee_id: empIdVal, reasons: errs });
      continue;
    }

    validRows.push(normalizedRow);
  }

  // ─── PHASE 2: Hash passwords in parallel (much faster than sequential) ───────
  const BATCH_HASH = 100; // Hash 100 passwords at a time
  const hashedRows = [];

  for (let batch = 0; batch < validRows.length; batch += BATCH_HASH) {
    const batchRows = validRows.slice(batch, batch + BATCH_HASH);
    const hashes = await Promise.all(
      batchRows.map(r => {
        const defaultPwd = r.password || r.employee_id.toLowerCase();
        return bcrypt.hash(defaultPwd, 10).then(hash => ({ ...r, password_hash: hash, temp_password: defaultPwd }));
      })
    );
    hashedRows.push(...hashes);
  }

  // ─── PHASE 3: Filter out duplicates using a single query ─────────────────────
  if (hashedRows.length === 0) {
    const excelBuffer = generateExcelBuffer([], 'Failed Rows');
    return res.json({
      success: true,
      data: {
        created: 0,
        failed: errorRows.length,
        errorRows,
        downloadUrl: null,
      },
      _excelBuffer: excelBuffer.toString('base64'),
    });
  }

  const allEmpIds = hashedRows.map(r => r.employee_id);
  const [existingRows] = await pool.query(
    'SELECT employee_id, email FROM users WHERE employee_id IN (?) OR email IN (?)',
    [allEmpIds, hashedRows.map(r => r.email.toLowerCase())]
  );
  const existingMap = new Map();
  existingRows.forEach(r => existingMap.set(r.employee_id.toLowerCase(), 'Duplicate employee_id'));
  existingRows.forEach(r => existingMap.set(r.email.toLowerCase(), 'Duplicate email'));

  const finalRows = [];
  for (const row of hashedRows) {
    const empKey = row.employee_id.toLowerCase();
    const emailKey = row.email.toLowerCase();
    if (existingMap.has(empKey)) {
      errorRows.push({ row: row._rowIndex + 2, employee_id: row.employee_id, reasons: ['Duplicate employee_id'] });
    } else if (existingMap.has(emailKey)) {
      errorRows.push({ row: row._rowIndex + 2, employee_id: row.employee_id, reasons: ['Duplicate email'] });
    } else {
      existingMap.set(empKey, true);
      existingMap.set(emailKey, true);
      finalRows.push(row);
    }
  }

  // ─── PHASE 4: Batch INSERT (100 rows per query) ─────────────────────────────
  const BATCH_SIZE = 100;
  const successRows = [];
  let dbErrors = [];

  for (let batch = 0; batch < finalRows.length; batch += BATCH_SIZE) {
    const batchRows = finalRows.slice(batch, batch + BATCH_SIZE);
    const values = batchRows.map(r => [
      r.employee_id,
      r.full_name,
      r.short_name ? String(r.short_name).trim() : null,
      r.education_type,
      r.department,
      r.designation ? String(r.designation).trim() : null,
      r.phone_number ? String(r.phone_number).trim() : null,
      r.email.toLowerCase(),
      r.password_hash,
      r.role
    ]);

    try {
      await pool.query(
        `INSERT INTO users (employee_id,full_name,short_name,highest_qualification,department,designation,phone_number,email,password_hash,role,is_first_login)
         VALUES ?`,
        [values.map(v => [...v, 1])]
      );
      successRows.push(...batchRows.map(r => ({
        employee_id: r.employee_id,
        full_name: r.full_name,
        email: r.email,
        temp_password: r.temp_password
      })));
    } catch (err) {
      // If batch insert fails, fall back to individual inserts
      for (const row of batchRows) {
        try {
          await pool.query(
            `INSERT INTO users (employee_id,full_name,short_name,highest_qualification,department,designation,phone_number,email,password_hash,role,is_first_login)
             VALUES (?,?,?,?,?,?,?,?,?,?,TRUE)`,
            [
              row.employee_id,
              row.full_name,
              row.short_name ? String(row.short_name).trim() : null,
              row.education_type,
              row.department,
              row.designation ? String(row.designation).trim() : null,
              row.phone_number ? String(row.phone_number).trim() : null,
              row.email.toLowerCase(),
              row.password_hash,
              row.role
            ]
          );
          successRows.push({ employee_id: row.employee_id, full_name: row.full_name, email: row.email, temp_password: row.temp_password });
        } catch (e2) {
          errorRows.push({ row: row._rowIndex + 2, employee_id: row.employee_id, reasons: [e2.code === 'ER_DUP_ENTRY' ? 'Duplicate employee_id or email' : e2.message] });
        }
      }
    }
  }

  const excelBuffer = generateExcelBuffer(successRows, 'New Users');

  return res.json({
    success: true,
    data: {
      created:    successRows.length,
      failed:     errorRows.length,
      totalRows:  rows.length,
      errorRows,
      downloadUrl: successRows.length ? '/api/admin/users/bulk/download' : null,
    },
    _excelBuffer: excelBuffer.toString('base64'),
  });
}

// ─── GET /api/admin/users/:employee_id ───────────────────────────────────────
async function getUser(req, res) {
  try {
    if (req.user.role !== 'Admin' && req.user.employee_id !== req.params.employee_id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const [rows] = await pool.query(
      'SELECT employee_id,full_name,short_name,highest_qualification,department,designation,phone_number,bank_name,bank_account_no,bank_ifsc,bank_details_submitted,email,role,is_first_login,created_at FROM users WHERE employee_id = ?',
      [req.params.employee_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/admin/users ───────────────────────────────────────────────────
async function createUser(req, res) {
  const { employee_id, full_name, short_name, highest_qualification, department,
          designation, phone_number, email, role, password } = req.body;

  if (!employee_id || !full_name || !department || !role) {
    return res.status(400).json({ success: false, message: 'employee_id, full_name, department, and role are required.' });
  }

  try {
    const emailVal = email && String(email).trim() !== '' ? String(email).trim().toLowerCase() : `${employee_id.toLowerCase()}@college.edu`;
    const defaultPwd = password || employee_id.toLowerCase();
    const hash = await bcrypt.hash(defaultPwd, 10);

    await pool.query(
      `INSERT INTO users (employee_id,full_name,short_name,highest_qualification,department,designation,phone_number,email,password_hash,role,is_first_login)
       VALUES (?,?,?,?,?,?,?,?,?,?,TRUE)`,
      [
        employee_id,
        full_name,
        short_name || null,
        highest_qualification,
        department,
        designation || null,
        phone_number || null,
        emailVal,
        hash,
        role
      ]
    );

    return res.json({ success: true, message: 'User created successfully.', temp_password: defaultPwd });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Employee ID or email already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/users/:employee_id ───────────────────────────────────────
async function updateUser(req, res) {
  const { employee_id } = req.params;
  const isSelf = req.user.employee_id === employee_id;
  const isAdmin = req.user.role === 'Admin';

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const { full_name, short_name, highest_qualification, department,
          designation, phone_number, email, role, bank_name, bank_account_no, bank_ifsc, bank_holder_name } = req.body;

  try {
    if (isAdmin) {
      const hasBank = !!(bank_name && bank_account_no && bank_ifsc && bank_holder_name);
      await pool.query(
        `UPDATE users SET 
           full_name=?, short_name=?, highest_qualification=?, department=?, 
           designation=?, phone_number=?, email=COALESCE(?,email), role=?,
           bank_name=?, bank_account_no=?, bank_ifsc=?, bank_holder_name=?, bank_details_submitted=?
         WHERE employee_id=?`,
        [
          full_name, short_name||null, highest_qualification, department,
          designation||null, phone_number||null, email && String(email).trim() !== '' ? email.toLowerCase() : null, role,
          bank_name||null, bank_account_no||null, bank_ifsc||null, bank_holder_name||null, hasBank,
          employee_id
        ]
      );
    } else {
      await pool.query(
        `UPDATE users SET 
           phone_number=?, email=COALESCE(?,email), highest_qualification=?, designation=?
         WHERE employee_id=?`,
        [
          phone_number||null, 
          email && String(email).trim() !== '' ? email.toLowerCase() : null, 
          highest_qualification, 
          designation||null,
          employee_id
        ]
      );
    }
    return res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Email address already in use by another user.' });
    }
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/users/:employee_id/reset-password ────────────────────────
async function resetPassword(req, res) {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }
  try {
    const hash    = await bcrypt.hash(password.trim(), 10);

    const [result] = await pool.query(
      'UPDATE users SET password_hash=?, is_first_login=TRUE WHERE employee_id=?',
      [hash, req.params.employee_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/users/bulk-reset-password ──────────────────────────────
async function bulkResetPassword(req, res) {
  const { employee_ids, password } = req.body;

  if (!employee_ids || !password) {
    return res.status(400).json({ success: false, message: 'employee_ids and password are required.' });
  }

  try {
    const hash = await bcrypt.hash(password.trim(), 10);

    let result;
    if (employee_ids === 'all') {
      [result] = await pool.query(
        'UPDATE users SET password_hash = ?, is_first_login = TRUE WHERE role != "Admin"',
        [hash]
      );
    } else {
      if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'employee_ids must be an array or "all".' });
      }
      [result] = await pool.query(
        'UPDATE users SET password_hash = ?, is_first_login = TRUE WHERE employee_id IN (?)',
        [hash, employee_ids]
      );
    }

    return res.json({
      success: true,
      message: `Password reset successfully for ${result.affectedRows} users.`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error resetting passwords in bulk.' });
  }
}

// ─── DELETE /api/admin/users/all ──────────────────────────────────────────────
async function deleteAllUsers(req, res) {
  const conn = await pool.getConnection();
  try {
    // First, get the list of admin employee_ids
    const [adminRows] = await conn.query('SELECT employee_id FROM users WHERE role = "Admin"');
    const adminIds = adminRows.map(r => r.employee_id);

    // Helper: build safe NOT IN clause from adminIds
    // If adminIds is empty, delete everything; otherwise keep admin rows
    const safeNotIn = (ids) => ids.length ? ids : ['__NEVER_MATCH__'];
    const adminParam = safeNotIn(adminIds);

    // Delete dependent records for non-admin users
    // Use parameterized queries with the admin IDs directly (no subquery = no "can't reopen" error)
    await conn.query('DELETE FROM diary_logs WHERE employee_id NOT IN (?)', [adminParam]);
    await conn.query('DELETE FROM leave_requests WHERE employee_id NOT IN (?)', [adminParam]);
    await conn.query('DELETE FROM on_duty_requests WHERE employee_id NOT IN (?)', [adminParam]);
    await conn.query('DELETE FROM extra_hours WHERE employee_id NOT IN (?)', [adminParam]);
    // notifications has sender_employee_id and receiver_employee_id
    await conn.query('DELETE FROM notifications WHERE sender_employee_id NOT IN (?) AND receiver_employee_id NOT IN (?)', [adminParam, adminParam]);
    await conn.query('DELETE FROM timetables WHERE employee_id NOT IN (?)', [adminParam]);
    await conn.query('DELETE FROM bank_detail_change_requests WHERE employee_id NOT IN (?)', [adminParam]);
    await conn.query('DELETE FROM counseling_records WHERE counselor_id NOT IN (?)', [adminParam]);

    // Delete all students (not tied to admin directly)
    await conn.query('DELETE FROM students');

    // Delete all non-admin users
    const [result] = await conn.query('DELETE FROM users WHERE role != "Admin"');
    const deleted = result.affectedRows;

    const [adminCount] = await conn.query('SELECT COUNT(*) as count FROM users WHERE role = "Admin"');
    const preserved = adminCount[0].count;

    return res.json({ success: true, message: `All ${deleted} non-admin users deleted successfully. ${preserved} admin user(s) preserved.`, deleted, preserved });
  } catch (err) {
    console.error('Delete all users error:', err);
    return res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  } finally {
    conn.release();
  }
}

// ─── DELETE /api/admin/users/:employee_id ─────────────────────────────────────
async function deleteUser(req, res) {
  try {
    const [result] = await pool.query(
      'DELETE FROM users WHERE employee_id = ?',
      [req.params.employee_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/users/bank-details ────────────────────────────────────────────
async function submitBankDetails(req, res) {
  const { employee_id } = req.user;
  const { bank_name, bank_account_no, bank_ifsc, bank_holder_name } = req.body;

  if (!bank_name || !bank_account_no || !bank_ifsc || !bank_holder_name) {
    return res.status(400).json({ success: false, message: 'All bank details are required.' });
  }

  try {
    const [userRows] = await pool.query('SELECT bank_details_submitted FROM users WHERE employee_id = ?', [employee_id]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (userRows[0].bank_details_submitted) {
      return res.status(400).json({ success: false, message: 'Bank details already submitted. Please request admin for changes.' });
    }

    await pool.query(
      'UPDATE users SET bank_name = ?, bank_account_no = ?, bank_ifsc = ?, bank_holder_name = ?, bank_details_submitted = TRUE WHERE employee_id = ?',
      [bank_name.trim(), bank_account_no.trim(), bank_ifsc.trim().toUpperCase(), bank_holder_name.trim(), employee_id]
    );

    return res.json({ success: true, message: 'Bank details submitted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/users/bank-details/request ────────────────────────────────────
async function requestBankDetailsChange(req, res) {
  const { employee_id } = req.user;
  const { bank_name, bank_account_no, bank_ifsc, bank_holder_name, reason } = req.body;

  if (!reason || String(reason).trim() === '') {
    return res.status(400).json({ success: false, message: 'Reason for change is required.' });
  }

  try {
    const [userRows] = await pool.query('SELECT bank_name, bank_account_no, bank_ifsc, bank_holder_name FROM users WHERE employee_id = ?', [employee_id]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRows[0];

    const [pending] = await pool.query(
      'SELECT id FROM bank_detail_change_requests WHERE employee_id = ? AND status = "Pending"',
      [employee_id]
    );
    if (pending.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have a pending change request.' });
    }

    await pool.query(
      `INSERT INTO bank_detail_change_requests 
       (employee_id, old_bank_name, new_bank_name, old_bank_account_no, new_bank_account_no, old_bank_ifsc, new_bank_ifsc, old_bank_holder_name, new_bank_holder_name, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        user.bank_name,
        bank_name ? bank_name.trim() : user.bank_name,
        user.bank_account_no,
        bank_account_no ? bank_account_no.trim() : user.bank_account_no,
        user.bank_ifsc,
        bank_ifsc ? bank_ifsc.trim().toUpperCase() : user.bank_ifsc,
        user.bank_holder_name,
        bank_holder_name ? bank_holder_name.trim() : user.bank_holder_name,
        reason.trim()
      ]
    );

    return res.json({ success: true, message: 'Bank detail change request submitted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = {
  listUsers,
  createUser,
  bulkCreateUsers,
  bulkResetPassword,
  resetPassword,
  getUser,
  updateUser,
  deleteUser,
  deleteAllUsers,
  submitBankDetails,
  requestBankDetailsChange,
};
