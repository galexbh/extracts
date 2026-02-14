// src/components/Contabilidad/productovendido.js
import React, { useMemo, useState } from "react";
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  useColorModeValue,
  Flex,
  FormControl,
  FormLabel,
  Input,
  IconButton,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Divider,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Stack,
  Checkbox,
  useDisclosure,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { ChevronDownIcon, RepeatIcon } from "@chakra-ui/icons";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";

import { pedidos, productos } from "../../data/pedidos";

const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte: Producto más vendido";

// Columnas disponibles para exportar
const ALL_COLUMNS = ["Producto", "Cantidad", "Ingreso"];
const extractors = {
  Producto: (r) => r.nombre,
  Cantidad: (r) => r.total,
  Ingreso: (r) => r.ingreso, // número; en UI formateamos a Lempiras
};

const formatoLempira = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

export default function ProductoVendido() {
  const bg = useColorModeValue("white", "gray.800");
  const kpiBg = useColorModeValue("teal.50", "teal.900");
  const chartBg = useColorModeValue("white", "gray.700");
  const chartGrid = useColorModeValue("#E6FFFA", "#2D3748");
  const lineColor = useColorModeValue("#2C7A7B", "#81E6D9");
  const textMuted = useColorModeValue("#4A5568", "#CBD5E0");
  const navigate = useNavigate();

  // Filtros de fecha
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modal exportación
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState(null); // "PDF" | "EXCEL"
  const [selectedCols, setSelectedCols] = useState(ALL_COLUMNS);
  const toggleCol = (col) =>
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );

  // Agregado por producto (cantidad + ingreso) con filtro de fechas
  const { salesAgg, totalUnits, totalRevenue, topProductName } = useMemo(() => {
    const map = new Map(); // id_producto -> { id, nombre, total, ingreso }
    const isInRange = (fechaISO) => {
      if (fromDate && fechaISO < fromDate) return false;
      if (toDate && fechaISO > toDate) return false;
      return true;
    };

    const priceById = new Map(
      (productos || []).map((p) => [p.id_producto, p.precio_unitario || 0])
    );
    const nameById = new Map(
      (productos || []).map((p) => [p.id_producto, p.nombre || "—"])
    );

    (pedidos || []).forEach((pedido) => {
      const fecha = pedido.fecha_reserva; // ISO YYYY-MM-DD
      if (!isInRange(fecha)) return;

      (pedido.productos || []).forEach((item) => {
        const id = item.id_producto;
        const qty = Number(item.cantidad || 0);
        const price =
          Number(item.precio_unitario) || Number(priceById.get(id) || 0);
        const ingreso = qty * price;

        if (!map.has(id)) {
          map.set(id, {
            id,
            nombre: nameById.get(id) || "—",
            total: 0,
            ingreso: 0,
          });
        }
        const ref = map.get(id);
        ref.total += qty;
        ref.ingreso += ingreso;
      });
    });

    const arr = Array.from(map.values()).sort((a, b) => b.total - a.total);
    const units = arr.reduce((acc, r) => acc + r.total, 0);
    const revenue = arr.reduce((acc, r) => acc + r.ingreso, 0);
    const topName = arr.length ? arr[0].nombre : "—";

    return {
      salesAgg: arr,
      totalUnits: units,
      totalRevenue: revenue,
      topProductName: topName,
    };
  }, [fromDate, toDate]);

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
  };

  // Gráfica (Top 5 por cantidad) — SOLO “más vendidos”
  const chartQty = useMemo(
    () => salesAgg.slice(0, 5).map((r) => ({ name: r.nombre, Cantidad: r.total })),
    [salesAgg]
  );

  // ===== Exportar PDF (mismo estilo que pedidosdiarios) =====
  const exportToPDF = () => {
    const doc = new jsPDF();
    const m = 14,
      w = doc.internal.pageSize.getWidth(),
      h = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString("es-ES");

    // Encabezado
    doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
    doc.setFontSize(14).setTextColor(102, 187, 106).text(REPORT_TITLE, w / 2, 30, { align: "center" });
    doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

    const img = doc.getImageProperties(logo);
    const imgW = 20,
      imgH = (img.height * imgW) / img.width;
    doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
    doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

    // Tabla
    autoTable(doc, {
      startY: 40,
      head: [selectedCols],
      body: salesAgg.map((r) => selectedCols.map((c) => extractors[c](r))),
      theme: "grid",
      headStyles: { fillColor: [200, 255, 200], textColor: [0, 80, 0] },
      margin: { left: m, right: m },
      styles: { fontSize: 8, cellPadding: 2, halign: "center" },
      didDrawPage: () => {
        const p = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
      },
    });

    doc.save("productos_mas_vendidos.pdf");
    onClose();
  };

  // ===== Exportar Excel (mismo estilo que pedidosdiarios) =====
  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("ProductosVendidos", {
      views: [{ state: "frozen", ySplit: 4 }],
    });
    const dateStr = new Date().toLocaleDateString("es-ES");

    // Empresa
    ws.mergeCells("A1:C1");
    Object.assign(ws.getCell("A1"), {
      value: COMPANY_NAME,
      font: { size: 14, bold: true, color: { argb: "2E7D32" } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(1).height = 24;

    // Título
    ws.mergeCells("A2:C2");
    Object.assign(ws.getCell("A2"), {
      value: REPORT_TITLE,
      font: { size: 12, bold: true, color: { argb: "66BB6A" } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(2).height = 20;

    // Fecha
    ws.mergeCells("A3:C3");
    Object.assign(ws.getCell("A3"), {
      value: `Fecha: ${dateStr}`,
      font: { size: 10 },
      alignment: { horizontal: "left", vertical: "middle" },
    });
    ws.getRow(3).height = 18;

    // Encabezado (columnas seleccionadas)
    ws.addRow([]);
    const hdr = ws.addRow(selectedCols);
    hdr.height = 20;
    hdr.eachCell((cell) => {
      Object.assign(cell, {
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "CCFFCC" } },
        font: { bold: true, color: { argb: "005000" } },
        alignment: { horizontal: "center", vertical: "middle" },
      });
    });

    // Filas
    salesAgg.forEach((r) => ws.addRow(selectedCols.map((c) => extractors[c](r))));

    // Anchos automáticos y pie de página
    ws.columns.forEach((col) => {
      const vals = col.values.slice(1);
      const mx = vals.reduce((m, v) => Math.max(m, (v ?? "").toString().length), 0);
      col.width = Math.min(mx + 5, 30);
      // Centrar todas las celdas
      col.alignment = { horizontal: "center", vertical: "middle" };
    });
    ws.headerFooter = { oddFooter: "&CPágina &P" };

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), "productos_mas_vendidos.xlsx");
    onClose();
  };

  return (
    <Box p={6} bg={bg} borderRadius="md" boxShadow="lg">
      {/* Título */}
      <Heading size="md" mb={1} color={useColorModeValue("teal.600", "teal.300")}>
        {REPORT_TITLE}
      </Heading>

      {/* Botón Atrás debajo del título */}
      <Button mt={1} mb={3} size="sm" onClick={() => navigate(-1)} w="fit-content">
        ←
      </Button>

      <Divider mb={4} />

      {/* Filtros Desde/Hasta + Exportar */}
      <Flex mb={4} align="center" justify="space-between">
        <Flex align="flex-end" gap={4}>
          <FormControl>
            <FormLabel fontSize="sm" mb={1}>
              Desde
            </FormLabel>
            <Input
              type="date"
              size="sm"
              w="140px"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || undefined}
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm" mb={1}>
              Hasta
            </FormLabel>
            <Input
              type="date"
              size="sm"
              w="140px"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
            />
          </FormControl>

          <IconButton
            aria-label="Limpiar fechas"
            icon={<RepeatIcon />}
            size="sm"
            onClick={clearFilters}
            mt={6}
          />
        </Flex>

        {/* Exportar (igual a pedidosdiarios: formato -> modal columnas) */}
        <Menu>
          <MenuButton as={Button} colorScheme="green" size="sm" rightIcon={<ChevronDownIcon />}>
            Exportar
          </MenuButton>
          <MenuList>
            <MenuItem
              onClick={() => {
                setExportFormat("PDF");
                onOpen();
              }}
            >
              Exportar PDF
            </MenuItem>
            <MenuItem
              onClick={() => {
                setExportFormat("EXCEL");
                onOpen();
              }}
            >
              Exportar Excel
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      {/* KPIs */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Box p={4} borderRadius="md" bg={kpiBg}>
          <Stat>
            <StatLabel>Total de unidades vendidas</StatLabel>
            <StatNumber>{totalUnits}</StatNumber>
          </Stat>
        </Box>

        <Box p={4} borderRadius="md" bg={kpiBg}>
          <Stat>
            <StatLabel>Ingreso total</StatLabel>
            <StatNumber>{formatoLempira.format(totalRevenue)}</StatNumber>
          </Stat>
        </Box>

        <Box p={4} borderRadius="md" bg={kpiBg} display="flex" alignItems="center" justifyContent="center">
          <Box textAlign="center">
            <Text fontSize="sm" color={textMuted}>
              Producto más vendido
            </Text>
            <Text fontWeight="bold" fontSize="lg">
              {topProductName}
            </Text>
          </Box>
        </Box>
      </SimpleGrid>

      {/* Gráfica de línea (Top 5) con tooltip transparente */}
      <Box p={4} borderRadius="md" bg={chartBg} boxShadow="md" mb={6}>
        <Heading size="sm" mb={3}>
          Top 5 por cantidad (línea)
        </Heading>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartQty} margin={{ top: 5, right: 20, left: 8, bottom: 5 }}>
            <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: textMuted }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: textMuted }} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                background: "rgba(255,255,255,0)",
                border: "none",
                boxShadow: "none",
                padding: "4px 6px",
              }}
              wrapperStyle={{ outline: "none" }}
              labelStyle={{ color: textMuted, fontSize: 12 }}
              itemStyle={{ color: lineColor, fontSize: 12, padding: 0 }}
            />
            <Line
              type="monotone"
              dataKey="Cantidad"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* Tabla centrada */}
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th textAlign="center">Producto</Th>
            <Th textAlign="center">Cantidad</Th>
            <Th textAlign="center">Ingreso</Th>
          </Tr>
        </Thead>
        <Tbody>
          {salesAgg.map((row) => (
            <Tr key={row.id}>
              <Td textAlign="center">{row.nombre}</Td>
              <Td textAlign="center">{row.total}</Td>
              <Td textAlign="center">{formatoLempira.format(row.ingreso)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* Modal de columnas para exportar */}
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Columnas a exportar ({exportFormat})</ModalHeader>
          <ModalBody>
            <Stack spacing={2}>
              {ALL_COLUMNS.map((col) => (
                <Checkbox
                  key={col}
                  isChecked={selectedCols.includes(col)}
                  onChange={() => toggleCol(col)}
                >
                  {col}
                </Checkbox>
              ))}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="green"
              mr={3}
              onClick={exportFormat === "PDF" ? exportToPDF : exportToExcel}
            >
              Generar
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
