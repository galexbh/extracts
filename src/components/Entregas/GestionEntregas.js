// src/components/Entregas/GestionEntregas.jsx
import React, { useState } from "react";
import {
  Box,
  Flex,
  FormControl,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  IconButton,
  Checkbox,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useColorModeValue,
  useToast,
  Heading,
  Divider,
  HStack,
  Select,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt, FaFilePdf, FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";

/** =======================
 *  Constantes y utilidades
 *  ======================= */
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Gestión de Entregas";

// Convierte 1->A, 2->B, ..., 27->AA
const excelCol = (n) => {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};

// 👇 Lista ajustada: SIN hora/recibido/firma (se movieron al Detalle)
const allColumns = [
  "ID",
  "Pedido",
  "Factura",
  "Fecha",
  "Destino",
  "Observaciones",
  "Estado",
];

const columnExtractors = {
  ID: (e) => e.id_entrega,
  Pedido: (e) => e.id_pedido,            // ← número de pedido (del módulo Pedidos)
  Factura: (e) => e.id_factura,          // ← número de factura (del módulo Facturas)
  Fecha: (e) => e.fecha_entrega,
  Destino: (e) => e.destino,
  Observaciones: (e) => e.observaciones,
  Estado: (e) => e.id_estado_entrega,
};

/** =======================
 *  Exportar a PDF (estilo pro)
 *  ======================= */
const exportToPDF = (data, columns) => {
  const doc = new jsPDF();
  const m = 14;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString("es-ES");

  // Encabezado
  doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
  doc.setFontSize(14).setTextColor(102, 187, 106).text(REPORT_TITLE, w / 2, 30, { align: "center" });
  doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

  // Logo
  try {
    const img = doc.getImageProperties(logo);
    const imgW = 20;
    const imgH = (img.height * imgW) / img.width;
    doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
  } catch (e) {}

  // Línea divisoria
  doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

  // Tabla
  autoTable(doc, {
    startY: 40,
    head: [columns],
    body: data.map((row) => columns.map((c) => columnExtractors[c](row))),
    theme: "grid",
    headStyles: { fillColor: [200, 255, 200], textColor: [0, 80, 0] },
    margin: { left: m, right: m },
    styles: { fontSize: 8, cellPadding: 2 },
    didDrawPage: () => {
      const p = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
    },
  });

  doc.save("reporte_entregas.pdf");
};

/** ===========================
 *  Exportar a Excel (estilo pro)
 *  =========================== */
const exportToExcel = async (data, columns) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Entregas", { views: [{ state: "frozen", ySplit: 4 }] });

  const dateStr = new Date().toLocaleDateString("es-ES");
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
    value: REPORT_TITLE,
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
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    });
  });

  // Datos
  data.forEach((row) => {
    const r = ws.addRow(columns.map((c) => columnExtractors[c](row)));
    r.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
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
  saveAs(new Blob([buf]), "reporte_entregas.xlsx");
};

export default function GestionEntregas() {
  const navigate = useNavigate();
  const toast = useToast();

  const bgContainer = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgFilter = useColorModeValue("gray.200", "gray.700");
  const modalBg = useColorModeValue("white", "gray.800");
  const accent = useColorModeValue("teal.600", "teal.300");

  // ✅ Datos ejemplo: enlazando pedido 1 (módulo Pedidos) y factura 0001 (módulo Facturas)
  const [entregas, setEntregas] = useState([
    {
      id_entrega: 6001,
      id_pedido: 1,              // ← número de pedido
      id_factura: "0001",        // ← número de factura
      fecha_entrega: "2025-08-12",
      destino: "Res. Roble Oeste, Casa #25, DC, F.M.",
      observaciones: "Programada 09:30 am",
      id_estado_entrega: "Pendiente",
    },
    {
      id_entrega: 6002,
      id_pedido: 2,
      id_factura: "0002",
      fecha_entrega: "2025-08-13",
      destino: "Sucursal Sur",
      observaciones: "Sin novedades",
      id_estado_entrega: "Pendiente",
    },
  ]);

  const [filters, setFilters] = useState({
    id_entrega: "",
    id_pedido: "",
    id_factura: "",
    fecha_entrega: "",
    destino: "",
    observaciones: "",
    id_estado_entrega: "",
  });

  const [selectedEntrega, setSelectedEntrega] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isColsOpen, onOpen: onColsOpen, onClose: onColsClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState(null);
  const [colsToExport, setColsToExport] = useState([...allColumns]);

  // Filtrado
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };
  const filteredEntregas = entregas.filter((e) =>
    Object.entries(filters).every(
      ([k, v]) => !v || (e[k] ?? "").toString().toLowerCase().includes(v.toLowerCase())
    )
  );

  // CRUD
  const resetForm = () => {
    setSelectedEntrega({
      id_entrega: null,
      id_pedido: "",
      id_factura: "",
      fecha_entrega: "",
      destino: "",
      observaciones: "",
      id_estado_entrega: "",
    });
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedEntrega((prev) => ({ ...prev, [name]: value }));
  };
  const handleSave = () => {
    if (selectedEntrega?.id_entrega) {
      setEntregas((prev) =>
        prev.map((x) => (x.id_entrega === selectedEntrega.id_entrega ? selectedEntrega : x))
      );
      toast({ title: "Entrega actualizada", status: "success" });
    } else {
      setEntregas((prev) => [
        ...prev,
        {
          ...selectedEntrega,
          id_entrega: Math.max(0, ...prev.map((x) => x.id_entrega || 0)) + 1,
        },
      ]);
      toast({ title: "Entrega agregada", status: "success" });
    }
    onClose();
  };
  const handleEdit = (e) => {
    setSelectedEntrega(e);
    onOpen();
  };

  // Selección múltiple
  const handleCheckboxChange = (e, id) => {
    setSelectedIds((sel) => (e.target.checked ? [...sel, id] : sel.filter((x) => x !== id)));
  };
  const handleDeleteSelected = () => {
    setEntregas((prev) => prev.filter((e) => !selectedIds.includes(e.id_entrega)));
    setSelectedIds([]);
    toast({ title: "Entrega(s) eliminada(s)", status: "info" });
  };

  return (
    <>
      {/* Encabezado */}
      <Box p={2}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent} mb={2}>
            Gestión de Entregas
          </Heading>
        </Flex>
        <Divider mb={12} />
      </Box>

      {/* Contenedor */}
      <Box
        p={4}
        bg={bgContainer}
        mt={4}
        mx={8}
        borderRadius="lg"
        boxShadow="lg"
        borderWidth="1px"
        borderColor={borderColor}
        minH="500px"
        position="relative"
      >
        {/* Atrás */}
        <Button mb={4} size="sm" onClick={() => navigate(-1)}>
          ←
        </Button>

        {/* Filtros compactos */}
        <Flex mb={4} wrap="wrap" gap={2} mt={1}>
          {Object.entries(filters).map(([key, val]) => (
            <FormControl key={key} w="auto">
              <Input
                name={key}
                value={val}
                onChange={handleFilterChange}
                placeholder={
                  {
                    id_entrega: "ID",
                    id_pedido: "Pedido",
                    id_factura: "Factura",
                    fecha_entrega: "Fecha",
                    destino: "Destino",
                    observaciones: "Observaciones",
                    id_estado_entrega: "Estado",
                  }[key]
                }
                bg={bgFilter}
                size="xs"
                h="30px"
                fontSize="xs"
                borderRadius="md"
                textAlign="center"
              />
            </FormControl>
          ))}
        </Flex>

        {/* Botones ABSOLUTOS arriba-derecha */}
        <HStack spacing={3} position="absolute" top="-50px" right="16px" zIndex="1">
          {selectedIds.length > 0 ? (
            <Menu>
              <MenuButton as={Button} colorScheme="blue" size="sm">
                Acciones
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleDeleteSelected}>Eliminar</MenuItem>
                <MenuItem
                  onClick={() => {
                    const first = entregas.find((e) => selectedIds.includes(e.id_entrega));
                    if (first) handleEdit(first);
                  }}
                >
                  Editar
                </MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <>
              <Button
                colorScheme="green"
                size="sm"
                onClick={() => {
                  resetForm();
                  onOpen();
                }}
              >
                + Agregar Entrega
              </Button>
              <Menu>
                <MenuButton as={Button} colorScheme="green" size="sm">
                  Reporte
                </MenuButton>
                <MenuList>
                  <MenuItem
                    icon={<FaFilePdf />}
                    onClick={() => {
                      setExportFormat("pdf");
                      onColsOpen();
                    }}
                  >
                    Exportar a PDF
                  </MenuItem>
                  <MenuItem
                    icon={<FaFileExcel />}
                    onClick={() => {
                      setExportFormat("excel");
                      onColsOpen();
                    }}
                  >
                    Exportar a Excel
                  </MenuItem>
                </MenuList>
              </Menu>
              <IconButton
                colorScheme="gray"
                size="sm"
                aria-label="Recargar"
                icon={<FaSyncAlt />}
                onClick={() => window.location.reload()}
              />
            </>
          )}
        </HStack>

        {/* Tabla */}
        <Box overflowX="auto" mt="30px">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={
                      selectedIds.length === filteredEntregas.length && filteredEntregas.length > 0
                    }
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? filteredEntregas.map((x) => x.id_entrega) : [])
                    }
                  />
                </Th>
                {allColumns.map((col) => (
                  <Th key={col}>{col}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filteredEntregas.map((e) => (
                <Tr key={e.id_entrega}>
                  <Td>
                    <Checkbox
                      isChecked={selectedIds.includes(e.id_entrega)}
                      onChange={(ev) => {
                        ev.stopPropagation();
                        handleCheckboxChange(ev, e.id_entrega);
                      }}
                    />
                  </Td>
                  <Td onClick={() => handleEdit(e)} style={{ cursor: "pointer" }}>
                    {e.id_entrega}
                  </Td>
                  <Td>{e.id_pedido}</Td>
                  <Td>{e.id_factura}</Td>
                  <Td>{e.fecha_entrega}</Td>
                  <Td>{e.destino}</Td>
                  <Td>{e.observaciones}</Td>
                  <Td>{e.id_estado_entrega}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* Modal columnas a exportar */}
        <Modal isOpen={isColsOpen} onClose={onColsClose}>
          <ModalOverlay />
          <ModalContent bg={modalBg}>
            <ModalHeader>Columnas a exportar ({exportFormat?.toUpperCase()})</ModalHeader>
            <ModalBody>
              <Flex direction="column" gap={3}>
                {allColumns.map((col) => (
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
              </Flex>
            </ModalBody>
            <ModalFooter>
              <Button
                colorScheme="green"
                onClick={() => {
                  if (colsToExport.length === 0) {
                    toast({ title: "Selecciona al menos una columna", status: "warning" });
                    return;
                  }
                  if (exportFormat === "pdf") {
                    exportToPDF(filteredEntregas, colsToExport);
                  } else {
                    exportToExcel(filteredEntregas, colsToExport);
                  }
                  onColsClose();
                }}
              >
                Generar
              </Button>
              <Button variant="ghost" onClick={onColsClose} ml={3}>
                Cancelar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal agregar/editar */}
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent bg={modalBg}>
            <ModalHeader>
              {selectedEntrega?.id_entrega ? "Editar Entrega" : "Agregar Entrega"}
            </ModalHeader>
            <ModalBody>
              <FormControl mt={3}>
                <Input
                  name="id_pedido"
                  type="number"
                  value={selectedEntrega?.id_pedido || ""}
                  onChange={handleChange}
                  placeholder="N° de Pedido"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="id_factura"
                  value={selectedEntrega?.id_factura || ""}
                  onChange={handleChange}
                  placeholder="N° de Factura"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="fecha_entrega"
                  type="date"
                  value={selectedEntrega?.fecha_entrega || ""}
                  onChange={handleChange}
                  placeholder="Fecha"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="destino"
                  value={selectedEntrega?.destino || ""}
                  onChange={handleChange}
                  placeholder="Destino"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="observaciones"
                  value={selectedEntrega?.observaciones || ""}
                  onChange={handleChange}
                  placeholder="Observaciones"
                />
              </FormControl>
              <FormControl mt={3}>
                <Select
                  name="id_estado_entrega"
                  value={selectedEntrega?.id_estado_entrega || ""}
                  onChange={handleChange}
                  placeholder="Estado"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Entregado">Entregado</option>
                  <option value="Anulado">Anulado</option>
                </Select>
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={handleSave}>
                {selectedEntrega?.id_entrega ? "Guardar Cambios" : "Agregar Entrega"}
              </Button>
              <Button variant="ghost" onClick={onClose} ml={3}>
                Cancelar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </>
  );
}
