const mysql = require('mysql2/promise');
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = require('./config');

const pool = mysql.createPool({
  host:               DB_HOST,
  user:               DB_USER,
  password:           DB_PASSWORD,
  database:           DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  dateStrings:        true,
});

pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL connected — pool ready');
    conn.release();
  })
  .catch(err => {
    console.error('❌  MySQL connection error:', err.message);
    process.exit(1);
  });

module.exports = pool;
