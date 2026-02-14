// src/components/Contabilidad/pedidosdiarios.js
import React, { useMemo, useState } from "react";
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
} from "@chakra-ui/react";
import { ChevronDownIcon, RepeatIcon } from "@chakra-ui/icons";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";
import { pedidos, productos as allProds } from "../../data/pedidos";

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

  // 1) Prepara datos agrupados
  const rawData = useMemo(() => {
    const map = {};
    pedidos.forEach(({ fecha_reserva, productos }) =>
      productos.forEach(({ id_producto, cantidad }) => {
        const key = `${fecha_reserva}|${id_producto}`;
        map[key] = (map[key] || 0) + cantidad;
      })
    );
    return Object.entries(map).map(([k, cantidad]) => {
      const [fecha, id] = k.split("|");
      const prod = allProds.find((p) => p.id_producto === +id);
      return { fecha, producto: prod?.nombre || "", cantidad };
    });
  }, []);

  // 2) Estados de filtro y exportación
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState(null);
  const [selectedCols, setSelectedCols] = useState(ALL_COLUMNS);

  const toggleCol = (col) =>
    setSelectedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );

  // 3) Filtra por rango
  const data = useMemo(() => {
    return rawData
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .filter((r) => {
        if (fromDate && r.fecha < fromDate) return false;
        if (toDate && r.fecha > toDate) return false;
        return true;
      });
  }, [rawData, fromDate, toDate]);

  // 4) Limpia filtros
  const clearFilters = () => {
    setFromDate("");
    setToDate("");
  };

  // 5) Exportar a PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const m = 14,
      w = doc.internal.pageSize.getWidth(),
      h = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString("es-ES");

    doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
    doc.setFontSize(14).setTextColor(102, 187, 106).text(REPORT_TITLE, w / 2, 30, { align: "center" });
    doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

    const img = doc.getImageProperties(logo);
    const imgW = 20,
      imgH = (img.height * imgW) / img.width;
    doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
    doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

    autoTable(doc, {
      startY: 40,
      head: [selectedCols],
      body: data.map((r) => selectedCols.map((c) => extractors[c](r))),
      theme: "grid",
      headStyles: { fillColor: [200, 255, 200], textColor: [0, 80, 0] },
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

  // 6) Exportar a Excel
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
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "CCFFCC" } },
        font: { bold: true, color: { argb: "005000" } },
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

  // 7) Renderizado
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.600");

  return (
    <Box p={6} bg={bg} borderRadius="md" boxShadow="lg">
      {/* Título */}
      <Heading mb={1} size="md" color={useColorModeValue("teal.600", "teal.300")}>
        {REPORT_TITLE}
      </Heading>

      {/* Botón Atrás debajo del título */}
      <Button mt={1} mb={3} size="sm" onClick={() => navigate(-1)} w="fit-content">
        ←
      </Button>

      <Divider mb={4} />

      {/* Filtros Desde/Hasta, Limpiar y Exportar */}
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
        <Menu>
          <MenuButton as={Button} colorScheme="green" size="sm" rightIcon={<ChevronDownIcon />}>
            Exportar
          </MenuButton>
          <MenuList>
            <MenuItem
              icon={<FaFilePdf />}
              onClick={() => {
                setExportFormat("PDF");
                onOpen();
              }}
            >
              Exportar PDF
            </MenuItem>
            <MenuItem
              icon={<FaFileExcel />}
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

      {/* Tabla con líneas */}
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
            {data.map((row, idx) => (
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
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
