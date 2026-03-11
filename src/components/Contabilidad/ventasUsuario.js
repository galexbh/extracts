// src/components/Contabilidad/ventasUsuario.js
import React, { useMemo, useState } from "react";
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Button, useColorModeValue,
  Flex, FormControl, FormLabel, Input, IconButton, Divider, Menu, MenuButton,
  MenuList, MenuItem, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, Stack, Checkbox, useDisclosure, Text, SimpleGrid, Spinner, useToast, Icon, Stat, StatLabel, StatNumber
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { ChevronDownIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaBoxOpen, FaUserTie, FaCoins, FaChartBar } from "react-icons/fa";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";
import api from "../../api/apiClient";

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
  const muted = useColorModeValue("gray.500", "gray.400");
  const thBg = useColorModeValue("gray.50", "gray.700");
  const chartBg = useColorModeValue("white", "gray.700");
  const chartGrid = useColorModeValue("#EDF2F7", "#2D3748");

  const titleColor = useColorModeValue("teal.600", "teal.300");
  const headingColor = useColorModeValue("gray.700", "gray.200");
  const tooltipCursorColor = useColorModeValue("rgba(0,0,0,0.05)", "rgba(255,255,255,0.05)");
  const tooltipBgColor = useColorModeValue("rgba(255,255,255,0.9)", "rgba(45,55,72,0.9)");
  const rowHoverBg = useColorModeValue("gray.50", "gray.700");
  const montoColor = useColorModeValue("green.600", "green.300");

  const kpiBg1 = useColorModeValue("linear(to-br, blue.400, blue.600)", "linear(to-br, blue.600, blue.900)");
  const kpiBg2 = useColorModeValue("linear(to-br, teal.400, teal.600)", "linear(to-br, teal.600, teal.900)");
  const kpiBg3 = useColorModeValue("linear(to-br, purple.400, purple.600)", "linear(to-br, purple.600, purple.900)");

  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [ventas, setVentas] = useState([]);

  // Fetch API
  React.useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true);
      try {
        const listRes = await api.get("/ventas/ventasyreserva/pedidos");
        const pedidosList = listRes.data || [];

        const ventasConstruidas = [];
        await Promise.all(
          pedidosList.map(async (p) => {
            try {
              const detRes = await api.get(`/ventas/ventasyreserva/pedidos/${p.id_pedido}`);
              const { pedido: cab, detalle } = detRes.data;

              ventasConstruidas.push({
                id_venta: cab.id_pedido,
                usuario: cab.vendedor || cab.id_cliente || "Sin Cajero", // Fallback en caso de que vendedor sea null
                fecha: cab.fecha_reserva?.substring(0, 10),
                items: detalle.map(d => ({
                  producto: String(d.nombre_producto || "").toUpperCase(),
                  cantidad: Number(d.cantidad || 0),
                  precio: Number(d.precio_unitario || 0)
                }))
              });
            } catch (err) { }
          })
        );

        setVentas(ventasConstruidas);
      } catch (err) {
        toast({
          title: "Error cargando ventas",
          description: "Hubo un problema obteniendo los datos reales de ventas.",
          status: "error",
          duration: 3000,
          isClosable: true
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVentas();
  }, [toast]);

  // ===== Filtros =====
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const clearFilters = () => { setFromDate(""); setToDate(""); };

  // ===== Modal exportación =====
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState("PDF"); // "PDF" | "EXCEL"
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

  // ===== MÉTRICAS GLOBALES (KPIs) =====
  const totalUsuarios = resumen.length;
  const globalUnidades = resumen.reduce((acc, r) => acc + r.cantidad, 0);
  const globalMonto = resumen.reduce((acc, r) => acc + r.montoTotal, 0);

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

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="40vh">
        <Spinner size="xl" color="teal.500" />
      </Flex>
    );
  }

  return (
    <Box p={6} bg={bg} borderRadius="md" boxShadow="lg">
      {/* Título */}
      <Heading size="md" mb={1} color={titleColor}>
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

        <Button
          colorScheme="green"
          size="sm"
          isDisabled={fromDate && toDate && fromDate > toDate}
          onClick={onOpen}
        >
          Exportar
        </Button>
      </Flex>

      {/* Descripción corta */}
      <Text fontSize="sm" color={muted} mb={6}>
        EXTRACTUS Concentrados de fruta en trozos (1 Galón/8.33lbs). Mantener refrigerado 2–4°C. Sabores: MARACUYA, NARANJA, TAMARINDO, MORA, LIMON.
      </Text>

      {/* KPIs Premium */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <Box p={6} borderRadius="xl" bgGradient={kpiBg1} color="white" boxShadow="xl" position="relative" overflow="hidden">
          <Icon as={FaUserTie} boxSize={20} position="absolute" right="-4" bottom="-4" opacity={0.2} />
          <Stat>
            <StatLabel fontSize="lg" fontWeight="semibold" opacity={0.9}>Vendedores Activos</StatLabel>
            <StatNumber fontSize="4xl" fontWeight="extrabold">{totalUsuarios}</StatNumber>
          </Stat>
        </Box>
        <Box p={6} borderRadius="xl" bgGradient={kpiBg2} color="white" boxShadow="xl" position="relative" overflow="hidden">
          <Icon as={FaChartBar} boxSize={20} position="absolute" right="-4" bottom="-4" opacity={0.2} />
          <Stat>
            <StatLabel fontSize="lg" fontWeight="semibold" opacity={0.9}>Unidades Totales</StatLabel>
            <StatNumber fontSize="4xl" fontWeight="extrabold">{globalUnidades}</StatNumber>
          </Stat>
        </Box>
        <Box p={6} borderRadius="xl" bgGradient={kpiBg3} color="white" boxShadow="xl" position="relative" overflow="hidden">
          <Icon as={FaCoins} boxSize={20} position="absolute" right="-4" bottom="-4" opacity={0.2} />
          <Stat>
            <StatLabel fontSize="lg" fontWeight="semibold" opacity={0.9}>Monto Total</StatLabel>
            <StatNumber fontSize="4xl" fontWeight="extrabold">{formatoHNL.format(globalMonto)}</StatNumber>
          </Stat>
        </Box>
      </SimpleGrid>

      {resumen.length === 0 ? (
        <Flex direction="column" align="center" justify="center" py={16} bg={chartBg} borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor={border}>
          <Icon as={FaBoxOpen} boxSize={16} color="gray.300" mb={4} />
          <Heading size="md" color={muted} mb={2}>No hay ventas registradas</Heading>
          <Text color="gray.400" textAlign="center" maxW="sm">
            Ningún usuario ha registrado ventas de productos del catálogo en las fechas seleccionadas.
          </Text>
        </Flex>
      ) : (
        <>
          {/* Gráfico de Barras (Resumen Visual) */}
          <Box p={6} borderRadius="xl" bg={chartBg} boxShadow="md" mb={8} borderWidth="1px" borderColor={border}>
            <Heading size="sm" mb={6} color={headingColor}>
              Comparativa de Rendimiento (Monto por Usuario)
            </Heading>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={resumen} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="usuario" tick={{ fontSize: 12, fill: muted }} axisLine={false} tickLine={false} dy={10} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: muted }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: tooltipCursorColor }}
                  contentStyle={{
                    background: tooltipBgColor,
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    padding: "8px 12px",
                  }}
                  itemStyle={{ fontWeight: "bold" }}
                  formatter={(value) => formatoHNL.format(value)}
                />
                <Bar dataKey="montoTotal" fill="#3182CE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          {/* ===== DETALLE de ventas ===== */}
          <Heading size="sm" mb={4}>Detalle de movimientos</Heading>
          <Box borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={border} boxShadow="sm">
            <Table size="md" variant="simple" borderCollapse="collapse">
              <Thead bg={thBg}>
                <Tr>
                  {selectedDetailCols.map((col, i) => (
                    <Th key={col} textAlign="center" color="gray.500" py={4}>
                      {col}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {detalle.map((row) => (
                  <Tr key={row.id} _hover={{ bg: rowHoverBg }} transition="background 0.2s">
                    {selectedDetailCols.includes("Fecha") && (
                      <Td textAlign="center" borderColor={border}>
                        {row.fecha}
                      </Td>
                    )}
                    {selectedDetailCols.includes("Usuario") && (
                      <Td textAlign="center" borderColor={border} fontWeight="medium" color={muted}>
                        {row.usuario}
                      </Td>
                    )}
                    {selectedDetailCols.includes("Producto") && (
                      <Td textAlign="center" borderColor={border}>
                        <Text fontSize="sm" fontWeight="bold">{row.producto}</Text>
                      </Td>
                    )}
                    {selectedDetailCols.includes("Cantidad") && (
                      <Td textAlign="center" borderColor={border}>
                        {row.cantidad}
                      </Td>
                    )}
                    {selectedDetailCols.includes("Monto") && (
                      <Td textAlign="center" borderColor={border} fontWeight="semibold" color={montoColor}>
                        {formatoHNL.format(row.importe)}
                      </Td>
                    )}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </>
      )}

      {/* Modal Selección de columnas */}
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalOverlay />
        <ModalContent border="1px solid" borderColor={border} bg={bg}>
          <ModalHeader>
            Exportar Ventas
          </ModalHeader>
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Tipo de Reporte</FormLabel>
              <Box as="select"
                width="100%"
                padding="8px"
                borderRadius="md"
                borderWidth="1px"
                borderColor={border}
                bg={bg}
                value={exportContext}
                onChange={(e) => setExportContext(e.target.value)}
              >
                <option value="RESUMEN">Resumen por Usuario</option>
                <option value="DETALLE">Detalle de Ventas</option>
              </Box>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato de Exportación</FormLabel>
              <Box as="select"
                width="100%"
                padding="8px"
                borderRadius="md"
                borderWidth="1px"
                borderColor={border}
                bg={bg}
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="PDF">PDF</option>
                <option value="EXCEL">Excel</option>
              </Box>
            </FormControl>

            <Divider mb={4} />

            <FormLabel fontWeight="bold">Columnas a Exportar</FormLabel>
            <Stack spacing={2} maxHeight="200px" overflowY="auto">
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
            <Button colorScheme="green" mr={3} onClick={exportFormat === "PDF" ? doExportPDF : doExportExcel}
              isDisabled={
                exportContext === "RESUMEN"
                  ? selectedSummaryCols.length === 0
                  : selectedDetailCols.length === 0
              }
            >
              Generar
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
