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

function generateStaffDiaryReportBuffer({ employee, fromDate, toDate, summary, rows }) {
  const sheetRows = [
    ['Employee Name', employee.full_name, '', 'Department', employee.department, ''],
    ['', '', '', '', '', ''],
    ['Abstract', '', '', '', '', ''],
    ['From to', `${fromDate} to ${toDate} (${summary.workingDays} Working Days)`, '', '', '', ''],
    ['OD', `${summary.odDays} Day${summary.odDays === 1 ? '' : 's'}`, '', '', '', ''],
    ['Leave', `${summary.leaveDays} Day${summary.leaveDays === 1 ? '' : 's'}`, '', '', '', ''],
    ['Total Worked Days', summary.totalWorkedDays, 'Total Working Days - Leave - OD', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Description of Total Hours', '', '', '', '', ''],
    ['Theory Hours Worked', summary.theoryHours, '', '', '', ''],
    ['Lab Hours Worked', summary.labHours, '', '', '', ''],
    ['Others Hours Worked', summary.otherHours, '', '', '', ''],
    ['Total Hours Worked', `${summary.totalHours} / ${summary.totalHours}`, '', '', '', ''],
    ['', '', '', '', '', ''],
    ['S.NO', 'DATE', 'TIME', 'CLASS & SEC', 'DESCRIPTION / Reason', 'No of Working Hours'],
  ];

  rows.forEach((row, index) => {
    sheetRows.push([
      row.serial || index + 1,
      row.date,
      row.time,
      row.classSection,
      row.description,
      row.hours,
    ]);
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet['!cols'] = [
    { wch: 22 }, { wch: 16 }, { wch: 20 },
    { wch: 20 }, { wch: 48 }, { wch: 22 },
  ];
  worksheet['!merges'] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 5 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 5 } },
    { s: { r: 6, c: 2 }, e: { r: 6, c: 5 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 5 } },
    { s: { r: 10, c: 1 }, e: { r: 10, c: 5 } },
    { s: { r: 11, c: 1 }, e: { r: 11, c: 5 } },
    { s: { r: 12, c: 1 }, e: { r: 12, c: 5 } },
    { s: { r: 13, c: 1 }, e: { r: 13, c: 5 } },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff Activity Report');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { parseExcelBuffer, generateExcelBuffer, generateStaffDiaryReportBuffer };
