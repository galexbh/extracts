// src/components/Inventarios/Movimientos.js
import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Input,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from '../login/log.png';

// ======= Constantes formato reporte (estilo Créditos.jsx) =======
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Movimientos";

// Convierte 1->A, 2->B, ..., 27->AA (para merges en Excel)
const excelCol = (n) => {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};

// Datos iniciales INSUMOS
const initialInsumos = [
  { id: "01", tipo: "entrada", nombre: "botes de litro", cantidad: 500, venta: "Juan",  fecha: "2025-08-01" },
  { id: "02", tipo: "salida",  nombre: "botes de litro", cantidad: 100, venta: "Maria", fecha: "2025-08-02" },
  { id: "03", tipo: "entrada", nombre: "botes de galón", cantidad: 300, venta: "Luis",  fecha: "2025-08-01" },
  { id: "04", tipo: "salida",  nombre: "botes de galón", cantidad: 50,  venta: "Ana",   fecha: "2025-08-03" },
  { id: "05", tipo: "entrada", nombre: "tapaderas",      cantidad: 400, venta: "Carlos",fecha: "2025-08-02" },
  { id: "06", tipo: "salida",  nombre: "stickers",       cantidad: 120, venta: "Luisa", fecha: "2025-08-04" },
];

// Datos iniciales PRODUCTOS
const initialProductos = [
  { id: "01", tipo: "entrada", nombre: "limón",     cantidad: 200, venta: "Pedro",  fecha: "2025-08-01" },
  { id: "02", tipo: "salida",  nombre: "limón",     cantidad: 80,  venta: "Ana",    fecha: "2025-08-02" },
  { id: "03", tipo: "entrada", nombre: "mora",      cantidad: 150, venta: "Luis",   fecha: "2025-08-01" },
  { id: "04", tipo: "salida",  nombre: "mora",      cantidad: 40,  venta: "Maria",  fecha: "2025-08-03" },
  { id: "05", tipo: "entrada", nombre: "tamarindo", cantidad: 120, venta: "Juan",   fecha: "2025-08-02" },
  { id: "06", tipo: "salida",  nombre: "naranja",   cantidad: 50,  venta: "Carlos", fecha: "2025-08-04" },
  { id: "07", tipo: "entrada", nombre: "maracuyá",  cantidad: 180, venta: "Luisa",  fecha: "2025-08-05" },
];

