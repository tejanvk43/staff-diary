const pool = require('../config/db');

// ─── GET /api/faculty/setup ───────────────────────────────────────────────────
async function getSetup(req, res) {
  const { employee_id } = req.user;
  try {
    const [courses] = await pool.query(
      'SELECT * FROM faculty_courses WHERE employee_id = ? ORDER BY education_type, year, section',
      [employee_id]
    );
    const [blocks] = await pool.query(
      `SELECT fba.block_id, bt.name AS block_name, bt.education_type, bt.year, bt.section,
              (SELECT COUNT(*) FROM block_timetable_slots s WHERE s.timetable_id = bt.id) AS slot_count
       FROM faculty_block_assignments fba
       JOIN block_timetables bt ON fba.block_id = bt.id
       WHERE fba.employee_id = ?`,
      [employee_id]
    );
    const [subjects] = await pool.query(
      `SELECT fs.subject_id, s.subject_name, s.subject_code, s.subject_type, s.education_type, s.year
       FROM faculty_subjects fs
       JOIN subjects s ON fs.subject_id = s.id
       WHERE fs.employee_id = ? ORDER BY s.education_type, s.year, s.subject_name`,
      [employee_id]
    );
    const isComplete = courses.length > 0 && blocks.length > 0 && subjects.length > 0;
    return res.json({ success: true, data: { courses, blocks, subjects, isComplete } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/faculty/setup ──────────────────────────────────────────────────
async function saveSetup(req, res) {
  const { employee_id } = req.user;
  const { courses = [], block_ids = [], subject_ids = [] } = req.body;

  if (!courses.length || !block_ids.length || !subject_ids.length) {
    return res.status(400).json({
      success: false,
      message: 'courses, block_ids, and subject_ids are all required.'
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Replace courses
    await conn.query('DELETE FROM faculty_courses WHERE employee_id = ?', [employee_id]);
    const courseVals = courses.map(c => [employee_id, c.education_type, c.year, c.section, c.section_id || null]);
    await conn.query(
      'INSERT INTO faculty_courses (employee_id, education_type, year, section, section_id) VALUES ?',
      [courseVals]
    );

    // Replace block assignments
    await conn.query('DELETE FROM faculty_block_assignments WHERE employee_id = ?', [employee_id]);
    const blockVals = block_ids.map(id => [employee_id, id]);
    await conn.query(
      'INSERT INTO faculty_block_assignments (employee_id, block_id) VALUES ?',
      [blockVals]
    );

    // Replace subject assignments
    await conn.query('DELETE FROM faculty_subjects WHERE employee_id = ?', [employee_id]);
    const subjVals = subject_ids.map(id => [employee_id, id]);
    await conn.query(
      'INSERT INTO faculty_subjects (employee_id, subject_id) VALUES ?',
      [subjVals]
    );

    await conn.commit();
    return res.json({ success: true, message: 'Setup saved.' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    conn.release();
  }
}

// ─── GET /api/faculty/blocks ──────────────────────────────────────────────────
async function getAllBlocks(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT bt.id, bt.name, bt.education_type, bt.year, bt.section, bt.department,
              (SELECT COUNT(*) FROM block_timetable_slots s WHERE s.timetable_id = bt.id) AS slot_count
       FROM block_timetables bt ORDER BY bt.name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/faculty/subjects ────────────────────────────────────────────────
async function getAllSubjects(req, res) {
  try {
    const { education_type } = req.query;
    let sql = 'SELECT * FROM subjects WHERE 1=1';
    const params = [];
    if (education_type) { sql += ' AND education_type = ?'; params.push(education_type); }
    sql += ' ORDER BY education_type, year, subject_name';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/faculty/my-blocks-with-slots ────────────────────────────────────
// Returns blocks assigned to faculty WITH their time slots (for timetable creation)
async function getMyBlocksWithSlots(req, res) {
  const { employee_id } = req.user;
  try {
    const [blocks] = await pool.query(
      `SELECT bt.id, bt.name, bt.education_type, bt.year, bt.section, bt.department
       FROM faculty_block_assignments fba
       JOIN block_timetables bt ON fba.block_id = bt.id
       WHERE fba.employee_id = ? ORDER BY bt.name`,
      [employee_id]
    );

    // Attach unique time slots for each block
    for (const block of blocks) {
      const [slots] = await pool.query(
        `SELECT DISTINCT from_time, to_time, short_name, subject_type FROM block_timetable_slots
         WHERE timetable_id = ? ORDER BY from_time`,
        [block.id]
      );
      block.slots = slots;
    }

    return res.json({ success: true, data: blocks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/faculty/my-subjects ─────────────────────────────────────────────
async function getMySubjects(req, res) {
  const { employee_id } = req.user;
  try {
    const [rows] = await pool.query(
      `SELECT s.* FROM faculty_subjects fs
       JOIN subjects s ON fs.subject_id = s.id
       WHERE fs.employee_id = ? ORDER BY s.education_type, s.year, s.subject_name`,
      [employee_id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/faculty/my-courses ──────────────────────────────────────────────
async function getMyCourses(req, res) {
  const { employee_id } = req.user;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM faculty_courses WHERE employee_id = ? ORDER BY education_type, year, section',
      [employee_id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/faculty/sections ────────────────────────────────────────────────
async function getAllSections(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM class_sections ORDER BY education_type, year, section_name'
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = {
  getSetup, saveSetup, getAllBlocks, getAllSubjects,
  getMyBlocksWithSlots, getMySubjects, getMyCourses,
  getAllSections,
};
