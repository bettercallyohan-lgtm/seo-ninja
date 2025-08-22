const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function exportToExcel(rows, outPath) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const ws = XLSX.utils.json_to_sheet(safeRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'spots');
  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });
  XLSX.writeFile(wb, outPath);
}

module.exports = { exportToExcel };
