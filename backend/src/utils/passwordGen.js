const crypto = require('crypto');

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS    = '0123456789';
const SPECIALS  = '@#$!';

/**
 * Generate a secure 10-character random password.
 * Guarantees at least: 1 uppercase, 1 digit, 1 special character.
 */
function generateTempPassword(length = 10) {
  const all = UPPERCASE + LOWERCASE + DIGITS + SPECIALS;
  let password = '';

  // Guarantee at least one of each required type
  password += pick(UPPERCASE);
  password += pick(DIGITS);
  password += pick(SPECIALS);
  password += pick(LOWERCASE);

  // Fill remaining characters randomly
  for (let i = password.length; i < length; i++) {
    password += pick(all);
  }

  // Shuffle
  return password
    .split('')
    .sort(() => crypto.randomInt(0, 3) - 1)
    .join('');
}

function pick(chars) {
  return chars[crypto.randomInt(0, chars.length)];
}

module.exports = { generateTempPassword };
