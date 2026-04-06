// ============================================================
// src/components/Inventarios/Movimientos.js
// ðŸ’Ž Movimientos de Insumos y Productos â€” Export Modal Clientes-style
// ============================================================
import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Input,
  IconButton,
  HStack,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Select,
  Checkbox,
  Badge,
  Divider,
  SimpleGrid,
  useColorModeValue,
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { FaFileExport, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { formatNow } from "../../utils/dateFormat";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import extractusLogo from "../login/log.png";

// â”€â”€ Campos disponibles para exportaciÃ³n â”€â”€
const EXPORT_FIELDS = [
  { key: "id", label: "ID" },
  { key: "nombre", label: "Nombre" },
  { key: "tipo", label: "Tipo (Entrada/Salida)" },
  { key: "cantidad", label: "Cantidad" },
  { key: "venta", label: "Venta" },
  { key: "fecha", label: "Fecha" },
  { key: "categoria", label: "CategorÃ­a (Insumo/Producto)" },
];
const ALL_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);

// Datos iniciales INSUMOS
const initialInsumos = [
  { id: "01", tipo: "entrada", nombre: "botes de litro", cantidad: 500, venta: "Juan", fecha: "2025-08-01" },
  { id: "02", tipo: "salida", nombre: "botes de litro", cantidad: 100, venta: "Maria", fecha: "2025-08-02" },
  { id: "03", tipo: "entrada", nombre: "botes de galÃ³n", cantidad: 300, venta: "Luis", fecha: "2025-08-01" },
  { id: "04", tipo: "salida", nombre: "botes de galÃ³n", cantidad: 50, venta: "Ana", fecha: "2025-08-03" },
  { id: "05", tipo: "entrada", nombre: "tapaderas", cantidad: 400, venta: "Carlos", fecha: "2025-08-02" },
  { id: "06", tipo: "salida", nombre: "stickers", cantidad: 120, venta: "Luisa", fecha: "2025-08-04" },
];

// Datos iniciales PRODUCTOS
const initialProductos = [
  { id: "01", tipo: "entrada", nombre: "limÃ³n", cantidad: 200, venta: "Pedro", fecha: "2025-08-01" },
  { id: "02", tipo: "salida", nombre: "limÃ³n", cantidad: 80, venta: "Ana", fecha: "2025-08-02" },
  { id: "03", tipo: "entrada", nombre: "mora", cantidad: 150, venta: "Luis", fecha: "2025-08-01" },
  { id: "04", tipo: "salida", nombre: "mora", cantidad: 40, venta: "Maria", fecha: "2025-08-03" },
  { id: "05", tipo: "entrada", nombre: "tamarindo", cantidad: 120, venta: "Juan", fecha: "2025-08-02" },
  { id: "06", tipo: "salida", nombre: "naranja", cantidad: 50, venta: "Carlos", fecha: "2025-08-04" },
  { id: "07", tipo: "entrada", nombre: "maracuyÃ¡", cantidad: 180, venta: "Luisa", fecha: "2025-08-05" },
];

