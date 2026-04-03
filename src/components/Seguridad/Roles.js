// ============================================================
// 📁 src/components/Seguridad/Roles.js
// ✅ Versión con dashboard, export modal PDF/Excel y diseño moderno
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
  Checkbox,
  CheckboxGroup,
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
  { key: "nombre", label: "Nombre Rol" },
  { key: "descripcion", label: "Descripción" },
  { key: "accesos", label: "Accesos" },
];

const ALL_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);

export default function Roles() {
  // ============================================================
  // ✅ Paleta de colores (modo claro/oscuro)
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
  const [loading, setLoading] = useState(true);

  // Modal de exportación
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expNombre, setExpNombre] = useState("");
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
  // ✅ Accesos disponibles
  // ============================================================
  const opcionesAccesos = [
    "Ventas y Reservas",
    "Producción",
    "Inventarios",
    "Entregas",
    "Contabilidad",
    "Compras",
    "Seguridad",
    "Mantenimiento",
    "Todos",
  ];

  // ============================================================
  // ✅ Cargar Roles
  // ============================================================
  const cargarRoles = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/roles");

      const normalizados = res.data.map((r) => {
        let accesos = [];
        if (Array.isArray(r.accesos)) accesos = r.accesos;
        else if (typeof r.accesos === "string") {
          try {
            accesos = JSON.parse(r.accesos);
          } catch {
            accesos = r.accesos.split(",").map((a) => a.trim());
          }
        }
        return { ...r, accesos };
      });

      setData(normalizados);
    } catch (err) {
      toast({
        title: "Error al cargar roles",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarRoles();
  }, [cargarRoles]);

  // ============================================================
  // ✅ Dashboard stats
  // ============================================================
  const totalRoles = data.length;
  const rolesFullAccess = data.filter((r) =>
    r.accesos?.includes("Todos")
  ).length;
  const rolesSinAccesos = data.filter(
    (r) => !r.accesos || r.accesos.length === 0
  ).length;

  // ============================================================
  // 🔧 Helpers de exportación
  // ============================================================
  const buildFilterText = (filters = {}) => {
    const parts = [];
    if (filters.nombre) parts.push(`Nombre: ${filters.nombre}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredData = useCallback(
    (filters = {}) => {
      let filtered = [...data];
      if (filters.nombre) {
        const q = filters.nombre.toLowerCase();
        filtered = filtered.filter((r) =>
          (r.nombre_rol || "").toLowerCase().includes(q)
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

  const getAccesosStr = (r) => {
    if (Array.isArray(r.accesos)) return r.accesos.join(", ");
    if (typeof r.accesos === "string") return r.accesos.replace(/[\[\]"]/g, "");
    return "";
  };

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
      doc.text("REPORTE DE ROLES", pageWidth / 2, 45, { align: "center" });

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
        id: (r) => r.id_rol,
        nombre: (r) => r.nombre_rol || "",
        descripcion: (r) => r.descripcion || "",
        accesos: (r) => getAccesosStr(r),
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
      doc.text(`Total de roles exportados: ${rows.length}`, 50, y); y += 16;
      const full = rows.filter((r) => r.accesos?.includes("Todos")).length;
      doc.text(`Con acceso total: ${full}`, 50, y); y += 16;
      const sin = rows.filter((r) => !r.accesos || r.accesos.length === 0).length;
      doc.text(`Sin accesos asignados: ${sin}`, 50, y);

      doc.save(`Roles_Extractus_${new Date().toISOString().split("T")[0]}.pdf`);
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
      const ws = wb.addWorksheet("Roles");

      const allCols = [
        { key: "id", header: "ID", width: 8, extract: (r) => r.id_rol },
        { key: "nombre", header: "Nombre Rol", width: 22, extract: (r) => r.nombre_rol || "" },
        { key: "descripcion", header: "Descripción", width: 35, extract: (r) => r.descripcion || "" },
        { key: "accesos", header: "Accesos", width: 40, extract: (r) => getAccesosStr(r) },
      ];
      const columns = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns.length);

      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Roles — Extractus";
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
      saveAs(new Blob([buffer]), `Roles_Extractus_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // ✅ Funciones de validación y sanitización
  // ============================================================
  const sanitizeTexto = (valor) => {
    if (!valor) return "";
    return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
  };

  const validarNombreRol = (v) => {
    if (!v || v.trim() === "") return "El nombre del rol es obligatorio.";
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regex.test(v)) return "Solo se permiten letras y espacios.";
    return null;
  };

  const validarAccesos = (v) => {
    if (!Array.isArray(v) || v.length === 0) return "Debe asignar al menos un acceso.";
    return null;
  };

  // ============================================================
  // ✅ Campos del CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_rol", label: "Nombre del Rol", type: "text", required: true,
      placeholderText: "Ej. Administrador, Vendedor",
      validate: validarNombreRol,
      sanitize: sanitizeTexto,
    },
    { name: "descripcion", label: "Descripción", type: "textarea" },
    {
      name: "accesos",
      label: "Accesos",
      type: "custom",
      validate: validarAccesos,
      render: (value, onChange) => (
        <CheckboxGroup
          value={Array.isArray(value) ? value : []}
          onChange={(val) => onChange(val)}
        >
          <SimpleGrid columns={[2, 2]} spacing={2} mt={2}>
            {opcionesAccesos.map((acc) => (
              <Checkbox key={acc} value={acc}>
                {acc}
              </Checkbox>
            ))}
          </SimpleGrid>
        </CheckboxGroup>
      ),
    },
  ];

  const extractors = {
    "ID Rol": (r) => r.id_rol,
    "Nombre Rol": (r) => r.nombre_rol,
    "Descripción": (r) => r.descripcion || "-",
    "Accesos": (r) =>
      Array.isArray(r.accesos)
        ? r.accesos.join(", ")
        : typeof r.accesos === "string"
          ? r.accesos.replace(/[\[\]"]/g, "")
          : "-",
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
  // ✅ Render Final
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
          Roles
        </Heading>
        <Button
          size="sm"
          colorScheme="teal"
          leftIcon={<FaFileExport />}
          onClick={() => {
            setExpNombre("");
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
              Roles Registrados
            </StatLabel>
            <StatNumber fontSize="3xl">{totalRoles}</StatNumber>
            <StatHelpText>Total configurados</StatHelpText>
          </Stat>
        </Box>

        {/* Roles con "Todos" */}
        <Box
          bg={cardBg}
          border={`1px solid ${borderClr}`}
          p={5}
          rounded="md"
          shadow="sm"
        >
          <Stat>
            <StatLabel fontSize="lg" color="green.400">
              Acceso Total
            </StatLabel>
            <StatNumber fontSize="3xl" color="green.400">
              {rolesFullAccess}
            </StatNumber>
            <StatHelpText>Rol con permisos completos</StatHelpText>
          </Stat>
        </Box>

        {/* Sin accesos */}
        <Box
          bg={cardBg}
          border={`1px solid ${borderClr}`}
          p={5}
          rounded="md"
          shadow="sm"
        >
          <Stat>
            <StatLabel fontSize="lg" color="red.400">
              Sin Accesos
            </StatLabel>
            <StatNumber fontSize="3xl" color="red.400">
              {rolesSinAccesos}
            </StatNumber>
            <StatHelpText>Roles sin permisos asignados</StatHelpText>
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
          title="Roles"
          columns={["ID Rol", "Nombre Rol", "Descripción", "Accesos"]}
          extractors={extractors}
          fields={fields}
          idKey="id_rol"
          initialData={data}
          onReload={cargarRoles}
          apiUrl="/seguridad/roles"
          preprocessSave={(item) => ({
            ...item,
            accesos: JSON.stringify(item.accesos || []),
          })}
        />
      </Box>

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Roles</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
              Si no aplicas filtros, se exportarán todos los roles.
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
              <FormLabel fontSize="sm">Por nombre de rol</FormLabel>
              <Input
                placeholder="Ej: Administrador"
                value={expNombre}
                onChange={(e) => setExpNombre(e.target.value)}
                size="sm"
                bg={inputBg}
              />
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
