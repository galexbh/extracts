// src/components/Contabilidad/ReporteMoras.jsx
import React, { useMemo, useState } from "react";
import {
  Box, Flex, Table, Thead, Tbody, Tr, Th, Td, Button, IconButton,
  Menu, MenuButton, MenuList, MenuItem, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel,
  Input, useColorModeValue, Stack, Text, Checkbox, SimpleGrid, Heading, Divider, Spinner, useToast, Icon, Badge, Stat, StatNumber, StatLabel
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt, FaRegSmileWink, FaRegSadTear, FaFileInvoiceDollar, FaRegClock, FaUsersSlash } from "react-icons/fa";
import { ChevronDownIcon } from "@chakra-ui/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";
import api from "../../api/apiClient";

const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Clientes en Mora";

const formatoHNL = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const msDia = 24 * 60 * 60 * 1000;
const parseISO = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const hoyLocal = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const isMora = (c) => {
  const estado = String(c.id_estado_credito || "").toLowerCase();
  const venc = parseISO(c.fecha_vencimiento);
  const hoy = hoyLocal();
  if (!venc) return false;
  return estado === "mora" || (estado !== "pagado" && venc < hoy);
};
const diasEnMora = (c) => {
  const venc = parseISO(c.fecha_vencimiento);
  if (!venc) return 0;
  const dias = Math.floor((hoyLocal() - venc) / msDia);
  return Math.max(0, dias);
};
const lastColLetter = (len) => String.fromCharCode(64 + Math.max(1, len)); // A..Z

const ALL_COLUMNS = [
  "Cliente",
  "ID Detalle Pedido",
  "Deuda",
  "Fecha de Inicio",
  "Fecha de Vencimiento",
  "Días en Mora",
  "Estado",
];

const extractors = {
  "Cliente": (c) => c.nombre_cliente || c.id_cliente,
  "ID Detalle Pedido": (c) => c.id_detalle_pedidos,
  "Deuda": (c) => c.monto_credito,
  "Fecha de Inicio": (c) => c.fecha_inicio,
  "Fecha de Vencimiento": (c) => c.fecha_vencimiento,
  "Días en Mora": (c) => diasEnMora(c),
  "Estado": () => "Mora", // siempre Mora en esta vista
};

// ===== Exportadores =====
const exportPDF = (rows, cols) => {
  const doc = new jsPDF();
  const m = 14;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString("es-ES");

  // Encabezado
  doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
  doc.setFontSize(14).setTextColor(102, 187, 106).text(REPORT_TITLE, w / 2, 30, { align: "center" });
  doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);
  try {
    const img = doc.getImageProperties(logo);
    const imgW = 20, imgH = (img.height * imgW) / img.width;
    doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
  } catch { }
  doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

  const body = rows.map((c) =>
    cols.map((col) => {
      const val = extractors[col](c);
      if (col === "Deuda") return formatoHNL.format(Number(val || 0));
      if (col === "Días en Mora") return diasEnMora(c);
      return val ?? "";
    })
  );

  autoTable(doc, {
    startY: 40,
    head: [cols],
    body,
    theme: "grid",
    headStyles: { fillColor: [200, 255, 200], textColor: [0, 80, 0] },
    margin: { left: m, right: m },
    styles: { fontSize: 8, cellPadding: 2, halign: "center" },
    didDrawPage: () => {
      const p = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
    },
  });

  doc.save("reporte_clientes_en_mora.pdf");
};