function Movimientos() {
  const toast = useToast();
  const navigate = useNavigate();
  const accent = useColorModeValue("#009e73", "teal.300");
  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const modalInputBg = useColorModeValue("white", "gray.600");

  const [filters, setFilters] = useState({ id: "", nombre: "", cantidad: "", venta: "", fecha: "" });
  const [insumos] = useState(initialInsumos);
  const [productos] = useState(initialProductos);

  // Modal exportaciÃ³n
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expNombre, setExpNombre] = useState("");
  const [expTipo, setExpTipo] = useState("");
  const [expCategoria, setExpCategoria] = useState("");
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

  const filteredInsumos = insumos.filter(
    (m) =>
      m.id.toLowerCase().includes(filters.id.toLowerCase()) &&
      m.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) &&
      m.cantidad.toString().includes(filters.cantidad) &&
      m.venta.toLowerCase().includes(filters.venta.toLowerCase()) &&
      m.fecha.includes(filters.fecha)
  );

  const filteredProductos = productos.filter(
    (m) =>
      m.id.toLowerCase().includes(filters.id.toLowerCase()) &&
      m.nombre.toLowerCase().includes(filters.nombre.toLowerCase()) &&
      m.cantidad.toString().includes(filters.cantidad) &&
      m.venta.toLowerCase().includes(filters.venta.toLowerCase()) &&
      m.fecha.includes(filters.fecha)
  );

  // ============================================================
  // ðŸ”§ Export helpers
  // ============================================================
  const buildFilterText = (f = {}) => {
    const parts = [];
    if (f.nombre) parts.push(`Nombre: ${f.nombre}`);
    if (f.tipo) parts.push(`Tipo: ${f.tipo}`);
    if (f.categoria) parts.push(`CategorÃ­a: ${f.categoria}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getAllData = useCallback(() => {
    const insWithCat = filteredInsumos.map((r) => ({ ...r, categoria: "Insumo" }));
    const prodWithCat = filteredProductos.map((r) => ({ ...r, categoria: "Producto" }));
    return [...insWithCat, ...prodWithCat];
  }, [filteredInsumos, filteredProductos]);

  const getFilteredData = useCallback(
    (f = {}) => {
      let data = getAllData();
      if (f.nombre) {
        const q = f.nombre.toLowerCase();
        data = data.filter((r) => r.nombre.toLowerCase().includes(q));
      }
      if (f.tipo) {
        data = data.filter((r) => r.tipo.toLowerCase() === f.tipo.toLowerCase());
      }
      if (f.categoria) {
        data = data.filter((r) => r.categoria.toLowerCase() === f.categoria.toLowerCase());
      }
      return data;
    },
    [getAllData]
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

  // ðŸ“¤ PDF
  const handleExportPDF = async (f = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(f);
      if (rows.length === 0) { toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true }); return; }

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;

      try { const dataURL = await imgToDataURL(extractusLogo); doc.addImage(dataURL, "PNG", 40, 20, 45, 45); } catch (e) { /* sin logo */ }

      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(25, 55, 80);
      doc.text("MOVIMIENTOS DE INSUMOS Y PRODUCTOS", pageWidth / 2, 45, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
      doc.text(`Generado: ${formatNow()}`, pageWidth / 2, 62, { align: "center" });
      doc.setFontSize(9); doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(f)}`, pageWidth / 2, 78, { align: "center" });
      doc.setDrawColor(0, 158, 115); doc.setLineWidth(1); doc.line(40, 90, pageWidth - 40, 90);

      const fieldExtractors = {
        id: (r) => r.id,
        nombre: (r) => r.nombre,
        tipo: (r) => r.tipo,
        cantidad: (r) => r.cantidad,
        venta: (r) => r.venta,
        fecha: (r) => r.fecha,
        categoria: (r) => r.categoria,
      };

      const activeFields = EXPORT_FIELDS.filter((ef) => selectedFields.includes(ef.key));
      const headers = activeFields.map((ef) => ef.label);
      const tableData = rows.map((r) => activeFields.map((ef) => fieldExtractors[ef.key](r)));

      autoTable(doc, {
        startY: 105, head: [headers], body: tableData,
        styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
        headStyles: { fillColor: [0, 158, 115], textColor: 255, fontStyle: "bold" },
        didDrawPage: () => { const ps = doc.internal.pageSize; doc.setFontSize(8); doc.setTextColor(120); doc.text(`PÃ¡gina ${doc.getNumberOfPages()}`, ps.getWidth() - 80, ps.getHeight() - 20); },
      });

      const finalY = doc.lastAutoTable.finalY + 25;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(25, 55, 80);
      doc.text("RESUMEN", 40, finalY);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60);
      let y = finalY + 18;
      doc.text(`Total registros exportados: ${rows.length}`, 50, y); y += 16;
      const ent = rows.filter((r) => r.tipo === "entrada").length;
      const sal = rows.filter((r) => r.tipo === "salida").length;
      doc.text(`Entradas: ${ent}`, 50, y); y += 16;
      doc.text(`Salidas: ${sal}`, 50, y);

      doc.save(`Movimientos_Inv_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("âŒ Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally { setExporting(false); }
  };

  // ðŸ“Š Excel
  const handleExportExcel = async (f = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(f);
      if (rows.length === 0) { toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true }); return; }

      const wb = new ExcelJS.Workbook(); wb.creator = "Extractus ERP"; wb.created = new Date();
      const ws = wb.addWorksheet("Movimientos");

      const allCols = [
        { key: "id", header: "ID", width: 8, extract: (r) => r.id },
        { key: "nombre", header: "Nombre", width: 22, extract: (r) => r.nombre },
        { key: "tipo", header: "Tipo", width: 12, extract: (r) => r.tipo },
        { key: "cantidad", header: "Cantidad", width: 12, extract: (r) => r.cantidad },
        { key: "venta", header: "Venta", width: 14, extract: (r) => r.venta },
        { key: "fecha", header: "Fecha", width: 14, extract: (r) => r.fecha },
        { key: "categoria", header: "CategorÃ­a", width: 14, extract: (r) => r.categoria },
      ];
      const columns_exp = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns_exp.length);

      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Movimientos de Insumos y Productos â€” Extractus";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF009E73" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells(`A2:${lastColLetter}2`);
      const filterCell = ws.getCell("A2");
      filterCell.value = `Filtros: ${buildFilterText(f)}  |  Generado: ${formatNow()}`;
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
      saveAs(new Blob([buffer]), `Movimientos_Inv_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("âŒ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally { setExporting(false); }
  };

  // ============================================================
  // UI â€” Render boxes de entradas/salidas
  // ============================================================
  const renderBoxes = (data, tipoItem) => {
    const entradas = data.filter((m) => m.tipo === "entrada");
    const salidas = data.filter((m) => m.tipo === "salida");

    return (
      <>
        <Box border="1px" borderColor="gray.300" borderRadius="md" p={4} mb={6}>
          <Heading size="md" mb={3}>Entradas</Heading>
          {entradas.length === 0 && <Text>No hay entradas</Text>}
          {entradas.map((mov) => (
            <Box key={`${tipoItem}-${mov.id}-entrada`} p={4} mb={3} bg="green.100" borderRadius="md" shadow="md" color="black">
              <Text><strong>ID:</strong> {mov.id}</Text>
              <Text><strong>{tipoItem}:</strong> {mov.nombre}</Text>
              <Text><strong>Cantidad:</strong> {mov.cantidad}</Text>
              <Text><strong>Venta:</strong> {mov.venta}</Text>
              <Text><strong>Fecha:</strong> {mov.fecha}</Text>
            </Box>
          ))}
        </Box>

        <Box border="1px" borderColor="gray.300" borderRadius="md" p={4}>
          <Heading size="md" mb={3}>Salidas</Heading>
          {salidas.length === 0 && <Text>No hay salidas</Text>}
          {salidas.map((mov) => (
            <Box key={`${tipoItem}-${mov.id}-salida`} p={4} mb={3} bg="red.100" borderRadius="md" shadow="md" color="black">
              <Text><strong>ID:</strong> {mov.id}</Text>
              <Text><strong>{tipoItem}:</strong> {mov.nombre}</Text>
              <Text><strong>Cantidad:</strong> {mov.cantidad}</Text>
              <Text><strong>Venta:</strong> {mov.venta}</Text>
              <Text><strong>Fecha:</strong> {mov.fecha}</Text>
            </Box>
          ))}
        </Box>
      </>
    );
  };

  return (
    <Box p={6}>
      {/* Encabezado */}
      <Flex alignItems="center" mb={4} justify="space-between">
        <HStack spacing={3}>
          <Button size="sm" variant="outline" colorScheme="teal" leftIcon={<FaArrowLeft />} onClick={() => navigate("/app/inventarios")}>
            Atrás
          </Button>
          <Heading>Movimientos de Insumos y Productos</Heading>
        </HStack>
        <Button
          size="sm"
          colorScheme="teal"
          leftIcon={<FaFileExport />}
          onClick={() => {
            setExpNombre(""); setExpTipo(""); setExpCategoria("");
            setExportFormat("excel");
            setSelectedFields([...ALL_FIELD_KEYS]);
            exportModal.onOpen();
          }}
          isDisabled={exporting}
        >
          Exportar
        </Button>
      </Flex>

      {/* Filtros en una sola lÃ­nea */}
      <Flex gap={3} mb={6} flexWrap="nowrap">
        <Input size="sm" placeholder="Buscar ID" value={filters.id} onChange={(e) => handleFilterChange("id", e.target.value)} />
        <Input size="sm" placeholder="Buscar Nombre" value={filters.nombre} onChange={(e) => handleFilterChange("nombre", e.target.value)} />
        <Input size="sm" placeholder="Buscar Cantidad" value={filters.cantidad} onChange={(e) => handleFilterChange("cantidad", e.target.value)} />
        <Input size="sm" placeholder="Buscar Venta" value={filters.venta} onChange={(e) => handleFilterChange("venta", e.target.value)} />
        <Input size="sm" placeholder="Buscar Fecha" value={filters.fecha} onChange={(e) => handleFilterChange("fecha", e.target.value)} />
      </Flex>

      <Flex gap={8}>
        {/* Insumos */}
        <Box flex="1">
          <Heading size="lg" mb={4}>Insumos</Heading>
          {renderBoxes(filteredInsumos, "Insumo")}
        </Box>

        {/* Productos */}
        <Box flex="1">
          <Heading size="lg" mb={4}>Productos</Heading>
          {renderBoxes(filteredProductos, "Producto")}
        </Box>
      </Flex>

      {/* ðŸ“¤ Modal de ExportaciÃ³n */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Movimientos</Text>
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
                <option value="excel">ðŸ“Š Excel (.xlsx)</option>
                <option value="pdf">ðŸ“„ PDF (.pdf)</option>
              </Select>
            </FormControl>

            <Divider my={4} />
            <Text fontWeight="bold" mb={3} color={accent}>Filtros de exportaciÃ³n</Text>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por nombre</FormLabel>
              <Input placeholder="Ej: limÃ³n, tapaderas" value={expNombre} onChange={(e) => setExpNombre(e.target.value)} size="sm" bg={modalInputBg} />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por tipo</FormLabel>
              <Select placeholder="Todos" value={expTipo} onChange={(e) => setExpTipo(e.target.value)} size="sm" bg={modalInputBg}>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </Select>
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por categorÃ­a</FormLabel>
              <Select placeholder="Todas" value={expCategoria} onChange={(e) => setExpCategoria(e.target.value)} size="sm" bg={modalInputBg}>
                <option value="Insumo">Insumo</option>
                <option value="Producto">Producto</option>
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
                const fl = { nombre: expNombre || undefined, tipo: expTipo || undefined, categoria: expCategoria || undefined };
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
}

export default Movimientos;

