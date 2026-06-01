const pool = require('../config/db');
const { hasTimeCollision, hasTimeCollisionByTime } = require('../utils/timeConflict');

// Helper: get system config value
async function getConfig(key) {
  const [rows] = await pool.query(
    'SELECT config_value FROM system_configs WHERE config_key = ?', [key]
  );
  return rows.length ? rows[0].config_value : null;
}

// Helper: check if a date is a holiday (Sunday = default holiday, unless overridden)
async function isDateHoliday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const isSunday = d.getDay() === 0;

  if (isSunday) {
    const [working] = await pool.query(
      'SELECT id FROM working_sundays WHERE working_date = ?', [dateStr]
    );
    if (working.length > 0) {
      return null; // Not a holiday, designated working Sunday
    }
    return 'Sunday (Default Holiday)';
  } else {
    const [h] = await pool.query(
      'SELECT holiday_name FROM holidays WHERE holiday_date = ?', [dateStr]
    );
    return h.length ? h[0].holiday_name : null;
  }
}

// ─── GET /api/diary/today ─────────────────────────────────────────────────────
async function getToday(req, res) {
  const { employee_id } = req.user;
  try {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const holidayName = await isDateHoliday(todayStr);

    // Fetch latest date-based edit request
    const [dateReqs] = await pool.query(
      `SELECT status, edit_window_expires_at, remarks FROM request_detail_changes
       WHERE employee_id = ? AND target_table = 'diary_logs_date'
         AND JSON_UNQUOTE(JSON_EXTRACT(change_payload, '$.date')) = ?
       ORDER BY created_at DESC LIMIT 1`,
      [employee_id, todayStr]
    );

    const date_edit_status = dateReqs.length ? dateReqs[0].status : null;
    const date_edit_approved = dateReqs.length ? (dateReqs[0].status === 'Approved' && new Date(dateReqs[0].edit_window_expires_at) > new Date()) : false;
    const date_edit_window_expires_at = dateReqs.length ? dateReqs[0].edit_window_expires_at : null;
    const date_edit_remarks = dateReqs.length ? dateReqs[0].remarks : null;

    // Get existing diary entries for today
    const [entries] = await pool.query(
      `SELECT d.*, 
              IF(r.target_record_id IS NOT NULL, 1, 0) AS edit_approved,
              r.edit_window_expires_at
       FROM diary_logs d
       LEFT JOIN (
         SELECT target_record_id, MAX(edit_window_expires_at) AS edit_window_expires_at
         FROM request_detail_changes
         WHERE target_table = 'diary_logs'
           AND status = 'Approved'
           AND edit_window_expires_at > NOW()
         GROUP BY target_record_id
       ) r ON r.target_record_id = d.id
       WHERE d.employee_id = ? AND d.log_date = CURDATE()
       ORDER BY d.from_time`,
      [employee_id]
    );

    return res.json({
      success: true,
      data: {
        entries,
        holiday: holidayName,
        auto_populated: false,
        date_edit_status,
        date_edit_approved,
        date_edit_window_expires_at,
        date_edit_remarks
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/diary?date=YYYY-MM-DD ──────────────────────────────────────────
async function getByDate(req, res) {
  const { employee_id } = req.user;
  const { date } = req.query;

  if (!date) return res.status(400).json({ success: false, message: 'date param required.' });

  try {
    const holidayName = await isDateHoliday(date);

    // Fetch latest date-based edit request
    const [dateReqs] = await pool.query(
      `SELECT status, edit_window_expires_at, remarks FROM request_detail_changes
       WHERE employee_id = ? AND target_table = 'diary_logs_date'
         AND JSON_UNQUOTE(JSON_EXTRACT(change_payload, '$.date')) = ?
       ORDER BY created_at DESC LIMIT 1`,
      [employee_id, date]
    );

    const date_edit_status = dateReqs.length ? dateReqs[0].status : null;
    const date_edit_approved = dateReqs.length ? (dateReqs[0].status === 'Approved' && new Date(dateReqs[0].edit_window_expires_at) > new Date()) : false;
    const date_edit_window_expires_at = dateReqs.length ? dateReqs[0].edit_window_expires_at : null;
    const date_edit_remarks = dateReqs.length ? dateReqs[0].remarks : null;

    const [entries] = await pool.query(
      `SELECT d.*, 
              IF(r.target_record_id IS NOT NULL, 1, 0) AS edit_approved,
              r.edit_window_expires_at
       FROM diary_logs d
       LEFT JOIN (
         SELECT target_record_id, MAX(edit_window_expires_at) AS edit_window_expires_at
         FROM request_detail_changes
         WHERE target_table = 'diary_logs'
           AND status = 'Approved'
           AND edit_window_expires_at > NOW()
         GROUP BY target_record_id
       ) r ON r.target_record_id = d.id
       WHERE d.employee_id = ? AND d.log_date = ?
       ORDER BY d.from_time`,
      [employee_id, date]
    );

    return res.json({
      success: true,
      data: entries,
      holiday: holidayName,
      date_edit_status,
      date_edit_approved,
      date_edit_window_expires_at,
      date_edit_remarks
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/diary ──────────────────────────────────────────────────────────
async function createEntry(req, res) {
  const { employee_id } = req.user;
  const { from_time, to_time, description, activity_type } = req.body;

  if (!from_time || !to_time || !activity_type) {
    return res.status(400).json({ success: false, message: 'from_time, to_time, and activity_type are required.' });
  }

  try {
    const startCfg = await getConfig('diary_start_time') || '08:30';
    const endCfg   = await getConfig('diary_end_time')   || '16:10';

    const today = new Date().toISOString().split('T')[0];
    const fromDT = new Date(from_time);
    const toDT   = new Date(to_time);
    const targetDateStr = fromDT.toISOString().split('T')[0];

    // Check if there is an approved date-based edit request for targetDateStr
    const [dateReq] = await pool.query(
      `SELECT * FROM request_detail_changes
       WHERE employee_id = ? AND target_table = 'diary_logs_date'
         AND JSON_UNQUOTE(JSON_EXTRACT(change_payload, '$.date')) = ?
         AND status = 'Approved' AND edit_window_expires_at > NOW()`,
      [employee_id, targetDateStr]
    );
    const hasDateApproval = dateReq.length > 0;

    // Deadline check for today
    const now = new Date();
    const currentLocalTimeStr = now.toTimeString().slice(0, 5); // 'HH:MM'
    if (targetDateStr === today && currentLocalTimeStr > endCfg && !hasDateApproval) {
      return res.status(403).json({
        success: false,
        message: `Diary writing window for today is over (closed at ${endCfg}).`,
      });
    }

    // Past date check
    if (targetDateStr !== today && !hasDateApproval) {
      return res.status(400).json({
        success: false,
        message: 'Past entries can only be created with an approved edit request within the edit window.',
      });
    }

    // Within allowed window (hours and minutes check)
    const [startH, startM] = startCfg.split(':').map(Number);
    const [endH, endM]     = endCfg.split(':').map(Number);
    const windowStart = new Date(fromDT); windowStart.setHours(startH, startM, 0, 0);
    const windowEnd   = new Date(toDT);   windowEnd.setHours(endH, endM, 0, 0);

    if (fromDT < windowStart || toDT > windowEnd) {
      return res.status(400).json({
        success: false,
        message: `Entry must be within ${startCfg}–${endCfg}.`,
      });
    }

    if (fromDT >= toDT) {
      return res.status(400).json({ success: false, message: 'from_time must be before to_time.' });
    }

    // Collision check
    const [existing] = await pool.query(
      `SELECT from_time, to_time FROM diary_logs WHERE employee_id = ? AND log_date = ?`,
      [employee_id, targetDateStr]
    );

    if (hasTimeCollision(existing, from_time, to_time)) {
      return res.status(409).json({ success: false, message: 'Time overlaps with an existing diary entry.' });
    }

    const [result] = await pool.query(
      `INSERT INTO diary_logs (employee_id, log_date, from_time, to_time, description, activity_type, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Draft')`,
      [employee_id, targetDateStr, from_time, to_time, description || null, activity_type]
    );

    const [newEntry] = await pool.query('SELECT * FROM diary_logs WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, data: newEntry[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/diary/:id ───────────────────────────────────────────────────────
async function updateEntry(req, res) {
  const { employee_id } = req.user;
  const { id } = req.params;
  const { from_time, to_time, description, activity_type } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM diary_logs WHERE id = ? AND employee_id = ?',
      [id, employee_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Entry not found.' });

    const entry = rows[0];
    const today = new Date().toISOString().split('T')[0];
    const isToday = entry.log_date === today;

    const [editReq] = await pool.query(
      `SELECT * FROM request_detail_changes
       WHERE employee_id = ? AND status = 'Approved' AND edit_window_expires_at > NOW()
         AND (
           (target_table = 'diary_logs' AND target_record_id = ?)
           OR
           (target_table = 'diary_logs_date' AND JSON_UNQUOTE(JSON_EXTRACT(change_payload, '$.date')) = ?)
         )`,
      [employee_id, id, entry.log_date]
    );
    const isApproved = editReq.length > 0;

    if (isToday) {
      const endCfg = await getConfig('diary_end_time') || '16:10';
      const now = new Date();
      const currentLocalTimeStr = now.toTimeString().slice(0, 5);
      if (currentLocalTimeStr > endCfg && !isApproved) {
        return res.status(403).json({
          success: false,
          message: `Diary writing window for today is over (closed at ${endCfg}). Request edit permission.`,
        });
      }
    } else {
      if (!isApproved) {
        return res.status(403).json({
          success: false,
          message: 'Past entries can only be edited with an approved edit request within the edit window.',
        });
      }
    }

    // Collision check (excluding current entry)
    const [existing] = await pool.query(
      `SELECT from_time, to_time FROM diary_logs WHERE employee_id = ? AND log_date = ? AND id != ?`,
      [employee_id, entry.log_date, id]
    );

    if (from_time && to_time && hasTimeCollision(existing, from_time, to_time)) {
      return res.status(409).json({ success: false, message: 'Time overlaps with an existing diary entry.' });
    }

    await pool.query(
      `UPDATE diary_logs SET from_time=COALESCE(?,from_time), to_time=COALESCE(?,to_time),
       description=COALESCE(?,description), activity_type=COALESCE(?,activity_type)
       WHERE id = ?`,
      [from_time||null, to_time||null, description||null, activity_type||null, id]
    );

    const [updated] = await pool.query('SELECT * FROM diary_logs WHERE id = ?', [id]);
    return res.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/diary/:id/submit ───────────────────────────────────────────────
async function submitEntry(req, res) {
  const { employee_id } = req.user;
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT log_date FROM diary_logs WHERE id=? AND employee_id=?',
      [id, employee_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Entry not found.' });

    const entry = rows[0];
    const today = new Date().toISOString().split('T')[0];
    const isToday = entry.log_date === today;

    const [editReq] = await pool.query(
      `SELECT * FROM request_detail_changes
       WHERE employee_id = ? AND status = 'Approved' AND edit_window_expires_at > NOW()
         AND (
           (target_table = 'diary_logs' AND target_record_id = ?)
           OR
           (target_table = 'diary_logs_date' AND JSON_UNQUOTE(JSON_EXTRACT(change_payload, '$.date')) = ?)
         )`,
      [employee_id, id, entry.log_date]
    );
    const isApproved = editReq.length > 0;

    if (isToday) {
      const endCfg = await getConfig('diary_end_time') || '16:10';
      const now = new Date();
      const currentLocalTimeStr = now.toTimeString().slice(0, 5);
      if (currentLocalTimeStr > endCfg && !isApproved) {
        return res.status(403).json({
          success: false,
          message: `Diary writing window for today is over (closed at ${endCfg}). Request edit permission.`,
        });
      }
    } else {
      if (!isApproved) {
        return res.status(403).json({
          success: false,
          message: 'Past entries can only be submitted with an approved edit request within the edit window.',
        });
      }
    }

    const [result] = await pool.query(
      `UPDATE diary_logs SET status='Approved' WHERE id=? AND employee_id=? AND status='Draft'`,
      [id, employee_id]
    );
    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Entry not found or not in Draft status.' });
    }
    return res.json({ success: true, message: 'Entry submitted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/diary/submit-day ──────────────────────────────────────────────
async function submitDay(req, res) {
  const { employee_id } = req.user;
  try {
    const endCfg = await getConfig('diary_end_time') || '16:10';
    const now = new Date();
    const currentLocalTimeStr = now.toTimeString().slice(0, 5);
    if (currentLocalTimeStr > endCfg) {
      return res.status(403).json({
        success: false,
        message: `Diary writing window for today is over (closed at ${endCfg}).`,
      });
    }

    const [result] = await pool.query(
      `UPDATE diary_logs SET status='Approved' WHERE employee_id=? AND log_date=CURDATE() AND status='Draft'`,
      [employee_id]
    );
    return res.json({ success: true, message: `${result.affectedRows} entries submitted.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/diary/request-edit ────────────────────────────────────────────
async function requestEdit(req, res) {
  const { employee_id } = req.user;
  const { diary_log_id, date, reason } = req.body;

  if (!reason) {
    return res.status(400).json({ success: false, message: 'reason is required.' });
  }

  if (!diary_log_id && !date) {
    return res.status(400).json({ success: false, message: 'Either diary_log_id or date is required.' });
  }

  try {
    if (date) {
      await pool.query(
        `INSERT INTO request_detail_changes (employee_id, target_table, target_record_id, request_type, reason, change_payload, status)
         VALUES (?, 'diary_logs_date', 0, 'edit', ?, ?, 'Pending')`,
        [employee_id, reason, JSON.stringify({ date })]
      );
    } else {
      await pool.query(
        `INSERT INTO request_detail_changes (employee_id, target_table, target_record_id, request_type, reason, change_payload, status)
         VALUES (?, 'diary_logs', ?, 'edit', ?, NULL, 'Pending')`,
        [employee_id, diary_log_id, reason]
      );
    }

    // Notify admins
    const [admins] = await pool.query(`SELECT employee_id FROM users WHERE role IN ('Admin','HOD')`);
    const notifMsg = date 
      ? `${req.user.full_name} requested edit permission for the past date ${date}.`
      : `${req.user.full_name} requested to edit a past diary entry.`;

    const notifValues = admins.map(a => [employee_id, a.employee_id,
      'Diary Edit Request', notifMsg, 'General']);
    if (notifValues.length) {
      await pool.query(
        `INSERT INTO notifications (sender_employee_id, receiver_employee_id, title, message, notification_type) VALUES ?`,
        [notifValues]
      );
    }

    return res.status(201).json({ success: true, message: 'Edit request submitted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── DELETE /api/diary/:id ────────────────────────────────────────────────────
async function deleteEntry(req, res) {
  const { employee_id } = req.user;
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT log_date FROM diary_logs WHERE id=? AND employee_id=?',
      [id, employee_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Entry not found.' });

    const entry = rows[0];
    const today = new Date().toISOString().split('T')[0];
    const isToday = entry.log_date === today;

    const [editReq] = await pool.query(
      `SELECT * FROM request_detail_changes
       WHERE employee_id = ? AND status = 'Approved' AND edit_window_expires_at > NOW()
         AND (
           (target_table = 'diary_logs' AND target_record_id = ?)
           OR
           (target_table = 'diary_logs_date' AND JSON_UNQUOTE(JSON_EXTRACT(change_payload, '$.date')) = ?)
         )`,
      [employee_id, id, entry.log_date]
    );
    const isApproved = editReq.length > 0;

    if (isToday) {
      const endCfg = await getConfig('diary_end_time') || '16:10';
      const now = new Date();
      const currentLocalTimeStr = now.toTimeString().slice(0, 5);
      if (currentLocalTimeStr > endCfg && !isApproved) {
        return res.status(403).json({
          success: false,
          message: `Diary writing window for today is over (closed at ${endCfg}). Request edit permission.`,
        });
      }
    } else {
      if (!isApproved) {
        return res.status(403).json({
          success: false,
          message: 'Past entries can only be deleted with an approved edit request within the edit window.',
        });
      }
    }

    const [result] = await pool.query(
      `DELETE FROM diary_logs WHERE id=? AND employee_id=? AND status='Draft'`,
      [id, employee_id]
    );
    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Entry not found or cannot be deleted (not Draft).' });
    }
    return res.json({ success: true, message: 'Entry deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getToday, getByDate, createEntry, updateEntry, submitEntry, submitDay, requestEdit, deleteEntry };
