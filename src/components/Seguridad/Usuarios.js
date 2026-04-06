// ============================================================
// ðŸ“ src/components/Seguridad/Usuarios.js
// âœ… VersiÃ³n con dashboard, export modal PDF/Excel y sin botÃ³n refrescar
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
  Tooltip,
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
  validarEmailSeguridad,
  validarLongitudMinima,
  validarPassword,
} from "../../utils/validaciones";

// â”€â”€ Campos disponibles para exportaciÃ³n â”€â”€
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
  // âœ… Paleta unificada claro/oscuro
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
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [estados, setEstados] = useState([]);

  // Modal de exportaciÃ³n
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
  // âœ… Cargar datos
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
  // âœ… Dashboard estadÃ­sticas
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
  // ðŸ”§ Helpers de exportaciÃ³n
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

      // â”€â”€ Logo â”€â”€
      try {
        const dataURL = await imgToDataURL(extractusLogo);
        doc.addImage(dataURL, "PNG", 40, 20, 45, 45);
      } catch (e) { /* sin logo */ }

      // â”€â”€ TÃ­tulo â”€â”€
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(25, 55, 80);
      doc.text("REPORTE DE USUARIOS", pageWidth / 2, 45, { align: "center" });

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

      // â”€â”€ Tabla â”€â”€
      const fieldExtractors = {
        id: (r) => r.id_usuario,
        nombre: (r) => r.nombre_usuario || "",
        correo: (r) => r.username || "",
        rol: (r) => r.nombre_rol || "",
        estado: (r) => r.nombre_estado_usuario || "",
        fecha: (r) => r.fecha_creacion ? formatDate(r.fecha_creacion) : "",
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
      doc.text(`Total de usuarios exportados: ${rows.length}`, 50, y);
      y += 16;
      const act = rows.filter((r) => (r.nombre_estado_usuario || "").toLowerCase() === "activo").length;
      const inact = rows.length - act;
      doc.text(`Activos: ${act}`, 50, y); y += 16;
      doc.text(`Inactivos: ${inact}`, 50, y);

      doc.save(`Usuarios_Extractus_${new Date().toISOString().split("T")[0]}.pdf`);
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
      const ws = wb.addWorksheet("Usuarios");

      const allCols = [
        { key: "id", header: "ID", width: 8, extract: (r) => r.id_usuario },
        { key: "nombre", header: "Nombre", width: 25, extract: (r) => r.nombre_usuario || "" },
        { key: "correo", header: "Correo", width: 28, extract: (r) => r.username || "" },
        { key: "rol", header: "Rol", width: 18, extract: (r) => r.nombre_rol || "" },
        { key: "estado", header: "Estado", width: 14, extract: (r) => r.nombre_estado_usuario || "" },
        { key: "fecha", header: "Fecha Creación", width: 16, extract: (r) => r.fecha_creacion ? formatDate(r.fecha_creacion) : "" },
      ];
      const columns = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns.length);

      // â”€â”€ TÃ­tulo + Filtros â”€â”€
      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Usuarios â€” Extractus";
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
        if (idx % 2 === 1) {
          for (let i = 1; i <= columns.length; i++) {
            ws.getCell(rowNum, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F7F0" } };
          }
        }
      });

      // â”€â”€ Auto-width â”€â”€
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
      console.error("âŒ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // âœ… Campos CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_usuario",
      label: "Nombre del Usuario",
      type: "text",
      required: true,
      // Solo letras (con acentos y Ã±), espacios, guion y punto
      sanitize: (val) => val.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s.'-]/g, ""),
      validate: (valor) =>
        validarRequerido(valor, "El nombre de usuario") ||
        validarLongitudMinima(valor, "El nombre de usuario", 3) ||
        (valor?.trim().length > 80 ? "El nombre no puede superar 80 caracteres." : null),
      placeholderText: "Ej. Juan PÃ©rez",
    },
    {
      name: "username",
      label: "Correo electrÃ³nico",
      type: "text",
      required: true,
      validate: (valor) =>
        validarRequerido(valor, "El correo electrÃ³nico") ||
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
          // CreaciÃ³n: obligatoria + complejidad completa
          return validarPassword(valor, true);
        }
        // EdiciÃ³n: solo validar si escribiÃ³ algo
        if (!valor || valor.trim() === "") return null;
        return validarPassword(valor, false);
      },
      placeholderText: "MÃ­n. 8 caracteres, mayÃºscula, nÃºmero y sÃ­mbolo",
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
    "Nombre del Usuario": (r) => r.nombre_usuario || "â€”",
    Correo: (r) => r.username,
    Rol: (r) => r.nombre_rol || "â€”",
    Estado: (r) => r.nombre_estado_usuario || "â€”",
    "Fecha Creación": (r) => r.fecha_creacion ? formatDateTime(r.fecha_creacion) : "—",
  };

  // ============================================================
  // âœ… Loading
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh">
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ============================================================
  // âœ… Render final
  // ============================================================
  return (
    <Box p={4}>
      {/* Botón Atrás */}
      <Tooltip label="Volver al menú Seguridad" placement="bottom-start">
        <Button
          leftIcon={<FaArrowLeft />}
          bg={btnBackBg}
          color="white"
          _hover={{ bg: btnBackHover, transform: "scale(1.03)" }}
          size="sm"
          mb={4}
          boxShadow="sm"
          borderRadius="full"
          onClick={() => window.history.back()}
        >
          Atrás
        </Button>
      </Tooltip>

      {/* TÃ­tulo + BotÃ³n Exportar */}
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
           âœ… DASHBOARD
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
           âœ… TABLA CRUD (sin refrescar arriba)
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

      {/* ðŸ“¤ Modal de ExportaciÃ³n */}
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
              Si no aplicas filtros, se exportarÃ¡n todos los usuarios.
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
                placeholder="Ej: Juan PÃ©rez"
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



