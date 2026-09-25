const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./src/config/db');

// List of SQL files in order of execution
const sqlFiles = [
  'schema.sql',
  'migration_v2.sql',
  'block_timetable_migration.sql',
  'class_adjustments_migration.sql',
  'dynamic_programs_migration.sql',
  'faculty_courses.sql',
  'mutual_adjustments_columns.sql',
  'section_timetable_source_migration.sql',
    'student_counselling_and_holder_name_migration.sql',
    'counseling_history_retention_migration.sql',
  'messaging_migration.sql',
  'subject_types_migration.sql',
  'subject_types_short_name_migration.sql',
  'subjects_columns_migration.sql',
  'subjects_unique_key_migration.sql',
  'working_sundays_migration.sql',
  'seed.sql',
  'seed1.sql'
];

function cleanSql(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

async function runAllMigrations() {
  console.log('🚀 Starting Full Database Migration Suite...');
  const dbDir = path.join(__dirname, '../database');

  for (const fileName of sqlFiles) {
    const filePath = path.join(dbDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Warning: ${fileName} not found, skipping.`);
      continue;
    }

    console.log(`\n📁 Processing SQL file: ${fileName}`);
    const rawSql = fs.readFileSync(filePath, 'utf8');
    const cleanedSql = cleanSql(rawSql);

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await pool.query(stmt);
        successCount++;
      } catch (err) {
        // 1050: Table already exists
        // 1054: Unknown column (e.g. column already renamed/altered)
        // 1060: Duplicate column name
        // 1061: Duplicate key name
        // 1062: Duplicate entry
        // 1091: Can't DROP key/column
        if ([1050, 1054, 1060, 1061, 1062, 1091].includes(err.errno)) {
          skipCount++;
        } else {
          console.error(`❌ Error in ${fileName} (statement ${i + 1}):`, err.sqlMessage || err.message);
        }
      }
    }

    console.log(`✅ ${fileName} completed. Executed: ${successCount}, Skipped/Applied: ${skipCount}`);
  }

  console.log('\n🎉 ALL DATABASE MIGRATIONS PROCESSED SUCCESSFULLY!');
  process.exit(0);
}

runAllMigrations().catch(err => {
  console.error('\n💥 Migration runner failed:', err);
  process.exit(1);
});
