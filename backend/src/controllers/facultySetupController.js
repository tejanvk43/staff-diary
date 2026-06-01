const pool = require('../config/db');
const { hasTimeCollisionByTime } = require('../utils/timeConflict');

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
    const [otherWorks] = await pool.query(
      `SELECT * FROM faculty_other_works WHERE employee_id = ? 
       ORDER BY FIELD(day, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), from_time`,
      [employee_id]
    );
    const isComplete = courses.length > 0 && blocks.length > 0 && subjects.length > 0;
    return res.json({ success: true, data: { courses, blocks, subjects, otherWorks, isComplete } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/faculty/setup ──────────────────────────────────────────────────
async function saveSetup(req, res) {
  const { employee_id } = req.user;
  const { courses = [], block_ids = [], subject_ids = [], other_works = [] } = req.body;

  if (!courses.length || !block_ids.length || !subject_ids.length) {
    return res.status(400).json({
      success: false,
      message: 'courses, block_ids, and subject_ids are all required.'
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ─── VALIDATE TIME CONFLICTS ───
    // Fetch all current weekly timetable slots for this user
    const [regularSlots] = await conn.query(
      'SELECT day, from_time, to_time FROM timetables WHERE employee_id = ?',
      [employee_id]
    );

    // Validate that other works do not overlap with regular slots
    for (const ow of other_works) {
      if (!ow.day || !ow.from_time || !ow.to_time || !ow.duty_name) {
        throw new Error('All other work entries must have Day, Time, and Duty Name.');
      }
      if (ow.from_time >= ow.to_time) {
        throw new Error(`Invalid times: "${ow.duty_name}" start time must be before end time.`);
      }

      // Check conflict with regular slots on the same day
      const sameDayReg = regularSlots.filter(r => r.day === ow.day);
      if (hasTimeCollisionByTime(sameDayReg, ow.from_time, ow.to_time)) {
        const overlapping = sameDayReg.find(r => {
          const s1 = r.from_time.slice(0, 5);
          const e1 = r.to_time.slice(0, 5);
          const s2 = ow.from_time.slice(0, 5);
          const e2 = ow.to_time.slice(0, 5);
          return s2 < e1 && s1 < e2;
        });
        throw new Error(`Conflict: "${ow.duty_name}" on ${ow.day} (${ow.from_time} - ${ow.to_time}) overlaps with your regular class timetable slot (${overlapping.from_time.slice(0,5)} - ${overlapping.to_time.slice(0,5)}).`);
      }
    }

    // Validate that other works do not overlap with each other
    for (let i = 0; i < other_works.length; i++) {
      const ow1 = other_works[i];
      for (let j = i + 1; j < other_works.length; j++) {
        const ow2 = other_works[j];
        if (ow1.day === ow2.day) {
          const s1 = ow1.from_time.slice(0, 5);
          const e1 = ow1.to_time.slice(0, 5);
          const s2 = ow2.from_time.slice(0, 5);
          const e2 = ow2.to_time.slice(0, 5);
          if (s1 < e2 && s2 < e1) {
            throw new Error(`Conflict: "${ow1.duty_name}" overlaps with "${ow2.duty_name}" on ${ow1.day}.`);
          }
        }
      }
    }

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

    // Replace other works
    await conn.query('DELETE FROM faculty_other_works WHERE employee_id = ?', [employee_id]);
    if (other_works.length > 0) {
      const otherVals = other_works.map(ow => [employee_id, ow.day, ow.from_time, ow.to_time, ow.duty_name.trim()]);
      await conn.query(
        'INSERT INTO faculty_other_works (employee_id, day, from_time, to_time, duty_name) VALUES ?',
        [otherVals]
      );
    }

    await conn.commit();
    return res.json({ success: true, message: 'Setup saved.' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    const isCustom = err.message && (err.message.startsWith('Conflict:') || err.message.startsWith('Invalid') || err.message.startsWith('All other'));
    return res.status(isCustom ? 400 : 500).json({ 
      success: false, 
      message: isCustom ? err.message : 'Server error.' 
    });
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
