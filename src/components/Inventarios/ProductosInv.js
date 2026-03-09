// ============================================================
// ProductosInv.js — Inventario Productos con Export Modal Clientes-style
// ============================================================
import React, { useState, useCallback } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td,
  Input, IconButton, Button, Badge, HStack,
  useToast, Text, Flex,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Select,
  Checkbox, Divider, SimpleGrid, useColorModeValue,
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { FaFileExport, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import extractusLogo from "../login/log.png";

// ── Campos disponibles para exportación ──
const EXPORT_FIELDS = [
  { key: "id", label: "ID" },
  { key: "nombre", label: "Nombre" },
  { key: "cantidad", label: "Cantidad" },
  { key: "usuario", label: "Usuario" },
  { key: "observaciones", label: "Observaciones" },
  { key: "estado", label: "Estado" },
];
const ALL_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);

const productosData = [
  { id: "01", nombre: "Limón", cantidad: 50, usuario: "Equipo de Venta", observaciones: "Jugo" },
  { id: "02", nombre: "Mora", cantidad: 20, usuario: "Equipo de Venta", observaciones: "Concentrado" },
  { id: "03", nombre: "Tamarindo", cantidad: 100, usuario: "Equipo de Venta", observaciones: "Jugo" },
  { id: "04", nombre: "Naranja", cantidad: 250, usuario: "Equipo de Venta", observaciones: "Concentrado" },
  { id: "05", nombre: "Maracuyá", cantidad: 25, usuario: "Equipo de Venta", observaciones: "Jugo" },
];

const getEstado = (cantidad) => {
  if (cantidad <= 25) return "Stock Bajo";
  if (cantidad >= 250) return "Máximo";
  return "En Rango";
};

