const bcrypt  = require('bcryptjs');
const pool    = require('../config/db');
const { parseExcelBuffer, generateExcelBuffer } = require('../utils/excelParser');

// ─── helpers ──────────────────────────────────────────────────────────────────

function validateUserRow(row, index) {
  const errors = [];
  const required = ['employee_id','full_name','highest_qualification','department','role'];
  required.forEach(f => {
    if (!row[f] || String(row[f]).trim() === '') errors.push(`Row ${index}: missing ${f}`);
  });
  if (row.role && !['Admin','HOD','Faculty'].includes(row.role)) {
    errors.push(`Row ${index}: invalid role`);
  }
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push(`Row ${index}: invalid email`);
  }
  return errors;
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
async function listUsers(req, res) {
  try {
    const { role, department: userDept } = req.user;
    const { department: queryDept, search, page = 1, limit = 50 } = req.query;
    let sql  = 'SELECT employee_id,full_name,short_name,highest_qualification,department,designation,phone_number,bank_name,bank_account_no,bank_ifsc,bank_details_submitted,email,role,is_first_login,created_at FROM users WHERE 1=1';
    const params = [];

    if (role === 'HOD') {
      sql += ' AND department = ?';
      params.push(userDept);
    } else if (queryDept) {
      sql += ' AND department = ?';
      params.push(queryDept);
    }

    if (search) {
      sql += ' AND (full_name LIKE ? OR employee_id LIKE ? OR email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/admin/users ────────────────────────────────────────────────────
async function createUser(req, res) {
  const { employee_id, full_name, short_name, highest_qualification, department,
          designation, phone_number, email, role, bank_name, bank_account_no, bank_ifsc, password } = req.body;

  if (!employee_id || !full_name || !highest_qualification || !department || !role || !password) {
    return res.status(400).json({ success: false, message: 'Required fields missing (including password).' });
  }

  try {
    const hash    = await bcrypt.hash(password.trim(), 10);
    const emailVal = email && String(email).trim() !== '' ? email.trim().toLowerCase() : `${employee_id.trim().toLowerCase()}@college.edu`;
    const hasBank = !!(bank_name && bank_account_no && bank_ifsc);

    await pool.query(
      `INSERT INTO users (employee_id,full_name,short_name,highest_qualification,department,designation,phone_number,bank_name,bank_account_no,bank_ifsc,bank_details_submitted,email,password_hash,role,is_first_login)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,TRUE)`,
      [employee_id.trim(), full_name.trim(), short_name||null, highest_qualification.trim(), department,
       designation||null, phone_number||null, bank_name||null, bank_account_no||null, bank_ifsc||null, hasBank, emailVal, hash, role]
    );

    return res.status(201).json({
      success: true,
      data: { employee_id, full_name, email: emailVal },
      message: 'User created successfully.',
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'employee_id or email already exists.' });
    }
    console.error(err);
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

  const successRows = [];
  const errorRows   = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Normalize keys
    const rawEmpId = row.employee_id || row.Employee_ID || row['employee id'] || row['Employee ID'] || row['User_ID/Employee_id'] || row['User_ID/Employee_Id'] || row['User_ID/employee_id'] || row.user_id || row.User_ID || row['User ID'];
    const empIdVal = rawEmpId ? String(rawEmpId).trim() : '';

    const rawFullName = row.full_name || row.Full_Name || row['full name'] || row['Full Name'] || row.name || row.Name;
    const fullNameVal = rawFullName ? String(rawFullName).trim() : '';

    const rawEmail = row.email || row.Email || row['Email ID'] || row['email id'] || row['Email_ID'] || row['email_id'] || row['email ID'] || row['email_Id'];
    const emailVal = rawEmail && String(rawEmail).trim() !== '' ? String(rawEmail).trim() : (empIdVal ? `${empIdVal.toLowerCase()}@college.edu` : '');

    const rawPassword = row.password || row.Password || row.default_password || row.Default_Password || row['default password'] || row['Default Password'];
    const passwordVal = rawPassword ? String(rawPassword).trim() : null;

    const rawQual = row.highest_qualification || row.Highest_Qualification || row.qualification || row.Qualification || row.education_type || row.Education_Type || row['education type'] || row['Education Type'] || row['B-Tech/Diploma'] || row['B-Tech/diploma'] || row['B-Tech/Diploma '] || row['B-Tech/diploma '] || row.programme || row.Programme || row.program || row.Program || row.education || row.Education;
    const qualVal = rawQual ? String(rawQual).trim() : '';

    const rawDept = row.department || row.Department || row.dept || row.Dept || row.DEPT;

    const normalizedRow = {
      employee_id:           empIdVal,
      full_name:             fullNameVal,
      short_name:            row.short_name || row.Short_Name || row['short name'] || row['Short Name'] || row['ShortName'] || row.short || row.Short || null,
      highest_qualification: qualVal,
      department:            rawDept ? String(rawDept).trim() : '',
      designation:           row.designation || row.Designation || null,
      phone_number:          row.phone_number || row.Phone_Number || row['phone number'] || row['Phone Number'] || row.phone || row.Phone || row['Phone No'] || row['Phone no'] || row['Phone_no'] || row['Phone_No'] || null,
      email:                 emailVal,
      role:                  row.role || row.Role || 'Faculty',
      password:              passwordVal
    };

    // Normalize department (CSE -> Computer Science & Engineering, etc.)
    let deptMapped = normalizedRow.department || 'General';
    if (normalizedRow.department) {
      const MAPPING_RULES = [
        { test: /CSE|Computer Science/i, target: 'Computer Science & Engineering' },
        { test: /ECE|Electronics & Communication/i, target: 'Electronics & Communication Engineering' },
        { test: /IT|Information Technology/i, target: 'Information Technology' },
        { test: /EEE|Electrical/i, target: 'Electrical & Electronics Engineering' },
        { test: /MECH|ME|Mechanical/i, target: 'Mechanical Engineering' },
        { test: /CIVIL|Civil/i, target: 'Civil Engineering' },
        { test: /AI&DS|AI|Data Science/i, target: 'Artificial Intelligence & Data Science' },
        { test: /MATHEMATICS|PHYSICS|CHEMISTRY|ENGLISH|S&H/i, target: 'Science & Humanities' },
        { test: /T&P|Placement/i, target: 'Training & Placement' },
        { test: /PHYSICAL EDUCATION/i, target: 'Physical Education' },
        { test: /LIBRARY/i, target: 'Library' }
      ];

      let foundRule = MAPPING_RULES.find(r => r.test.test(normalizedRow.department));
      if (foundRule) {
        deptMapped = foundRule.target;
      } else {
        const match = depts.find(d => 
          d.department_code.toLowerCase() === normalizedRow.department.toLowerCase() ||
          d.department_name.toLowerCase() === normalizedRow.department.toLowerCase() ||
          d.department_name.toLowerCase().includes(normalizedRow.department.toLowerCase()) ||
          normalizedRow.department.toLowerCase().includes(d.department_code.toLowerCase())
        );
        if (match) {
          deptMapped = match.department_name;
        }
      }
    }
    normalizedRow.department = deptMapped;

    const errs = validateUserRow(normalizedRow, i + 2);
    if (errs.length) { errorRows.push({ row: i + 2, reasons: errs }); continue; }

    try {
      const defaultPwd = normalizedRow.password || normalizedRow.employee_id.toLowerCase();
      const hash    = await bcrypt.hash(defaultPwd, 10);

      await pool.query(
        `INSERT INTO users (employee_id,full_name,short_name,highest_qualification,department,designation,phone_number,email,password_hash,role,is_first_login)
         VALUES (?,?,?,?,?,?,?,?,?,?,TRUE)`,
        [
          normalizedRow.employee_id,
          normalizedRow.full_name,
          normalizedRow.short_name ? String(normalizedRow.short_name).trim() : null,
          normalizedRow.highest_qualification,
          normalizedRow.department,
          normalizedRow.designation ? String(normalizedRow.designation).trim() : null,
          normalizedRow.phone_number ? String(normalizedRow.phone_number).trim() : null,
          normalizedRow.email.toLowerCase(),
          hash,
          normalizedRow.role
        ]
      );

      successRows.push({ employee_id: normalizedRow.employee_id, full_name: normalizedRow.full_name, email: normalizedRow.email, temp_password: defaultPwd });
    } catch (err) {
      errorRows.push({ row: i + 2, reasons: [err.code === 'ER_DUP_ENTRY' ? 'Duplicate employee_id or email' : err.message] });
    }
  }

  const excelBuffer = generateExcelBuffer(successRows, 'New Users');

  res.setHeader('Content-Type', 'application/json');
  return res.json({
    success: true,
    data: {
      created:    successRows.length,
      failed:     errorRows.length,
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
        'UPDATE users SET password_hash = ?, is_first_login = TRUE',
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

    return res.json({ success: true, message: 'Bank details change request submitted to Admin.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { 
  listUsers, 
  createUser, 
  bulkCreateUsers, 
  getUser, 
  updateUser, 
  resetPassword, 
  bulkResetPassword,
  deleteUser,
  submitBankDetails,
  requestBankDetailsChange
};
