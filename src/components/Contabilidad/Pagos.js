// ============================================================
// 📁 src/components/Contabilidad/Pagos.js
// ============================================================

import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Flex, Table, Thead, Tbody, Tr, Th, Td, Button, IconButton, Checkbox,
  Menu, MenuButton, MenuList, MenuItem, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, FormControl, Input, Select,
  useColorModeValue, useToast, Heading, Divider, HStack, Stack, FormLabel
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt, FaFilePdf, FaFileExcel } from "react-icons/fa";
import { RepeatIcon } from "@chakra-ui/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";
import api from "../../api/apiClient"; // ✅ Cliente centralizado con UID

/* ======================================
   🔹 CONFIGURACIÓN GENERAL
   ====================================== */
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Pagos";

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
  "ID Pago",
  "Cliente",
  "Total Crédito",
  "Monto Pagado",
  "Fecha de Pago",
  "Observaciones",
  "Estado",
];

const formatoLempira = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const columnExtractors = {
  "ID Pago": (p) => p.id_pago,
  Cliente: (p) => p.cliente || "N/A",
  "Total Crédito": (p) => formatoLempira.format(p.total_credito || 0),
  "Monto Pagado": (p) => formatoLempira.format(p.monto_pagado || 0),
  "Fecha de Pago": (p) => (p.fecha_pago ? p.fecha_pago.split("T")[0] : ""),
  Observaciones: (p) => p.observaciones || "",
  Estado: (p) => p.estado || "",
};

/* ======================================
   🔹 FUNCIONES DE EXPORTACIÓN
   ====================================== */
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

  doc.save("reporte_pagos.pdf");
  if (onCloseModal) onCloseModal();
};

const exportToExcel = async (data, columns, onCloseModal) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pagos", { views: [{ state: "frozen", ySplit: 4 }] });
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
  saveAs(new Blob([buf]), "reporte_pagos.xlsx");
  if (onCloseModal) onCloseModal();
};

/* ======================================
   🔹 COMPONENTE PRINCIPAL
   ====================================== */
