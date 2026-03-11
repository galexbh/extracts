// ============================================================
// 📁 src/components/Contabilidad/Creditos.js
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

/** =======================
 *  CONFIGURACIÓN
 *  ======================= */

const COMPANY_NAME = " Extractus ";
const REPORT_TITLE = "Reporte de Créditos";

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
  "Nombre del Cliente",
  "Numero de Pedido",
  "Monto",
  "Fecha de Inicio",
  "Fecha de Vencimiento",
  "Estado",
];

const formatoLempira = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const columnExtractors = {
  ID: (c) => c.id_credito,
  "Nombre del Cliente": (c) => c.id_cliente,
  "Numero de Pedido": (c) => c.id_detalle_pedidos,
  Monto: (c) => formatoLempira.format(c.monto_credito),
  "Fecha de Inicio": (c) => c.fecha_inicio?.slice(0, 10),
  "Fecha de Vencimiento": (c) => c.fecha_vencimiento?.slice(0, 10),
  Estado: (c) => c.id_estado_credito,
};

/** =======================
 *  Exportar PDF / Excel
 *  ======================= */
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
    styles: { fontSize: 8, cellPadding: 2, halign: "center" },
    didDrawPage: () => {
      const p = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(10).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
    },
  });

  doc.save("reporte_creditos.pdf");
  if (onCloseModal) onCloseModal();
};

