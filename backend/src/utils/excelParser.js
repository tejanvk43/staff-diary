const XLSX = require('xlsx');

/**
 * Parse an Excel buffer and return an array of row objects.
 * @param {Buffer} buffer
 * @param {string} [sheetName] - optional sheet name; defaults to first sheet
 * @returns {Array<Object>}
 */
function parseExcelBuffer(buffer, sheetName) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const name = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Sheet "${name}" not found in workbook.`);
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

/**
 * Generate an Excel buffer from an array of objects.
 * @param {Array<Object>} rows
 * @param {string} [sheetName]
 * @returns {Buffer}
 */
function generateExcelBuffer(rows, sheetName = 'Sheet1') {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { parseExcelBuffer, generateExcelBuffer };