function Movimientos() {
  const toast = useToast();
  const [filters, setFilters] = useState({
    id: "",
    nombre: "",
    cantidad: "",
    venta: "",
    fecha: "",
  });

  const [insumos] = useState(initialInsumos);
  const [productos] = useState(initialProductos);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredInsumos = insumos.filter(m =>
    m.id.toLowerCase().includes(filters.id.toLowerCase()) &&
    m.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) &&
    m.cantidad.toString().includes(filters.cantidad) &&
    m.venta.toLowerCase().includes(filters.venta.toLowerCase()) &&
    m.fecha.includes(filters.fecha)
  );

  const filteredProductos = productos.filter(m =>
    m.id.toLowerCase().includes(filters.id.toLowerCase()) &&
    m.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) &&
    m.cantidad.toString().includes(filters.cantidad) &&
    m.venta.toLowerCase().includes(filters.venta.toLowerCase()) &&
    m.fecha.includes(filters.fecha)
  );

  // ======= NUEVO: PDF estilo pro (no cambia tu botón ni UI) =======
  const imprimirPDF = (movimiento, tipoMovimiento, tipoItem) => {
    const doc = new jsPDF();
    const m = 14;
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString("es-ES");

    // Encabezado
    doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
    doc.setFontSize(14).setTextColor(102, 187, 106).text(`${REPORT_TITLE} (${tipoItem})`, w / 2, 30, { align: "center" });
    doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

    try {
      const img = doc.getImageProperties(logo);
      const imgW = 20;
      const imgH = (img.height * imgW) / img.width;
      doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
    } catch {}

    // Línea divisoria
    doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

    // Tabla (mismas columnas que tu diseño)
    const cols = ["ID", tipoItem, "Cantidad", "Venta", "Fecha", "Tipo"];
    autoTable(doc, {
      startY: 40,
      head: [cols],
      body: [[
        movimiento.id,
        movimiento.nombre,
        movimiento.cantidad,
        movimiento.venta,
        movimiento.fecha,
        tipoMovimiento,
      ]],
      theme: "grid",
      headStyles: { fillColor: [200, 255, 200], textColor: [0, 80, 0] },
      margin: { left: m, right: m },
      styles: { fontSize: 8, cellPadding: 2 },
      didDrawPage: () => {
        const p = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
      },
    });

    doc.save(`Movimiento_${tipoMovimiento}_${tipoItem}_${movimiento.id}.pdf`);
  };

  // ======= OPCIONAL: Exportar LISTA (no conectado a UI; no cambio tu diseño) =======
  const exportMovListPDF = (rows, tipoItem) => {
    const doc = new jsPDF();
    const m = 14;
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString("es-ES");

    doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
    doc.setFontSize(14).setTextColor(102, 187, 106).text(`${REPORT_TITLE} (${tipoItem})`, w / 2, 30, { align: "center" });
    doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

    try {
      const img = doc.getImageProperties(logo);
      const imgW = 20;
      const imgH = (img.height * imgW) / img.width;
      doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
    } catch {}

    doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

    const cols = ["ID", tipoItem, "Cantidad", "Venta", "Fecha", "Tipo"];
    autoTable(doc, {
      startY: 40,
      head: [cols],
      body: rows.map(r => [r.id, r.nombre, r.cantidad, r.venta, r.fecha, r.tipo]),
      theme: "grid",
      headStyles: { fillColor: [200, 255, 200], textColor: [0, 80, 0] },
      margin: { left: m, right: m },
      styles: { fontSize: 8, cellPadding: 2 },
      didDrawPage: () => {
        const p = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
      },
    });

    doc.save(`Movimientos_${tipoItem}.pdf`);
  };

  const exportMovListExcel = async (rows, tipoItem) => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Movimientos ${tipoItem}`, { views: [{ state: "frozen", ySplit: 4 }] });

    const dateStr = new Date().toLocaleDateString("es-ES");
    const columns = ["ID", tipoItem, "Cantidad", "Venta", "Fecha", "Tipo"];
    const lastCol = excelCol(columns.length);

    // Fila 1: Empresa
    ws.mergeCells(`A1:${lastCol}1`);
    Object.assign(ws.getCell("A1"), {
      value: COMPANY_NAME,
      font: { size: 14, bold: true, color: { argb: "2E7D32" } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(1).height = 24;

    // Fila 2: Título
    ws.mergeCells(`A2:${lastCol}2`);
    Object.assign(ws.getCell("A2"), {
      value: `${REPORT_TITLE} (${tipoItem})`,
      font: { size: 12, bold: true, color: { argb: "66BB6A" } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(2).height = 20;

    // Fila 3: Fecha
    ws.mergeCells(`A3:${lastCol}3`);
    Object.assign(ws.getCell("A3"), {
      value: `Fecha: ${dateStr}`,
      font: { size: 10 },
      alignment: { horizontal: "left", vertical: "middle" },
    });
    ws.getRow(3).height = 18;

    // Fila en blanco
    ws.addRow([]);

    // Encabezados
    const hdr = ws.addRow(columns);
    hdr.height = 20;
    hdr.eachCell((cell) => {
      Object.assign(cell, {
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "CCFFCC" } },
        font: { bold: true, color: { argb: "005000" } },
        alignment: { horizontal: "center", vertical: "middle" },
        border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } },
      });
    });

    // Datos
    rows.forEach((r) => {
      const row = ws.addRow([r.id, r.nombre, r.cantidad, r.venta, r.fecha, r.tipo]);
      row.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
    });

    // Auto-anchos
    ws.columns.forEach((col) => {
      const vals = col.values.slice(1);
      const mx = vals.reduce((m, v) => Math.max(m, (v ?? "").toString().length), 0);
      col.width = Math.min(mx + 5, 30);
    });

    // Pie de página
    ws.headerFooter = { oddFooter: "&CPágina &P" };

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `Movimientos_${tipoItem}.xlsx`);
  };

  // ======= TU UI ORIGINAL, SIN CAMBIOS =======
  const renderBoxes = (data, tipoItem) => {
    const entradas = data.filter(m => m.tipo === "entrada");
    const salidas  = data.filter(m => m.tipo === "salida");

    return (
      <>
        <Box border="1px" borderColor="gray.300" borderRadius="md" p={4} mb={6}>
          <Heading size="md" mb={3}>Entradas</Heading>
          {entradas.length === 0 && <Text>No hay entradas</Text>}
          {entradas.map(mov => (
            <Box
              key={`${tipoItem}-${mov.id}-entrada`}
              p={4}
              mb={3}
              bg="green.100"
              borderRadius="md"
              shadow="md"
              color="black"
            >
              <Text><strong>ID:</strong> {mov.id}</Text>
              <Text><strong>{tipoItem}:</strong> {mov.nombre}</Text>
              <Text><strong>Cantidad:</strong> {mov.cantidad}</Text>
              <Text><strong>Venta:</strong> {mov.venta}</Text>
              <Text><strong>Fecha:</strong> {mov.fecha}</Text>
              <Button
                size="sm"
                mt={2}
                colorScheme="green"
                onClick={() => imprimirPDF(mov, "entrada", tipoItem)}
              >
                Imprimir PDF
              </Button>
            </Box>
          ))}
        </Box>

        <Box border="1px" borderColor="gray.300" borderRadius="md" p={4}>
          <Heading size="md" mb={3}>Salidas</Heading>
          {salidas.length === 0 && <Text>No hay salidas</Text>}
          {salidas.map(mov => (
            <Box
              key={`${tipoItem}-${mov.id}-salida`}
              p={4}
              mb={3}
              bg="red.100"
              borderRadius="md"
              shadow="md"
              color="black"
            >
              <Text><strong>ID:</strong> {mov.id}</Text>
              <Text><strong>{tipoItem}:</strong> {mov.nombre}</Text>
              <Text><strong>Cantidad:</strong> {mov.cantidad}</Text>
              <Text><strong>Venta:</strong> {mov.venta}</Text>
              <Text><strong>Fecha:</strong> {mov.fecha}</Text>
              <Button
                size="sm"
                mt={2}
                colorScheme="red"
                onClick={() => imprimirPDF(mov, "salida", tipoItem)}
              >
                Imprimir PDF
              </Button>
            </Box>
          ))}
        </Box>
      </>
    );
  };

  return (
    <Box p={6}>
      {/* Botón de atrás */}
      <Flex alignItems="center" mb={4}>
        <IconButton
          icon={<ArrowBackIcon />}
          colorScheme="teal"
          variant="ghost"
          aria-label="Volver"
          onClick={() => window.history.back()}
          mr={3}
        />
        <Heading>Movimientos de Insumos y Productos</Heading>
      </Flex>

      {/* Filtros en una sola línea */}
      <Flex gap={3} mb={6} flexWrap="nowrap">
        <Input size="sm" placeholder="Buscar ID"       value={filters.id}      onChange={(e) => handleFilterChange("id", e.target.value)} />
        <Input size="sm" placeholder="Buscar Nombre"   value={filters.nombre}  onChange={(e) => handleFilterChange("nombre", e.target.value)} />
        <Input size="sm" placeholder="Buscar Cantidad" value={filters.cantidad}onChange={(e) => handleFilterChange("cantidad", e.target.value)} />
        <Input size="sm" placeholder="Buscar Venta"    value={filters.venta}   onChange={(e) => handleFilterChange("venta", e.target.value)} />
        <Input size="sm" placeholder="Buscar Fecha"    value={filters.fecha}   onChange={(e) => handleFilterChange("fecha", e.target.value)} />
      </Flex>

      <Flex gap={8}>
        {/* Insumos */}
        <Box flex="1">
          <Heading size="lg" mb={4}>Insumos</Heading>
          {renderBoxes(filteredInsumos, "Insumo")}
        </Box>

        {/* Productos */}
        <Box flex="1">
          <Heading size="lg" mb={4}>Productos</Heading>
          {renderBoxes(filteredProductos, "Producto")}
        </Box>
      </Flex>
    </Box>
  );
}

export default Movimientos;
