// ============================================================
// 📁 src/components/Seguridad/personas.js
// ✅ Versión con export modal PDF/Excel, Modo Claro/Oscuro optimizado
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
  Grid,
  FormControl,
  FormLabel,
  Input,
  Select,
  Text,
  HStack,
  SimpleGrid,
  Checkbox,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from "@chakra-ui/react";

import {
  FaSave,
  FaTrash,
  FaEdit,
  FaBroom,
  FaArrowLeft,
  FaFileExport,
} from "react-icons/fa";
import { DownloadIcon } from "@chakra-ui/icons";

import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";
import CrudTabla from "./CrudTabla";

// 📦 Exportación
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// 🖼️ Logo SOLO para el PDF
import extractusLogo from "../login/log.png";

// ── Campos disponibles para exportación ──
const EXPORT_FIELDS = [
  { key: "id", label: "ID" },
  { key: "nombre", label: "Nombre Completo" },
  { key: "identificacion", label: "Identificación" },
  { key: "genero", label: "Género" },
  { key: "tipo", label: "Tipo Empleado" },
  { key: "telefono", label: "Teléfono" },
  { key: "correo", label: "Correo" },
  { key: "ciudad", label: "Ciudad" },
  { key: "fecha_nac", label: "Fecha Nacimiento" },
];

const ALL_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);

