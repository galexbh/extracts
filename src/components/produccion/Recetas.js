// src/components/Produccion/Recetas.jsx
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
  Textarea,
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
const REPORT_TITLE = "Reporte de Recetas";

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
  "Nombre",
  "Descripción",
  "Unidad",
  "Precio",
  "Estado",
  "Receta",
  "Fecha",
];

// Moneda HNL
const formatoLempira = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

// Mapa de extractores (PDF/Excel)
const columnExtractors = {
  ID: (r) => r.id,
  Nombre: (r) => r.nombre,
  Descripción: (r) => r.descripcion,
  Unidad: (r) => r.unidad_medida,
  Precio: (r) => formatoLempira.format(Number(r.precio_unitario || 0)),
  Estado: (r) => r.id_estado_producto,
  Receta: (r) => r.receta,
  Fecha: (r) => r.fecha,
};

/** =======================
 *  Exportar a PDF
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

  // Logo (si falla, continuar)
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

  doc.save("reporte_recetas.pdf");
};

/** ===========================
 *  Exportar a Excel
 *  =========================== */
const exportToExcel = async (data, columns) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Recetas", { views: [{ state: "frozen", ySplit: 4 }] });

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
  saveAs(new Blob([buf]), "reporte_recetas.xlsx");
};

export default function Recetas() {
  const navigate = useNavigate();
  const toast = useToast();

  const bgContainer = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgFilter = useColorModeValue("gray.200", "gray.700");
  const modalBg = useColorModeValue("white", "gray.800");
  const accent = useColorModeValue("teal.600", "teal.300");

  // Datos iniciales (como tu ejemplo)
  const [recetas, setRecetas] = useState([
    {
      id: 1,
      nombre: "Mora",
      descripcion: "Jugo de mora natural",
      unidad_medida: "onzas",
      precio_unitario: 10,
      id_estado_producto: "Activo",
      receta: "Mora + Agua + Azúcar",
      fecha: "2025-08-01",
    },
    {
      id: 2,
      nombre: "Naranja",
      descripcion: "Jugo de naranja exprimido",
      unidad_medida: "onzas",
      precio_unitario: 12,
      id_estado_producto: "Activo",
      receta: "Naranja + Agua",
      fecha: "2025-07-30",
    },
  ]);

  const [filters, setFilters] = useState({
    nombre: "",
    descripcion: "",
    unidad_medida: "",
    precio_unitario: "",
    id_estado_producto: "",
    receta: "",
    fecha: "",
  });

  const [selectedReceta, setSelectedReceta] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isColsOpen,
    onOpen: onColsOpen,
    onClose: onColsClose,
  } = useDisclosure();
  const [exportFormat, setExportFormat] = useState(null); // "pdf" | "excel"
  const [colsToExport, setColsToExport] = useState([...allColumns]);

  // Filtrado (idéntico patrón a Créditos)
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };
  const filteredRecetas = recetas.filter((r) =>
    Object.entries(filters).every(
      ([k, v]) => !v || (r[k] ?? "").toString().toLowerCase().includes(v.toLowerCase())
    )
  );

  // CRUD
  const resetForm = () => {
    setSelectedReceta({
      id: null,
      nombre: "",
      descripcion: "",
      unidad_medida: "",
      precio_unitario: "",
      id_estado_producto: "",
      receta: "",
      fecha: new Date().toISOString().split("T")[0],
    });
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedReceta((prev) => ({ ...prev, [name]: value }));
  };
  const handleSave = () => {
    const req = { ...selectedReceta };
    delete req.id;
    if (Object.values(req).some((v) => v === "" || v === null || v === undefined)) {
      toast({ title: "Completa todos los campos", status: "warning" });
      return;
    }
    if (selectedReceta.id) {
      setRecetas((prev) =>
        prev.map((r) => (r.id === selectedReceta.id ? selectedReceta : r))
      );
    } else {
      setRecetas((prev) => [
        ...prev,
        { ...selectedReceta, id: Math.max(0, ...prev.map((x) => x.id)) + 1 },
      ]);
    }
    onClose();
  };
  const handleEdit = (r) => {
    setSelectedReceta(r);
    onOpen();
  };

  // Selección múltiple
  const handleCheckboxChange = (e, id) => {
    setSelectedIds((sel) => (e.target.checked ? [...sel, id] : sel.filter((x) => x !== id)));
  };
  const handleDeleteSelected = () => {
    setRecetas((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
    setSelectedIds([]);
  };

  return (
    <>
      {/* Encabezado fuera del contenedor */}
      <Box p={2}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent} mb={2}>
            Recetas
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
        position="relative"
      >
        {/* Flecha atrás */}
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
                    nombre: "Nombre",
                    descripcion: "Descripción",
                    unidad_medida: "Unidad",
                    precio_unitario: "Precio",
                    id_estado_producto: "Estado",
                    receta: "Receta",
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

        {/* Botones ABSOLUTOS arriba-derecha (idéntico layout) */}
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
                    const first = recetas.find((r) => selectedIds.includes(r.id));
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
                + Agregar Receta
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

        {/* Tabla (margen para que no tape botones) */}
        <Box overflowX="auto" mt="30px">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={
                      selectedIds.length === filteredRecetas.length &&
                      filteredRecetas.length > 0
                    }
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? filteredRecetas.map((r) => r.id) : []
                      )
                    }
                  />
                </Th>
                {allColumns.map((col) => (
                  <Th key={col}>{col}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filteredRecetas.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Checkbox
                      isChecked={selectedIds.includes(r.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCheckboxChange(e, r.id);
                      }}
                    />
                  </Td>
                  <Td onClick={() => handleEdit(r)} style={{ cursor: "pointer" }}>
                    {r.id}
                  </Td>
                  <Td>{r.nombre}</Td>
                  <Td>{r.descripcion}</Td>
                  <Td>{r.unidad_medida}</Td>
                  <Td>{formatoLempira.format(Number(r.precio_unitario || 0))}</Td>
                  <Td>{r.id_estado_producto}</Td>
                  <Td>{r.receta}</Td>
                  <Td>{r.fecha}</Td>
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
                    exportToPDF(filteredRecetas, colsToExport);
                  } else {
                    exportToExcel(filteredRecetas, colsToExport);
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
              {selectedReceta?.id ? "Editar Receta" : "Agregar Receta"}
            </ModalHeader>
            <ModalBody>
              <FormControl mt={3}>
                <Input
                  name="nombre"
                  value={selectedReceta?.nombre || ""}
                  onChange={handleChange}
                  placeholder="Nombre"
                />
              </FormControl>
              <FormControl mt={3}>
                <Textarea
                  name="descripcion"
                  value={selectedReceta?.descripcion || ""}
                  onChange={handleChange}
                  placeholder="Descripción"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="unidad_medida"
                  value={selectedReceta?.unidad_medida || ""}
                  onChange={handleChange}
                  placeholder="Unidad de medida"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="precio_unitario"
                  type="number"
                  value={selectedReceta?.precio_unitario || ""}
                  onChange={handleChange}
                  placeholder="Precio unitario"
                />
              </FormControl>
              <FormControl mt={3}>
                <Select
                  name="id_estado_producto"
                  value={selectedReceta?.id_estado_producto || ""}
                  onChange={handleChange}
                  placeholder="Estado del producto"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </Select>
              </FormControl>
              <FormControl mt={3}>
                <Textarea
                  name="receta"
                  value={selectedReceta?.receta || ""}
                  onChange={handleChange}
                  placeholder="Receta"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="fecha"
                  type="date"
                  value={selectedReceta?.fecha || new Date().toISOString().split("T")[0]}
                  onChange={handleChange}
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={handleSave}>
                {selectedReceta?.id ? "Guardar Cambios" : "Agregar Receta"}
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
