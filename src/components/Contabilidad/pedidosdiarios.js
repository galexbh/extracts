// src/components/Contabilidad/pedidosdiarios.js
import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Flex,
  Heading,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Checkbox,
  useDisclosure,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Stack,
  FormControl,
  FormLabel,
  Input,
  IconButton,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { ChevronDownIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";
import api from "../../api/apiClient";

const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Pedidos Diarios";
const ALL_COLUMNS = ["Fecha", "Producto", "Cantidad"];
const extractors = {
  Fecha: (r) => r.fecha,
  Producto: (r) => r.producto,
  Cantidad: (r) => r.cantidad,
};

export default function PedidosDiarios() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState([]);

  // Cargar datos reales desde el backend
  useEffect(() => {
    const cargar = async () => {
      try {
        // Traer lista de pedidos
        const listRes = await api.get("/ventas/ventasyreserva/pedidos");
        const pedidosList = listRes.data || [];

        // Por cada pedido, obtener su detalle
        const map = {};
        await Promise.all(
          pedidosList.map(async (p) => {
            try {
              const detRes = await api.get(
                `/ventas/ventasyreserva/pedidos/${p.id_pedido}`
              );
              const { pedido: cab, detalle } = detRes.data;
              const fecha = cab.fecha_reserva?.substring(0, 10);
              detalle.forEach(({ nombre_producto, cantidad }) => {
                const key = `${fecha}|${nombre_producto}`;
                map[key] = (map[key] || 0) + Number(cantidad);
              });
            } catch { }
          })
        );

        const resultado = Object.entries(map).map(([k, cantidad]) => {
          const [fecha, producto] = k.split("|");
          return { fecha, producto, cantidad };
        });

        setRawData(resultado);
      } catch (err) {
        console.error("❌ Error cargando pedidos diarios:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  // Estados de filtro y exportación
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState(null);
  const [selectedCols, setSelectedCols] = useState(ALL_COLUMNS);

  const toggleCol = (col) =>
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );

  // Filtrar por rango de fechas
  const data = useMemo(() => {
    return rawData
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .filter((r) => {
        if (fromDate && r.fecha < fromDate) return false;
        if (toDate && r.fecha > toDate) return false;
        return true;
      });
  }, [rawData, fromDate, toDate]);

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
  };

  // Exportar a PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const m = 14,
      w = doc.internal.pageSize.getWidth(),
      h = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString("es-ES");

    doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
    doc.setFontSize(14).setTextColor(102, 187, 106).text(REPORT_TITLE, w / 2, 30, { align: "center" });
    doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

    try {
      const img = doc.getImageProperties(logo);
      const imgW = 20,
        imgH = (img.height * imgW) / img.width;
      doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
    } catch { }
    doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

    autoTable(doc, {
      startY: 40,
      head: [selectedCols],
      body: data.map((r) => selectedCols.map((c) => extractors[c](r))),
      theme: "grid",
      headStyles: { fillColor: [0, 128, 128], textColor: [255, 255, 255] },
      margin: { left: m, right: m },
      styles: { fontSize: 8, cellPadding: 2 },
      didDrawPage: () => {
        const p = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
      },
    });

    doc.save("pedidos_diarios.pdf");
    onClose();
  };

  // Exportar a Excel
  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("PedidosDiarios", {
      views: [{ state: "frozen", ySplit: 4 }],
    });
    const dateStr = new Date().toLocaleDateString("es-ES");

    ws.mergeCells("A1:C1");
    Object.assign(ws.getCell("A1"), {
      value: COMPANY_NAME,
      font: { size: 14, bold: true, color: { argb: "2E7D32" } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(1).height = 24;

    ws.mergeCells("A2:C2");
    Object.assign(ws.getCell("A2"), {
      value: REPORT_TITLE,
      font: { size: 12, bold: true, color: { argb: "66BB6A" } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(2).height = 20;

    ws.mergeCells("A3:C3");
    Object.assign(ws.getCell("A3"), {
      value: `Fecha: ${dateStr}`,
      font: { size: 10 },
      alignment: { horizontal: "left", vertical: "middle" },
    });
    ws.getRow(3).height = 18;

    ws.addRow([]);
    const hdr = ws.addRow(selectedCols);
    hdr.height = 20;
    hdr.eachCell((cell) => {
      Object.assign(cell, {
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "008080" } },
        font: { bold: true, color: { argb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "middle" },
      });
    });

    data.forEach((r) => ws.addRow(selectedCols.map((c) => extractors[c](r))));
    ws.columns.forEach((col) => {
      const vals = col.values.slice(1);
      const mx = vals.reduce((m, v) => Math.max(m, (v || "").toString().length), 0);
      col.width = Math.min(mx + 5, 30);
    });
    ws.headerFooter = { oddFooter: "&CPágina &P" };

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), "pedidos_diarios.xlsx");
    onClose();
  };

  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.600");
  const emptyColor = useColorModeValue("gray.400", "gray.500");

  if (loading)
    return (
      <Flex justify="center" align="center" minH="40vh">
        <Spinner size="xl" color="teal.400" />
      </Flex>
    );

  return (
    <Box p={6} bg={bg} borderRadius="md" boxShadow="lg">
      {/* Título */}
      <Heading mb={1} size="md" color={useColorModeValue("teal.600", "teal.300")}>
        {REPORT_TITLE}
      </Heading>

      {/* Botón Atrás */}
      <Button mt={1} mb={3} size="sm" onClick={() => navigate(-1)} w="fit-content">
        ←
      </Button>

      <Divider mb={4} />

      {/* Filtros + Exportar */}
      <Flex mb={4} align="center" justify="space-between" wrap="wrap" gap={3}>
        <Flex align="flex-end" gap={4} wrap="wrap">
          <FormControl>
            <FormLabel fontSize="sm" mb={1}>Desde</FormLabel>
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
            <FormLabel fontSize="sm" mb={1}>Hasta</FormLabel>
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

        <Flex align="center" gap={3}>
          <Text fontSize="sm" color={emptyColor}>
            {data.length} registro(s)
          </Text>
          <Menu>
            <MenuButton
              as={Button}
              colorScheme="teal"
              size="sm"
              rightIcon={<ChevronDownIcon />}
              isDisabled={fromDate && toDate && fromDate > toDate}
            >
              Exportar
            </MenuButton>
            <MenuList>
              <MenuItem
                icon={<FaFilePdf />}
                onClick={() => { setExportFormat("PDF"); onOpen(); }}
              >
                Exportar PDF
              </MenuItem>
              <MenuItem
                icon={<FaFileExcel />}
                onClick={() => { setExportFormat("EXCEL"); onOpen(); }}
              >
                Exportar Excel
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      {/* Modal columnas */}
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
              colorScheme="teal"
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

      {/* Tabla */}
      <Box borderRadius="md" p={0}>
        <Table
          size="sm"
          variant="simple"
          borderX="1px solid"
          borderColor={border}
          borderCollapse="collapse"
        >
          <Thead>
            <Tr>
              {selectedCols.map((col, i) => (
                <Th
                  key={col}
                  textAlign="center"
                  borderRight={i < selectedCols.length - 1 ? "1px solid" : undefined}
                  borderColor={border}
                  borderBottom="1px solid"
                >
                  {col}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {data.length === 0 ? (
              <Tr>
                <Td colSpan={selectedCols.length} textAlign="center" py={10} color={emptyColor}>
                  No hay datos para el rango de fechas seleccionado.
                </Td>
              </Tr>
            ) : (
              data.map((row, idx) => (
                <Tr key={idx}>
                  {selectedCols.includes("Fecha") && (
                    <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                      {row.fecha}
                    </Td>
                  )}
                  {selectedCols.includes("Producto") && (
                    <Td textAlign="center" borderRight="1px solid" borderColor={border} borderBottom="1px solid">
                      {row.producto}
                    </Td>
                  )}
                  {selectedCols.includes("Cantidad") && (
                    <Td textAlign="center" borderBottom="1px solid">
                      {row.cantidad}
                    </Td>
                  )}
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
