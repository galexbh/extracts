// src/components/Produccion/InsumosUsados.jsx
import React, { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Divider,
  Button,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  Input,
  Select,
  HStack,
  useColorModeValue,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { FaSyncAlt, FaFilePdf, FaFileExcel } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";

/** =======================
 *  Constantes y utilidades
 *  ======================= */
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Insumos Usados";

// Convierte 1->A, 2->B, ..., 27->AA (para merges dinámicos en Excel)
const excelCol = (n) => {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};

const allColumns = [
  "ID",
  "Producto",
  "Insumo",
  "Cantidad",
  "Fecha",
];

const columnExtractors = {
  ID: (i) => i.id_usado,
  Producto: (i) => i.id_orden,
  Insumo: (i) => i.id_insumo,
  Cantidad: (i) => i.cantidad_utilizada,
  Fecha: (i) => i.fecha,
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

  // Logo (si falla, no bloquear)
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

  doc.save("reporte_insumos_usados.pdf");
};

/** ===========================
 *  Exportar a Excel (estilo pro)
 *  =========================== */
const exportToExcel = async (data, columns) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Insumos", { views: [{ state: "frozen", ySplit: 4 }] });

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
  saveAs(new Blob([buf]), "reporte_insumos_usados.xlsx");
};

export default function InsumosUsados() {
  const navigate = useNavigate();
  const toast = useToast();

  const bgContainer = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgFilter = useColorModeValue("gray.200", "gray.700");
  const modalBg = useColorModeValue("white", "gray.800");
  const accent = useColorModeValue("teal.600", "teal.300");

  // Catálogo para selects dependientes (opcional, no afecta diseño)
  const recetas = {
    Mora: ["Mora", "Agua"],
    Tamarindo: ["Tamarindo", "Agua", "Basi"],
    Limonada: ["Limón", "Agua", "Vaso"],
  };

  const [insumos, setInsumos] = useState([
    {
      id_usado: 1001,
      id_orden: "Mora",
      id_insumo: "Agua",
      cantidad_utilizada: "2",
      fecha: "2025-08-04T08:30",
    },
    {
      id_usado: 1002,
      id_orden: "Tamarindo",
      id_insumo: "Basi",
      cantidad_utilizada: "1.5",
      fecha: "2025-08-04T09:15",
    },
  ]);

  const [filters, setFilters] = useState({
    id_orden: "",
    id_insumo: "",
    cantidad_utilizada: "",
    fecha: "",
  });

  const [selectedInsumo, setSelectedInsumo] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isColsOpen, onOpen: onColsOpen, onClose: onColsClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState(null); // "pdf" | "excel"
  const [colsToExport, setColsToExport] = useState([...allColumns]);

  // Filtrado reactivo (igual que Créditos)
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };
  const filteredInsumos = insumos.filter((i) =>
    Object.entries(filters).every(
      ([k, v]) => !v || i[k]?.toString().toLowerCase().includes(v.toLowerCase())
    )
  );

  // CRUD (igual patrón que Créditos)
  const resetForm = () => {
    setSelectedInsumo({
      id_usado: null,
      id_orden: "",
      id_insumo: "",
      cantidad_utilizada: "",
      fecha: new Date().toISOString().slice(0, 16),
    });
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedInsumo((prev) => ({ ...prev, [name]: value }));
  };
  const handleProductoChange = (e) => {
    const producto = e.target.value;
    setSelectedInsumo((prev) => ({
      ...prev,
      id_orden: producto,
      id_insumo: recetas[producto]?.[0] || "",
    }));
  };
  const handleSave = () => {
    if (selectedInsumo.id_usado) {
      setInsumos((prev) =>
        prev.map((i) => (i.id_usado === selectedInsumo.id_usado ? selectedInsumo : i))
      );
    } else {
      setInsumos((prev) => [...prev, { ...selectedInsumo, id_usado: prev.length + 1 }]);
    }
    onClose();
  };
  const handleEdit = (i) => {
    setSelectedInsumo(i);
    onOpen();
  };

  // Selección múltiple (calcado)
  const handleCheckboxChange = (e, id) => {
    setSelectedIds((sel) => (e.target.checked ? [...sel, id] : sel.filter((x) => x !== id)));
  };
  const handleDeleteSelected = () => {
    setInsumos((prev) => prev.filter((i) => !selectedIds.includes(i.id_usado)));
    setSelectedIds([]);
  };

  return (
    <>
      {/* Encabezado fuera del contenedor */}
      <Box p={2}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent} mb={2}>
            Insumos Usados
          </Heading>
        </Flex>
        <Divider mb={12} />
      </Box>

      {/* Contenedor principal */}
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
        position="relative" // clave para posicionar los botones
      >
        {/* Flecha atrás */}
        <Button mb={4} size="sm" onClick={() => navigate(-1)}>
          ←
        </Button>

        {/* Filtros (idéntico patrón a Créditos) */}
        <Flex mb={4} wrap="wrap" gap={2} mt={1}>
          {Object.entries(filters).map(([key, val]) => (
            <FormControl key={key} w="auto">
              <Input
                name={key}
                value={val}
                onChange={handleFilterChange}
                placeholder={
                  {
                    id_orden: "Producto",
                    id_insumo: "Insumo",
                    cantidad_utilizada: "Cantidad",
                    fecha: "Fecha",
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

        {/* Botones ABSOLUTOS arriba-derecha (misma posición) */}
        <HStack
          spacing={3}
          position="absolute"
          top="-50px"
          right="16px"
          zIndex="1"
        >
          {selectedIds.length > 0 ? (
            <Menu>
              <MenuButton as={Button} colorScheme="blue" size="sm">
                Acciones
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleDeleteSelected}>Eliminar</MenuItem>
                <MenuItem
                  onClick={() =>
                    handleEdit(insumos.find((i) => selectedIds.includes(i.id_usado)))
                  }
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
                + Agregar Insumo
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

        {/* Tabla (mismo margen superior para no tapar con los botones) */}
        <Box overflowX="auto" mt="30px">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={selectedIds.length === filteredInsumos.length && filteredInsumos.length > 0}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? filteredInsumos.map((i) => i.id_usado) : [])
                    }
                  />
                </Th>
                {allColumns.map((col) => (
                  <Th key={col}>{col}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filteredInsumos.map((i) => (
                <Tr key={i.id_usado}>
                  <Td>
                    <Checkbox
                      isChecked={selectedIds.includes(i.id_usado)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCheckboxChange(e, i.id_usado);
                      }}
                    />
                  </Td>
                  <Td onClick={() => handleEdit(i)} style={{ cursor: "pointer" }}>
                    {i.id_usado}
                  </Td>
                  <Td>{i.id_orden}</Td>
                  <Td>{i.id_insumo}</Td>
                  <Td>{i.cantidad_utilizada}</Td>
                  <Td>{i.fecha}</Td>
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
                    exportToPDF(filteredInsumos, colsToExport);
                  } else {
                    exportToExcel(filteredInsumos, colsToExport);
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

        {/* Modal editar/agregar */}
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent bg={modalBg}>
            <ModalHeader>
              {selectedInsumo?.id_usado ? "Editar Insumo" : "Agregar Insumo"}
            </ModalHeader>
            <ModalBody>
              <FormControl mt={3}>
                <Select
                  name="id_orden"
                  value={selectedInsumo?.id_orden || ""}
                  onChange={handleProductoChange}
                  placeholder="Seleccionar Producto"
                >
                  {Object.keys(recetas).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl mt={3}>
                <Select
                  name="id_insumo"
                  value={selectedInsumo?.id_insumo || ""}
                  onChange={handleChange}
                  placeholder="Seleccionar Insumo"
                >
                  {(recetas[selectedInsumo?.id_orden] || []).map((ins) => (
                    <option key={ins} value={ins}>{ins}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="cantidad_utilizada"
                  type="number"
                  value={selectedInsumo?.cantidad_utilizada || ""}
                  onChange={handleChange}
                  placeholder="Cantidad"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="fecha"
                  type="datetime-local"
                  value={selectedInsumo?.fecha || ""}
                  onChange={handleChange}
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={handleSave}>
                {selectedInsumo?.id_usado ? "Guardar Cambios" : "Agregar Insumo"}
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
