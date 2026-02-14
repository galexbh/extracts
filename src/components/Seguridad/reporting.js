// src/utils/reporting.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";

export const COMPANY_NAME = "Extractus";

// 1->A, 2->B, ..., 27->AA
export const excelCol = (n) => {
  let s = "";
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
};

export const exportToPDF = ({ title, columns, data, extractors }) => {
  const doc = new jsPDF();
  const m = 14, w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString("es-ES");

  doc.setFontSize(18).setTextColor(46,125,50).text(COMPANY_NAME, w/2, 20, { align:"center" });
  doc.setFontSize(14).setTextColor(102,187,106).text(title, w/2, 30, { align:"center" });
  doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

  try {
    const img = doc.getImageProperties(logo);
    const imgW = 20, imgH = (img.height*imgW)/img.width;
    doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
  } catch {}

  doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

  autoTable(doc, {
    startY: 40,
    head: [columns],
    body: data.map(r => columns.map(c => extractors[c](r))),
    theme: "grid",
    headStyles: { fillColor: [200,255,200], textColor: [0,80,0] },
    margin: { left: m, right: m },
    styles: { fontSize: 8, cellPadding: 2 },
    didDrawPage: () => {
      const p = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w/2, h - 10, { align:"center" });
    }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g,"_")}.pdf`);
};

export const exportToExcel = async ({ title, columns, data, extractors }) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(title, { views: [{ state:"frozen", ySplit: 4 }] });

  const dateStr = new Date().toLocaleDateString("es-ES");
  const lastCol = excelCol(Math.max(columns.length,1));

  ws.mergeCells(`A1:${lastCol}1`);
  Object.assign(ws.getCell("A1"), {
    value: COMPANY_NAME,
    font: { size: 14, bold: true, color: { argb:"2E7D32" } },
    alignment: { horizontal:"center", vertical:"middle" },
  });
  ws.getRow(1).height = 24;

  ws.mergeCells(`A2:${lastCol}2`);
  Object.assign(ws.getCell("A2"), {
    value: title,
    font: { size: 12, bold: true, color: { argb:"66BB6A" } },
    alignment: { horizontal:"center", vertical:"middle" },
  });
  ws.getRow(2).height = 20;

  ws.mergeCells(`A3:${lastCol}3`);
  Object.assign(ws.getCell("A3"), {
    value: `Fecha: ${dateStr}`,
    font: { size: 10 },
    alignment: { horizontal:"left", vertical:"middle" },
  });
  ws.getRow(3).height = 18;

  ws.addRow([]);
  const hdr = ws.addRow(columns);
  hdr.height = 20;
  hdr.eachCell(cell => {
    Object.assign(cell, {
      fill: { type:"pattern", pattern:"solid", fgColor:{ argb:"CCFFCC" } },
      font: { bold:true, color:{ argb:"005000" } },
      alignment: { horizontal:"center", vertical:"middle" },
      border: { top:{style:"thin"}, left:{style:"thin"}, bottom:{style:"thin"}, right:{style:"thin"} }
    });
  });

  data.forEach(r => {
    const row = ws.addRow(columns.map(c => extractors[c](r)));
    row.eachCell(cell => {
      cell.alignment = { horizontal:"center", vertical:"middle" };
      cell.border = { top:{style:"thin"}, left:{style:"thin"}, bottom:{style:"thin"}, right:{style:"thin"} };
    });
  });

  ws.columns.forEach(col => {
    const vals = col.values.slice(1);
    const mx = vals.reduce((m,v)=>Math.max(m,(v??"").toString().length),0);
    col.width = Math.min(mx+5, 50);
  });

  ws.headerFooter = { oddFooter: "&CPágina &P" };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `${title.toLowerCase().replace(/\s+/g,"_")}.xlsx`);
};
