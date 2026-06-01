const pool = require('../config/db');
const { parseExcelBuffer } = require('../utils/excelParser');

// ─── GET /api/admin/block-timetables ─────────────────────────────────────────
async function listBlockTimetables(req, res) {
  try {
    const { source } = req.query; // 'manual' | 'imported' | undefined (all)
    let sql = `SELECT bt.*, 
        (SELECT COUNT(*) FROM block_timetable_slots bts WHERE bts.timetable_id = bt.id) AS slot_count,
        u.full_name AS created_by_name
       FROM block_timetables bt
       LEFT JOIN users u ON bt.created_by = u.employee_id`;
    const params = [];
    if (source === 'manual' || source === 'imported') {
      sql += ' WHERE bt.source = ?';
      params.push(source);
    }
    sql += ' ORDER BY bt.department, bt.year, bt.section';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/admin/block-timetables ────────────────────────────────────────
async function createBlockTimetable(req, res) {
  const { name, department, education_type, year, section, academic_year } = req.body;
  const { employee_id } = req.user;

  if (!name) {
    return res.status(400).json({ success: false, message: 'name is required.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO block_timetables (name, department, education_type, year, section, academic_year, created_by, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'manual')`,
      [name.trim(), department || 'General', education_type || 'B-Tech', year || 1, section || null, academic_year || null, employee_id]
    );
    return res.status(201).json({ success: true, id: result.insertId, message: 'Block timetable created.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/block-timetables/:id ─────────────────────────────────────
async function updateBlockTimetable(req, res) {
  const { name, department, education_type, year, section, academic_year } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE block_timetables
       SET name=COALESCE(?,name), department=COALESCE(?,department),
           education_type=COALESCE(?,education_type), year=COALESCE(?,year),
           section=?, academic_year=?
       WHERE id=?`,
      [name || null, department || null, education_type || null, year || null,
       section ?? null, academic_year ?? null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Timetable not found.' });
    return res.json({ success: true, message: 'Timetable updated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── DELETE /api/admin/block-timetables/:id ───────────────────────────────────
async function deleteBlockTimetable(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM block_timetables WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Timetable not found.' });
    return res.json({ success: true, message: 'Timetable deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── GET /api/admin/block-timetables/:id/slots ───────────────────────────────
async function getSlots(req, res) {
  try {
    const [timetable] = await pool.query('SELECT * FROM block_timetables WHERE id = ?', [req.params.id]);
    if (!timetable.length) return res.status(404).json({ success: false, message: 'Timetable not found.' });

    const [slots] = await pool.query(
      'SELECT * FROM block_timetable_slots WHERE timetable_id = ? ORDER BY FIELD(day,"Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"), from_time',
      [req.params.id]
    );
    return res.json({ success: true, data: { timetable: timetable[0], slots } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/admin/block-timetables/:id/slots ───────────────────────────────
async function addSlot(req, res) {
  const { day, from_time, to_time, subject_id, subject_name, short_name, subject_type, room_number, faculty_id, faculty_name, notes } = req.body;

  if (!day || !from_time || !to_time) {
    return res.status(400).json({ success: false, message: 'day, from_time, and to_time are required.' });
  }
  if (from_time >= to_time) {
    return res.status(400).json({ success: false, message: 'to_time must be after from_time.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO block_timetable_slots
         (timetable_id, day, from_time, to_time, subject_id, subject_name, short_name, subject_type, room_number, faculty_id, faculty_name, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, day, from_time, to_time,
       subject_id || null, subject_name || null, short_name || null,
       subject_type || 'Theory', room_number || null,
       faculty_id || null, faculty_name || null, notes || null]
    );
    return res.status(201).json({ success: true, id: result.insertId, message: 'Slot added.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/block-timetables/:id/slots/:slotId ───────────────────────
async function updateSlot(req, res) {
  const { day, from_time, to_time, subject_id, subject_name, short_name, subject_type, room_number, faculty_id, faculty_name, notes } = req.body;
  try {
    const [slots] = await pool.query(
      'SELECT day, from_time, subject_type, short_name FROM block_timetable_slots WHERE id = ? AND timetable_id = ?',
      [req.params.slotId, req.params.id]
    );
    if (!slots.length) return res.status(404).json({ success: false, message: 'Slot not found.' });

    const slot = slots[0];
    const checkSubjectType = subject_type !== undefined ? subject_type : slot.subject_type;
    const checkShortName = short_name !== undefined ? short_name : slot.short_name;
    const checkDay = day !== undefined ? day : slot.day;
    const checkFromTime = from_time !== undefined ? from_time : slot.from_time;

    const isBreak = checkSubjectType === 'Break' || 
                    (checkShortName && (
                      checkShortName.toLowerCase().includes('break') ||
                      checkShortName.toLowerCase().includes('lunch') ||
                      checkShortName.toLowerCase().includes('recess') ||
                      checkShortName.toLowerCase().includes('interval') ||
                      checkShortName.toLowerCase().includes('tea')
                    ));

    const [result] = await pool.query(
      `UPDATE block_timetable_slots
       SET day=COALESCE(?,day), from_time=COALESCE(?,from_time), to_time=COALESCE(?,to_time),
           subject_id=?, subject_name=?, short_name=?, subject_type=COALESCE(?,subject_type),
           room_number=?, faculty_id=?, faculty_name=?, notes=?
       WHERE id=? AND timetable_id=?`,
      [day || null, from_time || null, to_time || null,
       subject_id ?? null, subject_name ?? null, short_name ?? null,
       subject_type || null, room_number ?? null,
       faculty_id ?? null, faculty_name ?? null, notes ?? null,
       req.params.slotId, req.params.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Slot not found.' });

    if (isBreak) {
      // Delete any mapped faculty slots for this block, day, and time
      await pool.query(
        `DELETE FROM timetables 
         WHERE block_id = ? 
           AND day = ? 
           AND TIME_TO_SEC(from_time) = TIME_TO_SEC(?)`,
        [req.params.id, checkDay, checkFromTime]
      );
    }

    return res.json({ success: true, message: 'Slot updated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── DELETE /api/admin/block-timetables/:id/slots/:slotId ────────────────────
async function deleteSlot(req, res) {
  try {
    const [slots] = await pool.query(
      'SELECT day, from_time FROM block_timetable_slots WHERE id=? AND timetable_id=?',
      [req.params.slotId, req.params.id]
    );
    if (!slots.length) return res.status(404).json({ success: false, message: 'Slot not found.' });
    
    const slot = slots[0];

    const [result] = await pool.query(
      'DELETE FROM block_timetable_slots WHERE id=? AND timetable_id=?',
      [req.params.slotId, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Slot not found.' });

    // Also delete any faculty mappings for this block slot
    await pool.query(
      `DELETE FROM timetables 
       WHERE block_id = ? 
         AND day = ? 
         AND TIME_TO_SEC(from_time) = TIME_TO_SEC(?)`,
      [req.params.id, slot.day, slot.from_time]
    );

    return res.json({ success: true, message: 'Slot deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── POST /api/admin/block-timetables/bulk-import ─────────────────────────────
async function bulkImportTimetable(req, res) {
  const { employee_id } = req.user;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  let rows;
  try {
    rows = parseExcelBuffer(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Excel parse error: ${err.message}` });
  }

  if (!rows || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'Excel file is empty.' });
  }

  // ── PRE-PASS: Build subject→faculty lookup per class section ─────────────────
  // Key: "program|year|section|subjectCode"  →  facultyShortName
  const subjectFacultyMap = new Map();

  function findRowValueSimple(row, possibleKeys) {
    for (const k of Object.keys(row)) {
      const norm = k.toLowerCase().replace(/[\s_&\.-]/g, '');
      if (possibleKeys.includes(norm)) return row[k];
    }
    return null;
  }

  for (const row of rows) {
    const rawProg    = findRowValueSimple(row, ['program','programme','edu','educationtype','edutype']);
    const rawYear    = findRowValueSimple(row, ['year','yr']);
    const rawSection = findRowValueSimple(row, ['classsection','class','section','class&section']);
    if (!rawProg || !rawYear || !rawSection) continue;

    let prog = String(rawProg).trim().replace(/\./g, '-');
    if (prog.toLowerCase() === 'btech' || prog.toLowerCase() === 'b-tech') prog = 'B-Tech';
    if (prog.toLowerCase() === 'mtech' || prog.toLowerCase() === 'm-tech') prog = 'M-Tech';
    if (prog.toLowerCase() === 'diploma') prog = 'Diploma';
    const yrMatch = String(rawYear).match(/\d+/);
    const yr = yrMatch ? parseInt(yrMatch[0]) : 1;
    const sec = String(rawSection).trim();

    for (const colKey of Object.keys(row)) {
      const normCol = colKey.toLowerCase().replace(/\s/g, '');
      if (!normCol.match(/^period\d+$/)) continue;
      const cellVal = String(row[colKey] ?? '').trim();
      if (!cellVal || cellVal === '-' || cellVal.toLowerCase() === 'free') continue;
      if (cellVal.split('-').length < 2) continue; // incomplete, skip in pre-pass

      const parts = cellVal.split('-');
      const subCode = parts[0].trim().toUpperCase();
      const facShort = parts.slice(1).join('-').trim();
      if (!subCode || !facShort) continue;

      const mapKey = `${prog}|${yr}|${sec}|${subCode}`;
      if (!subjectFacultyMap.has(mapKey)) {
        subjectFacultyMap.set(mapKey, facShort);
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const conn = await pool.getConnection();
  const warnings = [];
  let blocksCreated = 0;
  let slotsImported = 0;

  try {
    await conn.beginTransaction();

    const blockSlotsCache = new Map();

    async function getBlockSlotsForDay(blockId, dayName) {
      const cacheKey = `${blockId}|${dayName}`;
      if (blockSlotsCache.has(cacheKey)) {
        return blockSlotsCache.get(cacheKey);
      }
      const [slotRows] = await conn.query(
        'SELECT from_time, to_time, short_name, subject_name, subject_type FROM block_timetable_slots WHERE timetable_id = ? AND day = ? ORDER BY from_time ASC',
        [blockId, dayName]
      );
      const periods = slotRows.filter(s => {
        const type = (s.subject_type || '').toLowerCase();
        const name = (s.short_name || s.subject_name || '').toLowerCase();
        const isBreak = type === 'break' || name.includes('break') || name.includes('lunch') || name.includes('recess') || name.includes('interval') || name.includes('tea');
        return !isBreak;
      });
      blockSlotsCache.set(cacheKey, periods);
      return periods;
    }

    // Helper functions inside the transaction
    async function getOrCreateSubject(subCode, program, year, department) {
      let cleanBranch = (department || '').trim().toUpperCase();
      let cleanSubCode = subCode.trim();
      let finalSubCode = cleanSubCode;
      if (cleanBranch && cleanBranch !== 'GENERAL') {
        const prefix = `${cleanBranch}_`;
        if (!cleanSubCode.toUpperCase().startsWith(prefix)) {
          finalSubCode = `${cleanBranch}_${cleanSubCode}`;
        }
      }

      const [existing] = await conn.query('SELECT * FROM subjects WHERE subject_code = ?', [finalSubCode]);
      if (existing.length) return existing[0];

      // Auto-create missing subject
      const isLab = finalSubCode.toLowerCase().includes('lab') || finalSubCode.toLowerCase().includes('practical') || finalSubCode.toLowerCase().includes('workshop') || finalSubCode.toLowerCase().includes('l');
      const type = isLab ? 'Lab' : 'Theory';
      const name = finalSubCode.replace(/_/g, ' ');
      
      const currentMonth = new Date().getMonth(); // 0-11
      const isEvenSemester = currentMonth >= 0 && currentMonth <= 5; // Jan to June
      const sem = isEvenSemester ? (year * 2) : (year * 2 - 1);

      const [result] = await conn.query(
        'INSERT INTO subjects (subject_code, subject_name, subject_type, education_type, year, semester, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [finalSubCode, name, type, program, year, sem, department || 'General']
      );
      return { id: result.insertId, subject_code: finalSubCode, subject_name: name, subject_type: type, education_type: program, year, semester: sem, department };
    }

    const clearedPairs = new Set(); // To keep track of "blockId|day" we cleared in this request

    // Period mappings
    const PERIOD_TEMPLATES = {
      'B-Tech': {
        1: { from_time: '08:40:00', to_time: '09:40:00', label: 'Period 1' },
        2: { from_time: '09:40:00', to_time: '10:40:00', label: 'Period 2' },
        3: { from_time: '11:10:00', to_time: '12:10:00', label: 'Period 3' },
        4: { from_time: '12:10:00', to_time: '13:10:00', label: 'Period 4' },
        5: { from_time: '14:00:00', to_time: '15:00:00', label: 'Period 5' },
        6: { from_time: '15:00:00', to_time: '16:00:00', label: 'Period 6' },
      },
      'Diploma': {
        1: { from_time: '08:40:00', to_time: '09:40:00', label: 'Period 1' },
        2: { from_time: '10:10:00', to_time: '11:10:00', label: 'Period 2' },
        3: { from_time: '11:10:00', to_time: '12:10:00', label: 'Period 3' },
        4: { from_time: '13:00:00', to_time: '14:00:00', label: 'Period 4' },
        5: { from_time: '14:00:00', to_time: '15:00:00', label: 'Period 5' },
        6: { from_time: '15:00:00', to_time: '16:00:00', label: 'Period 6' },
      }
    };

    // Helper to insert breaks
    async function insertBreaksForBlock(destBlockId, dayName, programName, sourceBlockId) {
      let breaks = [];
      if (sourceBlockId) {
        const [timingSlots] = await conn.query(
          'SELECT from_time, to_time, short_name, subject_type FROM block_timetable_slots WHERE timetable_id = ? AND day = ?',
          [sourceBlockId, dayName]
        );
        breaks = timingSlots.filter(s => {
          const type = (s.subject_type || '').toLowerCase();
          const name = (s.short_name || s.subject_name || '').toLowerCase();
          return type === 'break' || name.includes('break') || name.includes('lunch') || name.includes('recess') || name.includes('interval') || name.includes('tea');
        });
      }

      if (breaks.length > 0) {
        for (const b of breaks) {
          await conn.query(
            `INSERT INTO block_timetable_slots (timetable_id, day, from_time, to_time, short_name, subject_type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [destBlockId, dayName, b.from_time, b.to_time, b.short_name, b.subject_type]
          );
        }
      } else {
        const isDiploma = programName.toLowerCase().includes('diploma');
        const defaultBreaks = isDiploma ? [
          { from_time: '09:40:00', to_time: '10:10:00', short_name: 'Break', subject_type: 'Break' },
          { from_time: '12:10:00', to_time: '13:00:00', short_name: 'Lunch', subject_type: 'Break' },
        ] : [
          { from_time: '10:40:00', to_time: '11:10:00', short_name: 'Break', subject_type: 'Break' },
          { from_time: '13:10:00', to_time: '14:00:00', short_name: 'Lunch Break', subject_type: 'Break' },
        ];

        for (const b of defaultBreaks) {
          await conn.query(
            `INSERT INTO block_timetable_slots (timetable_id, day, from_time, to_time, short_name, subject_type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [destBlockId, dayName, b.from_time, b.to_time, b.short_name, b.subject_type]
          );
        }
      }
    }

    const DAYS_MAP = {
      mon: 'Monday', monday: 'Monday',
      tue: 'Tuesday', tuesday: 'Tuesday',
      wed: 'Wednesday', wednesday: 'Wednesday',
      thu: 'Thursday', thursday: 'Thursday',
      fri: 'Friday', friday: 'Friday',
      sat: 'Saturday', saturday: 'Saturday'
    };

    function findRowValue(row, possibleKeys) {
      for (const k of Object.keys(row)) {
        const norm = k.toLowerCase().replace(/[\s_&\.-]/g, '');
        if (possibleKeys.includes(norm)) {
          return row[k];
        }
      }
      return null;
    }

    // Process each Excel row
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      const lineNum = rIdx + 2; // Excel row index

      // 1. Extract metadata values
      const rawProg = findRowValue(row, ['program', 'programme', 'edu', 'educationtype', 'edutype']);
      const rawDay = findRowValue(row, ['day']);
      const rawYear = findRowValue(row, ['year', 'yr']);
      const rawSection = findRowValue(row, ['classsection', 'class', 'section', 'class&section']);

      if (!rawProg || !rawDay || !rawYear || !rawSection) {
        warnings.push(`Row ${lineNum}: Skipped due to missing program/day/year/section values.`);
        continue;
      }

      // Normalize values
      let programName = String(rawProg).trim().replace(/\./g, '-');
      if (programName.toLowerCase() === 'btech' || programName.toLowerCase() === 'b-tech') programName = 'B-Tech';
      if (programName.toLowerCase() === 'mtech' || programName.toLowerCase() === 'm-tech') programName = 'M-Tech';
      if (programName.toLowerCase() === 'diploma') programName = 'Diploma';

      const dayName = DAYS_MAP[String(rawDay).trim().toLowerCase()];
      if (!dayName) {
        warnings.push(`Row ${lineNum}: Skipped due to invalid day value "${rawDay}".`);
        continue;
      }

      const yearMatch = String(rawYear).match(/\d+/);
      const yearNumber = yearMatch ? parseInt(yearMatch[0]) : 1;
      const sectionName = String(rawSection).trim();

      // Retrieve section information to get its block_id and department (associated branch)
      const [secRows] = await conn.query(
        'SELECT id, department, block_id FROM class_sections WHERE education_type = ? AND year = ? AND section_name = ?',
        [programName, yearNumber, sectionName]
      );
      
      let sectionBranch = null;
      let sectionBlockId = null;
      if (secRows.length) {
        sectionBranch = secRows[0].department;
        sectionBlockId = secRows[0].block_id;
      }

      let branchName = sectionBranch || 'General';
      if (branchName === 'General') {
        const cleanSection = sectionName.toUpperCase();
        if (cleanSection.includes('CSE')) branchName = 'CSE';
        else if (cleanSection.includes('ECE')) branchName = 'ECE';
        else if (cleanSection.includes('EEE')) branchName = 'EEE';
        else if (cleanSection.includes('ME')) branchName = 'ME';
        else if (cleanSection.includes('CE') || cleanSection.includes('CIVIL')) branchName = 'CE';
        else if (cleanSection.includes('IT')) branchName = 'IT';
      }

      // Look up or create block timetable
      let blockId;
      const [existingBlocks] = await conn.query(
        'SELECT id FROM block_timetables WHERE education_type = ? AND year = ? AND section = ?',
        [programName, yearNumber, sectionName]
      );

      if (existingBlocks.length) {
        blockId = existingBlocks[0].id;
      } else {
        const [progRows] = await conn.query('SELECT id FROM programs WHERE name = ?', [programName]);
        let yearName = `Year ${yearNumber}`;
        if (progRows.length) {
          const [yrRows] = await conn.query(
            'SELECT year_name FROM program_years WHERE program_id = ? AND year_number = ?',
            [progRows[0].id, yearNumber]
          );
          if (yrRows.length) {
            yearName = yrRows[0].year_name;
          }
        }

        const blockName = `${programName} (${yearName}) - ${sectionName}`;
        const [result] = await conn.query(
          `INSERT INTO block_timetables (name, department, education_type, year, section, created_by, source)
           VALUES (?, ?, ?, ?, ?, ?, 'imported')`,
          [blockName, branchName, programName, yearNumber, sectionName, employee_id]
        );
        blockId = result.insertId;
        blocksCreated++;
        // Mark existing block as imported if it was created without a source tag
        await conn.query(
          `UPDATE block_timetables SET source = 'imported' WHERE id = ? AND source = 'manual'`,
          [blockId]
        );
      }

      // 2. Clear block and faculty timetables for this block on this day on the first encounter
      const pairKey = `${blockId}|${dayName}`;
      if (!clearedPairs.has(pairKey)) {
        await conn.query('DELETE FROM block_timetable_slots WHERE timetable_id = ? AND day = ?', [blockId, dayName]);
        await conn.query('DELETE FROM timetables WHERE block_id = ? AND day = ?', [blockId, dayName]);
        // Copy breaks from the timing block or insert default breaks
        await insertBreaksForBlock(blockId, dayName, programName, sectionBlockId);
        clearedPairs.add(pairKey);
      }

      // 3. Process each period slot columns
      for (const colKey of Object.keys(row)) {
        const normCol = colKey.toLowerCase().replace(/\s/g, '');
        const pMatch = normCol.match(/^period(\d+)$/);
        if (!pMatch) continue;

        const periodIndex = parseInt(pMatch[1]);
        const cellVal = String(row[colKey]).trim();

        if (!cellVal || cellVal === '-' || cellVal.toLowerCase() === 'free') continue;

        const lowerCell = cellVal.toLowerCase();
        if (lowerCell.includes('break') || lowerCell.includes('lunch') || lowerCell.includes('recess') || lowerCell.includes('tea') || lowerCell.includes('interval')) {
          continue;
        }

        let subjectCode;
        let facultyShort;
        let autoResolved = false;

        const parts = cellVal.split('-');
        if (parts.length >= 2) {
          // Normal format: "SubjectCode - FacultyShortName"
          subjectCode = parts[0].trim();
          facultyShort = parts.slice(1).join('-').trim();
        } else {
          // Incomplete format (e.g. "SE", "CC", "MPMCLab") — try to auto-resolve faculty
          subjectCode = cellVal.trim();
          const upperSubCode = subjectCode.toUpperCase();

          // Strategy 1: Look up in the pre-scanned Excel map for this same class section
          const mapKey        = `${programName}|${yearNumber}|${sectionName}|${upperSubCode}`;
          // Also try with branch prefix stripped / added
          const mapKeyBranch  = `${programName}|${yearNumber}|${sectionName}|${branchName}_${upperSubCode}`;
          const mapKeyStrip   = subjectCode.includes('_')
            ? `${programName}|${yearNumber}|${sectionName}|${subjectCode.split('_').slice(1).join('_').toUpperCase()}`
            : null;

          facultyShort = subjectFacultyMap.get(mapKey)
                      || subjectFacultyMap.get(mapKeyBranch)
                      || (mapKeyStrip ? subjectFacultyMap.get(mapKeyStrip) : null)
                      || null;

          // Strategy 2: Search the database — find any faculty already teaching this subject
          //             in the same class section in block_timetable_slots
          if (!facultyShort) {
            const [dbFacRows] = await conn.query(
              `SELECT bts.faculty_id, bts.faculty_name, u.short_name
               FROM block_timetable_slots bts
               JOIN block_timetables bt ON bts.timetable_id = bt.id
               LEFT JOIN users u ON bts.faculty_id = u.employee_id
               WHERE bt.education_type = ? AND bt.year = ? AND bt.section = ?
                 AND (bts.short_name = ? OR bts.short_name = ? OR bts.short_name LIKE ?)
                 AND bts.faculty_id IS NOT NULL
               LIMIT 1`,
              [programName, yearNumber, sectionName,
               upperSubCode, `${branchName}_${upperSubCode}`, `%${upperSubCode}%`]
            );
            if (dbFacRows.length && dbFacRows[0].short_name) {
              facultyShort = dbFacRows[0].short_name;
            }
          }

          if (facultyShort) {
            autoResolved = true;
          } else {
            // Could not resolve — report an actionable error
            warnings.push(`Row ${lineNum}, column "${colKey}": ❌ Could not resolve faculty for subject "${subjectCode}" in ${sectionName}. No matching faculty found in this file or database. Please use format "SubjectCode - FacultyShortName".`);
            // Still import the slot without faculty so the block structure is preserved
            subjectCode = cellVal.trim();
          }
        }

        const subject = await getOrCreateSubject(subjectCode, programName, yearNumber, branchName);

        let facultyId = null;
        let facultyName = null;

        if (facultyShort) {
          const [facRows] = await conn.query('SELECT employee_id, full_name FROM users WHERE short_name = ?', [facultyShort]);
          if (facRows.length) {
            facultyId = facRows[0].employee_id;
            facultyName = facRows[0].full_name;
            if (autoResolved) {
              warnings.push(`Row ${lineNum}, column "${colKey}": ℹ️ Auto-resolved faculty for "${subjectCode}" → ${facultyName} (${facultyShort}).`);
            }
          } else {
            warnings.push(`Row ${lineNum}, column "${colKey}": Faculty with short name "${facultyShort}" not found. Slot created without faculty assignment.`);
          }
        }

        // Resolve time slot from mapped block template
        let fromTime = null;
        let toTime = null;

        if (sectionBlockId) {
          const timingPeriods = await getBlockSlotsForDay(sectionBlockId, dayName);
          const periodSlot = timingPeriods[periodIndex - 1];
          if (periodSlot) {
            fromTime = periodSlot.from_time;
            toTime = periodSlot.to_time;
          }
        }

        if (!fromTime || !toTime) {
          const progKey = PERIOD_TEMPLATES[programName] ? programName : 'B-Tech';
          const template = PERIOD_TEMPLATES[progKey][periodIndex];
          if (template) {
            fromTime = template.from_time;
            toTime = template.to_time;
          }
        }

        if (!fromTime || !toTime) {
          warnings.push(`Row ${lineNum}, column "${colKey}": Ignored because period ${periodIndex} timings could not be resolved.`);
          continue;
        }

        // Insert into block_timetable_slots
        await conn.query(
          `INSERT INTO block_timetable_slots
             (timetable_id, day, from_time, to_time, subject_id, subject_name, short_name, subject_type, faculty_id, faculty_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [blockId, dayName, fromTime, toTime, subject.id, subject.subject_name, subject.subject_code, subject.subject_type, facultyId, facultyName]
        );

        if (facultyId) {
          await conn.query(
            `INSERT INTO timetables (employee_id, block_id, subject_id, short_name, day, from_time, to_time, subject_type, education_type, year, section)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [facultyId, blockId, subject.id, subject.subject_code, dayName, fromTime, toTime, subject.subject_type, programName, yearNumber, sectionName]
          );

          const [existingAssign] = await conn.query(
            'SELECT id FROM faculty_block_assignments WHERE employee_id = ? AND block_id = ?',
            [facultyId, blockId]
          );
          if (!existingAssign.length) {
            await conn.query(
              'INSERT INTO faculty_block_assignments (employee_id, block_id) VALUES (?, ?)',
              [facultyId, blockId]
            );
          }

          const [existingCourse] = await conn.query(
            'SELECT id FROM faculty_courses WHERE employee_id = ? AND education_type = ? AND year = ? AND section = ?',
            [facultyId, programName, yearNumber, sectionName]
          );
          if (!existingCourse.length) {
            const [secRows] = await conn.query(
              'SELECT id FROM class_sections WHERE education_type = ? AND year = ? AND section_name = ?',
              [programName, yearNumber, sectionName]
            );
            const sectionId = secRows.length ? secRows[0].id : null;
            await conn.query(
              'INSERT INTO faculty_courses (employee_id, education_type, year, section, section_id) VALUES (?, ?, ?, ?, ?)',
              [facultyId, programName, yearNumber, sectionName, sectionId]
            );
          }

          const [existingSubj] = await conn.query(
            'SELECT id FROM faculty_subjects WHERE employee_id = ? AND subject_id = ?',
            [facultyId, subject.id]
          );
          if (!existingSubj.length) {
            await conn.query(
              'INSERT INTO faculty_subjects (employee_id, subject_id) VALUES (?, ?)',
              [facultyId, subject.id]
            );
          }
        }

        slotsImported++;
      }
    }

    await conn.commit();
    return res.json({
      success: true,
      message: 'Weekly timetable imported successfully.',
      data: {
        blocksCreated,
        slotsImported,
        warnings
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error during timetable import.' });
  } finally {
    conn.release();
  }
}

module.exports = {
  listBlockTimetables, createBlockTimetable, updateBlockTimetable, deleteBlockTimetable,
  getSlots, addSlot, updateSlot, deleteSlot, bulkImportTimetable
};
