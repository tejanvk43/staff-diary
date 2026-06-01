const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');
const { JWT_SECRET, JWT_EXPIRES } = require('../config/config');

// POST /api/auth/login
async function login(req, res) {
  const { employee_id, password } = req.body;
  if (!employee_id || !password) {
    return res.status(400).json({ success: false, message: 'Employee ID and password are required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE employee_id = ?',
      [employee_id.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid Employee ID or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid Employee ID or password.' });
    }

    const payload = {
      employee_id: user.employee_id,
      role:        user.role,
      full_name:   user.full_name,
      department:  user.department,
      short_name:  user.short_name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.json({
      success: true,
      data: {
        token,
        user: { ...payload, is_first_login: user.is_first_login },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
}

// POST /api/auth/change-password  (authenticated)
async function changePassword(req, res) {
  const { old_password, new_password } = req.body;
  const { employee_id } = req.user;

  if (!old_password || !new_password) {
    return res.status(400).json({ success: false, message: 'old_password and new_password are required.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT password_hash FROM users WHERE employee_id = ?',
      [employee_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const match = await bcrypt.compare(old_password, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Old password is incorrect.' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password_hash = ?, is_first_login = FALSE WHERE employee_id = ?',
      [hash, employee_id]
    );

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT employee_id, full_name, short_name, education_type, department, designation, phone_number, email, role, is_first_login, created_at FROM users WHERE employee_id = ?',
      [req.user.employee_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { login, changePassword, me };