const exportToExcel = async (data, columns, onCloseModal) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Créditos", { views: [{ state: "frozen", ySplit: 4 }] });
  const dateStr = new Date().toLocaleDateString("es-ES");
  const lastCol = excelCol(columns.length);

  ws.mergeCells(`A1:${lastCol}1`);
  Object.assign(ws.getCell("A1"), {
    value: COMPANY_NAME,
    font: { size: 14, bold: true, color: { argb: "2E7D32" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(1).height = 24;

  ws.mergeCells(`A2:${lastCol}2`);
  Object.assign(ws.getCell("A2"), {
    value: REPORT_TITLE,
    font: { size: 12, bold: true, color: { argb: "66BB6A" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(2).height = 20;

  ws.mergeCells(`A3:${lastCol}3`);
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

  data.forEach((row) => ws.addRow(columns.map((c) => columnExtractors[c](row))));

  ws.columns.forEach((col) => {
    col.width = 20;
    col.alignment = { horizontal: "center", vertical: "middle" };
  });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), "reporte_creditos.xlsx");
  if (onCloseModal) onCloseModal();
};

/** =======================
 *  COMPONENTE PRINCIPAL
 *  ======================= */
export default function Creditos() {
  const navigate = useNavigate();
  const toast = useToast();
  const bgContainer = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgFilter = useColorModeValue("gray.200", "gray.700");
  const modalBg = useColorModeValue("white", "gray.800");
  const accent = useColorModeValue("teal.600", "teal.300");

  const [creditos, setCreditos] = useState([]);
  const [filters, setFilters] = useState({
    id_cliente: "",
    id_detalle_pedidos: "",
    monto_credito: "",
    fecha_inicio: "",
    fecha_vencimiento: "",
    id_estado_credito: "",
  });
  const [selectedCredito, setSelectedCredito] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isColsOpen, onOpen: onColsOpen, onClose: onColsClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState("pdf"); // Default value for select
  const [colsToExport, setColsToExport] = useState([...allColumns]);
  const [loading, setLoading] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ================== CRUD ==================
  const fetchCreditos = async () => {
    try {
      setLoading(true);
      const res = await api.get("/contabilidad/creditos"); // ✅ usa apiClient
      setCreditos(res.data);
    } catch (err) {
      toast({ title: "Error al cargar créditos", description: err.message, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditos();
  }, []);

  const handleSave = async () => {
    try {
      const method = selectedCredito.id_credito ? "put" : "post";
      const url = selectedCredito.id_credito
        ? `/contabilidad/creditos/${selectedCredito.id_credito}`
        : `/contabilidad/creditos`;

      const res = await api[method](url, selectedCredito); // ✅ usa apiClient (envía UID)
      toast({ title: res.data.message || "Crédito guardado", status: "success" });
      onClose();
      fetchCreditos();
    } catch (err) {
      toast({ title: "Error al guardar", description: err.message, status: "error" });
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (const id of selectedIds) {
        await api.delete(`/contabilidad/creditos/${id}`); // ✅ usa apiClient
      }
      toast({ title: "Créditos eliminados", status: "success" });
      setSelectedIds([]);
      fetchCreditos();
    } catch (err) {
      toast({ title: "Error al eliminar", description: err.message, status: "error" });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedCredito((p) => ({ ...p, [name]: value }));
  };

  const filteredCreditos = creditos.filter((c) =>
    Object.entries(filters).every(
      ([k, v]) => !v || c[k]?.toString().toLowerCase().includes(v.toLowerCase())
    )
  );

  /* ======================================
     🔹 PAGINACIÓN
     ====================================== */
  const totalPages = Math.ceil(filteredCreditos.length / itemsPerPage);
  const paginatedCreditos = filteredCreditos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  const handleFilterChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
    setCurrentPage(1); // Reset page on filter
  };

  return (
    <>
      {/* Encabezado */}
      <Box p={2}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent} mb={2}>
            Créditos
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
        <Button mb={4} size="sm" onClick={() => navigate(-1)}>
          ←
        </Button>

        {/* Filtros */}
        <Flex mb={4} wrap="wrap" gap={2} mt={1}>
          {Object.entries(filters).map(([key, val]) => (
            <FormControl key={key} w="auto">
              <Input
                name={key}
                value={val}
                onChange={handleFilterChange}
                placeholder={key.replace(/_/g, " ")}
                bg={bgFilter}
                size="xs"
                textAlign="center"
              />
            </FormControl>
          ))}
        </Flex>

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
                  setSelectedCredito({});
                  onOpen();
                }}
              >
                + Agregar Crédito
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
                onClick={fetchCreditos}
              />
            </>
          )}
        </HStack>

        {/* Tabla */}
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
                      isChecked={
                        selectedIds.length === filteredCreditos.length && filteredCreditos.length > 0
                      }
                      onChange={(e) =>
                        setSelectedIds(
                          e.target.checked
                            ? filteredCreditos.map((c) => c.id_credito)
                            : []
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
                {paginatedCreditos.map((c) => (
                  <Tr
                    key={c.id_credito}
                    onClick={() => {
                      setSelectedCredito(c);
                      onOpen();
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <Td>
                      <Checkbox
                        isChecked={selectedIds.includes(c.id_credito)}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedIds((sel) =>
                            e.target.checked
                              ? [...sel, c.id_credito]
                              : sel.filter((x) => x !== c.id_credito)
                          );
                        }}
                      />
                    </Td>
                    <Td>{c.id_credito}</Td>
                    <Td>{c.id_cliente}</Td>
                    <Td>{c.id_detalle_pedidos}</Td>
                    <Td>{formatoLempira.format(c.monto_credito)}</Td>
                    <Td>{c.fecha_inicio?.slice(0, 10)}</Td>
                    <Td>{c.fecha_vencimiento?.slice(0, 10)}</Td>
                    <Td>{c.id_estado_credito}</Td>
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

        {/* Modal agregar / editar */}
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent bg={modalBg} zIndex="modal">
            <ModalHeader>
              {selectedCredito?.id_credito ? "Editar Crédito" : "Agregar Crédito"}
            </ModalHeader>
            <ModalBody>
              <FormControl mt={3}>
                <Input
                  name="id_cliente"
                  value={selectedCredito?.id_cliente || ""}
                  onChange={handleChange}
                  placeholder="Nombre del Cliente"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="id_detalle_pedidos"
                  type="number"
                  value={selectedCredito?.id_detalle_pedidos || ""}
                  onChange={handleChange}
                  placeholder="Número de Pedido"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="monto_credito"
                  type="number"
                  value={selectedCredito?.monto_credito || ""}
                  onChange={handleChange}
                  placeholder="Monto del Crédito"
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="fecha_inicio"
                  type="date"
                  value={selectedCredito?.fecha_inicio?.slice(0, 10) || ""}
                  onChange={handleChange}
                />
              </FormControl>
              <FormControl mt={3}>
                <Input
                  name="fecha_vencimiento"
                  type="date"
                  value={selectedCredito?.fecha_vencimiento?.slice(0, 10) || ""}
                  onChange={handleChange}
                />
              </FormControl>
              <FormControl mt={3}>
                <Select
                  name="id_estado_credito"
                  value={selectedCredito?.id_estado_credito || ""}
                  onChange={handleChange}
                  placeholder="Selecciona Estado"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagado">Pagado</option>
                  <option value="Mora">Mora</option>
                </Select>
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={handleSave}>
                {selectedCredito?.id_credito ? "Guardar Cambios" : "Agregar Crédito"}
              </Button>
              <Button variant="ghost" onClick={onClose} ml={3}>
                Cancelar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal Selección de Columnas (Exportar) */}
        <Modal isOpen={isColsOpen} onClose={onColsClose} size="sm">
          <ModalOverlay />
          <ModalContent bg={modalBg}>
            <ModalHeader>Exportar Créditos</ModalHeader>
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
                    exportToPDF(filteredCreditos, colsToExport, onColsClose);
                  } else {
                    exportToExcel(filteredCreditos, colsToExport, onColsClose);
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
