const pool = require('./src/config/db');

async function main() {
  try {
    const [adjustments] = await pool.query('SELECT * FROM class_adjustments');
    console.log('All Class Adjustments in DB:', adjustments);

    const [timetables] = await pool.query('SELECT * FROM timetables WHERE employee_id IN ("UR25070701", "99NG1A1252")');
    console.log('Timetable slots for these users:', timetables);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
