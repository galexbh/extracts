// ============================================================
// ðŸ“ src/components/Ventas/Clientes.js
// ðŸŽ¯ Clientes con mini dashboard, PDF/Excel, validaciones y soporte claro/oscuro
// ============================================================

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
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
  Select,
  Input,
  Checkbox,
  Badge,
} from "@chakra-ui/react";

import {
  FaArrowLeft,
  FaFileExport,
  FaUserFriends,
  FaCheckCircle,
  FaUserSlash,
  FaBan,
} from "react-icons/fa";
import { DownloadIcon } from "@chakra-ui/icons";

import { useNavigate } from "react-router-dom";
import CrudTabla from "../Seguridad/CrudTabla";
import api from "../../api/apiClient";
import { formatDate, formatDateTime, formatNow } from "../../utils/dateFormat";

// ðŸ“¦ ExportaciÃ³n
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ðŸ–¼ï¸ Logo SOLO para el PDF
import extractusLogo from "../login/log.png";

// âœ… Validaciones
import {
  validarRequerido,
  validarTelefono,
  validarRTN,
  validarEmailSeguridad,
  validarLongitudMinima,
  formatearTelefono,
} from "../../utils/validaciones";

// â”€â”€ Campos disponibles para exportaciÃ³n â”€â”€
const EXPORT_FIELDS = [
  { key: "id", label: "ID" },
  { key: "nombre", label: "Nombre" },
  { key: "rtn", label: "RTN / ID" },
  { key: "tipo", label: "Tipo" },
  { key: "direccion", label: "Dirección" },
  { key: "telefono", label: "Teléfono" },
  { key: "correo", label: "Correo" },
  { key: "estado", label: "Estado" },
  { key: "fecha", label: "Fecha Creación" },
];

const ALL_FIELD_KEYS = EXPORT_FIELDS.map(f => f.key);
const MAX_NOMBRE_CLIENTE = 60;

