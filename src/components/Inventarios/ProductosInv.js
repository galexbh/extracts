import React, { useState } from 'react';
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Input, IconButton, Button, Badge, HStack, useToast,
} from '@chakra-ui/react';
import { DownloadIcon, ArrowBackIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import logo from '../login/log.png';

/* ========= Constantes estilo reporte ========= */
const COMPANY_NAME = 'Extractus';
const REPORT_TITLE = 'Reporte de Inventario - Productos';

// Convierte 1->A, 2->B, ..., 27->AA
const excelCol = (n) => {
  let s = '';
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
};

const productosData = [
  { id: '01', nombre: 'Limón',      cantidad: 50,  usuario: 'Equipo de Venta', observaciones: 'Jugo' },
  { id: '02', nombre: 'Mora',       cantidad: 20,  usuario: 'Equipo de Venta', observaciones: 'Concentrado' },
  { id: '03', nombre: 'Tamarindo',  cantidad: 100, usuario: 'Equipo de Venta', observaciones: 'Jugo' },
  { id: '04', nombre: 'Naranja',    cantidad: 250, usuario: 'Equipo de Venta', observaciones: 'Concentrado' },
  { id: '05', nombre: 'Maracuyá',   cantidad: 25,  usuario: 'Equipo de Venta', observaciones: 'Jugo' },
];

const ProductosInv = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [filters, setFilters] = useState({
    id: '', nombre: '', cantidad: '', usuario: '', observaciones: ''
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredData = productosData.filter(item =>
    item.id.toLowerCase().includes(filters.id.toLowerCase()) &&
    item.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) &&
    item.cantidad.toString().includes(filters.cantidad) &&
    item.usuario.toLowerCase().includes(filters.usuario.toLowerCase()) &&
    item.observaciones.toLowerCase().includes(filters.observaciones.toLowerCase())
  );

  /* ========= PDF (item) — Formato pro, sin cambiar tu UI ========= */
  const exportPDF = (item) => {
    if (item.cantidad <= 25) {
      toast({
        title: '⚠ ¡Stock Bajo!',
        description: `Por favor realizar pedido: ${item.nombre} está bajo (${item.cantidad}).`,
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }

    const doc = new jsPDF();
    const m = 14;
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString('es-ES');

    // Encabezado
    doc.setFontSize(18).setTextColor(46,125,50).text(COMPANY_NAME, w/2, 20, { align: 'center' });
    doc.setFontSize(14).setTextColor(102,187,106).text(REPORT_TITLE, w/2, 30, { align: 'center' });
    doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

    try {
      const img = doc.getImageProperties(logo);
      const imgW = 20, imgH = (img.height*imgW)/img.width;
      doc.addImage(logo, 'PNG', w - imgW - m, 8, imgW, imgH);
    } catch {}

    doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

    // Tabla (mismas columnas que tu diseño)
    const cols = ['ID', 'Nombre', 'Cantidad', 'Usuario', 'Fecha/Hora', 'Observaciones'];
    autoTable(doc, {
      startY: 40,
      head: [cols],
      body: [[
        item.id,
        item.nombre,
        item.cantidad,
        item.usuario,
        new Date().toLocaleString(),
        item.observaciones,
      ]],
      theme: 'grid',
      headStyles: { fillColor: [200,255,200], textColor: [0,80,0] },
      margin: { left: m, right: m },
      styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
      didDrawPage: () => {
        const p = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w/2, h-10, { align:'center' });
      },
    });

    doc.save(`Producto_${item.id}.pdf`);
  };

  /* ========= PDF (lista filtrada) — Formato pro ========= */
  const exportAllPDF = () => {
    const doc = new jsPDF();
    const m = 14;
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString('es-ES');

    doc.setFontSize(18).setTextColor(46,125,50).text(COMPANY_NAME, w/2, 20, { align: 'center' });
    doc.setFontSize(14).setTextColor(102,187,106).text('Reporte General de Productos', w/2, 30, { align: 'center' });
    doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

    try {
      const img = doc.getImageProperties(logo);
      const imgW = 20, imgH = (img.height*imgW)/img.width;
      doc.addImage(logo, 'PNG', w - imgW - m, 8, imgW, imgH);
    } catch {}

    doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

    const cols = ['ID', 'Nombre', 'Cantidad', 'Usuario', 'Fecha/Hora', 'Observaciones'];
    autoTable(doc, {
      startY: 40,
      head: [cols],
      body: filteredData.map(item => ([
        item.id,
        item.nombre,
        item.cantidad,
        item.usuario,
        new Date().toLocaleString(),
        item.observaciones
      ])),
      theme: 'grid',
      headStyles: { fillColor: [200,255,200], textColor: [0,80,0] },
      margin: { left: m, right: m },
      styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
      didDrawPage: () => {
        const p = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w/2, h-10, { align:'center' });
      },
    });

    doc.save('Reporte_Productos.pdf');
  };

  /* ========= OPCIONAL: Excel (lista filtrada) — mismo estilo de encabezados ========= */
  const exportAllExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Productos', { views: [{ state: 'frozen', ySplit: 4 }] });

    const dateStr = new Date().toLocaleDateString('es-ES');
    const columns = ['ID','Nombre','Cantidad','Usuario','Fecha/Hora','Observaciones'];
    const lastCol = excelCol(columns.length);

    // Fila 1: Empresa
    ws.mergeCells(`A1:${lastCol}1`);
    Object.assign(ws.getCell('A1'), {
      value: COMPANY_NAME,
      font: { size: 14, bold: true, color: { argb: '2E7D32' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    ws.getRow(1).height = 24;

    // Fila 2: Título
    ws.mergeCells(`A2:${lastCol}2`);
    Object.assign(ws.getCell('A2'), {
      value: REPORT_TITLE,
      font: { size: 12, bold: true, color: { argb: '66BB6A' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    ws.getRow(2).height = 20;

    // Fila 3: Fecha
    ws.mergeCells(`A3:${lastCol}3`);
    Object.assign(ws.getCell('A3'), {
      value: `Fecha: ${dateStr}`,
      font: { size: 10 },
      alignment: { horizontal: 'left', vertical: 'middle' },
    });
    ws.getRow(3).height = 18;

    ws.addRow([]); // fila en blanco

    // Encabezados
    const hdr = ws.addRow(columns);
    hdr.height = 20;
    hdr.eachCell((cell) => {
      Object.assign(cell, {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'CCFFCC' } },
        font: { bold: true, color: { argb: '005000' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'}
        }
      });
    });

    // Datos (filtrados)
    filteredData.forEach((item) => {
      const row = ws.addRow([
        item.id, item.nombre, item.cantidad, item.usuario, new Date().toLocaleString(), item.observaciones
      ]);
      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
      });
    });

    // Auto-anchos
    ws.columns.forEach((col) => {
      const vals = col.values.slice(1);
      const mx = vals.reduce((m, v) => Math.max(m, (v ?? '').toString().length), 0);
      col.width = Math.min(mx + 5, 30);
    });

    ws.headerFooter = { oddFooter: '&CPágina &P' };

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), 'Reporte_Productos.xlsx');
  };
  // NOTA: no conecto exportAllExcel() a ningún botón para no tocar tu diseño.

  return (
    <Box p={5}>
      <HStack mb={4} spacing={4}>
        <Button leftIcon={<ArrowBackIcon />} colorScheme="gray" onClick={() => navigate(-1)}>
          Atrás
        </Button>
        <Button colorScheme="teal" onClick={exportAllPDF}>
          Imprimir Reporte
        </Button>
      </HStack>

      <Table variant="striped" colorScheme="gray">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Nombre Producto</Th>
            <Th>Cantidad</Th>
            <Th>Usuario</Th>
            <Th>Fecha/Hora</Th>
            <Th>Observaciones</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </Tr>
          <Tr>
            <Th><Input size="sm" placeholder="Buscar ID" value={filters.id} onChange={e => handleFilterChange('id', e.target.value)} /></Th>
            <Th><Input size="sm" placeholder="Buscar Nombre" value={filters.nombre} onChange={e => handleFilterChange('nombre', e.target.value)} /></Th>
            <Th><Input size="sm" placeholder="Buscar Cantidad" value={filters.cantidad} onChange={e => handleFilterChange('cantidad', e.target.value)} /></Th>
            <Th><Input size="sm" placeholder="Buscar Usuario" value={filters.usuario} onChange={e => handleFilterChange('usuario', e.target.value)} /></Th>
            <Th>{/* Fecha dinámica */}</Th>
            <Th><Input size="sm" placeholder="Buscar Observación" value={filters.observaciones} onChange={e => handleFilterChange('observaciones', e.target.value)} /></Th>
            <Th>{/* Estado */}</Th>
            <Th>{/* Acciones */}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredData.map((item) => (
            <Tr key={item.id}>
              <Td>{item.id}</Td>
              <Td>{item.nombre}</Td>
              <Td>{item.cantidad}</Td>
              <Td>{item.usuario}</Td>
              <Td>{new Date().toLocaleString()}</Td>
              <Td>{item.observaciones}</Td>
              <Td>
                {item.cantidad <= 25 ? (
                  <Badge colorScheme="red">⚠ Stock Bajo</Badge>
                ) : item.cantidad >= 250 ? (
                  <Badge colorScheme="green">✔ Máximo</Badge>
                ) : (
                  <Badge colorScheme="yellow">En Rango</Badge>
                )}
              </Td>
              <Td>
                <IconButton
                  icon={<DownloadIcon />}
                  colorScheme="teal"
                  onClick={() => exportPDF(item)}
                  aria-label="Exportar PDF"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default ProductosInv;
