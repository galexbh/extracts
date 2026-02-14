// src/components/Contabilidad/ReporteMoras.jsx
import React, { useMemo, useState } from "react";
import {
  Box, Flex, Table, Thead, Tbody, Tr, Th, Td, Button, IconButton,
  Menu, MenuButton, MenuList, MenuItem, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, FormControl, FormLabel,
  Input, useColorModeValue, Stack, Text, Checkbox, SimpleGrid, Heading, Divider
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt, FaFilePdf, FaFileExcel } from "react-icons/fa";
import { ChevronDownIcon } from "@chakra-ui/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";

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
  "Numero de Pedido",
  "Deuda",
  "Fecha de Inicio",
  "Fecha de Vencimiento",
  "Días en Mora",
  "Estado",
];

const extractors = {
  "Cliente": (c) => c.id_cliente,
  "Numero de Pedido": (c) => c.id_pedido,
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
  doc.setFontSize(18).setTextColor(46,125,50).text(COMPANY_NAME, w/2, 20, { align: "center" });
  doc.setFontSize(14).setTextColor(102,187,106).text(REPORT_TITLE, w/2, 30, { align: "center" });
  doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);
  try {
    const img = doc.getImageProperties(logo);
    const imgW = 20, imgH = (img.height * imgW) / img.width;
    doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
  } catch {}
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

  const kpiBg = useColorModeValue("green.50", "green.900");
  const kpiText = useColorModeValue("green.700", "green.200");
  const kpiBorder = useColorModeValue("green.200", "green.700");

  // Demo data
  const [creditos] = useState([
    { id_credito:1, id_cliente:"Juan Perez",       id_pedido:5001, monto_credito:1500.5, fecha_inicio:"2025-06-20", fecha_vencimiento:"2025-07-20", id_estado_credito:"Pendiente" },
    { id_credito:2, id_cliente:"Carmen Gutiérrez", id_pedido:5002, monto_credito:1700.0, fecha_inicio:"2025-07-01", fecha_vencimiento:"2025-08-10", id_estado_credito:"Pagado" },
    { id_credito:3, id_cliente:"Carla Fernández",  id_pedido:5003, monto_credito:1900.0, fecha_inicio:"2025-07-05", fecha_vencimiento:"2025-07-25", id_estado_credito:"Mora" },
    { id_credito:4, id_cliente:"Mario López",      id_pedido:5004, monto_credito:1200.0, fecha_inicio:"2025-07-15", fecha_vencimiento:"2025-08-05", id_estado_credito:"Pendiente" },
  ]);

  // Filtros
  const [fNombre, setFNombre] = useState("");
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");
  const limpiarFiltros = () => { setFNombre(""); setFDesde(""); setFHasta(""); };

  // Exportación
  const { isOpen: isColsOpen, onOpen: onColsOpen, onClose: onColsClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState(null);     // "pdf" | "excel"
  const [colsToExport, setColsToExport] = useState([...ALL_COLUMNS]);

  // Filas en mora
  const filas = useMemo(() => {
    const base = creditos.filter((c) => {
      const matchNombre = !fNombre || String(c.id_cliente).toLowerCase().includes(fNombre.toLowerCase());
      const matchDesde  = !fDesde  || (c.fecha_inicio >= fDesde);
      const matchHasta  = !fHasta  || (c.fecha_vencimiento <= fHasta);
      return matchNombre && matchDesde && matchHasta;
    });
    const soloMora = base.filter(isMora);
    return soloMora.sort((a, b) => diasEnMora(b) - diasEnMora(a));
  }, [creditos, fNombre, fDesde, fHasta]);

  // KPIs
  const totalDeuda = useMemo(() => filas.reduce((acc, c) => acc + Number(c.monto_credito || 0), 0), [filas]);
  const promedioDias = useMemo(() => (filas.length ? Math.round(filas.reduce((a,c)=>a+diasEnMora(c),0)/filas.length) : 0), [filas]);
  const maxDias = useMemo(() => (filas.length ? Math.max(...filas.map(diasEnMora)) : 0), [filas]);

  return (
    <>
      {/* Título y botón atrás (botón debajo del título, alineado a la izquierda) */}
      <Box px={8} pt={4}>
        <Heading size="md" color={useColorModeValue("teal.600", "teal.300")} mb={1}>
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

          <Menu>
            <MenuButton as={Button} colorScheme="green" size="sm" rightIcon={<ChevronDownIcon />}>
              Exportar
            </MenuButton>
            <MenuList>
              <MenuItem icon={<FaFilePdf />} onClick={() => { setExportFormat("pdf"); onColsOpen(); }}>
                Exportar PDF
              </MenuItem>
              <MenuItem icon={<FaFileExcel />} onClick={() => { setExportFormat("excel"); onColsOpen(); }}>
                Exportar Excel
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>

        {/* Descripción */}
     

        {/* KPIs */}
        <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4} mb={6}>
          <Box p={4} bg={kpiBg} border="1px solid" borderColor={kpiBorder} borderRadius="lg" boxShadow="sm">
            <Text fontSize="xs" color={kpiText} mb={1}>Créditos en mora</Text>
            <Text fontWeight="bold">{filas.length}</Text>
          </Box>
          <Box p={4} bg={kpiBg} border="1px solid" borderColor={kpiBorder} borderRadius="lg" boxShadow="sm">
            <Text fontSize="xs" color={kpiText} mb={1}>Deuda total</Text>
            <Text fontWeight="bold">{formatoHNL.format(totalDeuda)}</Text>
          </Box>
          <Box p={4} bg={kpiBg} border="1px solid" borderColor={kpiBorder} borderRadius="lg" boxShadow="sm">
            <Text fontSize="xs" color={kpiText} mb={1}>Días en mora (promedio / máx)</Text>
            <Text fontWeight="bold">{promedioDias} / {maxDias}</Text>
          </Box>
        </SimpleGrid>

        {/* Tabla */}
        <Box borderRadius="md" p={0}>
          <Table size="sm" variant="simple" borderX="1px solid" borderColor={border} borderCollapse="collapse">
            <Thead>
              <Tr>
                {ALL_COLUMNS.map((col, i) => (
                  <Th
                    key={col}
                    textAlign="center"
                    borderRight={i < ALL_COLUMNS.length - 1 ? "1px solid" : undefined}
                    borderColor={border}
                    borderBottom="1px solid"
                  >
                    {col}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filas.map((c) => (
                <Tr key={c.id_credito}>
                  <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                    {extractors["Cliente"](c)}
                  </Td>
                  <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                    {extractors["Numero de Pedido"](c)}
                  </Td>
                  <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                    {formatoHNL.format(extractors["Deuda"](c) || 0)}
                  </Td>
                  <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                    {extractors["Fecha de Inicio"](c)}
                  </Td>
                  <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                    {extractors["Fecha de Vencimiento"](c)}
                  </Td>
                  <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                    {extractors["Días en Mora"](c)}
                  </Td>
                  <Td textAlign="center" borderBottom="1px solid">
                    {extractors["Estado"](c)}
                  </Td>
                </Tr>
              ))}
              {filas.length === 0 && (
                <Tr>
                  <Td colSpan={ALL_COLUMNS.length}>
                    <Text fontStyle="italic" textAlign="center" py={3}>
                      Sin resultados con los filtros aplicados.
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* Modal: seleccionar columnas para exportar */}
      <Modal isOpen={isColsOpen} onClose={onColsClose} size="sm">
        <ModalOverlay />
        <ModalContent bg={modalBg}>
          <ModalHeader>
            Columnas a exportar {exportFormat ? `(${exportFormat.toUpperCase()})` : ""}
          </ModalHeader>
          <ModalBody>
            <Stack spacing={2}>
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
