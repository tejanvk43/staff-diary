const pool = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    const password = "Urce@2026";
    const hash = "$2b$10$YWVgeHcHH7Znsnuw/1jgkO3sDVJfz9g6cS9CgoDzi3PAGuGW0uuAe";
    bcrypt.compare(password, hash).then(result => {
      console.log(result); // true or false
      });
    // const [rows] = await pool.query('SELECT employee_id, password_hash, is_first_login FROM users WHERE employee_id = "99NG1A1118"');
    // if (rows.length === 0) {
    //   console.log('User not found!');
    //   process.exit(0);
    // }
    // const user = rows[0];
    // console.log('User details in DB:', user);

    // const testPasswords = ['99ng1a1118', '99NG1A1118', 'password', 'Teja@4569', '12345678'];
    // for (const pwd of testPasswords) {
    //   const match = await bcrypt.compare(pwd, user.password_hash);
    //   console.log(`Password "${pwd}": ${match ? 'MATCH' : 'NO MATCH'}`);
    // }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

}


main();
