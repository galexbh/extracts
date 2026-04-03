// ============================================================
// 📁 src/components/Produccion/Insumos.js
// 💎 Gestión de Insumos con control de stock, dashboard y export modal
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Flex,
  Heading,
  Divider,
  Spinner,
  useToast,
  useColorModeValue,
  Button,
  Tooltip,
  Icon,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
  HStack,
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
  Input,
  Select,
  Checkbox,
  Badge,
} from "@chakra-ui/react";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCheckCircle,
  FaTimesCircle,
  FaFileExport,
} from "react-icons/fa";
import { DownloadIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import CrudTabla from "../Seguridad/CrudTabla";
import api from "../../api/apiClient";

// 📦 Exportación
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import extractusLogo from "../login/log.png";

// ── Campos disponibles para exportación ──
const EXPORT_FIELDS = [
  { key: "id", label: "ID" },
  { key: "nombre", label: "Nombre" },
  { key: "unidad", label: "Unidad de Medida" },
  { key: "precio", label: "Precio Unitario" },
  { key: "stock_min", label: "Stock Mínimo" },
  { key: "stock_max", label: "Stock Máximo" },
  { key: "estado", label: "Estado" },
  { key: "fecha", label: "Fecha Creación" },
];
const ALL_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);

export default function Insumos() {
  // ============================================================
  // 🎨 Estilos Chakra
  // ============================================================
  const accent = useColorModeValue("#009e73", "teal.300");
  const pageBg = useColorModeValue("#f7faf8", "#020617");
  const cardBg = useColorModeValue("white", "#0b1120");
  const borderColor = useColorModeValue("#c2d4c3", "#1f2937");

  const btnBackBg = useColorModeValue("teal.100", "teal.600");
  const btnBackColor = useColorModeValue("teal.800", "white");
  const btnBackHoverBg = useColorModeValue("teal.200", "teal.500");

  const statTotalBg = useColorModeValue("#e8f7f0", "rgba(0,158,115,0.12)");
  const statActivosBg = useColorModeValue("#e9f9ee", "rgba(56,161,105,0.12)");
  const statInactivosBg = useColorModeValue("#ffe9e9", "rgba(245,101,101,0.12)");

  const subtitleColor = useColorModeValue("gray.600", "gray.300");
  const activosNumberColor = useColorModeValue("green.600", "green.300");
  const inactivosNumberColor = useColorModeValue("red.500", "red.300");

  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const modalInputBg = useColorModeValue("white", "gray.600");

  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de exportación
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

  // ============================================================
  // 🔹 Cargar datos
  // ============================================================
  const cargarInsumos = useCallback(async () => {
    try {
      const res = await api.get("/produccion/insumos");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando insumos:", err);
      toast({ title: "Error al cargar insumos", description: err.message, status: "error", duration: 4000, isClosable: true });
    }
  }, [toast]);

  const cargarEstados = useCallback(async () => {
    try {
      const res = await api.get("/mantenimiento/estado-insumo");
      setEstados(res.data);
    } catch (err) {
      console.warn("⚠️ No se pudieron cargar los estados:", err.message);
      setEstados([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([cargarInsumos(), cargarEstados()]).finally(() => setLoading(false));
  }, [cargarInsumos, cargarEstados]);

  // ============================================================
  // 🔹 Estadísticas Dashboard
  // ============================================================
  const { totalInsumos, insActivos, insInactivos } = React.useMemo(() => {
    const total = data.length;
    const activos = data.filter((r) => {
      const estado = (r.estado_insumo || r.nombre_estado_insumo || "").toString().toLowerCase();
      return estado === "activo";
    }).length;
    return { totalInsumos: total, insActivos: activos, insInactivos: total - activos };
  }, [data]);

  // ============================================================
  // 🔹 Validaciones
  // ============================================================
  const validarRequerido = (valor, campo) => {
    if (!valor || String(valor).trim() === "") return `El campo ${campo} es obligatorio.`;
    return null;
  };

  const validarSoloLetras = (valor, campo) => {
    const errorReq = validarRequerido(valor, campo);
    if (errorReq) return errorReq;
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regex.test(valor)) return `El campo ${campo} solo debe contener letras y espacios.`;
    return null;
  };

  const sanitizeTexto = (valor) => {
    if (!valor) return "";
    return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
  };

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    { name: "nombre_insumo", label: "Nombre del Insumo", type: "text", required: true, placeholderText: "Ej. Sal, Azucar", validate: (v) => validarSoloLetras(v, "Nombre del Insumo"), sanitize: sanitizeTexto },
    { name: "unidad_medida", label: "Unidad de Medida", type: "text", required: true, placeholderText: "Ej. Caja, Litro, Kilo", validate: (v) => { if (!v || v.trim() === "") return "Debe especificar una unidad de medida."; return null; }, sanitize: sanitizeTexto },
    { name: "precio_unitario", label: "Precio Unitario (Lps)", type: "number", step: "0.01", min: "0.01", required: true, validate: (v) => { if (!v || Number(v) <= 0) return "El precio debe ser mayor a 0."; return null; } },
    { name: "stock_minimo", label: "Stock Mínimo", type: "number", step: "0.01", min: "0", required: true, validate: (v) => { if (v === "" || v === undefined) return "El Stock Mínimo es obligatorio"; if (Number(v) < 0) return "El stock no puede ser negativo"; return null; } },
    { name: "stock_maximo", label: "Stock Máximo", type: "number", step: "0.01", min: "0", required: true, validate: (v, formData) => { if (v === "" || v === undefined) return "El Stock Máximo es obligatorio"; const valMax = Number(v); const valMin = Number(formData.stock_minimo); if (valMax < 0) return "El stock no puede ser negativo"; if (valMax < valMin) return `El Stock Máximo (${valMax}) no puede ser menor al Mínimo (${valMin}).`; return null; } },
    { name: "id_estado_insumo", label: "Estado del Insumo", type: "select", required: true, options: estados.filter((e) => e.nombre_estado.toLowerCase() === "activo" || e.nombre_estado.toLowerCase() === "inactivo").map((e) => ({ value: e.id_estado_insumo, label: e.nombre_estado })), validate: (v) => { if (!v) return "Debe seleccionar un estado."; return null; } },
  ];

  // ============================================================
  // 🔹 Columnas y extractores
  // ============================================================
  const columns = ["ID Insumo", "Nombre", "Unidad", "Precio Unitario", "Stock Mínimo", "Stock Máximo", "Estado", "Fecha Creación"];

  const extractors = {
    "ID Insumo": (r) => r.id_insumo,
    Nombre: (r) => r.nombre_insumo,
    Unidad: (r) => r.unidad_medida,
    "Precio Unitario": (r) => `L. ${parseFloat(r.precio_unitario || 0).toFixed(2)}`,
    "Stock Mínimo": (r) => parseFloat(r.stock_minimo || 0).toFixed(2),
    "Stock Máximo": (r) => parseFloat(r.stock_maximo || 0).toFixed(2),
    Estado: (r) => r.nombre_estado_insumo || "—",
    "Fecha Creación": (r) => r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleString("es-HN", { timeZone: "America/Tegucigalpa", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "—",
  };

  // ============================================================
  // 🔹 CRUD
  // ============================================================
  const handleInsert = async (nuevo) => {
    try {
      await api.post("/produccion/insumos", { ...nuevo, stock_minimo: parseFloat(nuevo.stock_minimo) || 0, stock_maximo: parseFloat(nuevo.stock_maximo) || 0 });
      const res = await api.get("/produccion/insumos");
      setData(res.data);
      toast({ title: "✅ Insumo agregado correctamente", status: "success", duration: 3000, isClosable: true });
    } catch (err) {
      console.error("❌ Error al insertar insumo:", err);
      toast({ title: "Error al agregar insumo", description: err.response?.data?.error || err.message, status: "error", duration: 4000, isClosable: true });
    }
  };

  const handleUpdate = async (editado) => {
    try {
      await api.put(`/produccion/insumos/${editado.id_insumo}`, { ...editado, stock_minimo: parseFloat(editado.stock_minimo) || 0, stock_maximo: parseFloat(editado.stock_maximo) || 0 });
      const res = await api.get("/produccion/insumos");
      setData(res.data);
      toast({ title: "✏️ Insumo actualizado correctamente", status: "success", duration: 3000, isClosable: true });
    } catch (err) {
      console.error("❌ Error al actualizar insumo:", err);
      toast({ title: "Error al actualizar insumo", description: err.response?.data?.error || err.message, status: "error", duration: 4000, isClosable: true });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/produccion/insumos/${id}`);
      const res = await api.get("/produccion/insumos");
      setData(res.data);
      toast({ title: "🗑️ Insumo eliminado correctamente", status: "info", duration: 3000, isClosable: true });
    } catch (err) {
      console.error("❌ Error al eliminar insumo:", err);
      toast({ title: "Error al eliminar insumo", description: err.response?.data?.error || err.message, status: "error", duration: 4000, isClosable: true });
    }
  };

  // ============================================================
  // 🔧 Helpers de exportación
  // ============================================================
  const buildFilterText = (filters = {}) => {
    const parts = [];
    if (filters.nombre) parts.push(`Nombre: ${filters.nombre}`);
    if (filters.estado) parts.push(`Estado: ${filters.estado}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredData = useCallback(
    (filters = {}) => {
      let filtered = [...data];
      if (filters.nombre) {
        const q = filters.nombre.toLowerCase();
        filtered = filtered.filter((r) => (r.nombre_insumo || "").toLowerCase().includes(q));
      }
      if (filters.estado) {
        filtered = filtered.filter((r) => (r.nombre_estado_insumo || "").toLowerCase() === filters.estado.toLowerCase());
      }
      return filtered;
    },
    [data]
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

  // ============================================================
  // 📤 Exportar PDF
  // ============================================================
  const handleExportPDF = async (filters = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(filters);
      if (rows.length === 0) { toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true }); return; }

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;

      try { const dataURL = await imgToDataURL(extractusLogo); doc.addImage(dataURL, "PNG", 40, 20, 45, 45); } catch (e) { /* sin logo */ }

      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(25, 55, 80);
      doc.text("REPORTE DE INSUMOS", pageWidth / 2, 45, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 62, { align: "center" });
      doc.setFontSize(9); doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(filters)}`, pageWidth / 2, 78, { align: "center" });
      doc.setDrawColor(0, 158, 115); doc.setLineWidth(1); doc.line(40, 90, pageWidth - 40, 90);

      const fieldExtractors = {
        id: (r) => r.id_insumo,
        nombre: (r) => r.nombre_insumo || "",
        unidad: (r) => r.unidad_medida || "",
        precio: (r) => `L. ${parseFloat(r.precio_unitario || 0).toFixed(2)}`,
        stock_min: (r) => parseFloat(r.stock_minimo || 0).toFixed(2),
        stock_max: (r) => parseFloat(r.stock_maximo || 0).toFixed(2),
        estado: (r) => r.nombre_estado_insumo || "—",
        fecha: (r) => r.fecha_creacion ? new Date(r.fecha_creacion).toISOString().split("T")[0] : "",
      };

      const activeFields = EXPORT_FIELDS.filter((f) => selectedFields.includes(f.key));
      const headers = activeFields.map((f) => f.label);
      const tableData = rows.map((r) => activeFields.map((f) => fieldExtractors[f.key](r)));

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
      doc.text(`Total de insumos exportados: ${rows.length}`, 50, y); y += 16;
      const act = rows.filter((r) => (r.nombre_estado_insumo || "").toLowerCase() === "activo").length;
      doc.text(`Activos: ${act}`, 50, y); y += 16;
      doc.text(`Inactivos: ${rows.length - act}`, 50, y);

      doc.save(`Insumos_Extractus_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally { setExporting(false); }
  };

  // ============================================================
  // 📊 Exportar Excel
  // ============================================================
  const handleExportExcel = async (filters = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(filters);
      if (rows.length === 0) { toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true }); return; }

      const wb = new ExcelJS.Workbook(); wb.creator = "Extractus ERP"; wb.created = new Date();
      const ws = wb.addWorksheet("Insumos");

      const allCols = [
        { key: "id", header: "ID", width: 8, extract: (r) => r.id_insumo },
        { key: "nombre", header: "Nombre", width: 25, extract: (r) => r.nombre_insumo || "" },
        { key: "unidad", header: "Unidad de Medida", width: 16, extract: (r) => r.unidad_medida || "" },
        { key: "precio", header: "Precio Unitario", width: 16, extract: (r) => `L. ${parseFloat(r.precio_unitario || 0).toFixed(2)}` },
        { key: "stock_min", header: "Stock Mínimo", width: 14, extract: (r) => parseFloat(r.stock_minimo || 0).toFixed(2) },
        { key: "stock_max", header: "Stock Máximo", width: 14, extract: (r) => parseFloat(r.stock_maximo || 0).toFixed(2) },
        { key: "estado", header: "Estado", width: 12, extract: (r) => r.nombre_estado_insumo || "—" },
        { key: "fecha", header: "Fecha Creación", width: 14, extract: (r) => r.fecha_creacion ? new Date(r.fecha_creacion).toISOString().split("T")[0] : "" },
      ];
      const columns_exp = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns_exp.length);

      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Insumos — Extractus";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF009E73" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells(`A2:${lastColLetter}2`);
      const filterCell = ws.getCell("A2");
      filterCell.value = `Filtros: ${buildFilterText(filters)}  |  Generado: ${new Date().toLocaleString()}`;
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
      saveAs(new Blob([buffer]), `Insumos_Extractus_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally { setExporting(false); }
  };

  // ============================================================
  // 🔹 Loader
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh">
        <Spinner size="xl" color="teal.400" />
      </Flex>
    );
  }

  // ============================================================
  // 🔹 Render principal
  // ============================================================
  return (
    <Box bg={pageBg} minH="100vh" p={4}>
      {/* Botón Atrás */}
      <Tooltip label="Volver al menú Producción" placement="bottom-start">
        <Button
          leftIcon={<Icon as={FaArrowLeft} />}
          bg={btnBackBg}
          color={btnBackColor}
          _hover={{ bg: btnBackHoverBg, transform: "scale(1.03)" }}
          onClick={() => navigate("/app/produccion")}
          size="sm"
          mb={4}
          boxShadow="sm"
          borderRadius="full"
        >
          Atrás
        </Button>
      </Tooltip>

      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" boxShadow="md">
        <CardHeader pb={3}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Box>
              <HStack spacing={2}>
                <FaBoxOpen color={accent} size={24} />
                <Heading size="md" color={accent}>
                  Gestión de Insumos
                </Heading>
              </HStack>
              <Text fontSize="sm" color={subtitleColor} mt={1}>
                Administra el catálogo de insumos y límites de stock
              </Text>
            </Box>
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

          <Divider mt={4} borderColor={borderColor} />

          {/* Mini-Dashboard */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={5} mb={2}>
            <Stat bg={statTotalBg} p={4} borderRadius="lg">
              <HStack spacing={2} mb={1}>
                <FaBoxOpen color="#009e73" />
                <StatLabel fontWeight="bold" color="teal.800">Total de Insumos</StatLabel>
              </HStack>
              <StatNumber fontSize="3xl" color="teal.900">{totalInsumos}</StatNumber>
              <StatHelpText m={0} color="teal.700">Registrados en BD</StatHelpText>
            </Stat>

            <Stat bg={statActivosBg} p={4} borderRadius="lg">
              <HStack spacing={2} mb={1}>
                <FaCheckCircle color="green" />
                <StatLabel fontWeight="bold" color="green.800">Insumos Activos</StatLabel>
              </HStack>
              <StatNumber fontSize="3xl" color={activosNumberColor}>{insActivos}</StatNumber>
              <StatHelpText m={0} color="green.700">Disponibles para producción</StatHelpText>
            </Stat>

            <Stat bg={statInactivosBg} p={4} borderRadius="lg">
              <HStack spacing={2} mb={1}>
                <FaTimesCircle color="red" />
                <StatLabel fontWeight="bold" color="red.800">Insumos Inactivos</StatLabel>
              </HStack>
              <StatNumber fontSize="3xl" color={inactivosNumberColor}>{insInactivos}</StatNumber>
              <StatHelpText m={0} color="red.700">Uso suspendido o agotado</StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardHeader>

        <CardBody pt={0} px={{ base: 2, md: 6 }}>
          <CrudTabla
            title="Insumos"
            columns={columns}
            extractors={extractors}
            fields={fields}
            idKey="id_insumo"
            initialData={data}
            onInsert={handleInsert}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onReload={cargarInsumos}
            apiUrl="/produccion/insumos"
          />
        </CardBody>
      </Card>

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Insumos</Text>
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
              <Input placeholder="Ej: Sal, Azúcar" value={expNombre} onChange={(e) => setExpNombre(e.target.value)} size="sm" bg={modalInputBg} />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por estado</FormLabel>
              <Select placeholder="Todos los estados" value={expEstado} onChange={(e) => setExpEstado(e.target.value)} size="sm" bg={modalInputBg}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
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
              {EXPORT_FIELDS.map((f) => (
                <Checkbox key={f.key} isChecked={selectedFields.includes(f.key)} onChange={() => toggleField(f.key)} colorScheme="teal" size="sm">
                  {f.label}
                </Checkbox>
              ))}
            </SimpleGrid>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="teal" leftIcon={<DownloadIcon />} isLoading={exporting} loadingText="Generando..." isDisabled={selectedFields.length === 0}
              onClick={async () => {
                if (selectedFields.length === 0) { toast({ title: "Selecciona al menos un campo", status: "warning", duration: 3000, isClosable: true }); return; }
                const filters = { nombre: expNombre || undefined, estado: expEstado || undefined };
                if (exportFormat === "pdf") { await handleExportPDF(filters); } else { await handleExportExcel(filters); }
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