export default function Clientes() {
  // ðŸŽ¨ Colores adaptados a dÃ­a/noche
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
  const statSuspendidosBg = useColorModeValue("#fff3e0", "rgba(237,137,54,0.12)");

  const subtitleColor = useColorModeValue("gray.600", "gray.300");
  const activosNumberColor = useColorModeValue("green.600", "green.300");
  const inactivosNumberColor = useColorModeValue("red.500", "red.300");
  const suspendidosNumberColor = useColorModeValue("orange.500", "orange.300");

  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [tiposCliente, setTiposCliente] = useState([]);
  const [estadosCliente, setEstadosCliente] = useState([]);
  const estadosClienteVisibles = estadosCliente.filter(
  (e) => (e.nombre_estado || "").toLowerCase() !== "suspendido"
);
  const [loading, setLoading] = useState(true);

  // Modal de exportaciÃ³n
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expNombre, setExpNombre] = useState("");
  const [expEstado, setExpEstado] = useState("");
  const [expTipo, setExpTipo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedFields, setSelectedFields] = useState([...ALL_FIELD_KEYS]);

  // Helpers de checklist
  const toggleField = (key) =>
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  const allSelected = selectedFields.length === ALL_FIELD_KEYS.length;
  const toggleAll = () =>
    setSelectedFields(allSelected ? [] : [...ALL_FIELD_KEYS]);

  // Colores del modal
  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const inputBg = useColorModeValue("white", "gray.600");

  // ============================================================
  // ðŸ”¹ Cargar clientes desde la API
  // ============================================================
  const cargarClientes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/ventas/clientes");
      setData(res.data);
    } catch (err) {
      console.error("âŒ Error cargando clientes:", err);
      toast({
        title: "Error al cargar clientes",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ============================================================
  // ðŸ”¹ Cargar tipos y estados (catÃ¡logos)
  // ============================================================
  const cargarTiposYEstados = useCallback(async () => {
    try {
      const [tipos, estados] = await Promise.all([
        api.get("/mantenimiento/tipo-cliente"),
        api.get("/mantenimiento/estado-cliente"),
      ]);
      setTiposCliente(tipos.data);
      setEstadosCliente(estados.data);
    } catch (err) {
      console.error("âŒ Error cargando catÃ¡logos:", err);
      toast({
        title: "Error al cargar catÃ¡logos",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }
  }, [toast]);

  // ============================================================
  // ðŸ”¹ Carga inicial
  // ============================================================
  useEffect(() => {
    Promise.all([cargarClientes(), cargarTiposYEstados()]);
  }, [cargarClientes, cargarTiposYEstados]);

  // ============================================================
  // ðŸ“Š Mini dashboard (totales)
  // ============================================================
  const { totalClientes, clientesActivos, clientesInactivos, clientesSuspendidos } = useMemo(() => {
    const total = data.length;

    const activos = data.filter((r) => {
      const estado = (r.estado_cliente || r.nombre_estado || "")
        .toString()
        .toLowerCase();
      return estado === "activo";
    }).length;

    const suspendidos = data.filter((r) => {
      const estado = (r.estado_cliente || r.nombre_estado || "")
        .toString()
        .toLowerCase();
      return estado === "suspendido";
    }).length;

    const inactivos = total - activos - suspendidos;

    return {
      totalClientes: total,
      clientesActivos: activos,
      clientesInactivos: inactivos,
      clientesSuspendidos: suspendidos,
    };
  }, [data]);

  // ============================================================
  // ðŸ” Validadores por campo
  // ============================================================
  const validators = {
    nombre_cliente: (v) => {
      const req = validarRequerido(v, "Nombre del cliente");
      if (req) return req;
      if (String(v).trim().length < 3)
        return "El nombre debe tener al menos 3 caracteres.";
      if (String(v).trim().length > MAX_NOMBRE_CLIENTE)
        return `El nombre no puede exceder ${MAX_NOMBRE_CLIENTE} caracteres.`;
      if (!/^[A-Za-zÃÃ‰ÃÃ“ÃšÃ‘Ã¡Ã©Ã­Ã³ÃºÃ±\s]+$/.test(String(v)))
        return "El nombre solo debe contener letras y espacios.";
      return null;
    },
    rtn: (v) => {
      const req = validarRequerido(v, "El RTN / ID");
      if (req) return req;
      const limpio = String(v).replace(/-/g, "");
      if (!/^[0-9]{13,14}$/.test(limpio))
        return "El RTN / ID debe tener entre 13 y 14 dÃ­gitos numÃ©ricos.";
      return null;
    },
    direccion: (v) =>
      validarRequerido(v, "Direccion") ||
      validarLongitudMinima(v, "Direccion", 5) ||
      (String(v || "").trim().length > 250 ? "La direccion no puede exceder 250 caracteres." : null),
    telefono: (v) =>
      validarRequerido(v, "Teléfono") || validarTelefono(v),
    correo_electronico: (v) =>
      validarRequerido(v, "Correo") || validarEmailSeguridad(v),
  };

  // ============================================================
  // ðŸ”¹ Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_cliente",
      label: "Nombre del Cliente",
      type: "text",
      required: true,
      placeholderText: "Ej. Juan Perez",
      validate: validators.nombre_cliente,
      maxLength: MAX_NOMBRE_CLIENTE,
      sanitize: (v) => String(v).replace(/[^A-Za-zÃÃ‰ÃÃ“ÃšÃ‘Ã¡Ã©Ã­Ã³ÃºÃ±\s]/g, "").slice(0, MAX_NOMBRE_CLIENTE),
      sanitizeWarning: `Solo letras y espacios. MÃ¡ximo ${MAX_NOMBRE_CLIENTE} caracteres.`,
    },
    {
      name: "rtn",
      label: "RTN / ID (13 o 14 dÃ­gitos)",
      type: "text",
      required: true,
      placeholderText: "Ej. 0801199012345",
      validate: validators.rtn,
      sanitize: (v) => String(v).replace(/[^0-9-]/g, "").slice(0, 15),
      sanitizeWarning: "Solo numeros y guiones. Usa 13 o 14 digitos.",
    },
    {
      name: "id_tipo_cliente",
      label: "Tipo de Cliente",
      type: "select",
      options: tiposCliente.map((t) => ({
        label: t.nombre_tipo,
        value: t.id_tipo_cliente,
      })),
      required: true,
      validate: (v) => validarRequerido(v, "Tipo de cliente"),
    },
    {
      name: "direccion",
      label: "Dirección",
      type: "text",
      required: true,
      placeholderText: "Ej. Col. Kennedy, Bloque 4",
      validate: validators.direccion,
      maxLength: 250,
      sanitize: (v) => String(v).replace(/[^A-Za-zÃÃ‰ÃÃ“ÃšÃ¡Ã©Ã­Ã³ÃºÃ±Ã‘0-9 .,#-]/g, "").slice(0, 250),
      sanitizeWarning: "Solo letras, numeros y . , # -. Minimo 5 y maximo 250 caracteres.",
    },
    {
      name: "telefono",
      label: "Teléfono (8 dígitos)",
      type: "text",
      required: true,
      placeholderText: "Ej. 9999-9999",
      validate: validators.telefono,
      sanitize: (v) => formatearTelefono(v),
      maxLength: 9,
      sanitizeWarning: "Solo numeros. Formato esperado: 9999-9999.",
    },
    {
      name: "correo_electronico",
      label: "Correo Electrónico",
      type: "email",
      required: true,
      placeholderText: "Ej. correo@ejemplo.com",
      validate: validators.correo_electronico,
      maxLength: 100,
      sanitize: (v) => String(v || "").replace(/\s/g, "").toLowerCase().slice(0, 100),
      sanitizeWarning: "Ingresa un correo valido como usuario@dominio.com.",
    },
    {
  name: "id_estado_cliente",
  label: "Estado del Cliente",
  type: "select",
  options: estadosClienteVisibles.map((e) => ({
    label: e.nombre_estado,
    value: e.id_estado_cliente,
  })),
  required: true,
  validate: (v) => validarRequerido(v, "Estado"),
},
  ];


  // ============================================================
  // ðŸ”§ Helpers de exportaciÃ³n
  // ============================================================
  const buildFilterText = (filters = {}) => {
    const parts = [];
    if (filters.nombre) parts.push(`Nombre: ${filters.nombre}`);
    if (filters.estado) parts.push(`Estado: ${filters.estado}`);
    if (filters.tipo) parts.push(`Tipo: ${filters.tipo}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredData = (filters = {}) => {
    let filtered = [...data];
    if (filters.nombre) {
      const q = filters.nombre.toLowerCase();
      filtered = filtered.filter(r => (r.nombre_cliente || "").toLowerCase().includes(q));
    }
    if (filters.estado) {
      const q = filters.estado.toLowerCase();
      filtered = filtered.filter(r => (r.estado_cliente || r.nombre_estado || "").toLowerCase() === q);
    }
    if (filters.tipo) {
      const q = filters.tipo.toLowerCase();
      filtered = filtered.filter(r => (r.tipo_cliente || r.nombre_tipo || "").toLowerCase() === q);
    }
    return filtered;
  };

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
  // ðŸ“¤ Exportar PDF â€” Estilo profesional
  // ============================================================
  const handleExportPDF = async (filters = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(filters);

      if (rows.length === 0) {
        toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true });
        return;
      }

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;

      // â”€â”€ Logo â”€â”€
      try {
        const dataURL = await imgToDataURL(extractusLogo);
        doc.addImage(dataURL, "PNG", 40, 20, 45, 45);
      } catch (e) { /* sin logo */ }

      // â”€â”€ TÃ­tulo â”€â”€
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(25, 55, 80);
      doc.text("REPORTE DE CLIENTES", pageWidth / 2, 45, { align: "center" });

      // â”€â”€ Fecha/hora â”€â”€
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Generado: ${formatNow()}`, pageWidth / 2, 62, { align: "center" });

      // â”€â”€ Filtros â”€â”€
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(filters)}`, pageWidth / 2, 78, { align: "center" });

      // â”€â”€ LÃ­nea separadora â”€â”€
      doc.setDrawColor(0, 158, 115);
      doc.setLineWidth(1);
      doc.line(40, 90, pageWidth - 40, 90);

      // â”€â”€ Tabla (dinÃ¡mica por campos seleccionados) â”€â”€
      const fieldExtractors = {
        id: r => r.id_cliente,
        nombre: r => r.nombre_cliente,
        rtn: r => r.rtn || "",
        tipo: r => r.tipo_cliente || r.nombre_tipo || "",
        direccion: r => r.direccion || "",
        telefono: r => r.telefono || "",
        correo: r => r.correo_electronico || "",
        estado: r => r.estado_cliente || r.nombre_estado || "",
        fecha: r => r.fecha_creacion ? new Date(r.fecha_creacion).toISOString().split("T")[0] : "",
      };

      const activeFields = EXPORT_FIELDS.filter(f => selectedFields.includes(f.key));
      const headers = activeFields.map(f => f.label);
      const tableData = rows.map(r => activeFields.map(f => fieldExtractors[f.key](r)));

      autoTable(doc, {
        startY: 105,
        head: [headers],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
        headStyles: {
          fillColor: [0, 158, 115],
          textColor: 255,
          fontStyle: "bold",
        },
        didDrawPage: () => {
          const ps = doc.internal.pageSize;
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(`PÃ¡gina ${doc.getNumberOfPages()}`, ps.getWidth() - 80, ps.getHeight() - 20);
        },
      });

      // â”€â”€ Resumen â”€â”€
      const finalY = doc.lastAutoTable.finalY + 25;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(25, 55, 80);
      doc.text("RESUMEN", 40, finalY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60);
      let y = finalY + 18;
      doc.text(`Total de clientes exportados: ${rows.length}`, 50, y);
      y += 16;
      const activos = rows.filter(r => (r.estado_cliente || r.nombre_estado || "").toLowerCase() === "activo").length;
      const inactivos = rows.length - activos;
      doc.text(`Activos: ${activos}`, 50, y); y += 16;
      doc.text(`Inactivos: ${inactivos}`, 50, y);

      doc.save(`Clientes_Extractus_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("âŒ Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // ðŸ“Š Exportar Excel â€” Estilo profesional
  // ============================================================
  const handleExportExcel = async (filters = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(filters);

      if (rows.length === 0) {
        toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true });
        return;
      }

      const wb = new ExcelJS.Workbook();
      wb.creator = "Extractus ERP";
      wb.created = new Date();
      const ws = wb.addWorksheet("Clientes");

      // â”€â”€ Columnas dinÃ¡micas por campos seleccionados â”€â”€
      const allCols = [
        { key: "id", header: "ID", width: 8, extract: r => r.id_cliente },
        { key: "nombre", header: "Nombre", width: 25, extract: r => r.nombre_cliente },
        { key: "rtn", header: "RTN / ID", width: 18, extract: r => r.rtn || "" },
        { key: "tipo", header: "Tipo", width: 15, extract: r => r.tipo_cliente || r.nombre_tipo || "" },
        { key: "direccion", header: "Dirección", width: 30, extract: r => r.direccion || "" },
        { key: "telefono", header: "Teléfono", width: 14, extract: r => r.telefono || "" },
        { key: "correo", header: "Correo", width: 28, extract: r => r.correo_electronico || "" },
        { key: "estado", header: "Estado", width: 12, extract: r => r.estado_cliente || r.nombre_estado || "" },
        { key: "fecha", header: "Fecha Creación", width: 16, extract: r => r.fecha_creacion ? new Date(r.fecha_creacion).toISOString().split("T")[0] : "" },
      ];
      const columns = allCols.filter(c => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns.length); // A=1

      // â”€â”€ TÃ­tulo + Filtros â”€â”€
      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Clientes â€” Extractus";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF009E73" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells(`A2:${lastColLetter}2`);
      const filterCell = ws.getCell("A2");
      filterCell.value = `Filtros: ${buildFilterText(filters)}  |  Generado: ${formatNow()}`;
      filterCell.font = { size: 9, italic: true, color: { argb: "FF666666" } };
      filterCell.alignment = { horizontal: "center" };

      // Header en fila 4
      const headerRow = 4;
      columns.forEach((col, i) => {
        const cell = ws.getCell(headerRow, i + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009E73" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { bottom: { style: "thin", color: { argb: "FF007A5A" } } };
      });

      // â”€â”€ Datos â”€â”€
      rows.forEach((r, idx) => {
        const rowNum = headerRow + 1 + idx;
        columns.forEach((col, i) => {
          ws.getCell(rowNum, i + 1).value = col.extract(r);
        });
        // Zebra
        if (idx % 2 === 1) {
          for (let i = 1; i <= columns.length; i++) {
            ws.getCell(rowNum, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F7F0" } };
          }
        }
      });

      // â”€â”€ Auto-width â”€â”€
      columns.forEach((col, i) => {
        let maxLen = col.header.length;
        rows.forEach(r => {
          const v = String(col.extract(r) ?? "");
          if (v.length > maxLen) maxLen = v.length;
        });
        ws.getColumn(i + 1).width = Math.min(Math.max(col.width, maxLen + 2), 50);
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Clientes_Extractus_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("âŒ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // ðŸ”¹ Loader
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh" bg={pageBg}>
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ============================================================
  // ðŸ”¹ Render principal
  // ============================================================
  return (
    <Box bg={pageBg} minH="100vh" p={4}>
      {/* Botón Atrás */}
      <Tooltip label="Volver al menú Ventas" placement="bottom-start">
        <Button
          leftIcon={<Icon as={FaArrowLeft} />}
          bg={btnBackBg}
          color={btnBackColor}
          _hover={{ bg: btnBackHoverBg, transform: "scale(1.03)" }}
          onClick={() => navigate("/app/ventas")}
          size="sm"
          mb={4}
          boxShadow="sm"
          borderRadius="full"
        >
          Atrás
        </Button>
      </Tooltip>

      <Card
        bg={cardBg}
        borderColor={borderColor}
        borderWidth="1px"
        boxShadow="md"
      >
        {/* Encabezado con tÃ­tulo + botones */}
        <CardHeader pb={3}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Box>
              <HStack spacing={2}>
                <FaUserFriends color={accent} />
                <Heading size="md" color={accent}>
                  Gestión de Clientes
                </Heading>
              </HStack>
              <Text fontSize="sm" color={subtitleColor}>
                Mini resumen de clientes y tabla editable en la parte inferior.
              </Text>
            </Box>

            <Button
              size="sm"
              colorScheme="teal"
              leftIcon={<FaFileExport />}
              onClick={() => {
                setExpNombre(""); setExpEstado(""); setExpTipo("");
                setExportFormat("excel");
                setSelectedFields([...ALL_FIELD_KEYS]);
                exportModal.onOpen();
              }}
              isDisabled={exporting}
            >
              Exportar
            </Button>
          </Flex>
        </CardHeader>

        <CardBody pt={0}>
          {/* MINI DASHBOARD */}
          <Box py={3}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <Box
                as={Stat}
                p={4}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                bg={statTotalBg}
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <StatLabel>Total de clientes</StatLabel>
                    <StatNumber>{totalClientes}</StatNumber>
                    <StatHelpText fontSize="xs">
                      Registrados en el sistema
                    </StatHelpText>
                  </Box>
                  <Icon as={FaUserFriends} boxSize={8} color={accent} />
                </Flex>
              </Box>

              <Box
                as={Stat}
                p={4}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                bg={statActivosBg}
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <StatLabel>Clientes activos</StatLabel>
                    <StatNumber color={activosNumberColor}>
                      {clientesActivos}
                    </StatNumber>
                    <StatHelpText fontSize="xs">
                      En estado &quot;Activo&quot;
                    </StatHelpText>
                  </Box>
                  <Icon as={FaCheckCircle} boxSize={8} color="green.400" />
                </Flex>
              </Box>

              <Box
                as={Stat}
                p={4}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                bg={statInactivosBg}
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <StatLabel>Clientes inactivos</StatLabel>
                    <StatNumber color={inactivosNumberColor}>
                      {clientesInactivos}
                    </StatNumber>
                    <StatHelpText fontSize="xs">
                      No activos / dados de baja
                    </StatHelpText>
                  </Box>
                  <Icon as={FaUserSlash} boxSize={8} color="red.400" />
                </Flex>
              </Box>

              <Box
                as={Stat}
                p={4}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                bg={statSuspendidosBg}
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <StatLabel>Clientes suspendidos</StatLabel>
                    <StatNumber color={suspendidosNumberColor}>
                      {clientesSuspendidos}
                    </StatNumber>
                    <StatHelpText fontSize="xs">
                      Temporalmente inhabilitados
                    </StatHelpText>
                  </Box>
                  <Icon as={FaBan} boxSize={8} color="orange.400" />
                </Flex>
              </Box>
            </SimpleGrid>
          </Box>

          <Divider my={4} />

          {/* TABLA CRUD */}
          <Box overflowX="auto">
            <CrudTabla
              title="Clientes"
              columns={[
                "ID Cliente",
                "Nombre Cliente",
                "RTN / ID",
                "Tipo Cliente",
                "Dirección",
                "Teléfono",
                "Correo Electrónico",
                "Estado Cliente",
                "Fecha Creación",
              ]}
              extractors={{
                "ID Cliente": (r) => r.id_cliente,
                "Nombre Cliente": (r) => r.nombre_cliente,
                "RTN / ID": (r) => r.rtn,
                "Tipo Cliente": (r) => r.tipo_cliente || r.nombre_tipo,
                "Dirección": (r) => r.direccion,
                "Teléfono": (r) => r.telefono,
                "Correo Electrónico": (r) => r.correo_electronico,
                "Estado Cliente": (r) =>
                  r.estado_cliente || r.nombre_estado,
                "Fecha Creación": (r) =>
                  r.fecha_creacion
                    ? new Date(r.fecha_creacion).toISOString().split("T")[0]
                    : "",
              }}
              fields={fields}
              idKey="id_cliente"
              initialData={data}
              onReload={cargarClientes}
              apiUrl="/ventas/clientes"
              validators={validators}
              showReloadButton={false}
              addButtonLabel="Agregar cliente"
              addButtonProps={{
                colorScheme: "teal",
                borderRadius: "full",
                px: 5,
                boxShadow: "sm",
                _hover: { transform: "translateY(-1px)", boxShadow: "md" },
              }}
            />
          </Box>
        </CardBody>
      </Card>

      {/* ðŸ“¤ Modal de ExportaciÃ³n */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Clientes</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
              Si no aplicas filtros, se exportarÃ¡n todos los clientes.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato</FormLabel>
              <Select value={exportFormat} onChange={e => setExportFormat(e.target.value)} bg={inputBg}>
                <option value="excel">ðŸ“Š Excel (.xlsx)</option>
                <option value="pdf">ðŸ“„ PDF (.pdf)</option>
              </Select>
            </FormControl>

            <Divider my={4} />

            <Text fontWeight="bold" mb={3} color={accent}>Filtros de exportaciÃ³n</Text>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por nombre</FormLabel>
              <Input
                placeholder="Ej: Juan Perez"
                value={expNombre}
                onChange={e => setExpNombre(e.target.value)}
                size="sm"
                bg={inputBg}
              />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por estado</FormLabel>
              <Select placeholder="Todos los estados" value={expEstado} onChange={e => setExpEstado(e.target.value)} size="sm" bg={inputBg}>
                {estadosClienteVisibles.map(e => (
  <option key={e.id_estado_cliente} value={e.nombre_estado}>
    {e.nombre_estado}
  </option>
))}
              </Select>
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por tipo de cliente</FormLabel>
              <Select placeholder="Todos los tipos" value={expTipo} onChange={e => setExpTipo(e.target.value)} size="sm" bg={inputBg}>
                {tiposCliente.map(t => (
                  <option key={t.id_tipo_cliente} value={t.nombre_tipo}>{t.nombre_tipo}</option>
                ))}
              </Select>
            </FormControl>

            <Divider my={4} />

            {/* â”€â”€ Checklist de campos â”€â”€ */}
            <Flex justify="space-between" align="center" mb={3}>
              <HStack spacing={2}>
                <Text fontWeight="bold" color={accent}>Campos a exportar</Text>
                <Badge colorScheme="teal" fontSize="xs" borderRadius="full" px={2}>
                  {selectedFields.length} / {ALL_FIELD_KEYS.length}
                </Badge>
              </HStack>
              <Checkbox
                isChecked={allSelected}
                isIndeterminate={selectedFields.length > 0 && !allSelected}
                onChange={toggleAll}
                colorScheme="teal"
                size="sm"
              >
                <Text fontSize="xs">Seleccionar todos</Text>
              </Checkbox>
            </Flex>

            <SimpleGrid columns={2} spacing={2}>
              {EXPORT_FIELDS.map(f => (
                <Checkbox
                  key={f.key}
                  isChecked={selectedFields.includes(f.key)}
                  onChange={() => toggleField(f.key)}
                  colorScheme="teal"
                  size="sm"
                >
                  {f.label}
                </Checkbox>
              ))}
            </SimpleGrid>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="teal"
              leftIcon={<DownloadIcon />}
              isLoading={exporting}
              loadingText="Generando..."
              isDisabled={selectedFields.length === 0}
              onClick={async () => {
                if (selectedFields.length === 0) {
                  toast({ title: "Selecciona al menos un campo", status: "warning", duration: 3000, isClosable: true });
                  return;
                }
                const filters = {
                  nombre: expNombre || undefined,
                  estado: expEstado || undefined,
                  tipo: expTipo || undefined,
                };
                if (exportFormat === "pdf") {
                  await handleExportPDF(filters);
                } else {
                  await handleExportExcel(filters);
                }
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

