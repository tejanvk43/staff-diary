const pool = require('../config/db');
const { hasTimeCollisionByTime } = require('../utils/timeConflict');

// ─── GET /api/timetable/mine ──────────────────────────────────────────────────
async function getMine(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, s.subject_name, s.subject_code FROM timetables t
       LEFT JOIN subjects s ON t.subject_id = s.id
       WHERE t.employee_id = ?
       ORDER BY FIELD(t.day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), t.from_time`,
      [req.user.employee_id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/timetable (admin - all) ────────────────────────────────────────
async function getAll(req, res) {
  try {
    const { department, employee_id } = req.query;
    let sql = `SELECT t.*, u.full_name, s.subject_name, s.subject_code FROM timetables t
               JOIN users u ON t.employee_id = u.employee_id
               LEFT JOIN subjects s ON t.subject_id = s.id WHERE 1=1`;
    const params = [];
    if (department) { sql += ' AND u.department = ?'; params.push(department); }
    if (employee_id) { sql += ' AND t.employee_id = ?'; params.push(employee_id); }
    sql += ` ORDER BY FIELD(t.day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), t.from_time`;
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/timetable ─────────────────────────────────────────────────────
async function createSlot(req, res) {
  const { employee_id } = req.user;
  const { block_id, subject_id, short_name, day, from_time, to_time, subject_type,
          education_type, year, section, room_number } = req.body;

  if (!day || !from_time || !to_time) {
    return res.status(400).json({ success: false, message: 'day, from_time, and to_time are required.' });
  }

  try {
    // Collision for same employee same day
    const [existing] = await pool.query(
      'SELECT from_time, to_time FROM timetables WHERE employee_id = ? AND day = ?',
      [employee_id, day]
    );

    if (hasTimeCollisionByTime(existing, from_time, to_time)) {
      return res.status(409).json({ success: false, message: 'Time overlaps with an existing timetable slot.' });
    }

    const [result] = await pool.query(
      `INSERT INTO timetables (employee_id,block_id,subject_id,short_name,day,from_time,to_time,subject_type,education_type,year,section,room_number)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [employee_id, block_id||null, subject_id||null, short_name||null, day, from_time, to_time,
       subject_type||'Theory', education_type||null, year||null, section||null, room_number||null]
    );

    const [newSlot] = await pool.query('SELECT * FROM timetables WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, data: newSlot[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/timetable/:id ───────────────────────────────────────────────────
async function updateSlot(req, res) {
  const { employee_id } = req.user;
  const { id } = req.params;
  const { subject_id, short_name, day, from_time, to_time, subject_type,
          education_type, year, section, room_number } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM timetables WHERE id = ? AND employee_id = ?',
      [id, employee_id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Slot not found.' });

    const slot = rows[0];
    const checkDay = day || slot.day;

    const [existing] = await pool.query(
      'SELECT from_time, to_time FROM timetables WHERE employee_id = ? AND day = ? AND id != ?',
      [employee_id, checkDay, id]
    );

    const checkFrom = from_time || slot.from_time;
    const checkTo   = to_time   || slot.to_time;

    if (hasTimeCollisionByTime(existing, checkFrom, checkTo)) {
      return res.status(409).json({ success: false, message: 'Time overlaps with an existing timetable slot.' });
    }

    await pool.query(
      `UPDATE timetables SET subject_id=COALESCE(?,subject_id), short_name=COALESCE(?,short_name),
       day=COALESCE(?,day), from_time=COALESCE(?,from_time), to_time=COALESCE(?,to_time),
       subject_type=COALESCE(?,subject_type), education_type=COALESCE(?,education_type),
       year=COALESCE(?,year), section=COALESCE(?,section), room_number=COALESCE(?,room_number)
       WHERE id = ?`,
      [subject_id||null, short_name||null, day||null, from_time||null, to_time||null,
       subject_type||null, education_type||null, year||null, section||null, room_number||null, id]
    );

    const [updated] = await pool.query('SELECT * FROM timetables WHERE id = ?', [id]);
    return res.json({ success: true, data: updated[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── DELETE /api/timetable/:id ───────────────────────────────────────────────
async function deleteSlot(req, res) {
  const { employee_id } = req.user;
  try {
    const [result] = await pool.query(
      'DELETE FROM timetables WHERE id = ? AND employee_id = ?',
      [req.params.id, employee_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Slot not found.' });
    return res.json({ success: true, message: 'Slot deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── DELETE /api/timetable/reset-all (Admin only) ────────────────────────────
async function resetAllTimetable(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result1] = await conn.query('DELETE FROM timetables');
    const [result2] = await conn.query('DELETE FROM block_timetables');

    await conn.commit();
    return res.json({
      success: true,
      message: `Timetable reset successfully. Deleted ${result1.affectedRows} faculty slots and ${result2.affectedRows} block timetables.`,
      deletedCount: result1.affectedRows + result2.affectedRows
    });
  } catch (err) {
    await conn.rollback();
    console.error('Reset timetable error:', err);
    return res.status(500).json({ success: false, message: 'Server error while resetting timetable.' });
  } finally {
    conn.release();
  }
}

module.exports = { getMine, getAll, createSlot, updateSlot, deleteSlot, resetAllTimetable };