export default function Personas() {
  const toast = useToast();
  const navigate = useNavigate();

  // ============================================================
  // ✅ PALETA HÍBRIDA (definida UNA VEZ)
  // ============================================================
  const cardBg = useColorModeValue("#FFFFFF", "#1E293B");
  const borderClr = useColorModeValue("#E2E8F0", "#334155");
  const accent = useColorModeValue("#0D9488", "#2DD4BF");

  const rowBgEven = useColorModeValue("#F8FAFC", "#1F2937");
  const rowBgOdd = useColorModeValue("#FFFFFF", "#111827");

  const inputBg = useColorModeValue("#F1F5F9", "#1E293B");
  const inputBorder = useColorModeValue("#CBD5E1", "#475569");
  const inputText = useColorModeValue("#0F172A", "#F8FAFC");

  const tableHeadBg = useColorModeValue("#0D9488", "#0F766E");
  const tableHeadText = useColorModeValue("#FFFFFF", "#E2E8F0");

  const colorBtn = useColorModeValue("#0D9488", "#0D9488");
  const colorBtnHover = useColorModeValue("#0FAD9B", "#14B8A6");
  const dangerBtn = useColorModeValue("#DC2626", "#DC2626");
  const dangerBtnHover = useColorModeValue("#EF4444", "#B91C1C");

  // Colores del modal
  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const modalInputBg = useColorModeValue("white", "gray.600");

  // ============================================================
  // ✅ Estados
  // ============================================================
  const [empleados, setEmpleados] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modoEdicion, setModoEdicion] = useState(false);

  const [idPersonaEdit, setIdPersonaEdit] = useState(null);
  const [idTelefonoEdit, setIdTelefonoEdit] = useState(null);
  const [idCorreoEdit, setIdCorreoEdit] = useState(null);
  const [idDireccionEdit, setIdDireccionEdit] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    identificacion: "",
    fecha_nacimiento: "",
    genero: "",
    tipo_persona: "",
    telefono: "",
    correo: "",
    direccion: "",
    ciudad: "",
    departamento: "",
    pais: "",
  });

  // Modal de exportación
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expNombre, setExpNombre] = useState("");
  const [expGenero, setExpGenero] = useState("");
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

  // ============================================================
  // VALIDACIONES (Mejoradas)
  // ============================================================
  const validarFormulario = () => {
    const soloLetrasConExtras = /^[A-Za-záéíóúÁÉÍÓÚñÑ\s\-'.]{3,100}$/;
    const dniRegex = /^(\d{13}|\d{4}-\d{4}-\d{5})$/;
    const telefonoRegex = /^[23789]\d{3}-?\d{4}$/;
    const correoRegex = /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/;
    const textoSeguro = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9 .,#-]{3,255}$/;

    const esVacio = (valor) => !valor || (typeof valor === 'string' && valor.trim() === "");

    if (esVacio(form.nombre)) {
      toast({ title: "El Nombre es obligatorio", status: "warning" });
      return false;
    }
    if (!soloLetrasConExtras.test(form.nombre.trim())) {
      toast({ title: "Nombre inválido", description: "Solo letras, mínimo 3 y máximo 100 caracteres.", status: "warning" });
      return false;
    }

    if (esVacio(form.apellido)) {
      toast({ title: "El Apellido es obligatorio", status: "warning" });
      return false;
    }
    if (!soloLetrasConExtras.test(form.apellido.trim())) {
      toast({ title: "Apellido inválido", description: "Solo letras, mínimo 3 y máximo 100 caracteres.", status: "warning" });
      return false;
    }

    if (esVacio(form.identificacion)) {
      toast({ title: "La Identificación es requerida", status: "warning" });
      return false;
    }
    if (form.identificacion.trim().length > 50) {
      toast({ title: "Identificación inválida", description: "No puede exceder 50 caracteres (BD).", status: "warning" });
      return false;
    }
    if (!dniRegex.test(form.identificacion.trim())) {
      toast({ title: "Identificación inválida", description: "Debe ser 13 dígitos o formato 0000-0000-00000.", status: "warning" });
      return false;
    }

    if (!form.fecha_nacimiento) {
      toast({ title: "Fecha de nacimiento requerida", status: "warning" });
      return false;
    }
    const fecha = new Date(form.fecha_nacimiento);
    const hoy = new Date();
    if (isNaN(fecha)) {
      toast({ title: "Fecha inválida", description: "Verifique el formato de la fecha.", status: "warning" });
      return false;
    }
    if (fecha > hoy) {
      toast({ title: "Fecha inválida", description: "No puede ser futura.", status: "warning" });
      return false;
    }
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const mesDif = hoy.getMonth() - fecha.getMonth();
    if (mesDif < 0 || (mesDif === 0 && hoy.getDate() < fecha.getDate())) {
      edad--;
    }
    if (edad < 18) {
      toast({ title: "Edad mínima: 18 años", status: "warning" });
      return false;
    }

    if (esVacio(form.genero)) {
      toast({ title: "Seleccione un género", status: "warning" });
      return false;
    }

    if (esVacio(form.tipo_persona)) {
      toast({ title: "Seleccione un tipo de empleado", status: "warning" });
      return false;
    }

    if (esVacio(form.telefono)) {
      toast({ title: "El Teléfono es requerido", status: "warning" });
      return false;
    }
    if (!telefonoRegex.test(form.telefono.trim())) {
      toast({ title: "Teléfono inválido", description: "Debe tener 8 dígitos y comenzar con 2,3,7,8 o 9.", status: "warning" });
      return false;
    }

    if (esVacio(form.correo)) {
      toast({ title: "El Correo es requerido", status: "warning" });
      return false;
    }
    if (!correoRegex.test(form.correo.trim())) {
      toast({ title: "Correo inválido", status: "warning" });
      return false;
    }

    if (esVacio(form.direccion)) {
      toast({ title: "La Dirección es requerida", status: "warning" });
      return false;
    }
    if (!textoSeguro.test(form.direccion.trim())) {
      toast({ title: "Dirección inválida", description: "Mínimo 3, máximo 255 caracteres permitidos.", status: "warning" });
      return false;
    }

    const validacionDireccion = (field, label) => {
      if (esVacio(form[field])) {
        toast({ title: `${label} es obligatorio`, status: "warning" });
        return false;
      }
      if (!soloLetrasConExtras.test(form[field].trim())) {
        toast({ title: `${label} inválido`, status: "warning" });
        return false;
      }
      return true;
    };

    if (!validacionDireccion('ciudad', 'Ciudad')) return false;
    if (!validacionDireccion('departamento', 'Departamento')) return false;
    if (!validacionDireccion('pais', 'País')) return false;

    return true;
  };

  // ============================================================
  // ✅ Cargar datos
  // ============================================================
  const cargar = useCallback(async () => {
    try {
      const [p, t, phones, mails, dirs] = await Promise.all([
        api.get("/seguridad/personas"),
        api.get("/mantenimiento/tipo-persona"),
        api.get("/seguridad/telefonos"),
        api.get("/seguridad/correos"),
        api.get("/seguridad/direcciones"),
      ]);

      const tabla = p.data.map((emp) => ({
        ...emp,
        telefono: phones.data.find((x) => x.id_persona === emp.id_persona),
        correo: mails.data.find((x) => x.id_persona === emp.id_persona),
        direccion: dirs.data.find((x) => x.id_persona === emp.id_persona),
      }));

      setEmpleados(tabla);
      setTipos(t.data);
    } catch (error) {
      toast({
        title: "Error cargando empleados",
        description: error.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ============================================================
  // ✅ Form handlers
  // ============================================================
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const limpiar = () => {
    setModoEdicion(false);
    setIdPersonaEdit(null);
    setIdTelefonoEdit(null);
    setIdCorreoEdit(null);
    setIdDireccionEdit(null);

    setForm({
      nombre: "",
      apellido: "",
      identificacion: "",
      fecha_nacimiento: "",
      genero: "",
      tipo_persona: "",
      telefono: "",
      correo: "",
      direccion: "",
      ciudad: "",
      departamento: "",
      pais: "",
    });
  };

  // ============================================================
  // ✅ Editar
  // ============================================================
  const editar = (emp) => {
    setModoEdicion(true);

    setIdPersonaEdit(emp.id_persona);
    setIdTelefonoEdit(emp.telefono?.id_telefono || null);
    setIdCorreoEdit(emp.correo?.id_correo || null);
    setIdDireccionEdit(emp.direccion?.id_direccion || null);

    setForm({
      nombre: emp.nombre || "",
      apellido: emp.apellido || "",
      identificacion: emp.identificacion || "",
      fecha_nacimiento: emp.fecha_nacimiento?.split("T")[0] || "",
      genero: emp.genero || "",
      tipo_persona: emp.tipo_persona || "",
      telefono: emp.telefono?.numero || "",
      correo: emp.correo?.correo || "",
      direccion: emp.direccion?.direccion || "",
      ciudad: emp.direccion?.ciudad || "",
      departamento: emp.direccion?.departamento || "",
      pais: emp.direccion?.pais || "",
    });
  };

  // ============================================================
  // ✅ Guardar nuevo
  // ============================================================
  const guardarNuevo = async () => {
    if (!validarFormulario()) return;

    try {
      const res = await api.post("/seguridad/personas", {
        nombre: form.nombre,
        apellido: form.apellido,
        identificacion: form.identificacion,
        fecha_nacimiento: form.fecha_nacimiento,
        genero: form.genero,
        tipo_persona: Number(form.tipo_persona),
      });

      const id = res.data.id_persona;

      await api.post("/seguridad/telefonos", { id_persona: id, numero: form.telefono, id_tipo_telefono: 1 });
      await api.post("/seguridad/correos", { id_persona: id, correo: form.correo });
      await api.post("/seguridad/direcciones", {
        id_persona: id, direccion: form.direccion, ciudad: form.ciudad,
        departamento: form.departamento, pais: form.pais,
      });

      toast({ title: "✅ Empleado creado", status: "success" });
      limpiar();
      cargar();
    } catch (e) {
      toast({ title: "Error", description: e.message, status: "error" });
    }
  };

  // ============================================================
  // ✅ Actualizar empleado
  // ============================================================
  const actualizar = async () => {
    if (!validarFormulario()) return;

    try {
      await api.put(`/seguridad/personas/${idPersonaEdit}`, {
        nombre: form.nombre, apellido: form.apellido,
        identificacion: form.identificacion, fecha_nacimiento: form.fecha_nacimiento,
        genero: form.genero, tipo_persona: Number(form.tipo_persona),
      });

      if (idTelefonoEdit)
        await api.put(`/seguridad/telefonos/${idTelefonoEdit}`, { id_persona: idPersonaEdit, numero: form.telefono, id_tipo_telefono: 1 });
      else if (form.telefono)
        await api.post(`/seguridad/telefonos`, { id_persona: idPersonaEdit, numero: form.telefono, id_tipo_telefono: 1 });

      if (idCorreoEdit)
        await api.put(`/seguridad/correos/${idCorreoEdit}`, { id_persona: idPersonaEdit, correo: form.correo });
      else if (form.correo)
        await api.post(`/seguridad/correos`, { id_persona: idPersonaEdit, correo: form.correo });

      if (idDireccionEdit)
        await api.put(`/seguridad/direcciones/${idDireccionEdit}`, {
          id_persona: idPersonaEdit, direccion: form.direccion, ciudad: form.ciudad,
          departamento: form.departamento, pais: form.pais,
        });
      else if (form.direccion)
        await api.post(`/seguridad/direcciones`, {
          id_persona: idPersonaEdit, direccion: form.direccion, ciudad: form.ciudad,
          departamento: form.departamento, pais: form.pais,
        });

      toast({ title: "✅ Empleado actualizado", status: "success" });
      limpiar();
      cargar();
    } catch (e) {
      toast({ title: "Error al actualizar", description: e.message, status: "error" });
    }
  };

  // ============================================================
  // ✅ Eliminar
  // ============================================================
  const eliminar = async (id) => {
    try {
      await api.delete(`/seguridad/personas/${id}`);
      toast({ title: "🗑️ Empleado eliminado", status: "success" });
      cargar();
    } catch (e) {
      toast({ title: "Error al eliminar", description: e.response?.data?.error || e.message, status: "error" });
    }
  };

  // ============================================================
  // 🔧 Helpers de exportación
  // ============================================================
  const buildFilterText = (filters = {}) => {
    const parts = [];
    if (filters.nombre) parts.push(`Nombre: ${filters.nombre}`);
    if (filters.genero) parts.push(`Género: ${filters.genero}`);
    if (filters.tipo) parts.push(`Tipo: ${filters.tipo}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredData = useCallback(
    (filters = {}) => {
      let filtered = [...empleados];
      if (filters.nombre) {
        const q = filters.nombre.toLowerCase();
        filtered = filtered.filter((r) =>
          `${r.nombre || ""} ${r.apellido || ""}`.toLowerCase().includes(q)
        );
      }
      if (filters.genero) {
        filtered = filtered.filter((r) => (r.genero || "").toLowerCase() === filters.genero.toLowerCase());
      }
      if (filters.tipo) {
        filtered = filtered.filter((r) => (r.nombre_tipo_persona || "").toLowerCase() === filters.tipo.toLowerCase());
      }
      return filtered;
    },
    [empleados]
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
      doc.text("REPORTE DE EMPLEADOS", pageWidth / 2, 45, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 62, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(filters)}`, pageWidth / 2, 78, { align: "center" });

      doc.setDrawColor(0, 158, 115);
      doc.setLineWidth(1);
      doc.line(40, 90, pageWidth - 40, 90);

      const fieldExtractors = {
        id: (r) => r.id_persona,
        nombre: (r) => `${r.nombre || ""} ${r.apellido || ""}`.trim(),
        identificacion: (r) => r.identificacion || "",
        genero: (r) => r.genero || "",
        tipo: (r) => r.nombre_tipo_persona || "",
        telefono: (r) => r.telefono?.numero || "",
        correo: (r) => r.correo?.correo || "",
        ciudad: (r) => r.direccion?.ciudad || "",
        fecha_nac: (r) => r.fecha_nacimiento ? new Date(r.fecha_nacimiento).toISOString().split("T")[0] : "",
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
          doc.text(`Página ${doc.getNumberOfPages()}`, ps.getWidth() - 80, ps.getHeight() - 20);
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
      doc.text(`Total de empleados exportados: ${rows.length}`, 50, y); y += 16;
      const masc = rows.filter((r) => (r.genero || "").toLowerCase() === "masculino").length;
      const fem = rows.filter((r) => (r.genero || "").toLowerCase() === "femenino").length;
      doc.text(`Masculinos: ${masc}`, 50, y); y += 16;
      doc.text(`Femeninos: ${fem}`, 50, y);

      doc.save(`Empleados_Extractus_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // 📊 Exportar Excel
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
      const ws = wb.addWorksheet("Empleados");

      const allCols = [
        { key: "id", header: "ID", width: 8, extract: (r) => r.id_persona },
        { key: "nombre", header: "Nombre Completo", width: 28, extract: (r) => `${r.nombre || ""} ${r.apellido || ""}`.trim() },
        { key: "identificacion", header: "Identificación", width: 18, extract: (r) => r.identificacion || "" },
        { key: "genero", header: "Género", width: 12, extract: (r) => r.genero || "" },
        { key: "tipo", header: "Tipo Empleado", width: 18, extract: (r) => r.nombre_tipo_persona || "" },
        { key: "telefono", header: "Teléfono", width: 14, extract: (r) => r.telefono?.numero || "" },
        { key: "correo", header: "Correo", width: 28, extract: (r) => r.correo?.correo || "" },
        { key: "ciudad", header: "Ciudad", width: 16, extract: (r) => r.direccion?.ciudad || "" },
        { key: "fecha_nac", header: "Fecha Nacimiento", width: 16, extract: (r) => r.fecha_nacimiento ? new Date(r.fecha_nacimiento).toISOString().split("T")[0] : "" },
      ];
      const columns = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns.length);

      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Empleados — Extractus";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF009E73" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells(`A2:${lastColLetter}2`);
      const filterCell = ws.getCell("A2");
      filterCell.value = `Filtros: ${buildFilterText(filters)}  |  Generado: ${new Date().toLocaleString()}`;
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
      saveAs(new Blob([buffer]), `Empleados_Extractus_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // ✅ Loading
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ✅ Stats Dashboard
  const statsData = {
    total: empleados.length,
    masculinos: empleados.filter(e => (e.genero || "").toLowerCase() === "masculino").length,
    femeninos: empleados.filter(e => (e.genero || "").toLowerCase() === "femenino").length
  };

  // ✅ CRUD Logic para CrudTabla
  const soloLetrasConExtras = /^[A-Za-záéíóúÁÉÍÓÚñÑ\s\-'.]{3,100}$/;
  const dniRegex = /^(\d{13}|\d{4}-\d{4}-\d{5})$/;
  const telefonoRegex = /^[23789]\d{3}-?\d{4}$/;
  const correoRegex = /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/;
  const textoSeguro = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9 .,#-]{3,255}$/;
  
  const validateText = (v) => (!v || !v.trim()) ? "Obligatorio" : (!soloLetrasConExtras.test(v.trim())) ? "Solo letras, 3 a 100 caracteres" : null;

  const fields = [
    {
      name: "nombre",
      label: "Nombre",
      type: "text",
      validate: validateText,
    },
    {
      name: "apellido",
      label: "Apellido",
      type: "text",
      validate: validateText,
    },
    {
      name: "identificacion",
      label: "Identificación",
      type: "text",
      placeholderText: "Ej: 0000-0000-00000 o 13 dígitos",
      validate: (v) => (!v || !v.trim()) ? "Obligatorio" : (!dniRegex.test(v.trim())) ? "Formato inválido" : null,
    },
    {
      name: "fecha_nacimiento",
      label: "Fecha de Nacimiento",
      type: "date",
      validate: (v) => {
         if (!v) return "Requerida";
         const fecha = new Date(v);
         const hoy = new Date();
         if(fecha > hoy) return "Fecha futura no permitida";
         let edad = hoy.getFullYear() - fecha.getFullYear();
         const mesDif = hoy.getMonth() - fecha.getMonth();
         if (mesDif < 0 || (mesDif === 0 && hoy.getDate() < fecha.getDate())) edad--;
         if (edad < 18) return "Debe ser mayor de 18 años";
         return null;
      }
    },
    {
      name: "genero",
      label: "Género",
      type: "select",
      options: [
        { label: "Masculino", value: "Masculino" },
        { label: "Femenino", value: "Femenino" }
      ],
      validate: (v) => (!v) ? "Seleccione género" : null,
    },
    {
      name: "tipo_persona",
      label: "Tipo de Empleado",
      type: "select",
      options: tipos.map(t => ({ label: t.nombre_tipo || t.tipo_persona, value: t.id_tipo_persona })),
      validate: (v) => (!v) ? "Seleccione un tipo" : null,
    },
    {
      name: "telefono",
      label: "Teléfono",
      type: "tel",
      placeholderText: "Ocho dígitos ej. 99998888",
      validate: (v) => (!v || String(v).trim() === "") ? "Obligatorio" : (!telefonoRegex.test(String(v).trim())) ? "Inválido (8 dígitos)" : null,
    },
    {
      name: "correo",
      label: "Correo Electrónico",
      type: "email",
      validate: (v) => (!v || !v.trim()) ? "Obligatorio" : (!correoRegex.test(v.trim())) ? "Correo incorrecto" : null,
    },
    {
      name: "direccion",
      label: "Dirección Exacta",
      type: "textarea",
      validate: (v) => (!v || !v.trim()) ? "Obligatorio" : (!textoSeguro.test(v.trim())) ? "Caracteres no válidos" : null,
    },
    {
      name: "ciudad",
      label: "Ciudad",
      type: "text",
      validate: validateText,
    },
    {
      name: "departamento",
      label: "Departamento",
      type: "text",
      validate: validateText,
    },
    {
      name: "pais",
      label: "País",
      type: "text",
      validate: validateText,
    }
  ];

  const columnsTable = [
    "ID",
    "Nombre Completo",
    "Identidad",
    "Género",
    "Tipo",
    "Teléfono",
    "Correo",
    "Ciudad"
  ];

  const extractors = {
    "ID": (r) => r.id_persona,
    "Nombre Completo": (r) => `${r.nombre || ""} ${r.apellido || ""}`.trim(),
    "Identidad": (r) => r.identificacion,
    "Género": (r) => r.genero || "",
    "Tipo": (r) => r.nombre_tipo_persona || r.tipo_persona || "",
    "Teléfono": (r) => r.telefono?.numero || r.telefono || "—",
    "Correo": (r) => r.correo?.correo || r.correo || "—",
    "Ciudad": (r) => r.direccion?.ciudad || r.ciudad || "—",
  };

  const handleInsert = async (nuevo) => {
      const res = await api.post("/seguridad/personas", {
        nombre: nuevo.nombre,
        apellido: nuevo.apellido,
        identificacion: nuevo.identificacion,
        fecha_nacimiento: nuevo.fecha_nacimiento,
        genero: nuevo.genero,
        tipo_persona: Number(nuevo.tipo_persona),
      });

      const id = res.data.id_persona;
      await api.post("/seguridad/telefonos", { id_persona: id, numero: nuevo.telefono, id_tipo_telefono: 1 });
      await api.post("/seguridad/correos", { id_persona: id, correo: nuevo.correo });
      await api.post("/seguridad/direcciones", {
        id_persona: id, direccion: nuevo.direccion, ciudad: nuevo.ciudad,
        departamento: nuevo.departamento, pais: nuevo.pais,
      });
      return true;
  };

  const handleUpdate = async (editado) => {
      await api.put(`/seguridad/personas/${editado.id_persona}`, {
        nombre: editado.nombre, apellido: editado.apellido,
        identificacion: editado.identificacion, fecha_nacimiento: editado.fecha_nacimiento,
        genero: editado.genero, tipo_persona: Number(editado.tipo_persona),
      });

      // Empleado viejo
      const empViejo = empleados.find(x => x.id_persona === editado.id_persona);

      const idTelefonoEdit = empViejo?.telefonoOrig?.id_telefono || empViejo?.telefono?.id_telefono;
      if (idTelefonoEdit) await api.put(`/seguridad/telefonos/${idTelefonoEdit}`, { id_persona: editado.id_persona, numero: editado.telefono, id_tipo_telefono: 1 });
      else if (editado.telefono) await api.post(`/seguridad/telefonos`, { id_persona: editado.id_persona, numero: editado.telefono, id_tipo_telefono: 1 });

      const idCorreoEdit = empViejo?.correoOrig?.id_correo || empViejo?.correo?.id_correo;
      if (idCorreoEdit) await api.put(`/seguridad/correos/${idCorreoEdit}`, { id_persona: editado.id_persona, correo: editado.correo });
      else if (editado.correo) await api.post(`/seguridad/correos`, { id_persona: editado.id_persona, correo: editado.correo });

      const idDireccionEdit = empViejo?.direccionOrig?.id_direccion || empViejo?.direccion?.id_direccion;
      if (idDireccionEdit) await api.put(`/seguridad/direcciones/${idDireccionEdit}`, {
          id_persona: editado.id_persona, direccion: editado.direccion, ciudad: editado.ciudad, departamento: editado.departamento, pais: editado.pais,
        });
      else if (editado.direccion) await api.post(`/seguridad/direcciones`, {
          id_persona: editado.id_persona, direccion: editado.direccion, ciudad: editado.ciudad, departamento: editado.departamento, pais: editado.pais,
        });
      return true;
  };

  // ============================================================
  // ✅ UI FINAL
  // ============================================================
  
  // Transformar lista final para modal flat
  const mappedData = empleados.map(emp => ({
    ...emp,
    fecha_nacimiento: emp.fecha_nacimiento?.split("T")[0] || "",
    telefonoOrig: emp.telefono,
    correoOrig: emp.correo,
    direccionOrig: emp.direccion,
    telefono: emp.telefono?.numero || "",
    correo: emp.correo?.correo || "",
    direccion: emp.direccion?.direccion || "",
    ciudad: emp.direccion?.ciudad || "",
    departamento: emp.direccion?.departamento || "",
    pais: emp.direccion?.pais || "",
    tipo_persona: emp.id_tipo_persona || emp.tipo_persona || ""
  }));

  return (
    <Box p={5}>

      {/* ✅ Botón Atrás */}
      <Button
        leftIcon={<FaArrowLeft />}
        bg={colorBtn}
        color="white"
        _hover={{ bg: colorBtnHover }}
        size="sm"
        mb={4}
        onClick={() => navigate("/app/seguridad")}
      >
        Atrás
      </Button>

      {/* Título + Botón Exportar */}
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="lg" color={accent}>
          Gestión de Empleados
        </Heading>
        <Button
          size="sm"
          colorScheme="teal"
          leftIcon={<FaFileExport />}
          onClick={() => {
            setExpNombre(""); setExpGenero(""); setExpTipo("");
            setExportFormat("excel");
            setSelectedFields([...ALL_FIELD_KEYS]);
            exportModal.onOpen();
          }}
          isDisabled={exporting}
        >
          Exportar
        </Button>
      </Flex>

      <Divider mb={5} borderColor={borderClr} />

      {/* ✅ DASHBOARD */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color={accent}>Empleados Registrados</StatLabel>
            <StatNumber fontSize="3xl">{statsData.total}</StatNumber>
            <StatHelpText>Personal configurado</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="blue.400">Masculinos</StatLabel>
            <StatNumber fontSize="3xl" color="blue.400">{statsData.masculinos}</StatNumber>
            <StatHelpText>Total de hombres</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="pink.400">Femeninos</StatLabel>
            <StatNumber fontSize="3xl" color="pink.400">{statsData.femeninos}</StatNumber>
            <StatHelpText>Total de mujeres</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* ✅ TABLA CRUD */}
      <Box
        bg={cardBg}
        p={3}
        rounded="md"
        border={`1px solid ${borderClr}`}
        shadow="sm"
      >
        <CrudTabla
          title="Empleados"
          columns={columnsTable}
          extractors={extractors}
          fields={fields}
          idKey="id_persona"
          initialData={mappedData}
          onInsert={handleInsert}
          onUpdate={handleUpdate}
          onDelete={eliminar}
          onReload={() => cargar()}
          apiUrl="/seguridad/personas"
        />
      </Box>

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Empleados</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
              Si no aplicas filtros, se exportarán todos los empleados.
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
              <Input
                placeholder="Ej: Juan Pérez"
                value={expNombre}
                onChange={(e) => setExpNombre(e.target.value)}
                size="sm"
                bg={modalInputBg}
              />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por género</FormLabel>
              <Select placeholder="Todos" value={expGenero} onChange={(e) => setExpGenero(e.target.value)} size="sm" bg={modalInputBg}>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
              </Select>
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por tipo de empleado</FormLabel>
              <Select placeholder="Todos los tipos" value={expTipo} onChange={(e) => setExpTipo(e.target.value)} size="sm" bg={modalInputBg}>
                {tipos.map((t) => (
                  <option key={t.id_tipo_persona} value={t.nombre_tipo}>{t.nombre_tipo}</option>
                ))}
              </Select>
            </FormControl>

            <Divider my={4} />

            {/* ── Checklist de campos ── */}
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
                  genero: expGenero || undefined,
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
