const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./src/config/db');

async function main() {
  try {
    const sqlPath = path.join(__dirname, '../database/mutual_adjustments_columns.sql');
    const fullSql = fs.readFileSync(sqlPath, 'utf8');
    
    const statements = fullSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Starting migration, found ${statements.length} statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.errno === 1060 || err.errno === 1050) {
          console.log(`Skipping duplicate field/table error: ${err.sqlMessage}`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
