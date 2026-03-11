// ============================================================
// 📁 src/components/Contabilidad/Moras.js
// ============================================================

import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
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
  Spinner,
  Stack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt, FaFilePdf, FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";
import api from "../../api/apiClient"; // ✅ Importa el cliente Axios centralizado

// ============================================================
// CONFIGURACIÓN
// ============================================================
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Moras";

const allColumns = [
  "ID Mora",
  "Nombre del Cliente",
  "Días en Mora",
  "Estado",
  "Observaciones",
];

// Mapeo para el Excel/PDF
const columnExtractors = {
  "ID Mora": (m) => m.id_mora,
  "Nombre del Cliente": (m) => m.nombre_cliente,
  "Días en Mora": (m) => m.dias_mora,
  Estado: (m) => m.estado,
  Observaciones: (m) => m.observaciones,
};

// ============================================================
// Exportar PDF
// ============================================================
const exportToPDF = (data, columns, onCloseModal) => {
  const doc = new jsPDF();
  const m = 14;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString("es-ES");

  doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
  doc.setFontSize(14).setTextColor(102, 187, 106).text(REPORT_TITLE, w / 2, 30, { align: "center" });
  doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

  try {
    const img = doc.getImageProperties(logo);
    const imgW = 20;
    const imgH = (img.height * imgW) / img.width;
    doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
  } catch { }

  doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

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
      doc.setFontSize(10).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
    },
  });

  doc.save("reporte_moras.pdf");
  if (onCloseModal) onCloseModal();
};

