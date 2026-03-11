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
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Stack,
  Checkbox,
  useDisclosure,
  Spinner,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { ChevronDownIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaBoxOpen, FaChartLine, FaMoneyBillWave, FaStar } from "react-icons/fa";

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
import api from "../../api/apiClient";

const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte: Producto más vendido";

// Columnas disponibles para exportar
const ALL_COLUMNS = ["Producto", "Cantidad", "Ingreso"];
const extractors = {
  Producto: (r) => r.nombre_producto,
  Cantidad: (r) => Number(r.total_cantidad),
  Ingreso: (r) => Number(r.total_vendido), // formatoLempira in UI
};

const formatoLempira = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

export default function ProductoVendido() {
  const bg = useColorModeValue("white", "gray.800");
  const kpiBg1 = useColorModeValue("linear(to-br, teal.400, teal.600)", "linear(to-br, teal.600, teal.900)");
  const kpiBg2 = useColorModeValue("linear(to-br, blue.400, blue.600)", "linear(to-br, blue.600, blue.900)");
  const kpiBg3 = useColorModeValue("linear(to-br, purple.400, purple.600)", "linear(to-br, purple.600, purple.900)");

  const titleColor = useColorModeValue("teal.600", "teal.300");
  const headingColor = useColorModeValue("gray.700", "gray.200");
  const rowHoverBg = useColorModeValue("gray.50", "gray.700");
  const montoColor = useColorModeValue("green.600", "green.300");

  const chartBg = useColorModeValue("white", "gray.700");
  const chartGrid = useColorModeValue("#E6FFFA", "#2D3748");
  const lineColor = useColorModeValue("#2C7A7B", "#81E6D9");
  const textMuted = useColorModeValue("gray.500", "gray.400");
  const thBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const navigate = useNavigate();

  // Filtros de fecha
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modal exportación
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState("pdf"); // "pdf" | "excel"
  const [selectedCols, setSelectedCols] = useState(ALL_COLUMNS);
  const toggleCol = (col) =>
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );

  // Estados de datos
  const [salesAgg, setSalesAgg] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalUnits, setTotalUnits] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [topProductName, setTopProductName] = useState("—");

  // Fetch de la API
  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {
          top: 100 // Podemos traer más si lo deseamos, o los top 10/20.
        };
        if (fromDate) params.desde = fromDate;
        if (toDate) params.hasta = toDate;

        const res = await api.get("/contabilidad/reportes-contabilidad/productos-mas-vendidos", { params });
        const data = res.data || [];

        setSalesAgg(data);

        // Agregaciones
        const units = data.reduce((acc, r) => acc + Number(r.total_cantidad || 0), 0);
        const revenue = data.reduce((acc, r) => acc + Number(r.total_vendido || 0), 0);
        const topName = data.length > 0 ? data[0].nombre_producto : "—";

        setTotalUnits(units);
        setTotalRevenue(revenue);
        setTopProductName(topName);
      } catch (error) {
        console.error("Error fetching top products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fromDate, toDate]);

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
  };

  // Gráfica (Top 5 por cantidad) — SOLO “más vendidos”
  const chartQty = useMemo(
    () => salesAgg.slice(0, 5).map((r) => ({ name: r.nombre_producto, Cantidad: Number(r.total_cantidad) })),
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
      <Heading size="md" mb={1} color={titleColor}>
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

        {/* Exportar */}
        <Button
          colorScheme="green"
          size="sm"
          onClick={onOpen}
          isDisabled={fromDate && toDate && fromDate > toDate}
        >
          Exportar
        </Button>
      </Flex>

      {/* KPIs Premium */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <Box p={6} borderRadius="xl" bgGradient={kpiBg1} color="white" boxShadow="xl" position="relative" overflow="hidden">
          <Icon as={FaChartLine} boxSize={20} position="absolute" right="-4" bottom="-4" opacity={0.2} />
          <Stat>
            <StatLabel fontSize="lg" fontWeight="semibold" opacity={0.9}>Unidades Vendidas</StatLabel>
            <StatNumber fontSize="4xl" fontWeight="extrabold">{totalUnits}</StatNumber>
          </Stat>
        </Box>

        <Box p={6} borderRadius="xl" bgGradient={kpiBg2} color="white" boxShadow="xl" position="relative" overflow="hidden">
          <Icon as={FaMoneyBillWave} boxSize={20} position="absolute" right="-4" bottom="-4" opacity={0.2} />
          <Stat>
            <StatLabel fontSize="lg" fontWeight="semibold" opacity={0.9}>Ingreso Total</StatLabel>
            <StatNumber fontSize="4xl" fontWeight="extrabold">{formatoLempira.format(totalRevenue)}</StatNumber>
          </Stat>
        </Box>

        <Box p={6} borderRadius="xl" bgGradient={kpiBg3} color="white" boxShadow="xl" position="relative" overflow="hidden" display="flex" alignItems="center" justifyContent="center">
          <Icon as={FaStar} boxSize={20} position="absolute" right="-4" bottom="-4" opacity={0.2} />
          <Box textAlign="center" zIndex={1}>
            <Text fontSize="lg" fontWeight="semibold" opacity={0.9}>
              Producto Estrella
            </Text>
            <Text fontWeight="extrabold" fontSize="3xl" lineHeight="short" mt={1}>
              {topProductName}
            </Text>
          </Box>
        </Box>
      </SimpleGrid>

      {/* Estado vacío o Gráfica + Tabla */}
      {loading ? (
        <Flex justify="center" align="center" minH="30vh">
          <Spinner size="xl" color="teal.500" thickness="4px" />
        </Flex>
      ) : salesAgg.length === 0 ? (
        <Flex direction="column" align="center" justify="center" py={16} bg={chartBg} borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
          <Icon as={FaBoxOpen} boxSize={16} color="gray.300" mb={4} />
          <Heading size="md" color={textMuted} mb={2}>No hay datos disponibles</Heading>
          <Text color="gray.400" textAlign="center" maxW="sm">
            No se registraron ventas de productos en este rango de fechas. Prueba ampliando el filtro "Desde" y "Hasta".
          </Text>
        </Flex>
      ) : (
        <>
          {/* Gráfica de línea (Top 5) con tooltip transparente */}
          <Box p={6} borderRadius="xl" bg={chartBg} boxShadow="md" mb={8} borderWidth="1px" borderColor={borderColor}>
            <Heading size="sm" mb={6} color={headingColor}>
              Comportamiento Top 5 (Unidades vs Producto)
            </Heading>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartQty} margin={{ top: 5, right: 20, left: 8, bottom: 5 }}>
                <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: textMuted }} axisLine={false} tickLine={false} dy={10} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: textMuted }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: "#A0AEC0" }}
                  contentStyle={{
                    background: useColorModeValue("rgba(255,255,255,0.9)", "rgba(45,55,72,0.9)"),
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    padding: "8px 12px",
                  }}
                  itemStyle={{ color: lineColor, fontWeight: "bold" }}
                />
                <Line
                  type="monotone"
                  dataKey="Cantidad"
                  stroke={lineColor}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: chartBg }}
                  activeDot={{ r: 6, fill: lineColor, stroke: "white", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          {/* Tabla estilizada */}
          <Box borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={borderColor} boxShadow="sm">
            <Table variant="simple" size="md">
              <Thead bg={thBg}>
                <Tr>
                  <Th textAlign="center" color="gray.500" py={4}>#</Th>
                  <Th textAlign="left" color="gray.500" py={4}>Producto</Th>
                  <Th textAlign="center" color="gray.500" py={4}>Cantidad</Th>
                  <Th textAlign="right" color="gray.500" py={4}>Ingreso Generado</Th>
                </Tr>
              </Thead>
              <Tbody>
                {salesAgg.map((row, index) => (
                  <Tr key={row.id_producto} _hover={{ bg: rowHoverBg }} transition="background 0.2s">
                    <Td textAlign="center" fontWeight="bold" color={textMuted}>{index + 1}</Td>
                    <Td textAlign="left" fontWeight="medium">
                      {row.nombre_producto}
                      {index === 0 && (
                        <Badge ml={2} colorScheme="yellow" variant="subtle" fontSize="0.7em" px={2} py={0.5} borderRadius="full">
                          TOP 1
                        </Badge>
                      )}
                    </Td>
                    <Td textAlign="center">{row.total_cantidad}</Td>
                    <Td textAlign="right" fontWeight="semibold" color={montoColor}>
                      {formatoLempira.format(row.total_vendido)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </>
      )}

      {/* Modal de columnas para exportar */}
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Exportar Productos Más Vendidos</ModalHeader>
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato de Exportación</FormLabel>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
              </Select>
            </FormControl>

            <Divider mb={4} />

            <FormLabel fontWeight="bold">Columnas a exportar</FormLabel>
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
              onClick={exportFormat === "pdf" ? exportToPDF : exportToExcel}
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
