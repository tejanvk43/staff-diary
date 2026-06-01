require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

module.exports = {
  DB_HOST:     process.env.DB_HOST     || 'localhost',
  DB_USER:     process.env.DB_USER     || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME:     process.env.DB_NAME     || 'college_diary',
  JWT_SECRET:  process.env.JWT_SECRET  || 'fallback_secret_change_me',
  PORT:        parseInt(process.env.PORT || '5000', 10),
  JWT_EXPIRES: '8h',
};
