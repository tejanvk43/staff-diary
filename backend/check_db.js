const pool = require('./src/config/db');

async function main() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Database tables:', tables.map(t => Object.values(t)[0]));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
