// ============================================================
// 📁 src/components/Seguridad/Usuarios.js
// ✅ Versión con dashboard, export modal PDF/Excel y sin botón refrescar
// ============================================================

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Flex,
  Heading,
  Divider,
  useColorModeValue,
  Spinner,
  useToast,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
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

import { FaArrowLeft, FaFileExport } from "react-icons/fa";
import { DownloadIcon } from "@chakra-ui/icons";
import CrudTabla from "./CrudTabla";
import api from "../../api/apiClient";

// 📦 Exportación
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// 🖼️ Logo SOLO para el PDF
import extractusLogo from "../login/log.png";

// ✅ Validaciones
import {
  validarRequerido,
  validarEmailSeguridad,
  validarLongitudMinima,
  validarPassword,
} from "../../utils/validaciones";

// ── Campos disponibles para exportación ──
const EXPORT_FIELDS = [
  { key: "id", label: "ID" },
  { key: "nombre", label: "Nombre" },
  { key: "correo", label: "Correo" },
  { key: "rol", label: "Rol" },
  { key: "estado", label: "Estado" },
  { key: "fecha", label: "Fecha Creación" },
];

const ALL_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);

export default function Usuarios() {
  const toast = useToast();

  // ============================================================
  // ✅ Paleta unificada claro/oscuro
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
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [estados, setEstados] = useState([]);

  // Modal de exportación
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expNombre, setExpNombre] = useState("");
  const [expEstado, setExpEstado] = useState("");
  const [expRol, setExpRol] = useState("");
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
  const cargarTodo = async () => {
    try {
      setLoading(true);

      const [rU, rR, rE] = await Promise.all([
        api.get("/seguridad/usuarios"),
        api.get("/seguridad/roles"),
        api.get("/mantenimiento/estado-usuario"),
      ]);

      setUsuarios(Array.isArray(rU.data) ? rU.data : []);
      setRoles(Array.isArray(rR.data) ? rR.data : []);
      setEstados(Array.isArray(rE.data) ? rE.data : []);
    } catch (err) {
      toast({
        title: "Error cargando datos",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // ============================================================
  // ✅ Dashboard estadísticas
  // ============================================================
  const totalUsuarios = usuarios.length;

  const activos = usuarios.filter(
    (u) =>
      u.nombre_estado_usuario?.toLowerCase() === "activo" ||
      u.id_estado_usuario === 1
  ).length;

  const inactivos = usuarios.filter(
    (u) =>
      u.nombre_estado_usuario?.toLowerCase() === "inactivo" ||
      u.id_estado_usuario === 2
  ).length;

  // ============================================================
  // 🔧 Helpers de exportación
  // ============================================================
  const buildFilterText = (filters = {}) => {
    const parts = [];
    if (filters.nombre) parts.push(`Nombre: ${filters.nombre}`);
    if (filters.estado) parts.push(`Estado: ${filters.estado}`);
    if (filters.rol) parts.push(`Rol: ${filters.rol}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredData = useCallback(
    (filters = {}) => {
      let filtered = [...usuarios];
      if (filters.nombre) {
        const q = filters.nombre.toLowerCase();
        filtered = filtered.filter((r) =>
          (r.nombre_usuario || "").toLowerCase().includes(q)
        );
      }
      if (filters.estado) {
        const q = filters.estado.toLowerCase();
        filtered = filtered.filter(
          (r) => (r.nombre_estado_usuario || "").toLowerCase() === q
        );
      }
      if (filters.rol) {
        const q = filters.rol.toLowerCase();
        filtered = filtered.filter(
          (r) => (r.nombre_rol || "").toLowerCase() === q
        );
      }
      return filtered;
    },
    [usuarios]
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
        } catch (e) {
          reject(e);
        }
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

      // ── Logo ──
      try {
        const dataURL = await imgToDataURL(extractusLogo);
        doc.addImage(dataURL, "PNG", 40, 20, 45, 45);
      } catch (e) { /* sin logo */ }

      // ── Título ──
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(25, 55, 80);
      doc.text("REPORTE DE USUARIOS", pageWidth / 2, 45, { align: "center" });

      // ── Fecha/hora ──
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 62, { align: "center" });

      // ── Filtros ──
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(filters)}`, pageWidth / 2, 78, { align: "center" });

      // ── Línea separadora ──
      doc.setDrawColor(0, 158, 115);
      doc.setLineWidth(1);
      doc.line(40, 90, pageWidth - 40, 90);

      // ── Tabla ──
      const fieldExtractors = {
        id: (r) => r.id_usuario,
        nombre: (r) => r.nombre_usuario || "",
        correo: (r) => r.username || "",
        rol: (r) => r.nombre_rol || "",
        estado: (r) => r.nombre_estado_usuario || "",
        fecha: (r) => r.fecha_creacion ? new Date(r.fecha_creacion).toISOString().split("T")[0] : "",
      };

      const activeFields = EXPORT_FIELDS.filter((f) => selectedFields.includes(f.key));
      const headers = activeFields.map((f) => f.label);
      const tableData = rows.map((r) => activeFields.map((f) => fieldExtractors[f.key](r)));

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
          doc.text(`Página ${doc.getNumberOfPages()}`, ps.getWidth() - 80, ps.getHeight() - 20);
        },
      });

      // ── Resumen ──
      const finalY = doc.lastAutoTable.finalY + 25;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(25, 55, 80);
      doc.text("RESUMEN", 40, finalY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60);
      let y = finalY + 18;
      doc.text(`Total de usuarios exportados: ${rows.length}`, 50, y);
      y += 16;
      const act = rows.filter((r) => (r.nombre_estado_usuario || "").toLowerCase() === "activo").length;
      const inact = rows.length - act;
      doc.text(`Activos: ${act}`, 50, y); y += 16;
      doc.text(`Inactivos: ${inact}`, 50, y);

      doc.save(`Usuarios_Extractus_${new Date().toISOString().split("T")[0]}.pdf`);
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
      const ws = wb.addWorksheet("Usuarios");

      const allCols = [
        { key: "id", header: "ID", width: 8, extract: (r) => r.id_usuario },
        { key: "nombre", header: "Nombre", width: 25, extract: (r) => r.nombre_usuario || "" },
        { key: "correo", header: "Correo", width: 28, extract: (r) => r.username || "" },
        { key: "rol", header: "Rol", width: 18, extract: (r) => r.nombre_rol || "" },
        { key: "estado", header: "Estado", width: 14, extract: (r) => r.nombre_estado_usuario || "" },
        { key: "fecha", header: "Fecha Creación", width: 16, extract: (r) => r.fecha_creacion ? new Date(r.fecha_creacion).toISOString().split("T")[0] : "" },
      ];
      const columns = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns.length);

      // ── Título + Filtros ──
      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Usuarios — Extractus";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF009E73" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells(`A2:${lastColLetter}2`);
      const filterCell = ws.getCell("A2");
      filterCell.value = `Filtros: ${buildFilterText(filters)}  |  Generado: ${new Date().toLocaleString()}`;
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

      // ── Datos ──
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

      // ── Auto-width ──
      columns.forEach((col, i) => {
        let maxLen = col.header.length;
        rows.forEach((r) => {
          const v = String(col.extract(r) ?? "");
          if (v.length > maxLen) maxLen = v.length;
        });
        ws.getColumn(i + 1).width = Math.min(Math.max(col.width, maxLen + 2), 50);
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Usuarios_Extractus_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // ✅ Campos CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_usuario",
      label: "Nombre del Usuario",
      type: "text",
      required: true,
      // Solo letras (con acentos y ñ), espacios, guion y punto
      sanitize: (val) => val.replace(/[^A-Za-zÀ-ÖØ-öø-ɏ\s.'-]/g, ""),
      validate: (valor) =>
        validarRequerido(valor, "El nombre de usuario") ||
        validarLongitudMinima(valor, "El nombre de usuario", 3) ||
        (valor?.trim().length > 80 ? "El nombre no puede superar 80 caracteres." : null),
      placeholderText: "Ej. Juan Pérez",
    },
    {
      name: "username",
      label: "Correo electrónico",
      type: "text",
      required: true,
      validate: (valor) =>
        validarRequerido(valor, "El correo electrónico") ||
        validarEmailSeguridad(valor),
      placeholderText: "Ej. usuario@dominio.com",
    },
    {
      name: "password",
      label: "Contraseña",
      type: "password",
      required: false,
      validate: (valor, form) => {
        const esNuevo = !form?.id_usuario;
        if (esNuevo) {
          // Creación: obligatoria + complejidad completa
          return validarPassword(valor, true);
        }
        // Edición: solo validar si escribió algo
        if (!valor || valor.trim() === "") return null;
        return validarPassword(valor, false);
      },
      placeholderText: "Mín. 8 caracteres, mayúscula, número y símbolo",
    },
    {
      name: "id_rol",
      label: "Rol",
      type: "select",
      required: true,
      validate: (valor) => validarRequerido(valor, "El rol"),
      options: roles.map((r) => ({
        label: r.nombre_rol,
        value: r.id_rol,
      })),
      placeholderText: "Seleccione un rol",
    },
    {
      name: "id_estado_usuario",
      label: "Estado",
      type: "select",
      required: true,
      validate: (valor) => validarRequerido(valor, "El estado"),
      options: estados.map((e) => ({
        label: e.nombre_estado,
        value: e.id_estado_usuario ?? e.id_estado_usuar,
      })),
      placeholderText: "Seleccione un estado",
    },
  ];

  const columns = [
    "ID Usuario",
    "Nombre del Usuario",
    "Correo",
    "Rol",
    "Estado",
    "Fecha Creación",
  ];

  const extractors = {
    "ID Usuario": (r) => r.id_usuario,
    "Nombre del Usuario": (r) => r.nombre_usuario || "—",
    Correo: (r) => r.username,
    Rol: (r) => r.nombre_rol || "—",
    Estado: (r) => r.nombre_estado_usuario || "—",
    "Fecha Creación": (r) =>
      r.fecha_creacion
        ? new Date(r.fecha_creacion).toLocaleString("es-HN", {
          timeZone: "America/Tegucigalpa",
        })
        : "—",
  };

  // ============================================================
  // ✅ Loading
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh">
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ============================================================
  // ✅ Render final
  // ============================================================
  return (
    <Box p={4}>
      {/* Botón Atrás */}
      <Button
        leftIcon={<FaArrowLeft />}
        bg={btnBackBg}
        color="white"
        _hover={{ bg: btnBackHover }}
        size="sm"
        mb={4}
        onClick={() => window.history.back()}
      >
        Atrás
      </Button>

      {/* Título + Botón Exportar */}
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="lg" color={accent}>
          Usuarios
        </Heading>
        <Button
          size="sm"
          colorScheme="teal"
          leftIcon={<FaFileExport />}
          onClick={() => {
            setExpNombre(""); setExpEstado(""); setExpRol("");
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

      {/* ======================================================
           ✅ DASHBOARD
      ====================================================== */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>

        {/* Total */}
        <Box
          bg={cardBg}
          border={`1px solid ${borderClr}`}
          p={5}
          rounded="md"
          shadow="sm"
        >
          <Stat>
            <StatLabel fontSize="lg" color={accent}>
              Usuarios Registrados
            </StatLabel>
            <StatNumber fontSize="3xl">{totalUsuarios}</StatNumber>
            <StatHelpText>Total en el sistema</StatHelpText>
          </Stat>
        </Box>

        {/* Activos */}
        <Box
          bg={cardBg}
          border={`1px solid ${borderClr}`}
          p={5}
          rounded="md"
          shadow="sm"
        >
          <Stat>
            <StatLabel fontSize="lg" color="green.400">
              Activos
            </StatLabel>
            <StatNumber fontSize="3xl" color="green.400">
              {activos}
            </StatNumber>
            <StatHelpText>Usuarios con acceso</StatHelpText>
          </Stat>
        </Box>

        {/* Inactivos */}
        <Box
          bg={cardBg}
          border={`1px solid ${borderClr}`}
          p={5}
          rounded="md"
          shadow="sm"
        >
          <Stat>
            <StatLabel fontSize="lg" color="red.400">
              Inactivos
            </StatLabel>
            <StatNumber fontSize="3xl" color="red.400">
              {inactivos}
            </StatNumber>
            <StatHelpText>Sin acceso al sistema</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* ======================================================
           ✅ TABLA CRUD (sin refrescar arriba)
      ====================================================== */}
      <Box
        bg={cardBg}
        p={3}
        rounded="md"
        border={`1px solid ${borderClr}`}
        shadow="sm"
      >
        <CrudTabla
          title="Usuarios"
          columns={columns}
          extractors={extractors}
          fields={fields}
          idKey="id_usuario"
          apiUrl="/seguridad/usuarios"
          initialData={usuarios}
          onReload={cargarTodo}
        />
      </Box>

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Usuarios</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
              Si no aplicas filtros, se exportarán todos los usuarios.
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
              <FormLabel fontSize="sm">Por nombre</FormLabel>
              <Input
                placeholder="Ej: Juan Pérez"
                value={expNombre}
                onChange={(e) => setExpNombre(e.target.value)}
                size="sm"
                bg={inputBg}
              />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por estado</FormLabel>
              <Select placeholder="Todos los estados" value={expEstado} onChange={(e) => setExpEstado(e.target.value)} size="sm" bg={inputBg}>
                {estados.map((e) => (
                  <option key={e.id_estado_usuario ?? e.id_estado_usuar} value={e.nombre_estado}>{e.nombre_estado}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por rol</FormLabel>
              <Select placeholder="Todos los roles" value={expRol} onChange={(e) => setExpRol(e.target.value)} size="sm" bg={inputBg}>
                {roles.map((r) => (
                  <option key={r.id_rol} value={r.nombre_rol}>{r.nombre_rol}</option>
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
                  estado: expEstado || undefined,
                  rol: expRol || undefined,
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
