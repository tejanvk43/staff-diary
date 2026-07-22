const pool = require('./src/config/db');

// Map raw input strings to official department names
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

async function run() {
  try {
    console.log('🔄  Starting department mapping & seed synchronization...');

    // 1. Ensure new departments exist in the departments table
    const targetDepts = [
      { name: 'Computer Science & Engineering', code: 'CSE' },
      { name: 'Electronics & Communication Engineering', code: 'ECE' },
      { name: 'Mechanical Engineering', code: 'MECH' },
      { name: 'Civil Engineering', code: 'CIVIL' },
      { name: 'Information Technology', code: 'IT' },
      { name: 'Electrical & Electronics Engineering', code: 'EEE' },
      { name: 'Artificial Intelligence & Data Science', code: 'AI&DS' },
      { name: 'Science & Humanities', code: 'S&H' },
      { name: 'Training & Placement', code: 'T&P' },
      { name: 'Physical Education', code: 'PHY.ED' },
      { name: 'Library', code: 'LIB' }
    ];

    for (const d of targetDepts) {
      await pool.query(
        'INSERT IGNORE INTO departments (department_name, department_code) VALUES (?, ?)',
        [d.name, d.code]
      );
    }
    console.log('✅  Target departments table synchronized.');

    // 2. Fetch all users
    const [users] = await pool.query('SELECT employee_id, full_name, department FROM users');
    let updatedCount = 0;

    console.log(`🔍  Checking ${users.length} users for department mapping...`);

    for (const u of users) {
      const rawDept = u.department || '';
      let mapped = rawDept;

      // Find the first mapping rule that matches
      for (const rule of MAPPING_RULES) {
        if (rule.test.test(rawDept)) {
          mapped = rule.target;
          break;
        }
      }

      // If mapped value is different from raw database value, update it
      if (mapped !== rawDept) {
        console.log(`   👉  Mapping [${u.employee_id}] ${u.full_name}: "${rawDept}" ➔ "${mapped}"`);
        await pool.query(
          'UPDATE users SET department = ? WHERE employee_id = ?',
          [mapped, u.employee_id]
        );
        updatedCount++;
      }
    }

    console.log(`\n🎉  Department mapping complete!`);
    console.log(`📊  Total users processed: ${users.length}`);
    console.log(`📊  Total departments updated: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error('❌  Error during department mapping:', err);
    process.exit(1);
  }
}

run();
