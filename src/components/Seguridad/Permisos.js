// ============================================================
// 📁 src/components/Seguridad/Permisos.js
// ✅ Versión con dashboard, export modal PDF/Excel y diseño uniforme
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
  Checkbox,
  Badge,
} from "@chakra-ui/react";
import { FaArrowLeft, FaFileExport } from "react-icons/fa";
import { DownloadIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import CrudTabla from "./CrudTabla";
import api from "../../api/apiClient";

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
  { key: "rol", label: "Rol" },
  { key: "objeto", label: "Objeto" },
  { key: "crear", label: "Crear" },
  { key: "leer", label: "Leer" },
  { key: "actualizar", label: "Actualizar" },
  { key: "eliminar", label: "Eliminar" },
];

const ALL_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);

export default function Permisos() {
  // ============================================================
  // ✅ Paleta de colores (modo claro/oscuro) — IGUAL que Roles/Objetos
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
  // ✅ Estados
  // ============================================================
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [objetos, setObjetos] = useState([]);
  const [loading, setLoading] = useState(true);

  const username = localStorage.getItem("userEmail");

  // Modal de exportación
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expRol, setExpRol] = useState("");
  const [expObjeto, setExpObjeto] = useState("");
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
  // ✅ Cargar datos
  // ============================================================
  const cargarPermisos = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/permisos");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando permisos:", err);
      toast({
        title: "Error al cargar permisos",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const cargarRoles = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/roles");
      setRoles(res.data);
    } catch (error) {
      console.error("❌ Error cargando roles:", error);
    }
  }, []);

  const cargarObjetos = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/objetos");
      const all = Array.isArray(res.data) ? res.data : res.data.rows || [];
      setObjetos(all);
    } catch (error) {
      console.error("❌ Error cargando objetos:", error);
    }
  }, []);

  useEffect(() => {
    Promise.all([cargarPermisos(), cargarRoles(), cargarObjetos()]);
  }, [cargarPermisos, cargarRoles, cargarObjetos]);

  // ============================================================
  // ✅ Dashboard stats
  // ============================================================
  const totalPermisos = data.length;
  const permisosCompletos = data.filter(
    (p) => p.can_create && p.can_read && p.can_update && p.can_delete
  ).length;
  const permisosSoloLectura = data.filter(
    (p) => p.can_read && !p.can_create && !p.can_update && !p.can_delete
  ).length;

  // ============================================================
  // 🔧 Helpers de exportación
  // ============================================================
  const buildFilterText = (filters = {}) => {
    const parts = [];
    if (filters.rol) parts.push(`Rol: ${filters.rol}`);
    if (filters.objeto) parts.push(`Objeto: ${filters.objeto}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredData = useCallback(
    (filters = {}) => {
      let filtered = [...data];
      if (filters.rol) {
        const q = filters.rol.toLowerCase();
        filtered = filtered.filter((r) =>
          (r.nombre_rol || "").toLowerCase() === q
        );
      }
      if (filters.objeto) {
        const q = filters.objeto.toLowerCase();
        filtered = filtered.filter((r) =>
          (r.nombre_objeto || "").toLowerCase() === q
        );
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
      doc.text("REPORTE DE PERMISOS", pageWidth / 2, 45, { align: "center" });

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
        id: (r) => r.id_permiso,
        rol: (r) => r.nombre_rol || "",
        objeto: (r) => r.nombre_objeto || "",
        crear: (r) => r.can_create ? "Sí" : "No",
        leer: (r) => r.can_read ? "Sí" : "No",
        actualizar: (r) => r.can_update ? "Sí" : "No",
        eliminar: (r) => r.can_delete ? "Sí" : "No",
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
      doc.text(`Total de permisos exportados: ${rows.length}`, 50, y); y += 16;
      const completos = rows.filter((r) => r.can_create && r.can_read && r.can_update && r.can_delete).length;
      doc.text(`Acceso completo (CRUD): ${completos}`, 50, y); y += 16;
      const soloLectura = rows.filter((r) => r.can_read && !r.can_create && !r.can_update && !r.can_delete).length;
      doc.text(`Solo lectura: ${soloLectura}`, 50, y);

      doc.save(`Permisos_Extractus_${new Date().toISOString().split("T")[0]}.pdf`);
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
      const ws = wb.addWorksheet("Permisos");

      const allCols = [
        { key: "id", header: "ID", width: 8, extract: (r) => r.id_permiso },
        { key: "rol", header: "Rol", width: 20, extract: (r) => r.nombre_rol || "" },
        { key: "objeto", header: "Objeto", width: 22, extract: (r) => r.nombre_objeto || "" },
        { key: "crear", header: "Crear", width: 10, extract: (r) => r.can_create ? "Sí" : "No" },
        { key: "leer", header: "Leer", width: 10, extract: (r) => r.can_read ? "Sí" : "No" },
        { key: "actualizar", header: "Actualizar", width: 12, extract: (r) => r.can_update ? "Sí" : "No" },
        { key: "eliminar", header: "Eliminar", width: 10, extract: (r) => r.can_delete ? "Sí" : "No" },
      ];
      const columns = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns.length);

      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Permisos — Extractus";
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
      saveAs(new Blob([buffer]), `Permisos_Extractus_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // ✅ Campos del formulario CRUD
  // ============================================================
  // Validación: al menos un permiso debe estar marcado
  const validarAlMenosUno = (_val, form) => {
    const alguno = form.can_create || form.can_read || form.can_update || form.can_delete;
    if (!alguno) return "Debe asignar al menos un permiso (crear, leer, actualizar o eliminar).";
    return null;
  };

  const fields = [
    {
      name: "id_rol",
      label: "Rol",
      type: "select",
      options: roles.map((r) => ({ label: r.nombre_rol, value: r.id_rol })),
      required: true,
      validate: (v) => (!v ? "Debe seleccionar un rol." : null),
    },
    {
      name: "id_objeto",
      label: "Objeto",
      type: "select",
      options: objetos.map((o) => ({
        label: o.nombre_objeto,
        value: o.id_objeto,
      })),
      required: true,
      validate: (v) => (!v ? "Debe seleccionar un objeto." : null),
    },
    { name: "can_create", label: "Puede crear", type: "boolean", validate: validarAlMenosUno },
    { name: "can_read", label: "Puede leer", type: "boolean", validate: validarAlMenosUno },
    { name: "can_update", label: "Puede actualizar", type: "boolean", validate: validarAlMenosUno },
    { name: "can_delete", label: "Puede eliminar", type: "boolean", validate: validarAlMenosUno },
  ];

  // ============================================================
  // ✅ Columnas y extractores
  // ============================================================
  const columnsTable = [
    "ID Permiso",
    "Rol",
    "Objeto",
    "Crear",
    "Leer",
    "Actualizar",
    "Eliminar",
    "Usuario Creado",
    "Fecha Creado",
    "Usuario Modificado",
    "Fecha Modificado",
  ];

  const extractors = {
    "ID Permiso": (r) => r.id_permiso,
    Rol: (r) => r.nombre_rol,
    Objeto: (r) => r.nombre_objeto,
    Crear: (r) => (r.can_create ? "✅" : "❌"),
    Leer: (r) => (r.can_read ? "✅" : "❌"),
    Actualizar: (r) => (r.can_update ? "✅" : "❌"),
    Eliminar: (r) => (r.can_delete ? "✅" : "❌"),
    "Usuario Creado": (r) => r.usuario_creado || "—",
    "Fecha Creado": (r) =>
      r.fecha_creado
        ? new Date(r.fecha_creado).toISOString().split("T")[0]
        : "—",
    "Usuario Modificado": (r) => r.usuario_modificado || "—",
    "Fecha Modificado": (r) =>
      r.fecha_modificado
        ? new Date(r.fecha_modificado).toISOString().split("T")[0]
        : "—",
  };

  // ============================================================
  // ✅ Funciones CRUD
  // ============================================================
  const handleInsert = async (nuevo) => {
    try {
      await api.post(
        "/seguridad/permisos",
        {
          id_rol: nuevo.id_rol,
          id_objeto: nuevo.id_objeto,
          can_create: nuevo.can_create || false,
          can_read: nuevo.can_read || false,
          can_update: nuevo.can_update || false,
          can_delete: nuevo.can_delete || false,
        },
        {
          headers: { "x-user-email": username },
        }
      );

      toast({
        title: "Permiso agregado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await cargarPermisos();
    } catch (err) {
      console.error("❌ Error insertando permiso:", err);
      const status = err.response?.status;
      const mensaje = err.response?.data?.error || err.message;
      toast({
        title: status === 409 ? "Permiso duplicado" : "Error al agregar permiso",
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
        `/seguridad/permisos/${editado.id_permiso}`,
        {
          id_rol: editado.id_rol,
          id_objeto: editado.id_objeto,
          can_create: editado.can_create || false,
          can_read: editado.can_read || false,
          can_update: editado.can_update || false,
          can_delete: editado.can_delete || false,
        },
        {
          headers: { "x-user-email": username },
        }
      );

      toast({
        title: "Permiso actualizado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await cargarPermisos();
    } catch (err) {
      console.error("❌ Error actualizando permiso:", err);
      const status = err.response?.status;
      const mensaje = err.response?.data?.error || err.message;
      toast({
        title: status === 409 ? "Combinación duplicada" : "Error al actualizar permiso",
        description: mensaje,
        status: status === 409 ? "warning" : "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/seguridad/permisos/${id}`, {
        headers: { "x-user-email": username },
      });
      toast({
        title: "Permiso eliminado correctamente",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      await cargarPermisos();
    } catch (err) {
      console.error("❌ Error eliminando permiso:", err);
      toast({
        title: "Error al eliminar permiso",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // ============================================================
  // ✅ Loader
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh">
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ============================================================
  // ✅ Render Final — Diseño uniforme con Roles/Objetos
  // ============================================================
  return (
    <Box p={4}>
      {/* 🔙 Botón Atrás */}
      <Tooltip label="Volver al módulo Seguridad" placement="bottom-start">
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

      {/* 🏷️ Título + Botón Exportar */}
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="lg" color={accent}>
          Permisos por Rol / Objeto
        </Heading>
        <Button
          size="sm"
          colorScheme="teal"
          leftIcon={<FaFileExport />}
          onClick={() => {
            setExpRol(""); setExpObjeto("");
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

      {/* ✅ DASHBOARD */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color={accent}>Permisos Registrados</StatLabel>
            <StatNumber fontSize="3xl">{totalPermisos}</StatNumber>
            <StatHelpText>Total configurados</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="green.400">Acceso Completo</StatLabel>
            <StatNumber fontSize="3xl" color="green.400">{permisosCompletos}</StatNumber>
            <StatHelpText>CRUD total (crear+leer+editar+eliminar)</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="orange.400">Solo Lectura</StatLabel>
            <StatNumber fontSize="3xl" color="orange.400">{permisosSoloLectura}</StatNumber>
            <StatHelpText>Permiso solo de consulta</StatHelpText>
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
          title="Permisos"
          columns={columnsTable}
          extractors={extractors}
          fields={fields}
          idKey="id_permiso"
          initialData={data}
          onInsert={handleInsert}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReload={cargarPermisos}
          apiUrl="/seguridad/permisos"
        />
      </Box>

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Permisos</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
              Si no aplicas filtros, se exportarán todos los permisos.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato</FormLabel>
              <Select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} bg={inputBg}>
                <option value="excel">📊 Excel (.xlsx)</option>
                <option value="pdf">📄 PDF (.pdf)</option>
              </Select>
            </FormControl>

            <Divider my={4} />

            <Text fontWeight="bold" mb={3} color={accent}>Filtros de exportación</Text>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por rol</FormLabel>
              <Select placeholder="Todos los roles" value={expRol} onChange={(e) => setExpRol(e.target.value)} size="sm" bg={inputBg}>
                {roles.map((r) => (
                  <option key={r.id_rol} value={r.nombre_rol}>{r.nombre_rol}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por objeto</FormLabel>
              <Select placeholder="Todos los objetos" value={expObjeto} onChange={(e) => setExpObjeto(e.target.value)} size="sm" bg={inputBg}>
                {objetos.map((o) => (
                  <option key={o.id_objeto} value={o.nombre_objeto}>{o.nombre_objeto}</option>
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
                  rol: expRol || undefined,
                  objeto: expObjeto || undefined,
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
