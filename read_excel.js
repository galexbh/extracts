const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function processFiles() {
  const dir = path.join(__dirname, 'matriz');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    console.log(`\n\n${'='.repeat(80)}`);
    console.log(`ARCHIVO: ${file}`);
    console.log(`${'='.repeat(80)}`);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      for (const worksheet of workbook.worksheets) {
        console.log(`\n--- HOJA: "${worksheet.name}" (${worksheet.rowCount} filas, ${worksheet.columnCount} columnas) ---`);
        
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          const vals = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            let v = cell.value;
            // Handle rich text
            if (v && typeof v === 'object') {
              if (v.richText) {
                v = v.richText.map(rt => rt.text).join('');
              } else if (v.text) {
                v = v.text;
              } else if (v.result !== undefined) {
                v = v.result;
              } else if (v instanceof Date) {
                v = v.toISOString().split('T')[0];
              }
            }
            vals.push(`[C${colNumber}]=${v}`);
          });
          console.log(`R${rowNumber}: ${vals.join(' | ')}`);
        });
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

processFiles();
