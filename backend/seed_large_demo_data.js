const pool = require('./src/config/db');

const passwordHash = '$2b$10$Z2QLe0qKJSaGnRm/sL4U0upOb8.2ze5O7lmcYN6o86JwrYjs0Hug2';
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const departments = [
  ['CSE', 'Computer Science & Engineering'],
  ['ECE', 'Electronics & Communication Engineering'],
  ['MECH', 'Mechanical Engineering'],
  ['CIVIL', 'Civil Engineering'],
  ['IT', 'Information Technology'],
  ['EEE', 'Electrical & Electronics Engineering'],
];
const timeSlots = [
  ['09:00', '10:00'],
  ['10:00', '11:00'],
  ['11:15', '12:15'],
  ['13:15', '14:15'],
  ['14:15', '15:15'],
];

function dateOffset(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function insertIfMissing(table, where, whereValues, columns, values) {
  const [existing] = await pool.query(`SELECT id FROM ${table} WHERE ${where} LIMIT 1`, whereValues);
  if (existing.length) return existing[0].id;
  const placeholders = columns.map(() => '?').join(', ');
  const [result] = await pool.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
  return result.insertId;
}

async function seedLargeDemoData() {
  const staff = [];
  const subjects = [];
  const students = [];

  for (let departmentIndex = 0; departmentIndex < departments.length; departmentIndex += 1) {
    const [departmentCode, departmentName] = departments[departmentIndex];

    for (let staffIndex = 1; staffIndex <= 5; staffIndex += 1) {
      const employeeId = `FAC${departmentCode}${String(staffIndex).padStart(2, '0')}`;
      const firstName = departmentCode === 'IT' && staffIndex === 2
        ? 'Bharath'
        : ['Ananya', 'Bharat', 'Chaitanya', 'Divya', 'Eshan'][staffIndex - 1];
      const fullName = `${firstName} ${departmentCode} Faculty`;
      await pool.query(
        `INSERT INTO users
          (employee_id, full_name, short_name, highest_qualification, department, designation, email, password_hash, role, is_first_login)
         VALUES (?, ?, ?, 'M.Tech', ?, 'Assistant Professor', ?, ?, 'Faculty', FALSE)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash)`,
        [employeeId, fullName, fullName.split(' ')[0], departmentName, `${employeeId.toLowerCase()}@college.edu`, passwordHash]
      );
      staff.push({ employeeId, departmentCode, departmentName, index: staffIndex });
    }

    for (let subjectIndex = 1; subjectIndex <= 8; subjectIndex += 1) {
      const subjectCode = `D${departmentCode}${String(subjectIndex).padStart(2, '0')}`;
      const subjectType = subjectIndex % 4 === 0 ? 'Lab' : 'Theory';
      const subjectName = `${departmentCode} Demo Subject ${subjectIndex}`;
      await pool.query(
        `INSERT INTO subjects
          (subject_code, regulation, subject_name, short_name, subject_type, education_type, year, semester, department, branch_sname)
         VALUES (?, 'R2024', ?, ?, ?, 'B.Tech', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name), subject_type = VALUES(subject_type)`,
        [subjectCode, subjectName, `${departmentCode}-${subjectIndex}`, subjectType, subjectIndex % 2 ? 2 : 3, subjectIndex % 2 ? 3 : 5, departmentName, departmentCode]
      );
      const [[subject]] = await pool.query('SELECT id FROM subjects WHERE subject_code = ?', [subjectCode]);
      subjects.push({ id: subject.id, code: subjectCode, departmentCode, departmentName, subjectType });
    }

    for (let studentIndex = 1; studentIndex <= 20; studentIndex += 1) {
      const rollNumber = `D${departmentCode}${String(studentIndex).padStart(3, '0')}`;
      const studentName = `Demo Student ${departmentCode} ${studentIndex}`;
      await pool.query(
        `INSERT INTO students (roll_number, name, department, year, section, counselor_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), counselor_id = VALUES(counselor_id)`,
        [rollNumber, studentName, departmentName, studentIndex % 2 ? 2 : 3, studentIndex % 2 ? 'A' : 'B', staff[departmentIndex * 5].employeeId]
      );
      students.push({ rollNumber, departmentCode, counselorId: staff[departmentIndex * 5].employeeId });
    }
  }

  for (const member of staff) {
    const memberSubjects = subjects.filter(subject => subject.departmentCode === member.departmentCode).slice(0, 4);
    for (const subject of memberSubjects) {
      await pool.query('INSERT IGNORE INTO faculty_subjects (employee_id, subject_id) VALUES (?, ?)', [member.employeeId, subject.id]);
    }
    await pool.query(
      `INSERT INTO faculty_courses (employee_id, education_type, year, section)
       SELECT ?, 'B-Tech', 3, 'A'
       WHERE NOT EXISTS (SELECT 1 FROM faculty_courses WHERE employee_id = ? AND education_type = 'B-Tech' AND year = 3 AND section = 'A')`,
      [member.employeeId, member.employeeId]
    );
  }

  for (const member of staff) {
    const memberSubjects = subjects.filter(subject => subject.departmentCode === member.departmentCode);
    for (let slotIndex = 0; slotIndex < 5; slotIndex += 1) {
      const subject = memberSubjects[(member.index + slotIndex) % memberSubjects.length];
      const day = days[(member.index + slotIndex) % days.length];
      const [fromTime, toTime] = timeSlots[slotIndex];
      await pool.query(
        `INSERT INTO timetables
          (employee_id, subject_id, short_name, day, from_time, to_time, subject_type, education_type, year, section, room_number)
         SELECT ?, ?, ?, ?, ?, ?, ?, 'B.Tech', 3, 'A', ?
         WHERE NOT EXISTS (SELECT 1 FROM timetables WHERE employee_id = ? AND day = ? AND from_time = ?)`,
        [member.employeeId, subject.id, `${member.departmentCode}-${slotIndex + 1}`, day, fromTime, toTime, subject.subjectType, `${member.departmentCode}-${200 + slotIndex}`, member.employeeId, day, fromTime]
      );
    }
  }

  const conflictSubject = subjects.find(subject => subject.departmentCode === 'CSE' && subject.subjectType === 'Theory');
  const conflictStaff = staff.filter(member => member.departmentCode === 'CSE').slice(0, 3);
  for (const member of conflictStaff) {
    await pool.query(
      `INSERT INTO timetables
        (employee_id, subject_id, short_name, day, from_time, to_time, subject_type, education_type, year, section, room_number)
       SELECT ?, ?, 'CONFLICT', 'Friday', '09:00', '10:00', 'Theory', 'B.Tech', 3, 'A', 'CONFLICT-ROOM'
       WHERE NOT EXISTS (SELECT 1 FROM timetables WHERE employee_id = ? AND day = 'Friday' AND room_number = 'CONFLICT-ROOM')`,
      [member.employeeId, conflictSubject.id, member.employeeId]
    );
  }

  for (const [departmentCode, departmentName] of departments) {
    const blockId = await insertIfMissing(
      'block_timetables',
      'name = ? AND academic_year = ?',
      [`${departmentCode} Demo Block`, '2026-27'],
      ['name', 'department', 'education_type', 'year', 'section', 'academic_year', 'created_by', 'source'],
      [`${departmentCode} Demo Block`, departmentName, 'B.Tech', 3, 'A', '2026-27', 'ADMIN001', 'manual']
    );
    const departmentSubjects = subjects.filter(subject => subject.departmentCode === departmentCode).slice(0, 5);
    const departmentStaff = staff.filter(member => member.departmentCode === departmentCode);
    await pool.query('INSERT IGNORE INTO faculty_block_assignments (employee_id, block_id) VALUES (?, ?)', [departmentStaff[0].employeeId, blockId]);
    for (let slotIndex = 0; slotIndex < departmentSubjects.length; slotIndex += 1) {
      const subject = departmentSubjects[slotIndex];
      const [fromTime, toTime] = timeSlots[slotIndex];
      await pool.query(
        `INSERT INTO block_timetable_slots
          (timetable_id, day, from_time, to_time, subject_id, subject_name, short_name, subject_type, room_number, faculty_id, faculty_name)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT full_name FROM users WHERE employee_id = ?)
         WHERE NOT EXISTS (SELECT 1 FROM block_timetable_slots WHERE timetable_id = ? AND day = ? AND from_time = ?)`,
        [blockId, days[slotIndex], fromTime, toTime, subject.id, `Demo ${subject.code}`, subject.code, subject.subjectType, `${departmentCode}-${200 + slotIndex}`, departmentStaff[slotIndex % departmentStaff.length].employeeId, departmentStaff[slotIndex % departmentStaff.length].employeeId, blockId, days[slotIndex], fromTime]
      );
    }
    await pool.query(
      `INSERT INTO block_timetable_slots (timetable_id, day, from_time, to_time, subject_type, room_number, notes)
       SELECT ?, 'Saturday', '09:00', '10:00', 'Theory', ?, 'Deliberately unassigned demo slot'
       WHERE NOT EXISTS (SELECT 1 FROM block_timetable_slots WHERE timetable_id = ? AND notes = 'Deliberately unassigned demo slot')`,
      [blockId, `${departmentCode}-UNASSIGNED`, blockId]
    );
  }

  for (const member of staff) {
    for (let historyDay = 1; historyDay <= 45; historyDay += 1) {
      const logDate = dateOffset(historyDay);
      const slot = timeSlots[historyDay % timeSlots.length];
      const description = `Historical demo activity ${historyDay} for ${member.employeeId}`;
      await pool.query(
        `INSERT INTO diary_logs (employee_id, log_date, from_time, to_time, description, activity_type, status, reviewed_by, reviewed_at, remarks)
         SELECT ?, CONCAT(?, ' ', '00:00:00'), CONCAT(?, ' ', ?), CONCAT(?, ' ', ?), ?, ?, ?, 'HOD001', NOW(), 'Historical demo record'
         WHERE NOT EXISTS (SELECT 1 FROM diary_logs WHERE employee_id = ? AND log_date = ? AND description = ?)`,
        [member.employeeId, logDate, logDate, slot[0], logDate, slot[1], description, historyDay % 3 === 0 ? 'Meeting' : 'Teaching', historyDay % 4 === 0 ? 'Submitted' : 'Approved', member.employeeId, logDate, description]
      );
    }

    if (member.employeeId === 'FACIT02') {
      const periods = [
        ['09:00:00', '10:00:00', 'Teaching', 'Conducted IT theory lecture for B.Tech IT-A.'],
        ['10:15:00', '11:15:00', 'Lab Work', 'Supervised programming laboratory for B.Tech IT-A.'],
        ['14:00:00', '15:00:00', 'Research', 'Reviewed student projects and research progress.'],
      ];
      for (let historyDay = 1; historyDay <= 3; historyDay += 1) {
        const logDate = dateOffset(historyDay);
        for (const [fromTime, toTime, activityType, description] of periods) {
          await pool.query(
            `INSERT INTO diary_logs (employee_id, log_date, from_time, to_time, description, activity_type, status, reviewed_by, reviewed_at, remarks)
             SELECT ?, ?, CONCAT(?, ' ', ?), CONCAT(?, ' ', ?), ?, ?, 'Approved', 'HOD001', NOW(), 'Multi-period Bharath demo record'
             WHERE NOT EXISTS (SELECT 1 FROM diary_logs WHERE employee_id = ? AND log_date = ? AND description = ?)`,
            [member.employeeId, logDate, logDate, fromTime, logDate, toTime, description, activityType, member.employeeId, logDate, description]
          );
        }
      }
    }
  }

  for (let requestIndex = 0; requestIndex < 30; requestIndex += 1) {
    const member = staff[requestIndex % staff.length];
    const requestDate = dateOffset(requestIndex + 1);
    await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_date, reason, session_type, leave_type, status, approved_by, reviewed_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, IF(? IN ('Approved', 'Rejected'), NOW(), NULL)
       WHERE NOT EXISTS (SELECT 1 FROM leave_requests WHERE employee_id = ? AND reason = ?)`,
      [member.employeeId, requestDate, `Historical leave request ${requestIndex + 1}`, requestIndex % 2 ? 'Full Day' : 'FN', requestIndex % 3 ? 'Casual' : 'Sick', requestIndex % 4 === 0 ? 'Pending' : 'Approved', requestIndex % 4 === 0 ? null : 'HOD001', requestIndex % 4 === 0 ? 'Pending' : 'Approved', member.employeeId, `Historical leave request ${requestIndex + 1}`]
    );
    await pool.query(
      `INSERT INTO extra_hours (employee_id, purpose, description, from_time, to_time, status, approved_by)
       SELECT ?, ?, 'Historical demo extra-hours record', CONCAT(?, ' 16:30:00'), CONCAT(?, ' 18:00:00'), ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM extra_hours WHERE employee_id = ? AND purpose = ?)`,
      [member.employeeId, `Extra hours ${requestIndex + 1}`, requestDate, requestDate, requestIndex % 5 === 0 ? 'Pending' : 'Approved', requestIndex % 5 === 0 ? null : 'HOD001', member.employeeId, `Extra hours ${requestIndex + 1}`]
    );
  }

  for (let index = 0; index < 24; index += 1) {
    const student = students[index % students.length];
    await pool.query(
      `INSERT INTO counseling_records (student_roll_number, counselor_id, counseling_date, discussion_points, action_taken)
       SELECT ?, ?, ?, ?, 'Track progress during next monthly review'
       WHERE NOT EXISTS (SELECT 1 FROM counseling_records WHERE student_roll_number = ? AND discussion_points = ?)`,
      [student.rollNumber, student.counselorId, dateOffset(index + 2), `Historical counseling discussion ${index + 1}`, student.rollNumber, `Historical counseling discussion ${index + 1}`]
    );
  }

  for (let index = 0; index < 20; index += 1) {
    const member = staff[index % staff.length];
    await pool.query(
      `INSERT INTO notifications (sender_employee_id, receiver_employee_id, title, message, notification_type)
       SELECT 'HOD001', ?, ?, 'Historical demo notification for portal testing.', ?
       WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE receiver_employee_id = ? AND title = ?)`,
      [member.employeeId, `Demo notification ${index + 1}`, index % 2 ? 'General' : 'Approval', member.employeeId, `Demo notification ${index + 1}`]
    );
  }

  for (let index = 0; index < 12; index += 1) {
    const holidayDate = dateOffset(-(index + 1) * 10);
    await pool.query(
      `INSERT INTO holidays (holiday_date, holiday_name, description)
       VALUES (?, ?, 'Historical demo holiday')
       ON DUPLICATE KEY UPDATE holiday_name = VALUES(holiday_name)`,
      [holidayDate, `Demo Holiday ${index + 1}`]
    );
  }

  console.log('Large demo dataset inserted successfully.');
  console.log(`Staff: ${staff.length}, Students: ${students.length}, Subjects: ${subjects.length}`);
  console.log('Conflict room: CONFLICT-ROOM on Friday 09:00-10:00');
  console.log('Demo staff password: Staff@1234');
}

seedLargeDemoData()
  .catch(error => {
    console.error('Large demo data seeding failed:', error.sqlMessage || error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());