export default function Pagos() {
  const navigate = useNavigate();
  const toast = useToast();

  const bgContainer = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgFilter = useColorModeValue("gray.100", "gray.700");
  const modalBg = useColorModeValue("white", "gray.800");
  const accent = useColorModeValue("teal.600", "teal.300");

  const [pagos, setPagos] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState(
    allColumns.reduce((acc, col) => ({ ...acc, [col]: "" }), {})
  );

  const [selectedPago, setSelectedPago] = useState({
    id_pago: null,
    id_credito: "",
    fecha_pago: "",
    monto_pagado: "",
    monto_pendiente: "",
    observaciones: "",
  });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isColsOpen, onOpen: onColsOpen, onClose: onColsClose } = useDisclosure();
  const [exportFormat, setExportFormat] = useState("pdf"); // Default value for select
  const [colsToExport, setColsToExport] = useState([...allColumns]);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* ======================================
     🔹 FUNCIONES API CON apiClient
     ====================================== */
  const fetchPagos = async () => {
    try {
      setLoading(true);
      const res = await api.get("/contabilidad/pagos"); // ✅ UID en headers
      setPagos(res.data);
    } catch (err) {
      console.error("❌ Error cargando pagos:", err);
      toast({
        title: "Error cargando pagos",
        description: err.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const savePago = async () => {
    try {
      const method = selectedPago.id_pago ? "put" : "post";
      const url = selectedPago.id_pago
        ? `/contabilidad/pagos/${selectedPago.id_pago}`
        : `/contabilidad/pagos`;

      const res = await api[method](url, selectedPago); // ✅ Envia UID
      toast({ title: res.data.message || "Pago guardado", status: "success", duration: 2000 });
      fetchPagos();
      onClose();
    } catch (err) {
      console.error("❌ Error guardando pago:", err);
      toast({ title: "Error guardando pago", status: "error" });
    }
  };

  const deletePagos = async () => {
    try {
      for (const id of selectedIds) {
        await api.delete(`/contabilidad/pagos/${id}`); // ✅ apiClient
      }
      toast({ title: "Pagos eliminados", status: "info" });
      setSelectedIds([]);
      fetchPagos();
    } catch (err) {
      console.error("❌ Error eliminando pagos:", err);
    }
  };

  /* ======================================
     🔹 CICLO DE VIDA
     ====================================== */
  useEffect(() => {
    fetchPagos();
  }, []);

  /* ======================================
     🔹 FILTROS
     ====================================== */
  const filteredPagos = useMemo(
    () =>
      pagos.filter((p) =>
        allColumns.every((col) => {
          const v = (filters[col] || "").toLowerCase();
          return (
            !v ||
            columnExtractors[col](p).toString().toLowerCase().includes(v)
          );
        })
      ),
    [pagos, filters]
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters(allColumns.reduce((acc, col) => ({ ...acc, [col]: "" }), {}));
    setCurrentPage(1);
  };

  const handleCheckboxChange = (e, id) => {
    setSelectedIds((sel) =>
      e.target.checked ? [...sel, id] : sel.filter((x) => x !== id)
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedPago((s) => ({ ...s, [name]: value }));
  };

  const resetForm = () =>
    setSelectedPago({
      id_pago: null,
      id_credito: "",
      fecha_pago: "",
      monto_pagado: "",
      monto_pendiente: "",
      observaciones: "",
    });

  /* ======================================
     🔹 PAGINACIÓN
     ====================================== */
  const totalPages = Math.ceil(filteredPagos.length / itemsPerPage);
  const paginatedPagos = filteredPagos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  /* ======================================
     🔹 RENDER
     ====================================== */
  return (
    <>
      <Box p={2}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent} mb={2}>
            Pagos
          </Heading>
        </Flex>
        <Divider mb={14} />
      </Box>

      <Box
        mt={0}
        p={4}
        mx={8}
        bg={bgContainer}
        border="1px"
        borderColor={borderColor}
        borderRadius="lg"
        boxShadow="lg"
        minH="500px"
        position="relative"
      >
        <Flex mb={4}>
          <Button size="sm" onClick={() => navigate("/app/contabilidad")}>
  ← Atrás
</Button>
        </Flex>

        {/* Filtros */}
        <Flex mb={4} gap={2} flexWrap="nowrap" overflowX="auto">
          {allColumns.map((col) => (
            <FormControl key={col} w="160px">
              <Input
                name={col}
                value={filters[col]}
                onChange={handleFilterChange}
                placeholder={col}
                bg={bgFilter}
                size="sm"
                h="30px"
                borderRadius="md"
                textAlign="center"
                fontSize="xs"
              />
            </FormControl>
          ))}
          <IconButton
            aria-label="Limpiar filtros"
            icon={<RepeatIcon />}
            size="sm"
            onClick={clearFilters}
            ml={2}
          />
        </Flex>

        {/* Botones */}
        <HStack spacing={3} position="absolute" top="-50px" right="16px" zIndex="1">
          {selectedIds.length > 0 ? (
            <Menu>
              <MenuButton as={Button} colorScheme="blue" size="sm">
                Acciones
              </MenuButton>
              <MenuList>
                <MenuItem
                  onClick={() => {
                    const pago = pagos.find((p) => p.id_pago === selectedIds[0]);
                    if (pago) {
                      setSelectedPago(pago);
                      onOpen();
                    }
                  }}
                >
                  Editar
                </MenuItem>
                <MenuItem onClick={deletePagos}>Eliminar</MenuItem>
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
                + Agregar Pago
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
                onClick={fetchPagos}
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
                      selectedIds.length === filteredPagos.length &&
                      filteredPagos.length > 0
                    }
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? filteredPagos.map((p) => p.id_pago) : []
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
              {paginatedPagos.map((p) => (
                <Tr
                  key={p.id_pago}
                  onClick={() => {
                    setSelectedPago(p);
                    onOpen();
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <Td>
                    <Checkbox
                      isChecked={selectedIds.includes(p.id_pago)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCheckboxChange(e, p.id_pago);
                      }}
                    />
                  </Td>
                  {allColumns.map((col) => (
                    <Td key={col}>{columnExtractors[col](p)}</Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

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
      </Box>

      {/* Modal Agregar / Editar */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg={modalBg}>
          <ModalHeader>
            {selectedPago.id_pago ? "Editar Pago" : "Agregar Pago"}
          </ModalHeader>
          <ModalBody>
            <FormControl mt={3}>
              <Input
                name="id_credito"
                placeholder="ID Crédito"
                value={selectedPago.id_credito}
                onChange={handleChange}
              />
            </FormControl>
            <FormControl mt={3}>
              <Input
                name="fecha_pago"
                type="date"
                value={selectedPago.fecha_pago}
                onChange={handleChange}
              />
            </FormControl>
            <FormControl mt={3}>
              <Input
                name="monto_pagado"
                type="number"
                placeholder="Monto Pagado"
                value={selectedPago.monto_pagado}
                onChange={handleChange}
              />
            </FormControl>
            <FormControl mt={3}>
              <Input
                name="monto_pendiente"
                type="number"
                placeholder="Monto Pendiente"
                value={selectedPago.monto_pendiente}
                onChange={handleChange}
              />
            </FormControl>
            <FormControl mt={3}>
              <Input
                name="observaciones"
                placeholder="Observaciones"
                value={selectedPago.observaciones}
                onChange={handleChange}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" onClick={savePago}>
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
          <ModalHeader>Exportar Pagos</ModalHeader>
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
                  exportToPDF(pagos, colsToExport, onColsClose);
                } else {
                  exportToExcel(pagos, colsToExport, onColsClose);
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
    </>
  );
}