const ProductosInv = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const accent = useColorModeValue("#009e73", "teal.300");
  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const modalInputBg = useColorModeValue("white", "gray.600");

  const [filters, setFilters] = useState({ id: "", nombre: "", cantidad: "", usuario: "", observaciones: "" });

  // Modal exportación
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expNombre, setExpNombre] = useState("");
  const [expEstado, setExpEstado] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedFields, setSelectedFields] = useState([...ALL_FIELD_KEYS]);

  const toggleField = (key) =>
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  const allSelected = selectedFields.length === ALL_FIELD_KEYS.length;
  const toggleAll = () =>
    setSelectedFields(allSelected ? [] : [...ALL_FIELD_KEYS]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const filteredData = productosData.filter(
    (item) =>
      item.id.toLowerCase().includes(filters.id.toLowerCase()) &&
      item.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) &&
      item.cantidad.toString().includes(filters.cantidad) &&
      item.usuario.toLowerCase().includes(filters.usuario.toLowerCase()) &&
      item.observaciones.toLowerCase().includes(filters.observaciones.toLowerCase())
  );

  // ============================================================
  // 🔧 Export helpers
  // ============================================================
  const buildFilterText = (f = {}) => {
    const parts = [];
    if (f.nombre) parts.push(`Nombre: ${f.nombre}`);
    if (f.estado) parts.push(`Estado: ${f.estado}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredData = useCallback(
    (f = {}) => {
      let data = [...filteredData];
      if (f.nombre) {
        const q = f.nombre.toLowerCase();
        data = data.filter((r) => r.nombre.toLowerCase().includes(q));
      }
      if (f.estado) {
        data = data.filter((r) => getEstado(r.cantidad).toLowerCase() === f.estado.toLowerCase());
      }
      return data;
    },
    [filteredData]
  );

  const imgToDataURL = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = src;
    });

  // 📤 PDF
  const handleExportPDF = async (f = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(f);
      if (rows.length === 0) { toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true }); return; }

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;

      try { const dataURL = await imgToDataURL(extractusLogo); doc.addImage(dataURL, "PNG", 40, 20, 45, 45); } catch (e) { /* sin logo */ }

      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(25, 55, 80);
      doc.text("INVENTARIO DE PRODUCTOS", pageWidth / 2, 45, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 62, { align: "center" });
      doc.setFontSize(9); doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(f)}`, pageWidth / 2, 78, { align: "center" });
      doc.setDrawColor(0, 158, 115); doc.setLineWidth(1); doc.line(40, 90, pageWidth - 40, 90);

      const fieldExtractors = {
        id: (r) => r.id,
        nombre: (r) => r.nombre,
        cantidad: (r) => r.cantidad,
        usuario: (r) => r.usuario,
        observaciones: (r) => r.observaciones,
        estado: (r) => getEstado(r.cantidad),
      };

      const activeFields = EXPORT_FIELDS.filter((ef) => selectedFields.includes(ef.key));
      const headers = activeFields.map((ef) => ef.label);
      const tableData = rows.map((r) => activeFields.map((ef) => fieldExtractors[ef.key](r)));

      autoTable(doc, {
        startY: 105, head: [headers], body: tableData,
        styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
        headStyles: { fillColor: [0, 158, 115], textColor: 255, fontStyle: "bold" },
        didDrawPage: () => { const ps = doc.internal.pageSize; doc.setFontSize(8); doc.setTextColor(120); doc.text(`Página ${doc.getNumberOfPages()}`, ps.getWidth() - 80, ps.getHeight() - 20); },
      });

      const finalY = doc.lastAutoTable.finalY + 25;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(25, 55, 80);
      doc.text("RESUMEN", 40, finalY);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60);
      let y = finalY + 18;
      doc.text(`Total productos exportados: ${rows.length}`, 50, y); y += 16;
      const bajos = rows.filter((r) => r.cantidad <= 25).length;
      const enRango = rows.filter((r) => r.cantidad > 25 && r.cantidad < 250).length;
      const maximos = rows.filter((r) => r.cantidad >= 250).length;
      doc.text(`Stock Bajo: ${bajos}`, 50, y); y += 16;
      doc.text(`En Rango: ${enRango}`, 50, y); y += 16;
      doc.text(`Máximo: ${maximos}`, 50, y);

      doc.save(`Inventario_Productos_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally { setExporting(false); }
  };

  // 📊 Excel
  const handleExportExcel = async (f = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(f);
      if (rows.length === 0) { toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true }); return; }

      const wb = new ExcelJS.Workbook(); wb.creator = "Extractus ERP"; wb.created = new Date();
      const ws = wb.addWorksheet("Inventario Productos");

      const allCols = [
        { key: "id", header: "ID", width: 8, extract: (r) => r.id },
        { key: "nombre", header: "Nombre", width: 18, extract: (r) => r.nombre },
        { key: "cantidad", header: "Cantidad", width: 12, extract: (r) => r.cantidad },
        { key: "usuario", header: "Usuario", width: 20, extract: (r) => r.usuario },
        { key: "observaciones", header: "Observaciones", width: 20, extract: (r) => r.observaciones },
        { key: "estado", header: "Estado", width: 14, extract: (r) => getEstado(r.cantidad) },
      ];
      const columns_exp = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns_exp.length);

      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Inventario de Productos — Extractus";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF009E73" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells(`A2:${lastColLetter}2`);
      const filterCell = ws.getCell("A2");
      filterCell.value = `Filtros: ${buildFilterText(f)}  |  Generado: ${new Date().toLocaleString()}`;
      filterCell.font = { size: 9, italic: true, color: { argb: "FF666666" } };
      filterCell.alignment = { horizontal: "center" };

      const headerRow = 4;
      columns_exp.forEach((col, i) => {
        const cell = ws.getCell(headerRow, i + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009E73" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { bottom: { style: "thin", color: { argb: "FF007A5A" } } };
      });

      rows.forEach((r, idx) => {
        const rowNum = headerRow + 1 + idx;
        columns_exp.forEach((col, i) => { ws.getCell(rowNum, i + 1).value = col.extract(r); });
        if (idx % 2 === 1) {
          for (let i = 1; i <= columns_exp.length; i++) {
            ws.getCell(rowNum, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F7F0" } };
          }
        }
      });

      columns_exp.forEach((col, i) => {
        let maxLen = col.header.length;
        rows.forEach((r) => { const v = String(col.extract(r) ?? ""); if (v.length > maxLen) maxLen = v.length; });
        ws.getColumn(i + 1).width = Math.min(Math.max(col.width, maxLen + 2), 50);
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Inventario_Productos_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally { setExporting(false); }
  };

  return (
    <Box p={5}>
      <Flex justify="space-between" align="center" mb={4}>
        <HStack spacing={4}>
          <Button size="sm" variant="outline" colorScheme="teal" leftIcon={<FaArrowLeft />} onClick={() => navigate("/app/inventarios")}>
            Atrás
          </Button>
        </HStack>
        <Button
          size="sm"
          colorScheme="teal"
          leftIcon={<FaFileExport />}
          onClick={() => {
            setExpNombre(""); setExpEstado("");
            setExportFormat("excel");
            setSelectedFields([...ALL_FIELD_KEYS]);
            exportModal.onOpen();
          }}
          isDisabled={exporting}
        >
          Exportar
        </Button>
      </Flex>

      <Table variant="striped" colorScheme="gray">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Nombre Producto</Th>
            <Th>Cantidad</Th>
            <Th>Usuario</Th>
            <Th>Fecha/Hora</Th>
            <Th>Observaciones</Th>
            <Th>Estado</Th>
          </Tr>
          <Tr>
            <Th><Input size="sm" placeholder="Buscar ID" value={filters.id} onChange={(e) => handleFilterChange("id", e.target.value)} /></Th>
            <Th><Input size="sm" placeholder="Buscar Nombre" value={filters.nombre} onChange={(e) => handleFilterChange("nombre", e.target.value)} /></Th>
            <Th><Input size="sm" placeholder="Buscar Cantidad" value={filters.cantidad} onChange={(e) => handleFilterChange("cantidad", e.target.value)} /></Th>
            <Th><Input size="sm" placeholder="Buscar Usuario" value={filters.usuario} onChange={(e) => handleFilterChange("usuario", e.target.value)} /></Th>
            <Th>{/* Fecha dinámica */}</Th>
            <Th><Input size="sm" placeholder="Buscar Observación" value={filters.observaciones} onChange={(e) => handleFilterChange("observaciones", e.target.value)} /></Th>
            <Th>{/* Estado */}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredData.map((item) => (
            <Tr key={item.id}>
              <Td>{item.id}</Td>
              <Td>{item.nombre}</Td>
              <Td>{item.cantidad}</Td>
              <Td>{item.usuario}</Td>
              <Td>{new Date().toLocaleString()}</Td>
              <Td>{item.observaciones}</Td>
              <Td>
                {item.cantidad <= 25 ? (
                  <Badge colorScheme="red">⚠ Stock Bajo</Badge>
                ) : item.cantidad >= 250 ? (
                  <Badge colorScheme="green">✔ Máximo</Badge>
                ) : (
                  <Badge colorScheme="yellow">En Rango</Badge>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Inventario de Productos</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato</FormLabel>
              <Select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} bg={modalInputBg}>
                <option value="excel">📊 Excel (.xlsx)</option>
                <option value="pdf">📄 PDF (.pdf)</option>
              </Select>
            </FormControl>

            <Divider my={4} />
            <Text fontWeight="bold" mb={3} color={accent}>Filtros de exportación</Text>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por nombre</FormLabel>
              <Input placeholder="Ej: Limón, Naranja" value={expNombre} onChange={(e) => setExpNombre(e.target.value)} size="sm" bg={modalInputBg} />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por estado</FormLabel>
              <Select placeholder="Todos" value={expEstado} onChange={(e) => setExpEstado(e.target.value)} size="sm" bg={modalInputBg}>
                <option value="Stock Bajo">Stock Bajo</option>
                <option value="En Rango">En Rango</option>
                <option value="Máximo">Máximo</option>
              </Select>
            </FormControl>

            <Divider my={4} />

            <Flex justify="space-between" align="center" mb={3}>
              <HStack spacing={2}>
                <Text fontWeight="bold" color={accent}>Campos a exportar</Text>
                <Badge colorScheme="teal" fontSize="xs" borderRadius="full" px={2}>{selectedFields.length} / {ALL_FIELD_KEYS.length}</Badge>
              </HStack>
              <Checkbox isChecked={allSelected} isIndeterminate={selectedFields.length > 0 && !allSelected} onChange={toggleAll} colorScheme="teal" size="sm">
                <Text fontSize="xs">Seleccionar todos</Text>
              </Checkbox>
            </Flex>

            <SimpleGrid columns={2} spacing={2}>
              {EXPORT_FIELDS.map((ef) => (
                <Checkbox key={ef.key} isChecked={selectedFields.includes(ef.key)} onChange={() => toggleField(ef.key)} colorScheme="teal" size="sm">
                  {ef.label}
                </Checkbox>
              ))}
            </SimpleGrid>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="teal" leftIcon={<DownloadIcon />} isLoading={exporting} loadingText="Generando..." isDisabled={selectedFields.length === 0}
              onClick={async () => {
                if (selectedFields.length === 0) { toast({ title: "Selecciona al menos un campo", status: "warning", duration: 3000, isClosable: true }); return; }
                const fl = { nombre: expNombre || undefined, estado: expEstado || undefined };
                if (exportFormat === "pdf") { await handleExportPDF(fl); } else { await handleExportExcel(fl); }
                exportModal.onClose();
              }}
            >
              Exportar
            </Button>
            <Button ml={3} onClick={exportModal.onClose}>Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ProductosInv;
