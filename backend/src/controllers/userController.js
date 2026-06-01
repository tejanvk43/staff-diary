const bcrypt  = require('bcryptjs');
const pool    = require('../config/db');
const { generateTempPassword } = require('../utils/passwordGen');
const { parseExcelBuffer, generateExcelBuffer } = require('../utils/excelParser');

// ─── helpers ──────────────────────────────────────────────────────────────────

function validateUserRow(row, index) {
  const errors = [];
  const required = ['employee_id','full_name','education_type','department','role'];
  required.forEach(f => {
    if (!row[f] || String(row[f]).trim() === '') errors.push(`Row ${index}: missing ${f}`);
  });
  if (row.education_type && !['B-Tech','Diploma','M-Tech'].includes(row.education_type)) {
    errors.push(`Row ${index}: invalid education_type`);
  }
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
    const { department, search, page = 1, limit = 50 } = req.query;
    let sql  = 'SELECT employee_id,full_name,short_name,education_type,department,designation,phone_number,email,role,is_first_login,created_at FROM users WHERE 1=1';
    const params = [];

    if (department) { sql += ' AND department = ?'; params.push(department); }
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
  const { employee_id, full_name, short_name, education_type, department,
          designation, phone_number, email, role } = req.body;

  if (!employee_id || !full_name || !education_type || !department || !role) {
    return res.status(400).json({ success: false, message: 'Required fields missing.' });
  }

  try {
    const tempPwd = generateTempPassword();
    const hash    = await bcrypt.hash(tempPwd, 10);
    const emailVal = email && String(email).trim() !== '' ? email.trim().toLowerCase() : `${employee_id.trim().toLowerCase()}@college.edu`;

    await pool.query(
      `INSERT INTO users (employee_id,full_name,short_name,education_type,department,designation,phone_number,email,password_hash,role,is_first_login)
       VALUES (?,?,?,?,?,?,?,?,?,?,TRUE)`,
      [employee_id.trim(), full_name.trim(), short_name||null, education_type, department,
       designation||null, phone_number||null, emailVal, hash, role]
    );

    return res.status(201).json({
      success: true,
      data: { employee_id, full_name, email: emailVal, temp_password: tempPwd },
      message: 'User created. Save the temp_password — it will not be shown again.',
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

    // Normalize education_type values (e.g., B.Tech -> B-Tech)
    let eduType = normalizedRow.education_type ? String(normalizedRow.education_type).trim() : '';
    const cleanEdu = eduType.toLowerCase().replace(/[\s\.-]/g, '');
    if (cleanEdu.startsWith('btech')) {
      eduType = 'B-Tech';
    } else if (cleanEdu.startsWith('diploma')) {
      eduType = 'Diploma';
    } else if (cleanEdu.startsWith('mtech')) {
      eduType = 'M-Tech';
    }
    normalizedRow.education_type = eduType;

    const errs = validateUserRow(normalizedRow, i + 2);
    if (errs.length) { errorRows.push({ row: i + 2, reasons: errs }); continue; }

    try {
      const tempPwd = normalizedRow.password || generateTempPassword();
      const hash    = await bcrypt.hash(tempPwd, 10);

      await pool.query(
        `INSERT INTO users (employee_id,full_name,short_name,education_type,department,designation,phone_number,email,password_hash,role,is_first_login)
         VALUES (?,?,?,?,?,?,?,?,?,?,TRUE)`,
        [
          normalizedRow.employee_id,
          normalizedRow.full_name,
          normalizedRow.short_name ? String(normalizedRow.short_name).trim() : null,
          normalizedRow.education_type,
          normalizedRow.department ? String(normalizedRow.department).trim() : 'General',
          normalizedRow.designation ? String(normalizedRow.designation).trim() : null,
          normalizedRow.phone_number ? String(normalizedRow.phone_number).trim() : null,
          normalizedRow.email.toLowerCase(),
          hash,
          normalizedRow.role
        ]
      );

      successRows.push({ employee_id: normalizedRow.employee_id, full_name: normalizedRow.full_name, email: normalizedRow.email, temp_password: tempPwd });
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
    const [rows] = await pool.query(
      'SELECT employee_id,full_name,short_name,education_type,department,designation,phone_number,email,role,is_first_login,created_at FROM users WHERE employee_id = ?',
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
  const { full_name, short_name, education_type, department,
          designation, phone_number, email, role } = req.body;
  try {
    await pool.query(
      `UPDATE users SET full_name=?,short_name=?,education_type=?,department=?,designation=?,phone_number=?,email=COALESCE(?,email),role=? WHERE employee_id=?`,
      [full_name, short_name||null, education_type, department,
       designation||null, phone_number||null, email && String(email).trim() !== '' ? email.toLowerCase() : null, role, req.params.employee_id]
    );
    return res.json({ success: true, message: 'User updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/users/:employee_id/reset-password ────────────────────────
async function resetPassword(req, res) {
  try {
    const tempPwd = generateTempPassword();
    const hash    = await bcrypt.hash(tempPwd, 10);

    const [result] = await pool.query(
      'UPDATE users SET password_hash=?, is_first_login=TRUE WHERE employee_id=?',
      [hash, req.params.employee_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      data: { temp_password: tempPwd },
      message: 'Password reset. Save the temp_password — it will not be shown again.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
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

module.exports = { listUsers, createUser, bulkCreateUsers, getUser, updateUser, resetPassword, deleteUser };
