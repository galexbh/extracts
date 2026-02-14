// src/components/Contabilidad/ventasUsuario.js
import React, { useMemo, useState } from "react";
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Button, useColorModeValue,
  Flex, FormControl, FormLabel, Input, IconButton, Divider, Menu, MenuButton,
  MenuList, MenuItem, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, Stack, Checkbox, useDisclosure, Text, SimpleGrid
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { ChevronDownIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";

const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte: Ventas por Usuario";

// Catálogo de sabores EXTRACTUS
const SABORES = ["MARACUYA", "NARANJA", "TAMARINDO", "MORA", "LIMON"];

// Columnas RESUMEN (para exportar)
const SUMMARY_COLUMNS = ["Usuario", "Cantidad", "Monto"];
const summaryExtractors = {
  "Usuario": (r) => r.usuario,
  "Cantidad": (r) => r.cantidad,   // 👈 total de unidades por usuario
  "Monto": (r) => r.montoTotal,
};

// Columnas DETALLE (para exportar/mostrar)
const DETAIL_COLUMNS = ["Fecha", "Usuario", "Producto", "Cantidad", "Monto"];
const detailExtractors = {
  "Fecha": (r) => r.fecha,
  "Usuario": (r) => r.usuario,
  "Producto": (r) => r.producto,
  "Cantidad": (r) => r.cantidad,
  "Monto": (r) => r.importe,
};

const formatoHNL = new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" });

export default function VentasPorUsuario() {
  const navigate = useNavigate();
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.600");
  const muted = useColorModeValue("gray.600", "gray.300");

  // ===== Datos DEMO (adaptados a EXTRACTUS) =====
  const [ventas] = useState([
    { id_venta: 1, usuario: "Osmany", fecha: "2025-07-30",
      items: [ { producto: "MARACUYA", cantidad: 2, precio: 180 },
               { producto: "LIMON",     cantidad: 1, precio: 170 } ] },
    { id_venta: 2, usuario: "Fanny",  fecha: "2025-08-01",
      items: [ { producto: "NARANJA",  cantidad: 1, precio: 175 } ] },
    { id_venta: 3, usuario: "Edi",    fecha: "2025-08-01",
      items: [ { producto: "MARACUYA", cantidad: 3, precio: 180 },
               { producto: "MORA",     cantidad: 1, precio: 185 } ] },
    { id_venta: 4, usuario: "Osmany", fecha: "2025-08-02",
      items: [ { producto: "TAMARINDO", cantidad: 1, precio: 165 } ] },
    { id_venta: 5, usuario: "Fanny",  fecha: "2025-08-03",
      items: [ { producto: "MORA",     cantidad: 2, precio: 185 } ] },
    { id_venta: 6, usuario: "Edi",    fecha: "2025-08-05",
      items: [ { producto: "LIMON",    cantidad: 1, precio: 170 } ] },
  ]);

  // ===== Filtros =====
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const clearFilters = () => { setFromDate(""); setToDate(""); };

  // ===== Modal exportación =====
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState(null); // "PDF" | "EXCEL"
  const [exportContext, setExportContext] = useState("RESUMEN"); // "RESUMEN" | "DETALLE"
  const [selectedSummaryCols, setSelectedSummaryCols] = useState(SUMMARY_COLUMNS);
  const [selectedDetailCols, setSelectedDetailCols] = useState(DETAIL_COLUMNS);

  const toggleCol = (col) => {
    if (exportContext === "RESUMEN") {
      setSelectedSummaryCols((prev) =>
        prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
      );
    } else {
      setSelectedDetailCols((prev) =>
        prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
      );
    }
  };

  // ===== Helpers =====
  const lastColLetter = (len) => String.fromCharCode(64 + Math.max(1, len)); // A..Z

  // ===== Ventas filtradas por fecha (base para DETALLE) =====
  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      if (fromDate && v.fecha < fromDate) return false;
      if (toDate && v.fecha > toDate) return false;
      return true;
    });
  }, [ventas, fromDate, toDate]);

  // ===== DETALLE (filtrado) — incluye ventaId para contar ventas si hiciera falta =====
  const detalle = useMemo(() => {
    const out = [];
    ventasFiltradas.forEach((v) => {
      (v.items || []).forEach((it, idx) => {
        const nombre = String(it.producto || "").toUpperCase();
        if (!SABORES.includes(nombre)) return; // solo sabores de catálogo
        out.push({
          id: `${v.id_venta}-${idx}`,
          ventaId: v.id_venta,
          fecha: v.fecha,
          usuario: v.usuario,
          producto: nombre,
          cantidad: Number(it.cantidad || 0),
          importe: Number(it.cantidad || 0) * Number(it.precio || 0),
        });
      });
    });
    return out.sort((a, b) =>
      a.fecha === b.fecha ? a.usuario.localeCompare(b.usuario) : a.fecha.localeCompare(b.fecha)
    );
  }, [ventasFiltradas]);

  // ===== RESUMEN (SE ALIMENTA DEL DETALLE) — suma ACUMULADA de unidades y monto =====
  const resumen = useMemo(() => {
    const map = new Map(); // usuario -> { cantidad:number, montoTotal:number }
    detalle.forEach((r) => {
      if (!map.has(r.usuario)) {
        map.set(r.usuario, { usuario: r.usuario, cantidad: 0, montoTotal: 0 });
      }
      const ref = map.get(r.usuario);
      ref.cantidad += r.cantidad;     // 👈 suma acumulada de unidades
      ref.montoTotal += r.importe;    // 👈 suma acumulada del importe
    });

    return Array.from(map.values()).sort((a, b) => b.montoTotal - a.montoTotal);
  }, [detalle]);

  // ===== Exportar PDF/Excel (usa resumen/detalle actuales) =====
  const doExportPDF = () => {
    const doc = new jsPDF();
    const m = 14, w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString("es-ES");

    doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
    doc.setFontSize(14).setTextColor(102, 187, 106)
      .text(`${REPORT_TITLE} — ${exportContext === "RESUMEN" ? "Resumen" : "Detalle"}`, w / 2, 30, { align: "center" });
    doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

    const img = doc.getImageProperties(logo);
    const imgW = 20, imgH = (img.height * imgW) / img.width;
    doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
    doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

    const cols = exportContext === "RESUMEN" ? selectedSummaryCols : selectedDetailCols;
    const extractors = exportContext === "RESUMEN" ? summaryExtractors : detailExtractors;
    const source = exportContext === "RESUMEN" ? resumen : detalle;

    autoTable(doc, {
      startY: 40,
      head: [cols],
      body: source.map((r) =>
        cols.map((c) => {
          const val = extractors[c](r);
          return c === "Monto" ? formatoHNL.format(val || 0) : val;
        })
      ),
      theme: "grid",
      headStyles: { fillColor: [200, 255, 200], textColor: [0, 80, 0] },
      margin: { left: m, right: m },
      styles: { fontSize: 8, cellPadding: 2, halign: "center" },
      didDrawPage: () => {
        const p = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
      },
    });

    doc.save(exportContext === "RESUMEN" ? "ventas_por_usuario_resumen.pdf" : "ventas_por_usuario_detalle.pdf");
    onClose();
  };

  const doExportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const cols = exportContext === "RESUMEN" ? selectedSummaryCols : selectedDetailCols;
    const extractors = exportContext === "RESUMEN" ? summaryExtractors : detailExtractors;
    const source = exportContext === "RESUMEN" ? resumen : detalle;
    const ws = wb.addWorksheet(
      exportContext === "RESUMEN" ? "VentasUsuario_Resumen" : "VentasUsuario_Detalle",
      { views: [{ state: "frozen", ySplit: 4 }] }
    );
    const dateStr = new Date().toLocaleDateString("es-ES");
    const last = String.fromCharCode(64 + Math.max(1, cols.length));

    ws.mergeCells(`A1:${last}1`);
    Object.assign(ws.getCell("A1"), {
      value: COMPANY_NAME,
      font: { size: 14, bold: true, color: { argb: "2E7D32" } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(1).height = 24;

    ws.mergeCells(`A2:${last}2`);
    Object.assign(ws.getCell("A2"), {
      value: `${REPORT_TITLE} — ${exportContext === "RESUMEN" ? "Resumen" : "Detalle"}`,
      font: { size: 12, bold: true, color: { argb: "66BB6A" } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(2).height = 20;

    ws.mergeCells(`A3:${last}3`);
    Object.assign(ws.getCell("A3"), {
      value: `Fecha: ${dateStr}`,
      font: { size: 10 },
      alignment: { horizontal: "left", vertical: "middle" },
    });
    ws.getRow(3).height = 18;

    ws.addRow([]);
    const hdr = ws.addRow(cols);
    hdr.height = 20;
    hdr.eachCell((cell) => {
      Object.assign(cell, {
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "CCFFCC" } },
        font: { bold: true, color: { argb: "005000" } },
        alignment: { horizontal: "center", vertical: "middle" },
      });
    });

    source.forEach((r) => ws.addRow(cols.map((c) => extractors[c](r))));

    const montoIdx = cols.indexOf("Monto") + 1;
    ws.columns.forEach((col, i) => {
      const vals = col.values.slice(1);
      const mx = vals.reduce((m, v) => Math.max(m, (v ?? "").toString().length), 0);
      col.width = Math.min(mx + 5, 32);
      col.alignment = { horizontal: "center", vertical: "middle" };
      if (i + 1 === montoIdx) col.numFmt = '#,##0.00';
    });
    ws.headerFooter = { oddFooter: "&CPágina &P" };

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]),
      exportContext === "RESUMEN" ? "ventas_por_usuario_resumen.xlsx" : "ventas_por_usuario_detalle.xlsx");
    onClose();
  };

  return (
    <Box p={6} bg={bg} borderRadius="md" boxShadow="lg">
      {/* Título */}
      <Heading size="md" mb={1} color={useColorModeValue("teal.600", "teal.300")}>
        {REPORT_TITLE}
      </Heading>

      {/* Botón Atrás (solo flechita) */}
      <Button mt={1} mb={3} size="sm" onClick={() => navigate(-1)} w="fit-content">
        ←
      </Button>

      <Divider mb={4} />

      {/* Filtros + Exportar */}
      <Flex mb={4} align="center" justify="space-between">
        <Flex align="flex-end" gap={4}>
          <FormControl>
            <FormLabel fontSize="sm" mb={1}>Desde</FormLabel>
            <Input
              type="date" size="sm" w="140px"
              value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              max={toDate || undefined}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm" mb={1}>Hasta</FormLabel>
            <Input
              type="date" size="sm" w="140px"
              value={toDate} onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
            />
          </FormControl>
          <IconButton aria-label="Limpiar fechas" icon={<RepeatIcon />} size="sm" onClick={clearFilters} mt={6} />
        </Flex>

        <Menu>
          <MenuButton as={Button} colorScheme="green" size="sm" rightIcon={<ChevronDownIcon />}>
            Exportar
          </MenuButton>
          <MenuList>
            <MenuItem icon={<FaFilePdf />} onClick={() => { setExportContext("RESUMEN"); setExportFormat("PDF"); onOpen(); }}>
              Exportar PDF (Resumen)
            </MenuItem>
            <MenuItem icon={<FaFileExcel />} onClick={() => { setExportContext("RESUMEN"); setExportFormat("EXCEL"); onOpen(); }}>
              Exportar Excel (Resumen)
            </MenuItem>
            <Divider my={1} />
            <MenuItem icon={<FaFilePdf />} onClick={() => { setExportContext("DETALLE"); setExportFormat("PDF"); onOpen(); }}>
              Exportar PDF (Detalle)
            </MenuItem>
            <MenuItem icon={<FaFileExcel />} onClick={() => { setExportContext("DETALLE"); setExportFormat("EXCEL"); onOpen(); }}>
              Exportar Excel (Detalle)
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      {/* Descripción corta del producto */}
      <Text fontSize="sm" color={muted} mb={4}>
        EXTRACTUS Concentrados de fruta en trozos (1 Galón/8.33lbs). Mantener refrigerado 2–4°C. Sabores: MARACUYA, NARANJA, TAMARINDO, MORA, LIMON.
      </Text>

      {/* ===== RESUMEN por usuario (neutro) ===== */}
      <Heading size="sm" mb={3}>Resumen por usuario</Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4} mb={6}>
        {resumen.map((row) => (
          <Box
            key={row.usuario}
            p={4}
            bg="transparent"
            border="1px solid"
            borderColor={border}
            borderRadius="lg"
            boxShadow="sm"
          >
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={2}>
              <Box borderWidth="1px" borderColor={border} borderRadius="md" p={3} textAlign="center">
                <Text fontSize="xs" opacity={0.8}>Usuario</Text>
                <Text fontSize="sm">{row.usuario}</Text>
              </Box>
              <Box borderWidth="1px" borderColor={border} borderRadius="md" p={3} textAlign="center">
                <Text fontSize="xs" opacity={0.8}>Cantidad</Text>
                <Text fontSize="sm">{row.cantidad}</Text>
              </Box>
              <Box borderWidth="1px" borderColor={border} borderRadius="md" p={3} textAlign="center">
                <Text fontSize="xs" opacity={0.8}>Monto</Text>
                <Text fontSize="sm">{formatoHNL.format(row.montoTotal)}</Text>
              </Box>
            </SimpleGrid>
          </Box>
        ))}
      </SimpleGrid>

      {/* ===== DETALLE de ventas ===== */}
      <Heading size="sm" mb={2}>Detalle de ventas</Heading>
      <Box borderRadius="md" p={0}>
        <Table size="sm" variant="simple" borderX="1px solid" borderColor={border} borderCollapse="collapse">
          <Thead>
            <Tr>
              {selectedDetailCols.map((col, i) => (
                <Th key={col} textAlign="center"
                    borderRight={i < selectedDetailCols.length - 1 ? "1px solid" : undefined}
                    borderColor={border} borderBottom="1px solid">
                  {col}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {detalle.map((row) => (
              <Tr key={row.id}>
                {selectedDetailCols.includes("Fecha") && (
                  <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                    {row.fecha}
                  </Td>
                )}
                {selectedDetailCols.includes("Usuario") && (
                  <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                    {row.usuario}
                  </Td>
                )}
                {selectedDetailCols.includes("Producto") && (
                  <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                    <Text fontSize="sm">{row.producto}</Text>
                  </Td>
                )}
                {selectedDetailCols.includes("Cantidad") && (
                  <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                    {row.cantidad}
                  </Td>
                )}
                {selectedDetailCols.includes("Monto") && (
                  <Td textAlign="center" borderBottom="1px solid">
                    {formatoHNL.format(row.importe)}
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Modal Selección de columnas */}
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Columnas a exportar ({exportFormat}) — {exportContext === "RESUMEN" ? "Resumen" : "Detalle"}
          </ModalHeader>
          <ModalBody>
            <Stack spacing={2}>
              {(exportContext === "RESUMEN" ? SUMMARY_COLUMNS : DETAIL_COLUMNS).map((col) => (
                <Checkbox
                  key={col}
                  isChecked={
                    exportContext === "RESUMEN"
                      ? selectedSummaryCols.includes(col)
                      : selectedDetailCols.includes(col)
                  }
                  onChange={() => toggleCol(col)}
                >
                  {col}
                </Checkbox>
              ))}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" mr={3} onClick={exportFormat === "PDF" ? doExportPDF : doExportExcel}>
              Generar
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
