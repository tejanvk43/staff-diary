const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const today = new Date().toISOString().slice(0, 10);
const passwordHash = '$2b$10$Z2QLe0qKJSaGnRm/sL4U0upOb8.2ze5O7lmcYN6o86JwrYjs0Hug2';

async function ensure(table, where, values, whereValues) {
  const [existing] = await pool.query(`SELECT id FROM ${table} WHERE ${where} LIMIT 1`, whereValues);
  if (existing.length > 0) return existing[0].id;

  const columns = Object.keys(values);
  const placeholders = columns.map(() => '?').join(', ');
  const [result] = await pool.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    columns.map(column => values[column])
  );
  return result.insertId;
}

async function seedDemoData() {
  const departments = [
    ['Computer Science & Engineering', 'CSE', 'CSE'],
    ['Electronics & Communication Engineering', 'ECE', 'ECE'],
  ];

  for (const [name, code] of departments) {
    await pool.query(
      `INSERT INTO departments (department_name, department_code)
       VALUES (?, ?) ON DUPLICATE KEY UPDATE department_name = VALUES(department_name)`,
      [name, code]
    );
  }

  const staff = [
    ['HOD001', 'Dr. Priya Nair', 'Priya Nair', 'Ph.D', 'Computer Science & Engineering', 'Head of Department', 'hod.cse@college.edu', 'HOD'],
    ['FAC001', 'Arjun Rao', 'Arjun Rao', 'M.Tech', 'Computer Science & Engineering', 'Assistant Professor', 'arjun.rao@college.edu', 'Faculty'],
    ['FAC002', 'Meera Shah', 'Meera Shah', 'M.Tech', 'Computer Science & Engineering', 'Assistant Professor', 'meera.shah@college.edu', 'Faculty'],
    ['FAC003', 'Vikram Das', 'Vikram Das', 'M.Tech', 'Electronics & Communication Engineering', 'Assistant Professor', 'vikram.das@college.edu', 'Faculty'],
  ];

  for (const [employeeId, fullName, shortName, qualification, department, designation, email, role] of staff) {
    await pool.query(
      `INSERT INTO users
        (employee_id, full_name, short_name, highest_qualification, department, designation, email, password_hash, role, is_first_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role), password_hash = VALUES(password_hash)`,
      [employeeId, fullName, shortName, qualification, department, designation, email, passwordHash, role]
    );
  }

  await pool.query("UPDATE departments SET hod_employee_id = 'HOD001' WHERE department_code = 'CSE'");

  const subjects = [
    ['CS301', 'Database Management Systems', 'DBMS', 'Theory', 'B.Tech', 3, 5, 'Computer Science & Engineering', 'CSE'],
    ['CS302', 'Operating Systems', 'OS', 'Theory', 'B.Tech', 3, 5, 'Computer Science & Engineering', 'CSE'],
    ['CS303', 'Database Systems Lab', 'DBMS Lab', 'Lab', 'B.Tech', 3, 5, 'Computer Science & Engineering', 'CSE'],
    ['EC201', 'Digital Electronics', 'DE', 'Theory', 'B.Tech', 2, 3, 'Electronics & Communication Engineering', 'ECE'],
  ];

  const subjectIds = {};
  for (const [code, name, shortName, type, educationType, year, semester, department, branch] of subjects) {
    await pool.query(
      `INSERT INTO subjects
        (subject_code, subject_name, short_name, subject_type, education_type, year, semester, department, branch_sname)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name), short_name = VALUES(short_name)`,
      [code, name, shortName, type, educationType, year, semester, department, branch]
    );
    const [[subject]] = await pool.query('SELECT id FROM subjects WHERE subject_code = ?', [code]);
    subjectIds[code] = subject.id;
  }

  const sections = [
    ['CSE-A', 'B.Tech', 3, 'Computer Science & Engineering'],
    ['ECE-A', 'B.Tech', 2, 'Electronics & Communication Engineering'],
  ];
  const sectionIds = {};
  for (const [sectionName, educationType, year, department] of sections) {
    sectionIds[sectionName] = await ensure('class_sections',
      'section_name = ? AND department = ? AND year = ?',
      { section_name: sectionName, education_type: educationType, year, department },
      [sectionName, department, year]);
  }

  const students = [
    ['CSE23A001', 'Asha Kumar', 'Computer Science & Engineering', 3, 'A', 'HOD001'],
    ['CSE23A002', 'Rahul Verma', 'Computer Science & Engineering', 3, 'A', 'HOD001'],
    ['CSE23A003', 'Nisha Patel', 'Computer Science & Engineering', 3, 'A', 'HOD001'],
    ['ECE24A001', 'Kiran Reddy', 'Electronics & Communication Engineering', 2, 'A', 'FAC003'],
    ['ECE24A002', 'Sana Ali', 'Electronics & Communication Engineering', 2, 'A', 'FAC003'],
  ];
  for (const [rollNumber, name, department, year, section, counselorId] of students) {
    await pool.query(
      `INSERT INTO students (roll_number, name, department, year, section, counselor_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), counselor_id = VALUES(counselor_id)`,
      [rollNumber, name, department, year, section, counselorId]
    );
  }

  const facultyCourses = [
    ['FAC001', 'B-Tech', 3, 'A', sectionIds['CSE-A']],
    ['FAC002', 'B-Tech', 3, 'A', sectionIds['CSE-A']],
    ['FAC003', 'B-Tech', 2, 'A', sectionIds['ECE-A']],
  ];
  for (const [employeeId, educationType, year, section, sectionId] of facultyCourses) {
    await pool.query(
      `INSERT INTO faculty_courses (employee_id, education_type, year, section, section_id)
       SELECT ?, ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM faculty_courses WHERE employee_id = ? AND education_type = ? AND year = ? AND section = ?)`,
      [employeeId, educationType, year, section, sectionId, employeeId, educationType, year, section]
    );
  }

  const facultySubjects = [
    ['FAC001', subjectIds.CS301],
    ['FAC002', subjectIds.CS302],
    ['FAC002', subjectIds.CS303],
    ['FAC003', subjectIds.EC201],
  ];
  for (const [employeeId, subjectId] of facultySubjects) {
    await pool.query('INSERT IGNORE INTO faculty_subjects (employee_id, subject_id) VALUES (?, ?)', [employeeId, subjectId]);
  }

  const timetable = [
    ['FAC001', subjectIds.CS301, 'Monday', '09:00', '10:00', 'Theory', 'B.Tech', 3, 'A', 'CSE-201'],
    ['FAC002', subjectIds.CS302, 'Tuesday', '10:00', '11:00', 'Theory', 'B.Tech', 3, 'A', 'CSE-201'],
    ['FAC002', subjectIds.CS303, 'Wednesday', '14:00', '16:00', 'Lab', 'B.Tech', 3, 'A', 'CSE-LAB1'],
    ['FAC003', subjectIds.EC201, 'Thursday', '09:00', '10:00', 'Theory', 'B.Tech', 2, 'A', 'ECE-101'],
  ];
  for (const [employeeId, subjectId, day, fromTime, toTime, subjectType, educationType, year, section, room] of timetable) {
    await pool.query(
      `INSERT INTO timetables
        (employee_id, subject_id, short_name, day, from_time, to_time, subject_type, education_type, year, section, room_number)
       SELECT ?, ?, (SELECT short_name FROM subjects WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM timetables WHERE employee_id = ? AND day = ? AND from_time = ?)`,
      [employeeId, subjectId, subjectId, day, fromTime, toTime, subjectType, educationType, year, section, room, employeeId, day, fromTime]
    );
  }

  const blockId = await ensure('block_timetables',
    'name = ? AND academic_year = ?',
    { name: 'CSE-A Demo Timetable', department: 'Computer Science & Engineering', education_type: 'B.Tech', year: 3, section: 'A', academic_year: '2026-27', created_by: 'HOD001' },
    ['CSE-A Demo Timetable', '2026-27']);
  const blockSlots = [
    ['Monday', '09:00', '10:00', subjectIds.CS301, 'Database Management Systems', 'DBMS', 'Theory', 'CSE-201', 'FAC001'],
    ['Tuesday', '10:00', '11:00', subjectIds.CS302, 'Operating Systems', 'OS', 'Theory', 'CSE-201', 'FAC002'],
    ['Wednesday', '14:00', '16:00', subjectIds.CS303, 'Database Systems Lab', 'DBMS Lab', 'Lab', 'CSE-LAB1', 'FAC002'],
  ];
  for (const [day, fromTime, toTime, subjectId, subjectName, shortName, subjectType, room, facultyId] of blockSlots) {
    await pool.query(
      `INSERT INTO block_timetable_slots
        (timetable_id, day, from_time, to_time, subject_id, subject_name, short_name, subject_type, room_number, faculty_id, faculty_name)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT full_name FROM users WHERE employee_id = ?)
       WHERE NOT EXISTS (SELECT 1 FROM block_timetable_slots WHERE timetable_id = ? AND day = ? AND from_time = ?)`,
      [blockId, day, fromTime, toTime, subjectId, subjectName, shortName, subjectType, room, facultyId, facultyId, blockId, day, fromTime]
    );
  }

  await pool.query(
    `INSERT INTO faculty_other_works (employee_id, day, from_time, to_time, duty_name)
     SELECT 'FAC001', 'Friday', '11:00', '12:00', 'Department Lab Coordination'
     WHERE NOT EXISTS (SELECT 1 FROM faculty_other_works WHERE employee_id = 'FAC001' AND duty_name = 'Department Lab Coordination')`
  );

  await pool.query(
    `INSERT INTO diary_logs (employee_id, log_date, from_time, to_time, description, activity_type, status, reviewed_by, reviewed_at, remarks)
     SELECT 'FAC001', ?, CONCAT(?, ' 09:00:00'), CONCAT(?, ' 10:00:00'), 'Conducted DBMS lecture for CSE-A.', 'Teaching', 'Approved', 'HOD001', NOW(), 'Demo approved entry'
     WHERE NOT EXISTS (SELECT 1 FROM diary_logs WHERE employee_id = 'FAC001' AND log_date = ? AND description = 'Conducted DBMS lecture for CSE-A.')`,
    [today, today, today, today]
  );

  await pool.query(
    `INSERT INTO leave_requests (employee_id, leave_date, reason, session_type, leave_type, status)
     SELECT 'FAC002', DATE_ADD(?, INTERVAL 7 DAY), 'Personal appointment', 'FN', 'Casual', 'Pending'
     WHERE NOT EXISTS (SELECT 1 FROM leave_requests WHERE employee_id = 'FAC002' AND reason = 'Personal appointment')`,
    [today]
  );
  await pool.query(
    `INSERT INTO on_duty_requests (employee_id, od_date, place, session_type, purpose, status)
     SELECT 'FAC003', DATE_ADD(?, INTERVAL 10 DAY), 'Vijayawada', 'Full Day', 'Attend technical workshop', 'Pending'
     WHERE NOT EXISTS (SELECT 1 FROM on_duty_requests WHERE employee_id = 'FAC003' AND purpose = 'Attend technical workshop')`,
    [today]
  );
  await pool.query(
    `INSERT INTO extra_hours (employee_id, purpose, description, from_time, to_time, status)
     SELECT 'FAC001', 'Project mentoring', 'Guided final-year project teams.', CONCAT(?, ' 16:30:00'), CONCAT(?, ' 18:00:00'), 'Pending'
     WHERE NOT EXISTS (SELECT 1 FROM extra_hours WHERE employee_id = 'FAC001' AND purpose = 'Project mentoring')`,
    [today, today]
  );

  await pool.query(
    `INSERT INTO counseling_records (student_roll_number, counselor_id, counseling_date, discussion_points, action_taken)
     SELECT 'CSE23A001', 'HOD001', ?, 'Discussed attendance and project progress.', 'Schedule a follow-up next month.'
     WHERE NOT EXISTS (SELECT 1 FROM counseling_records WHERE student_roll_number = 'CSE23A001' AND discussion_points = 'Discussed attendance and project progress.')`,
    [today]
  );

  await pool.query(
    `INSERT INTO notifications (sender_employee_id, receiver_employee_id, title, message, notification_type)
     SELECT 'HOD001', 'FAC001', 'Demo timetable published', 'Your CSE-A timetable is ready for review.', 'Timetable'
     WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE receiver_employee_id = 'FAC001' AND title = 'Demo timetable published')`
  );

  const [conversationResult] = await pool.query(
    `INSERT INTO message_conversations (subject, audience_type, created_by)
     SELECT 'Welcome to the demo staff portal', 'ALL_STAFF', 'HOD001'
     WHERE NOT EXISTS (SELECT 1 FROM message_conversations WHERE subject = 'Welcome to the demo staff portal')`
  );
  const conversationId = conversationResult.insertId || (await pool.query("SELECT id FROM message_conversations WHERE subject = 'Welcome to the demo staff portal' LIMIT 1"))[0][0].id;
  await pool.query('INSERT IGNORE INTO message_participants (conversation_id, employee_id, participant_role) VALUES (?, ?, ?), (?, ?, ?)', [conversationId, 'HOD001', 'sender', conversationId, 'FAC001', 'recipient']);
  const messageBody = 'This is a demo announcement for the staff portal.';
  const messageHash = crypto.createHash('sha256').update(`${conversationId}:HOD001:${messageBody}`).digest('hex');
  await pool.query(
    `INSERT INTO message_records (conversation_id, sender_employee_id, body, immutable_hash)
     SELECT ?, 'HOD001', ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM message_records WHERE conversation_id = ? AND body = ?)`,
    [conversationId, messageBody, messageHash, conversationId, messageBody]
  );

  console.log('Demo data inserted successfully.');
  console.log('Demo staff password: Staff@1234');
  console.log('Demo staff IDs: HOD001, FAC001, FAC002, FAC003');
}

seedDemoData()
  .catch(error => {
    console.error('Demo data seeding failed:', error.sqlMessage || error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());