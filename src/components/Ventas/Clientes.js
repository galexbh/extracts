// ============================================================
// 📁 src/components/Ventas/Clientes.js
// 🎯 Clientes con mini dashboard, PDF/Excel, validaciones y soporte claro/oscuro
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
} from "@chakra-ui/react";

import {
  FaArrowLeft,
  FaFileExport,
  FaUserFriends,
  FaCheckCircle,
  FaUserSlash,
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

// 🖼️ Logo SOLO para el PDF
import extractusLogo from "../login/log.png";

// ✅ Validaciones
import {
  validarRequerido,
  validarTelefono,
  validarRTN,
  validarEmail,
  validarLongitudMinima,
  formatearTelefono,
} from "../../utils/validaciones";

export default function Clientes() {
  // 🎨 Colores adaptados a día/noche
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

  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [tiposCliente, setTiposCliente] = useState([]);
  const [estadosCliente, setEstadosCliente] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de exportación
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expNombre, setExpNombre] = useState("");
  const [expEstado, setExpEstado] = useState("");
  const [expTipo, setExpTipo] = useState("");
  const [exporting, setExporting] = useState(false);

  // Colores del modal
  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const inputBg = useColorModeValue("white", "gray.600");

  // ============================================================
  // 🔹 Cargar clientes desde la API
  // ============================================================
  const cargarClientes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/ventas/clientes");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando clientes:", err);
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
  // 🔹 Cargar tipos y estados (catálogos)
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
      console.error("❌ Error cargando catálogos:", err);
      toast({
        title: "Error al cargar catálogos",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }
  }, [toast]);

  // ============================================================
  // 🔹 Carga inicial
  // ============================================================
  useEffect(() => {
    Promise.all([cargarClientes(), cargarTiposYEstados()]);
  }, [cargarClientes, cargarTiposYEstados]);

  // ============================================================
  // 📊 Mini dashboard (totales)
  // ============================================================
  const { totalClientes, clientesActivos, clientesInactivos } = useMemo(() => {
    const total = data.length;

    const activos = data.filter((r) => {
      const estado = (r.estado_cliente || r.nombre_estado || "")
        .toString()
        .toLowerCase();
      return estado === "activo";
    }).length;

    const inactivos = total - activos;

    return {
      totalClientes: total,
      clientesActivos: activos,
      clientesInactivos: inactivos,
    };
  }, [data]);

  // ============================================================
  // 🔍 Validadores por campo
  // ============================================================
  const validators = {
    nombre_cliente: (v) => {
      const req = validarRequerido(v, "Nombre del cliente");
      if (req) return req;
      if (String(v).trim().length < 3)
        return "El nombre debe tener al menos 3 caracteres.";
      if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(String(v)))
        return "El nombre solo debe contener letras y espacios.";
      return null;
    },
    rtn: (v) => {
      const req = validarRequerido(v, "El RTN / ID");
      if (req) return req;
      const limpio = String(v).replace(/-/g, "");
      if (!/^[0-9]{13,14}$/.test(limpio))
        return "El RTN / ID debe tener entre 13 y 14 dígitos numéricos.";
      return null;
    },
    direccion: (v) =>
      validarRequerido(v, "Dirección") ||
      validarLongitudMinima(v, "Dirección", 5),
    telefono: (v) =>
      validarRequerido(v, "Teléfono") || validarTelefono(v),
    correo_electronico: (v) =>
      validarRequerido(v, "Correo") || validarEmail(v),
  };

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_cliente",
      label: "Nombre del Cliente",
      type: "text",
      required: true,
      placeholderText: "Ej. Juan Perez",
      validate: validators.nombre_cliente,
      sanitize: (v) => String(v).replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ\s]/g, ""),
    },
    {
      name: "rtn",
      label: "RTN / ID (13 o 14 dígitos)",
      type: "text",
      required: true,
      placeholderText: "Ej. 0801199012345",
      validate: validators.rtn,
      sanitize: (v) => String(v).replace(/[^0-9-]/g, "").slice(0, 15),
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
    },
    {
      name: "telefono",
      label: "Teléfono (8 dígitos)",
      type: "text",
      required: true,
      placeholderText: "Ej. 9999-9999",
      validate: validators.telefono,
      sanitize: (v) => formatearTelefono(v),
    },
    {
      name: "correo_electronico",
      label: "Correo Electrónico",
      type: "email",
      required: true,
      placeholderText: "Ej. correo@ejemplo.com",
      validate: validators.correo_electronico,
    },
    {
      name: "id_estado_cliente",
      label: "Estado del Cliente",
      type: "select",
      options: estadosCliente.map((e) => ({
        label: e.nombre_estado,
        value: e.id_estado_cliente,
      })),
      required: true,
      validate: (v) => validarRequerido(v, "Estado"),
    },
  ];


  // ============================================================
  // 🔧 Helpers de exportación
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
  // 📤 Exportar PDF — Estilo profesional
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
      doc.text("REPORTE DE CLIENTES", pageWidth / 2, 45, { align: "center" });

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
      const tableData = rows.map(r => [
        r.id_cliente,
        r.nombre_cliente,
        r.rtn || "",
        r.tipo_cliente || r.nombre_tipo || "",
        r.direccion || "",
        r.telefono || "",
        r.correo_electronico || "",
        r.estado_cliente || r.nombre_estado || "",
        r.fecha_creacion ? new Date(r.fecha_creacion).toISOString().split("T")[0] : "",
      ]);

      autoTable(doc, {
        startY: 105,
        head: [["ID", "Nombre", "RTN / ID", "Tipo", "Dirección", "Teléfono", "Correo", "Estado", "Fecha"]],
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
      doc.text(`Total de clientes exportados: ${rows.length}`, 50, y);
      y += 16;
      const activos = rows.filter(r => (r.estado_cliente || r.nombre_estado || "").toLowerCase() === "activo").length;
      const inactivos = rows.length - activos;
      doc.text(`Activos: ${activos}`, 50, y); y += 16;
      doc.text(`Inactivos: ${inactivos}`, 50, y);

      doc.save(`Clientes_Extractus_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // 📊 Exportar Excel — Estilo profesional
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

      // ── Título + Filtros ──
      ws.mergeCells("A1:I1");
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Clientes — Extractus";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF009E73" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells("A2:I2");
      const filterCell = ws.getCell("A2");
      filterCell.value = `Filtros: ${buildFilterText(filters)}  |  Generado: ${new Date().toLocaleString()}`;
      filterCell.font = { size: 9, italic: true, color: { argb: "FF666666" } };
      filterCell.alignment = { horizontal: "center" };

      // ── Columnas ──
      const columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Nombre", key: "nombre", width: 25 },
        { header: "RTN / ID", key: "rtn", width: 18 },
        { header: "Tipo", key: "tipo", width: 15 },
        { header: "Dirección", key: "direccion", width: 30 },
        { header: "Teléfono", key: "telefono", width: 14 },
        { header: "Correo", key: "correo", width: 28 },
        { header: "Estado", key: "estado", width: 12 },
        { header: "Fecha Creación", key: "fecha", width: 16 },
      ];

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
        const values = [
          r.id_cliente,
          r.nombre_cliente,
          r.rtn || "",
          r.tipo_cliente || r.nombre_tipo || "",
          r.direccion || "",
          r.telefono || "",
          r.correo_electronico || "",
          r.estado_cliente || r.nombre_estado || "",
          r.fecha_creacion ? new Date(r.fecha_creacion).toISOString().split("T")[0] : "",
        ];
        values.forEach((v, i) => { ws.getCell(rowNum, i + 1).value = v; });
        // Zebra
        if (idx % 2 === 1) {
          for (let i = 1; i <= columns.length; i++) {
            ws.getCell(rowNum, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F7F0" } };
          }
        }
      });

      // ── Auto-width ──
      columns.forEach((col, i) => {
        let maxLen = col.header.length;
        rows.forEach(r => {
          const vals = [r.id_cliente, r.nombre_cliente, r.rtn, r.tipo_cliente || r.nombre_tipo, r.direccion, r.telefono, r.correo_electronico, r.estado_cliente || r.nombre_estado, ""];
          const v = String(vals[i] ?? "");
          if (v.length > maxLen) maxLen = v.length;
        });
        ws.getColumn(i + 1).width = Math.min(Math.max(col.width, maxLen + 2), 50);
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Clientes_Extractus_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // 🔹 Loader
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh" bg={pageBg}>
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ============================================================
  // 🔹 Render principal
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
        {/* Encabezado con título + botones */}
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
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
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
              showReloadButton={false} // 👈 sin botón Refrescar al lado de Agregar
            />
          </Box>
        </CardBody>
      </Card>

      {/* 📤 Modal de Exportación */}
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
              Si no aplicas filtros, se exportarán todos los clientes.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato</FormLabel>
              <Select value={exportFormat} onChange={e => setExportFormat(e.target.value)} bg={inputBg}>
                <option value="excel">📊 Excel (.xlsx)</option>
                <option value="pdf">📄 PDF (.pdf)</option>
              </Select>
            </FormControl>

            <Divider my={4} />

            <Text fontWeight="bold" mb={3} color={accent}>Filtros de exportación</Text>

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
                {estadosCliente.map(e => (
                  <option key={e.id_estado_cliente} value={e.nombre_estado}>{e.nombre_estado}</option>
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
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="teal"
              leftIcon={<DownloadIcon />}
              isLoading={exporting}
              loadingText="Generando..."
              onClick={async () => {
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