const exportXLSX = async (rows, cols) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Clientes en Mora", { views: [{ state: "frozen", ySplit: 4 }] });
  const dateStr = new Date().toLocaleDateString("es-ES");
  const last = lastColLetter(cols.length);

  // Empresa
  ws.mergeCells(`A1:${last}1`);
  Object.assign(ws.getCell("A1"), {
    value: COMPANY_NAME,
    font: { size: 14, bold: true, color: { argb: "2E7D32" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(1).height = 24;

  // Título
  ws.mergeCells(`A2:${last}2`);
  Object.assign(ws.getCell("A2"), {
    value: REPORT_TITLE,
    font: { size: 12, bold: true, color: { argb: "66BB6A" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(2).height = 20;

  // Fecha
  ws.mergeCells(`A3:${last}3`);
  Object.assign(ws.getCell("A3"), {
    value: `Fecha: ${dateStr}`,
    font: { size: 10 },
    alignment: { horizontal: "left", vertical: "middle" },
  });
  ws.getRow(3).height = 18;

  // Encabezados
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

  // Filas
  rows.forEach((c) => {
    const row = cols.map((col) => {
      const val = extractors[col](c);
      if (col === "Deuda") return Number(val || 0);
      if (col === "Días en Mora") return diasEnMora(c);
      return val ?? "";
    });
    ws.addRow(row);
  });

  // Formato / anchos
  const deudaIdx = cols.indexOf("Deuda") + 1;
  ws.columns.forEach((col, i) => {
    const vals = col.values.slice(1);
    const mx = vals.reduce((m, v) => Math.max(m, (v ?? "").toString().length), 0);
    col.width = Math.min(mx + 5, 32);
    col.alignment = { horizontal: "center", vertical: "middle" };
    if (i + 1 === deudaIdx) col.numFmt = "#,##0.00";
  });

  ws.headerFooter = { oddFooter: "&CPágina &P" };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), "reporte_clientes_en_mora.xlsx");
};

export default function ReporteMoras() {
  const navigate = useNavigate();

  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const bgFilter = useColorModeValue("gray.100", "gray.700");
  const modalBg = useColorModeValue("white", "gray.800");
  const muted = useColorModeValue("gray.600", "gray.300");

  const kpiBg1 = useColorModeValue("linear(to-br, red.400, red.600)", "linear(to-br, red.600, red.900)");
  const kpiBg2 = useColorModeValue("linear(to-br, orange.400, orange.600)", "linear(to-br, orange.600, orange.900)");
  const kpiBg3 = useColorModeValue("linear(to-br, yellow.400, yellow.600)", "linear(to-br, yellow.600, yellow.900)");

  const titleColor = useColorModeValue("teal.600", "teal.300");
  const rowHoverBg = useColorModeValue("gray.50", "gray.700");

  const thBg = useColorModeValue("gray.50", "gray.700");
  const chartBg = useColorModeValue("white", "gray.700");
  const toast = useToast();

  const [creditos, setCreditos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch API
  React.useEffect(() => {
    const fetchCreditos = async () => {
      setLoading(true);
      try {
        const res = await api.get("/contabilidad/creditos");
        setCreditos(res.data || []);
      } catch (err) {
        toast({
          title: "Error cargando mora",
          description: "No se pudieron obtener los créditos.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCreditos();
  }, [toast]);

  // Filtros
  const [fNombre, setFNombre] = useState("");
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");
  const limpiarFiltros = () => { setFNombre(""); setFDesde(""); setFHasta(""); };

  // Exportación
  const { isOpen: isColsOpen, onOpen: onColsOpen, onClose: onColsClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState("pdf");     // "pdf" | "excel", por defecto "pdf"
  const [colsToExport, setColsToExport] = useState([...ALL_COLUMNS]);

  // Filas en mora
  const filas = useMemo(() => {
    const base = creditos.filter((c) => {
      const nom = c.nombre_cliente || c.id_cliente || "";
      const matchNombre = !fNombre || String(nom).toLowerCase().includes(fNombre.toLowerCase());
      const matchDesde = !fDesde || (c.fecha_inicio && c.fecha_inicio.substring(0, 10) >= fDesde);
      const matchHasta = !fHasta || (c.fecha_vencimiento && c.fecha_vencimiento.substring(0, 10) <= fHasta);
      return matchNombre && matchDesde && matchHasta;
    });
    const soloMora = base.filter(isMora);
    return soloMora.sort((a, b) => diasEnMora(b) - diasEnMora(a));
  }, [creditos, fNombre, fDesde, fHasta]);

  // KPIs
  const totalDeuda = useMemo(() => filas.reduce((acc, c) => acc + Number(c.monto_credito || 0), 0), [filas]);
  const promedioDias = useMemo(() => (filas.length ? Math.round(filas.reduce((a, c) => a + diasEnMora(c), 0) / filas.length) : 0), [filas]);
  const maxDias = useMemo(() => (filas.length ? Math.max(...filas.map(diasEnMora)) : 0), [filas]);

  return (
    <>
      {/* Título y botón atrás (botón debajo del título, alineado a la izquierda) */}
      <Box px={8} pt={4}>
        <Heading size="md" color={titleColor} mb={1}>
          {REPORT_TITLE}
        </Heading>
        <Box pl={2} mb={2}>
          <Button size="sm" onClick={() => navigate(-1)} w="fit-content">
            ←
          </Button>
        </Box>
      </Box>
      <Divider mb={6} />

      {/* Contenedor principal */}
      <Box
        p={6}
        bg={bg}
        borderWidth="1px"
        borderColor={border}
        borderRadius="lg"
        boxShadow="lg"
        mx={8}
        minH="500px"
      >
        {/* Filtros + Exportar */}
        <Flex mb={4} align="center" justify="space-between" wrap="wrap" gap={3}>
          <Flex align="flex-end" gap={4}>
            <FormControl w="auto">
              <FormLabel fontSize="sm" mb={1}>Cliente</FormLabel>
              <Input
                size="sm"
                w="220px"
                placeholder="Nombre del cliente"
                value={fNombre}
                onChange={(e) => setFNombre(e.target.value)}
                bg={bgFilter}
              />
            </FormControl>
            <FormControl w="auto">
              <FormLabel fontSize="sm" mb={1}>Desde (inicio)</FormLabel>
              <Input
                type="date"
                size="sm"
                w="160px"
                value={fDesde}
                onChange={(e) => setFDesde(e.target.value)}
                bg={bgFilter}
              />
            </FormControl>
            <FormControl w="auto">
              <FormLabel fontSize="sm" mb={1}>Hasta (vencimiento)</FormLabel>
              <Input
                type="date"
                size="sm"
                w="160px"
                value={fHasta}
                onChange={(e) => setFHasta(e.target.value)}
                bg={bgFilter}
              />
            </FormControl>
            <IconButton
              aria-label="Limpiar"
              icon={<FaSyncAlt />}
              size="sm"
              onClick={limpiarFiltros}
              mt={6}
            />
          </Flex>

          <Button colorScheme="green" size="sm" onClick={onColsOpen}>
            Exportar
          </Button>
        </Flex>

        {/* Descripción */}


        {/* KPIs Premium */}
        <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={6} mb={8}>
          <Box p={6} borderRadius="xl" bgGradient={kpiBg1} color="white" boxShadow="xl" position="relative" overflow="hidden">
            <Icon as={FaUsersSlash} boxSize={20} position="absolute" right="-4" bottom="-4" opacity={0.2} />
            <Stat>
              <StatLabel fontSize="lg" fontWeight="semibold" opacity={0.9}>Créditos en Mora</StatLabel>
              <StatNumber fontSize="4xl" fontWeight="extrabold">{filas.length}</StatNumber>
            </Stat>
          </Box>
          <Box p={6} borderRadius="xl" bgGradient={kpiBg2} color="white" boxShadow="xl" position="relative" overflow="hidden">
            <Icon as={FaFileInvoiceDollar} boxSize={20} position="absolute" right="-4" bottom="-4" opacity={0.2} />
            <Stat>
              <StatLabel fontSize="lg" fontWeight="semibold" opacity={0.9}>Deuda Total</StatLabel>
              <StatNumber fontSize="4xl" fontWeight="extrabold">{formatoHNL.format(totalDeuda)}</StatNumber>
            </Stat>
          </Box>
          <Box p={6} borderRadius="xl" bgGradient={kpiBg3} color="white" boxShadow="xl" position="relative" overflow="hidden">
            <Icon as={FaRegClock} boxSize={20} position="absolute" right="-4" bottom="-4" opacity={0.2} />
            <Stat>
              <StatLabel fontSize="lg" fontWeight="semibold" opacity={0.9}>Promedio Días Mora</StatLabel>
              <StatNumber fontSize="4xl" fontWeight="extrabold">{promedioDias} <Text as="span" fontSize="lg">días</Text></StatNumber>
            </Stat>
          </Box>
        </SimpleGrid>

        {/* Estado vacío y Tabla */}
        {loading ? (
          <Flex justify="center" align="center" minH="30vh">
            <Spinner size="xl" color="teal.500" thickness="4px" />
          </Flex>
        ) : filas.length === 0 ? (
          <Flex direction="column" align="center" justify="center" py={16} bg={chartBg} borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor={border}>
            {creditos.length === 0 ? (
              // Si la BD de créditos está vacía globalmente para mora
              <>
                <Icon as={FaRegSmileWink} boxSize={16} color="green.400" mb={4} />
                <Heading size="md" color={muted} mb={2}>¡Excelente Trabajo!</Heading>
                <Text color="gray.400" textAlign="center" maxW="sm">
                  Actualmente no tienes clientes registrados con pagos atrasados. Todas las carteras están sanas.
                </Text>
              </>
            ) : (
              // Si hay creditos pero el filtro los oculta
              <>
                <Icon as={FaSyncAlt} boxSize={12} color="gray.300" mb={4} />
                <Heading size="md" color={muted} mb={2}>Sin coincidencias</Heading>
                <Text color="gray.400" textAlign="center" maxW="sm">
                  Ajusta los filtros de búsqueda para encontrar clientes específicos en mora.
                </Text>
              </>
            )}
          </Flex>
        ) : (
          <Box borderRadius="xl" overflow="hidden" borderWidth="1px" borderColor={border} boxShadow="sm">
            <Table size="sm" variant="simple" borderCollapse="collapse">
              <Thead bg={thBg}>
                <Tr>
                  {ALL_COLUMNS.map((col, i) => (
                    <Th
                      key={col}
                      textAlign="center"
                      borderRight={i < ALL_COLUMNS.length - 1 ? "1px solid" : undefined}
                      borderColor={border}
                      color="gray.500" py={4}
                    >
                      {col}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {filas.map((c) => (
                  <Tr key={c.id_credito} _hover={{ bg: rowHoverBg }} transition="background 0.2s">
                    <Td textAlign="center" borderRight="1px solid" borderColor={border} fontWeight="medium">
                      {extractors["Cliente"](c)}
                    </Td>
                    <Td textAlign="center" borderRight="1px solid" borderColor={border}>
                      {extractors["ID Detalle Pedido"](c)}
                    </Td>
                    <Td textAlign="center" borderRight="1px solid" borderColor={border} fontWeight="bold" color="red.500">
                      {formatoHNL.format(extractors["Deuda"](c) || 0)}
                    </Td>
                    <Td textAlign="center" borderRight="1px solid" borderColor={border}>
                      {extractors["Fecha de Inicio"](c)?.substring(0, 10)}
                    </Td>
                    <Td textAlign="center" borderRight="1px solid" borderColor={border}>
                      {extractors["Fecha de Vencimiento"](c)?.substring(0, 10)}
                    </Td>
                    <Td textAlign="center" borderRight="1px solid" borderColor={border} color="orange.500" fontWeight="bold">
                      {extractors["Días en Mora"](c)} días
                    </Td>
                    <Td textAlign="center">
                      <Badge colorScheme="red" variant="subtle" borderRadius="full" px={2} py={0.5}>
                        {extractors["Estado"](c)}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      {/* Modal: seleccionar columnas para exportar */}
      <Modal isOpen={isColsOpen} onClose={onColsClose} size="sm">
        <ModalOverlay />
        <ModalContent bg={modalBg}>
          <ModalHeader>
            Exportar Clientes en Mora
          </ModalHeader>
          <ModalBody>
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
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
              </Box>
            </FormControl>

            <Divider mb={4} />

            <FormLabel fontWeight="bold">Columnas a Exportar</FormLabel>
            <Stack spacing={2} maxHeight="200px" overflowY="auto">
              {ALL_COLUMNS.map((col) => (
                <Checkbox
                  key={col}
                  isChecked={colsToExport.includes(col)}
                  onChange={(e) =>
                    setColsToExport((prev) =>
                      e.target.checked ? [...prev, col] : prev.filter((x) => x !== col)
                    )
                  }
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
              onClick={() => {
                if (exportFormat === "pdf") exportPDF(filas, colsToExport);
                else exportXLSX(filas, colsToExport);
                onColsClose();
              }}
              isDisabled={colsToExport.length === 0}
            >
              Generar
            </Button>
            <Button variant="ghost" onClick={onColsClose}>Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
