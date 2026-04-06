// ============================================================
// ðŸ“ src/components/Seguridad/Objetos.js
// âœ… VersiÃ³n con dashboard, paginaciÃ³n, export modal PDF/Excel y validaciones
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
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  HStack,
  Text,
  Select,
  IconButton,
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
  Checkbox,
  Badge,
} from "@chakra-ui/react";
import { FaArrowLeft, FaFileExport } from "react-icons/fa";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import CrudTabla from "./CrudTabla";
import api from "../../api/apiClient";
import { formatDate, formatDateTime, formatNow } from "../../utils/dateFormat";

// ðŸ“¦ ExportaciÃ³n
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ðŸ–¼ï¸ Logo SOLO para el PDF
import extractusLogo from "../login/log.png";

// â”€â”€ Campos disponibles para exportaciÃ³n â”€â”€
const EXPORT_FIELDS = [
  { key: "id", label: "ID" },
  { key: "nombre", label: "Nombre Objeto" },
  { key: "descripcion", label: "DescripciÃ³n" },
  { key: "tipo", label: "Tipo" },
  { key: "estado", label: "Estado" },
  { key: "usuario_creado", label: "Usuario Creado" },
  { key: "fecha_creado", label: "Fecha Creado" },
];

const ALL_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);

export default function Objetos() {
  // ============================================================
  // âœ… Paleta de colores (modo claro/oscuro) â€” IGUAL que Roles
  // ============================================================
  const accent = useColorModeValue("#0D9488", "#2DD4BF");
  const cardBg = useColorModeValue("#FFFFFF", "#1E293B");
  const borderClr = useColorModeValue("#E2E8F0", "#334155");

  const btnBackBg = useColorModeValue("#0D9488", "#0D9488");
  const btnBackHover = useColorModeValue("#0FAD9B", "#14B8A6");

  // Colores del modal
  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const inputBg = useColorModeValue("white", "gray.600");

  // ============================================================
  // âœ… Estados
  // ============================================================
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]); // datos completos sin paginar para exportar
  const [loading, setLoading] = useState(true);

  // PaginaciÃ³n
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Dashboard stats (se cargan del total sin paginar)
  const [statsData, setStatsData] = useState({ total: 0, activos: 0, inactivos: 0 });

  const username = localStorage.getItem("userEmail");

  // Modal de exportaciÃ³n
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expNombre, setExpNombre] = useState("");
  const [expTipo, setExpTipo] = useState("");
  const [expEstado, setExpEstado] = useState("");
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

  // ============================================================
  // âœ… Cargar estadÃ­sticas (sin paginaciÃ³n)
  // ============================================================
  const cargarStats = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/objetos"); // sin params = retorna todo
      const all = Array.isArray(res.data) ? res.data : res.data.rows || [];
      setAllData(all); // guardar para exportaciÃ³n
      setStatsData({
        total: all.length,
        activos: all.filter((o) => o.estado === "activo").length,
        inactivos: all.filter((o) => o.estado === "inactivo").length,
      });
    } catch (err) {
      console.error("âŒ Error cargando stats:", err);
    }
  }, []);

  // ============================================================
  // âœ… Cargar objetos paginados
  // ============================================================
  const cargarObjetos = useCallback(async (currentPage = page) => {
    try {
      setLoading(true);
      const res = await api.get("/seguridad/objetos", {
        params: { page: currentPage, limit },
      });

      if (res.data && res.data.rows) {
        setData(res.data.rows);
        setTotalPages(res.data.totalPages);
        setPage(res.data.page);
        setTotalRecords(res.data.total);
      } else if (Array.isArray(res.data)) {
        // Fallback: si el backend retorna array directo
        setData(res.data);
        setTotalPages(1);
        setTotalRecords(res.data.length);
      }
    } catch (err) {
      console.error("âŒ Error cargando objetos:", err);
      toast({
        title: "Error al cargar objetos",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, toast]);

  useEffect(() => {
    cargarObjetos(page);
    cargarStats();
  }, [page, limit, cargarObjetos, cargarStats]);

  // ============================================================
  // ðŸ”§ Helpers de exportaciÃ³n
  // ============================================================
  const tipoLabels = {
    pantalla: "Pantalla", reporte: "Reporte", menu: "MenÃº", proceso: "Proceso",
    boton: "BotÃ³n", dashboard: "Dashboard", formulario: "Formulario",
    catalogo: "CatÃ¡logo", modulo: "MÃ³dulo",
  };

  const buildFilterText = (filters = {}) => {
    const parts = [];
    if (filters.nombre) parts.push(`Nombre: ${filters.nombre}`);
    if (filters.tipo) parts.push(`Tipo: ${filters.tipo}`);
    if (filters.estado) parts.push(`Estado: ${filters.estado}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredData = useCallback(
    (filters = {}) => {
      let filtered = [...allData];
      if (filters.nombre) {
        const q = filters.nombre.toLowerCase();
        filtered = filtered.filter((r) =>
          (r.nombre_objeto || "").toLowerCase().includes(q)
        );
      }
      if (filters.tipo) {
        filtered = filtered.filter((r) => r.tipo_objeto === filters.tipo);
      }
      if (filters.estado) {
        filtered = filtered.filter((r) => r.estado === filters.estado);
      }
      return filtered;
    },
    [allData]
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
  // ðŸ“¤ Exportar PDF
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

      try {
        const dataURL = await imgToDataURL(extractusLogo);
        doc.addImage(dataURL, "PNG", 40, 20, 45, 45);
      } catch (e) { /* sin logo */ }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(25, 55, 80);
      doc.text("REPORTE DE OBJETOS", pageWidth / 2, 45, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Generado: ${formatNow()}`, pageWidth / 2, 62, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(filters)}`, pageWidth / 2, 78, { align: "center" });

      doc.setDrawColor(0, 158, 115);
      doc.setLineWidth(1);
      doc.line(40, 90, pageWidth - 40, 90);

      const fieldExtractors = {
        id: (r) => r.id_objeto,
        nombre: (r) => r.nombre_objeto || "",
        descripcion: (r) => r.descripcion || "",
        tipo: (r) => tipoLabels[r.tipo_objeto] || r.tipo_objeto || "",
        estado: (r) => r.estado === "activo" ? "Activo" : "Inactivo",
        usuario_creado: (r) => r.usuario_creado || "",
        fecha_creado: (r) => r.fecha_creado ? new Date(r.fecha_creado).toISOString().split("T")[0] : "",
      };

      const activeFields = EXPORT_FIELDS.filter((f) => selectedFields.includes(f.key));
      const headers = activeFields.map((f) => f.label);
      const tableData = rows.map((r) => activeFields.map((f) => fieldExtractors[f.key](r)));

      autoTable(doc, {
        startY: 105,
        head: [headers],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
        headStyles: { fillColor: [0, 158, 115], textColor: 255, fontStyle: "bold" },
        didDrawPage: () => {
          const ps = doc.internal.pageSize;
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(`PÃ¡gina ${doc.getNumberOfPages()}`, ps.getWidth() - 80, ps.getHeight() - 20);
        },
      });

      const finalY = doc.lastAutoTable.finalY + 25;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(25, 55, 80);
      doc.text("RESUMEN", 40, finalY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60);
      let y = finalY + 18;
      doc.text(`Total de objetos exportados: ${rows.length}`, 50, y); y += 16;
      const act = rows.filter((r) => r.estado === "activo").length;
      doc.text(`Activos: ${act}`, 50, y); y += 16;
      doc.text(`Inactivos: ${rows.length - act}`, 50, y);

      doc.save(`Objetos_Extractus_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("âŒ Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // ðŸ“Š Exportar Excel
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
      const ws = wb.addWorksheet("Objetos");

      const allCols = [
        { key: "id", header: "ID", width: 8, extract: (r) => r.id_objeto },
        { key: "nombre", header: "Nombre Objeto", width: 25, extract: (r) => r.nombre_objeto || "" },
        { key: "descripcion", header: "DescripciÃ³n", width: 35, extract: (r) => r.descripcion || "" },
        { key: "tipo", header: "Tipo", width: 15, extract: (r) => tipoLabels[r.tipo_objeto] || r.tipo_objeto || "" },
        { key: "estado", header: "Estado", width: 12, extract: (r) => r.estado === "activo" ? "Activo" : "Inactivo" },
        { key: "usuario_creado", header: "Usuario Creado", width: 20, extract: (r) => r.usuario_creado || "" },
        { key: "fecha_creado", header: "Fecha Creado", width: 14, extract: (r) => r.fecha_creado ? new Date(r.fecha_creado).toISOString().split("T")[0] : "" },
      ];
      const columns = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns.length);

      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Objetos â€” Extractus";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF009E73" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells(`A2:${lastColLetter}2`);
      const filterCell = ws.getCell("A2");
      filterCell.value = `Filtros: ${buildFilterText(filters)}  |  Generado: ${formatNow()}`;
      filterCell.font = { size: 9, italic: true, color: { argb: "FF666666" } };
      filterCell.alignment = { horizontal: "center" };

      const headerRow = 4;
      columns.forEach((col, i) => {
        const cell = ws.getCell(headerRow, i + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009E73" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { bottom: { style: "thin", color: { argb: "FF007A5A" } } };
      });

      rows.forEach((r, idx) => {
        const rowNum = headerRow + 1 + idx;
        columns.forEach((col, i) => {
          ws.getCell(rowNum, i + 1).value = col.extract(r);
        });
        if (idx % 2 === 1) {
          for (let i = 1; i <= columns.length; i++) {
            ws.getCell(rowNum, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F7F0" } };
          }
        }
      });

      columns.forEach((col, i) => {
        let maxLen = col.header.length;
        rows.forEach((r) => {
          const v = String(col.extract(r) ?? "");
          if (v.length > maxLen) maxLen = v.length;
        });
        ws.getColumn(i + 1).width = Math.min(Math.max(col.width, maxLen + 2), 50);
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Objetos_Extractus_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("âŒ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // âœ… Funciones de validaciÃ³n y sanitizaciÃ³n
  // ============================================================
  const sanitizeTexto = (valor) => {
    if (!valor) return "";
    return valor.replace(/[^a-zA-ZÃ¡Ã©Ã­Ã³ÃºÃÃ‰ÃÃ“ÃšÃ±Ã‘\s._\-]/g, "");
  };

  const validarNombreObjeto = (v) => {
    if (!v || v.trim() === "") return "El nombre del objeto es obligatorio.";
    if (v.trim().length < 3) return "El nombre debe tener al menos 3 caracteres.";
    if (v.trim().length > 100) return "El nombre no puede exceder 100 caracteres.";
    if (/\d/.test(v)) return "El nombre del objeto no debe contener nÃºmeros.";
    return null;
  };

  const validarDescripcion = (v) => {
    if (v && v.length > 500) return "La descripciÃ³n no puede exceder 500 caracteres.";
    return null;
  };

  const validarTipoObjeto = (v) => {
    const tiposValidos = ["pantalla", "reporte", "menu", "proceso", "boton", "dashboard", "formulario", "catalogo", "modulo"];
    if (!v || !tiposValidos.includes(v)) return "Debe seleccionar un tipo de objeto vÃ¡lido.";
    return null;
  };

  const validarEstado = (v) => {
    if (!v || !["activo", "inactivo"].includes(v)) return "Debe seleccionar un estado vÃ¡lido.";
    return null;
  };

  // ============================================================
  // âœ… Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_objeto",
      label: "Nombre del Objeto",
      type: "text",
      required: true,
      placeholderText: "Ej. MÃ³dulo Ventas, BotÃ³n Reportes",
      validate: validarNombreObjeto,
      sanitize: sanitizeTexto,
      sanitizeWarning: "Solo letras, espacios y . _ -. MÃ­nimo 3 caracteres.",
    },
    {
      name: "descripcion",
      label: "DescripciÃ³n",
      type: "textarea",
      placeholderText: "Describe brevemente la funciÃ³n del objeto",
      validate: validarDescripcion,
      sanitize: sanitizeTexto,
    },
    {
      name: "tipo_objeto",
      label: "Tipo de Objeto",
      type: "select",
      required: true,
      validate: validarTipoObjeto,
      options: [
        { label: "Pantalla", value: "pantalla" },
        { label: "Reporte", value: "reporte" },
        { label: "MenÃº", value: "menu" },
        { label: "Proceso", value: "proceso" },
        { label: "BotÃ³n", value: "boton" },
        { label: "Dashboard", value: "dashboard" },
        { label: "Formulario", value: "formulario" },
        { label: "CatÃ¡logo", value: "catalogo" },
        { label: "MÃ³dulo", value: "modulo" },
      ],
    },
    {
      name: "estado",
      label: "Estado",
      type: "select",
      required: true,
      validate: validarEstado,
      options: [
        { label: "Activo", value: "activo" },
        { label: "Inactivo", value: "inactivo" },
      ],
    },
  ];

  // ============================================================
  // âœ… DefiniciÃ³n de columnas y extractores
  // ============================================================
  const columnsTable = [
    "ID Objeto",
    "Nombre Objeto",
    "DescripciÃ³n",
    "Tipo",
    "Estado",
    "Usuario Creado",
    "Fecha Creado",
    "Usuario Modificado",
    "Fecha Modificado",
  ];

  const extractors = {
    "ID Objeto": (r) => r.id_objeto,
    "Nombre Objeto": (r) => r.nombre_objeto,
    "DescripciÃ³n": (r) => r.descripcion || "-",
    "Tipo": (r) => {
      return tipoLabels[r.tipo_objeto] || r.tipo_objeto || "Pantalla";
    },
    "Estado": (r) => r.estado === "activo" ? "âœ… Activo" : "âŒ Inactivo",
    "Usuario Creado": (r) => r.usuario_creado || "â€”",
    "Fecha Creado": (r) =>
      r.fecha_creado ? new Date(r.fecha_creado).toISOString().split("T")[0] : "â€”",
    "Usuario Modificado": (r) => r.usuario_modificado || "â€”",
    "Fecha Modificado": (r) =>
      r.fecha_modificado ? new Date(r.fecha_modificado).toISOString().split("T")[0] : "â€”",
  };

  // ============================================================
  // âœ… Funciones CRUD
  // ============================================================
  const recargarTodo = async () => {
    await cargarObjetos(page);
    await cargarStats();
  };

  const handleInsert = async (nuevo) => {
    try {
      await api.post(
        "/seguridad/objetos",
        {
          nombre_objeto: nuevo.nombre_objeto,
          descripcion: nuevo.descripcion,
          tipo_objeto: nuevo.tipo_objeto || "pantalla",
          estado: nuevo.estado || "activo",
        },
        {
          headers: { "x-user-email": username },
        }
      );

      toast({
        title: "Objeto agregado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await recargarTodo();
    } catch (err) {
      console.error("âŒ Error insertando objeto:", err);
      const status = err.response?.status;
      const mensaje = err.response?.data?.error || err.message;
      toast({
        title: status === 409 ? "Objeto duplicado" : "Error al agregar objeto",
        description: mensaje,
        status: status === 409 ? "warning" : "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleUpdate = async (editado) => {
    try {
      await api.put(
        `/seguridad/objetos/${editado.id_objeto}`,
        {
          nombre_objeto: editado.nombre_objeto,
          descripcion: editado.descripcion,
          tipo_objeto: editado.tipo_objeto,
          estado: editado.estado,
        },
        {
          headers: { "x-user-email": username },
        }
      );

      toast({
        title: "Objeto actualizado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await recargarTodo();
    } catch (err) {
      console.error("âŒ Error actualizando objeto:", err);
      const status = err.response?.status;
      const mensaje = err.response?.data?.error || err.message;
      toast({
        title: status === 409 ? "Nombre duplicado" : "Error al actualizar objeto",
        description: mensaje,
        status: status === 409 ? "warning" : "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      const dependenciaRes = await api.get(`/seguridad/objetos/${id}/dependencias`);
      const dependenciaData = dependenciaRes.data || {};

      if (!dependenciaData.puedeEliminar) {
        const roles = (dependenciaData.permisos || [])
          .map((perm) => perm.nombre_rol)
          .filter(Boolean)
          .slice(0, 3);

        toast({
          title: "No se puede eliminar",
          description: `El objeto "${dependenciaData.nombre_objeto}" tiene ${dependenciaData.totalPermisos} permiso(s) asociado(s)${roles.length ? `: ${roles.join(", ")}${dependenciaData.totalPermisos > 3 ? "..." : ""}` : ""}.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return false;
      }

      await api.delete(`/seguridad/objetos/${id}`, {
        headers: { "x-user-email": username },
      });
        toast({
          title: "Objeto eliminado correctamente",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        await recargarTodo();
        return true;
      } catch (err) {
      console.error("âŒ Error eliminando objeto:", err);
      const status = err.response?.status;
      const mensaje = err.response?.data?.error || err.message;
        toast({
          title: status === 409 ? "No se puede eliminar" : "Error al eliminar objeto",
          description: mensaje,
          status: status === 409 ? "warning" : "error",
          duration: 4000,
          isClosable: true,
        });
        return false;
      }
    };

  // ============================================================
  // âœ… Loader
  // ============================================================
  if (loading && data.length === 0) {
    return (
      <Flex justify="center" align="center" minH="50vh">
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ============================================================
  // âœ… Render Final
  // ============================================================
  return (
    <Box p={4}>
      {/* ðŸ”™ BotÃ³n AtrÃ¡s */}
      <Tooltip label="Volver al mÃ³dulo Seguridad" placement="bottom-start">
        <Button
          leftIcon={<Icon as={FaArrowLeft} />}
          bg={btnBackBg}
          color="white"
          _hover={{ bg: btnBackHover }}
          onClick={() => navigate("/app/seguridad")}
          size="sm"
          mb={4}
        >
          Atrás
        </Button>
      </Tooltip>

      {/* ðŸ·ï¸ TÃ­tulo + BotÃ³n Exportar */}
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="lg" color={accent}>
          Objetos
        </Heading>
        <Button
          size="sm"
          colorScheme="teal"
          leftIcon={<FaFileExport />}
          onClick={() => {
            setExpNombre(""); setExpTipo(""); setExpEstado("");
            setExportFormat("excel");
            setSelectedFields([...ALL_FIELD_KEYS]);
            exportModal.onOpen();
          }}
          isDisabled={exporting}
        >
          Exportar
        </Button>
      </Flex>

      <Divider mb={4} borderColor={borderClr} />

      {/* âœ… DASHBOARD */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color={accent}>Objetos Registrados</StatLabel>
            <StatNumber fontSize="3xl">{statsData.total}</StatNumber>
            <StatHelpText>Total configurados</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="green.400">Activos</StatLabel>
            <StatNumber fontSize="3xl" color="green.400">{statsData.activos}</StatNumber>
            <StatHelpText>Objetos habilitados</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="red.400">Inactivos</StatLabel>
            <StatNumber fontSize="3xl" color="red.400">{statsData.inactivos}</StatNumber>
            <StatHelpText>Objetos deshabilitados</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* âœ… TABLA CRUD */}
      <Box
        bg={cardBg}
        p={3}
        rounded="md"
        border={`1px solid ${borderClr}`}
        shadow="sm"
      >
        <CrudTabla
          title="Objetos"
          columns={columnsTable}
          extractors={extractors}
          fields={fields}
          idKey="id_objeto"
          initialData={data}
          onInsert={handleInsert}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReload={() => recargarTodo()}
          apiUrl="/seguridad/objetos"
          enablePagination={false}
        />

        {/* âœ… PaginaciÃ³n */}
        {totalRecords > 0 && (
          <Flex justify="space-between" align="center" mt={4} p={2} borderTop="1px solid" borderColor={borderClr}>
            <HStack>
              <Text fontSize="sm" color="gray.500">
                Mostrando {Math.min(data.length, limit)} de {totalRecords} objetos
              </Text>
              <Select
                size="sm"
                width="80px"
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Select>
            </HStack>

            <HStack>
              <IconButton
                icon={<ChevronLeftIcon />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                isDisabled={page === 1}
                size="sm"
                aria-label="Anterior"
              />
              <Text fontSize="sm">
                PÃ¡gina {page} de {totalPages}
              </Text>
              <IconButton
                icon={<ChevronRightIcon />}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                isDisabled={page === totalPages}
                size="sm"
                aria-label="Siguiente"
              />
            </HStack>
          </Flex>
        )}
      </Box>

      {/* ðŸ“¤ Modal de ExportaciÃ³n */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Objetos</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
              Si no aplicas filtros, se exportarÃ¡n todos los objetos.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato</FormLabel>
              <Select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} bg={inputBg}>
                <option value="excel">ðŸ“Š Excel (.xlsx)</option>
                <option value="pdf">ðŸ“„ PDF (.pdf)</option>
              </Select>
            </FormControl>

            <Divider my={4} />

            <Text fontWeight="bold" mb={3} color={accent}>Filtros de exportaciÃ³n</Text>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por nombre</FormLabel>
              <Input
                placeholder="Ej: MÃ³dulo Ventas"
                value={expNombre}
                onChange={(e) => setExpNombre(e.target.value)}
                size="sm"
                bg={inputBg}
              />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por tipo de objeto</FormLabel>
              <Select placeholder="Todos los tipos" value={expTipo} onChange={(e) => setExpTipo(e.target.value)} size="sm" bg={inputBg}>
                <option value="pantalla">Pantalla</option>
                <option value="reporte">Reporte</option>
                <option value="menu">MenÃº</option>
                <option value="proceso">Proceso</option>
                <option value="boton">BotÃ³n</option>
                <option value="dashboard">Dashboard</option>
                <option value="formulario">Formulario</option>
                <option value="catalogo">CatÃ¡logo</option>
                <option value="modulo">MÃ³dulo</option>
              </Select>
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por estado</FormLabel>
              <Select placeholder="Todos los estados" value={expEstado} onChange={(e) => setExpEstado(e.target.value)} size="sm" bg={inputBg}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
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
              {EXPORT_FIELDS.map((f) => (
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
                  tipo: expTipo || undefined,
                  estado: expEstado || undefined,
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