// ============================================================
// Exportar Excel
// ============================================================
const exportToExcel = async (data, columns, onCloseModal) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Moras", { views: [{ state: "frozen", ySplit: 4 }] });
  const dateStr = new Date().toLocaleDateString("es-ES");

  ws.mergeCells("A1:E1");
  Object.assign(ws.getCell("A1"), {
    value: COMPANY_NAME,
    font: { size: 14, bold: true, color: { argb: "2E7D32" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:E2");
  Object.assign(ws.getCell("A2"), {
    value: REPORT_TITLE,
    font: { size: 12, bold: true, color: { argb: "66BB6A" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(2).height = 20;

  ws.mergeCells("A3:E3");
  Object.assign(ws.getCell("A3"), {
    value: `Fecha: ${dateStr}`,
    font: { size: 10 },
    alignment: { horizontal: "left", vertical: "middle" },
  });
  ws.getRow(3).height = 18;

  ws.addRow([]);
  const hdr = ws.addRow(columns);
  hdr.height = 20;
  hdr.eachCell((c) => {
    c.font = { bold: true, color: { argb: "005000" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "CCFFCC" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });

  data.forEach((row) => {
    ws.addRow(columns.map((c) => columnExtractors[c](row)));
  });

  ws.columns.forEach((col) => {
    col.width = 20;
    col.alignment = { horizontal: "center", vertical: "middle" };
  });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), "reporte_moras.xlsx");
  if (onCloseModal) onCloseModal();
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Mora() {
  const navigate = useNavigate();
  const toast = useToast();

  const bgContainer = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const modalBg = useColorModeValue("white", "gray.800");
  const accent = useColorModeValue("teal.600", "teal.300");

  const [moras, setMoras] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isColsOpen, onOpen: onColsOpen, onClose: onColsClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState("pdf"); // Default value for select
  const [colsToExport, setColsToExport] = useState([...allColumns]);

  const [editing, setEditing] = useState({
    id_mora: null,
    nombre_cliente: "",
    dias_mora: "",
    estado: "",
    observaciones: "",
  });

  // ============================================================
  // 🔹 Cargar Moras
  // ============================================================
  const fetchMoras = async () => {
    try {
      setLoading(true);
      const res = await api.get("/contabilidad/moras"); // ✅ Usa cliente con UID
      setMoras(res.data);
    } catch (err) {
      console.error(err);
      toast({ title: "Error al cargar moras", description: err.message, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoras();
  }, []);

  // ============================================================
  // 🔹 Guardar / Actualizar
  // ============================================================
  const handleSave = async () => {
    try {
      const method = editing.id_mora ? "put" : "post";
      const url = editing.id_mora
        ? `/contabilidad/moras/${editing.id_mora}`
        : `/contabilidad/moras`;

      const res = await api[method](url, editing); // ✅ Usa apiClient con headers UID
      toast({ title: res.data.message || "Mora guardada", status: "success" });
      onClose();
      fetchMoras();
    } catch (error) {
      toast({ title: "Error al guardar", description: error.message, status: "error" });
    }
  };

  // ============================================================
  // 🔹 Eliminar Seleccionadas
  // ============================================================
  const handleDeleteSelected = async () => {
    try {
      for (const id of selectedIds) {
        await api.delete(`/contabilidad/moras/${id}`); // ✅ apiClient
      }
      toast({ title: "Moras eliminadas", status: "success" });
      setSelectedIds([]);
      fetchMoras();
    } catch (err) {
      toast({ title: "Error al eliminar", description: err.message, status: "error" });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditing((p) => ({ ...p, [name]: value }));
  };

  /* ======================================
     🔹 PAGINACIÓN
     ====================================== */
  const totalPages = Math.ceil(moras.length / itemsPerPage);
  const paginatedMoras = moras.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  // ============================================================
  // 🔹 Render principal
  // ============================================================
  return (
    <>
      <Box p={2}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent} mb={2}>
            Moras
          </Heading>
        </Flex>
        <Divider mb={12} />
      </Box>

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
        <Button mb={4} size="sm" onClick={() => navigate(-1)}>
          ←
        </Button>

        {/* Botones superiores */}
        <HStack spacing={3} position="absolute" top="-50px" right="16px" zIndex="1">
          {selectedIds.length > 0 ? (
            <Menu>
              <MenuButton as={Button} colorScheme="blue" size="sm">
                Acciones
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleDeleteSelected}>Eliminar</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <>
              <Button
                colorScheme="green"
                size="sm"
                onClick={() => {
                  setEditing({});
                  onOpen();
                }}
              >
                + Agregar Mora
              </Button>
              <Button
                colorScheme="green"
                size="sm"
                onClick={onColsOpen}
              >
                Exportar
              </Button>
              <IconButton
                colorScheme="gray"
                size="sm"
                aria-label="Recargar"
                icon={<FaSyncAlt />}
                onClick={fetchMoras}
              />
            </>
          )}
        </HStack>

        {loading ? (
          <Flex justify="center" mt={10}>
            <Spinner size="lg" />
          </Flex>
        ) : (
          <Box overflowX="auto" mt="30px">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>
                    <Checkbox
                      isChecked={selectedIds.length === moras.length && moras.length > 0}
                      onChange={(e) =>
                        setSelectedIds(
                          e.target.checked ? moras.map((m) => m.id_mora) : []
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
                {paginatedMoras.map((m) => (
                  <Tr
                    key={m.id_mora}
                    onClick={() => {
                      setEditing(m);
                      onOpen();
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <Td>
                      <Checkbox
                        isChecked={selectedIds.includes(m.id_mora)}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedIds((sel) =>
                            e.target.checked
                              ? [...sel, m.id_mora]
                              : sel.filter((x) => x !== m.id_mora)
                          );
                        }}
                      />
                    </Td>
                    <Td>{m.id_mora}</Td>
                    <Td>{m.nombre_cliente}</Td>
                    <Td>{m.dias_mora}</Td>
                    <Td>{m.estado}</Td>
                    <Td>{m.observaciones}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Controles de Paginación */}
        <Flex justify="space-between" align="center" mt={4}>
          <Button
            size="sm"
            onClick={prevPage}
            isDisabled={currentPage === 1}
          >
            Anterior
          </Button>
          <Box fontSize="sm">
            Página {currentPage} de {totalPages || 1}
          </Box>
          <Button
            size="sm"
            onClick={nextPage}
            isDisabled={currentPage === totalPages || totalPages === 0}
          >
            Siguiente
          </Button>
        </Flex>

        {/* Modal Agregar / Editar */}
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent bg={modalBg}>
            <ModalHeader>{editing.id_mora ? "Editar Mora" : "Agregar Mora"}</ModalHeader>
            <ModalBody>
              <FormControl mt={3}>
                <Input
                  name="nombre_cliente"
                  value={editing.nombre_cliente || ""}
                  onChange={handleChange}
                  placeholder="Nombre del Cliente"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="dias_mora"
                  type="number"
                  value={editing.dias_mora || ""}
                  onChange={handleChange}
                  placeholder="Días en Mora"
                />
              </FormControl>
              <FormControl mt={3}>
                <Select
                  name="estado"
                  value={editing.estado || ""}
                  onChange={handleChange}
                  placeholder="Selecciona Estado"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagado">Pagado</option>
                </Select>
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="observaciones"
                  value={editing.observaciones || ""}
                  onChange={handleChange}
                  placeholder="Observaciones"
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={handleSave}>
                Guardar
              </Button>
              <Button variant="ghost" ml={3} onClick={onClose}>
                Cancelar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Selección de Columnas (Exportar) */}
        <Modal isOpen={isColsOpen} onClose={onColsClose} size="sm">
          <ModalOverlay />
          <ModalContent bg={modalBg}>
            <ModalHeader>Exportar Moras</ModalHeader>
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

              <FormLabel fontWeight="bold">Columnas a Exportar</FormLabel>
              <Stack spacing={2} maxHeight="200px" overflowY="auto">
                {allColumns.map((col) => (
                  <Checkbox
                    key={col}
                    isChecked={colsToExport.includes(col)}
                    onChange={(e) =>
                      setColsToExport((prev) =>
                        e.target.checked
                          ? [...prev, col]
                          : prev.filter((x) => x !== col)
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
                colorScheme="blue"
                mr={3}
                onClick={() => {
                  if (exportFormat === "pdf") {
                    exportToPDF(moras, colsToExport, onColsClose);
                  } else {
                    exportToExcel(moras, colsToExport, onColsClose);
                  }
                }}
                disabled={colsToExport.length === 0}
              >
                Generar
              </Button>
              <Button variant="ghost" onClick={onColsClose}>
                Cancelar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </>
  );
}
