// ============================================================
// 📁 src/components/Produccion/Produccion.js
// 🎨 Paleta UNIFORME con el sistema + Export Modal PDF/Excel
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Heading,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Spinner,
  Text,
  VStack,
  HStack,
  Select,
  Input,
  Textarea,
  useToast,
  Badge,
  useColorModeValue,
  Divider,
  Icon,
  Tooltip,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  IconButton,
  FormControl,
  FormLabel,
  Checkbox,
} from "@chakra-ui/react";
import {
  FaPlay,
  FaStop,
  FaClipboardList,
  FaIndustry,
  FaBoxOpen,
  FaCheckCircle,
  FaClock,
  FaPlus,
  FaTrash,
  FaArrowLeft,
  FaFileExport,
} from "react-icons/fa";
import { DownloadIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

// 📦 Exportación
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import extractusLogo from "../login/log.png";

// ── Campos disponibles para exportación ──
const EXPORT_FIELDS = [
  { key: "id", label: "ID Pedido" },
  { key: "cliente", label: "Cliente" },
  { key: "fecha_reserva", label: "Fecha Reserva" },
  { key: "fecha_entrega", label: "Fecha Entrega" },
  { key: "estado_pedido", label: "Estado Pedido" },
  { key: "id_orden", label: "Orden" },
  { key: "estado_produccion", label: "Estado Producción" },
];
const ALL_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);

// ── Helpers ──────────────────────────────────────────────────
const normalizarPedidos = (lista) => {
  const mapa = new Map();
  lista.forEach((p) => {
    if (!mapa.has(p.id_pedido)) mapa.set(p.id_pedido, p);
  });
  return [...mapa.values()];
};

const colorEstado = (estado) => {
  const e = (estado || "").toLowerCase();
  if (e.includes("finaliz")) return "green";
  if (e.includes("proces") || e.includes("inici")) return "teal";
  return "gray";
};

const iconEstado = (estado) => {
  const e = (estado || "").toLowerCase();
  if (e.includes("finaliz")) return FaCheckCircle;
  if (e.includes("proces") || e.includes("inici")) return FaClock;
  return FaBoxOpen;
};

// ─────────────────────────────────────────────────────────────
export default function Produccion() {
  // 🎨 Colores adaptados a día/noche (Idénticos al módulo Clientes)
  const accent = useColorModeValue("#009e73", "teal.300");
  const pageBg = useColorModeValue("#f7faf8", "#020617");
  const cardBg = useColorModeValue("white", "#0b1120");
  const cardBorder = useColorModeValue("#c2d4c3", "#1f2937");

  const btnBackBg = useColorModeValue("teal.100", "teal.600");
  const btnBackColor = useColorModeValue("teal.800", "white");
  const btnBackHoverBg = useColorModeValue("teal.200", "teal.500");
  const topBarBg = useColorModeValue("teal.600", "teal.800");

  const statTotalBg = useColorModeValue("#e8f7f0", "rgba(0,158,115,0.12)");
  const statActivosBg = useColorModeValue("#e9f9ee", "rgba(56,161,105,0.12)");
  const statInactivosBg = useColorModeValue("#ffe9e9", "rgba(245,101,101,0.12)");

  const activosNumberColor = useColorModeValue("green.600", "green.300");
  const inactivosNumberColor = useColorModeValue("red.500", "red.300");

  const tableHdrBg = useColorModeValue("gray.50", "gray.800");
  const rowHover = useColorModeValue("teal.50", "gray.800");
  const activeColor = useColorModeValue("teal.800", "white");
  const subtleText = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const modalBg = useColorModeValue("white", "gray.900");

  // Colores del modal export
  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const expInputBg = useColorModeValue("white", "gray.600");

  // 🔁 Estados
  const [pedidos, setPedidos] = useState([]);
  const [detalle, setDetalle] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [insumosCatalogo, setInsumosCatalogo] = useState([]);
  const [insumosUsados, setInsumosUsados] = useState([]);
  const [comentariosInsumos, setComentariosInsumos] = useState("");
  const [loading, setLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState(null);

  const toast = useToast();
  const navigate = useNavigate();
  const detalleModal = useDisclosure();
  const insumosModal = useDisclosure();

  // Modal de exportación
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expCliente, setExpCliente] = useState("");
  const [expEstadoProd, setExpEstadoProd] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedFields, setSelectedFields] = useState([...ALL_FIELD_KEYS]);

  const toggleField = (key) =>
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  const allFieldsSelected = selectedFields.length === ALL_FIELD_KEYS.length;
  const toggleAll = () =>
    setSelectedFields(allFieldsSelected ? [] : [...ALL_FIELD_KEYS]);

  // ── Stats ────────────────────────────────────────────────
  const total = pedidos.length;
  const enProceso = pedidos.filter((p) =>
    (p.estado_produccion || "").toLowerCase().includes("inici") ||
    (p.estado_produccion || "").toLowerCase().includes("proces")
  ).length;
  const finalizados = pedidos.filter((p) =>
    (p.estado_produccion || "").toLowerCase().includes("finaliz")
  ).length;

  // ── Cargar pedidos ────────────────────────────────────────
  const cargarPedidos = useCallback(async () => {
    try {
      const res = await api.get("/produccion/pedidos-pendientes");
      setPedidos(normalizarPedidos(res.data || []));
    } catch (err) {
      toast({
        title: "Error cargando pedidos",
        description: err.response?.data?.error || err.message,
        status: "error",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { cargarPedidos(); }, [cargarPedidos]);

  // ── Ver detalle ───────────────────────────────────────────
  const verDetalle = async (pedido) => {
    try {
      setPedidoSeleccionado(pedido);
      const res = await api.get(`/produccion/pedidos/${pedido.id_pedido}/detalle`);
      setDetalle(res.data || []);
      detalleModal.onOpen();
    } catch (err) {
      toast({ title: "Error obteniendo detalle", description: err.message, status: "error" });
    }
  };

  // ── Iniciar producción ────────────────────────────────────
  const iniciarProduccion = async (pedido) => {
    setAccionLoading(pedido.id_pedido);
    try {
      const res = await api.post(`/produccion/ordenes/iniciar/${pedido.id_pedido}`);
      toast({ title: "✅ Producción iniciada", description: res.data?.message, status: "success", position: "top" });
      cargarPedidos();
    } catch (err) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, status: "error" });
    } finally {
      setAccionLoading(null);
    }
  };

  // ── Abrir modal insumos ───────────────────────────────────
  const finalizarProduccion = async (pedido) => {
    if (!pedido.id_orden)
      return toast({
        title: "Sin orden iniciada",
        description: "Inicia la producción antes de finalizar.",
        status: "warning",
        position: "top",
      });

    try {
      setPedidoSeleccionado(pedido);
      const res = await api.get("/inventario/inventario-insumos");
      setInsumosCatalogo(res.data.filter((i) => i.id_insumo && i.nombre_insumo));
      setInsumosUsados([{ filaId: 1, id_insumo: "", cantidad_usada: "" }]);
      setComentariosInsumos("");
      insumosModal.onOpen();
    } catch (err) {
      toast({ title: "Error cargando inventario", description: err.message, status: "error" });
    }
  };

  // ── Gestión de filas insumos ──────────────────────────────
  const agregarFilaInsumo = () =>
    setInsumosUsados((prev) => [
      ...prev,
      { filaId: prev.length ? prev[prev.length - 1].filaId + 1 : 1, id_insumo: "", cantidad_usada: "" },
    ]);

  const actualizarInsumo = (filaId, campo, valor) =>
    setInsumosUsados((prev) =>
      prev.map((f) => (f.filaId === filaId ? { ...f, [campo]: valor } : f))
    );

  const eliminarFilaInsumo = (filaId) =>
    setInsumosUsados((prev) => prev.filter((f) => f.filaId !== filaId));

  // ── Guardar insumos ───────────────────────────────────────
  const guardarInsumos = async () => {
    if (!pedidoSeleccionado?.id_orden)
      return toast({ title: "Sin orden", description: "No hay orden seleccionada.", status: "error" });

    const insumosValidos = insumosUsados.filter((i) => {
      const v = Number(i.cantidad_usada);
      return i.id_insumo && !isNaN(v) && v > 0;
    });

    if (insumosValidos.length === 0)
      return toast({ title: "Agrega al menos 1 insumo con cantidad válida", status: "warning", position: "top" });

    try {
      await api.post(`/produccion/ordenes/${pedidoSeleccionado.id_orden}/insumos`, {
        insumos: insumosValidos.map((i) => ({
          id_insumo: i.id_insumo,
          cantidad_utilizada: Number(i.cantidad_usada),
        })),
        comentarios: comentariosInsumos || null,
      });

      toast({ title: "✅ Producción finalizada", status: "success", position: "top" });
      insumosModal.onClose();
      cargarPedidos();
    } catch (err) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, status: "error" });
    }
  };

  // ============================================================
  // 🔧 Export helpers
  // ============================================================
  const buildFilterText = (filters = {}) => {
    const parts = [];
    if (filters.cliente) parts.push(`Cliente: ${filters.cliente}`);
    if (filters.estadoProd) parts.push(`Producción: ${filters.estadoProd}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredData = useCallback(
    (filters = {}) => {
      let filtered = [...pedidos];
      if (filters.cliente) {
        const q = filters.cliente.toLowerCase();
        filtered = filtered.filter((r) => (r.nombre_cliente || "").toLowerCase().includes(q));
      }
      if (filters.estadoProd) {
        filtered = filtered.filter((r) => (r.estado_produccion || "Pendiente").toLowerCase() === filters.estadoProd.toLowerCase());
      }
      return filtered;
    },
    [pedidos]
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

  // 📤 PDF
  const handleExportPDF = async (filters = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(filters);
      if (rows.length === 0) { toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true }); return; }

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;

      try { const dataURL = await imgToDataURL(extractusLogo); doc.addImage(dataURL, "PNG", 40, 20, 45, 45); } catch (e) { /* sin logo */ }

      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(25, 55, 80);
      doc.text("REPORTE DE PRODUCCIÓN", pageWidth / 2, 45, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 62, { align: "center" });
      doc.setFontSize(9); doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(filters)}`, pageWidth / 2, 78, { align: "center" });
      doc.setDrawColor(0, 158, 115); doc.setLineWidth(1); doc.line(40, 90, pageWidth - 40, 90);

      const fieldExtractors = {
        id: (r) => r.id_pedido,
        cliente: (r) => r.nombre_cliente || "",
        fecha_reserva: (r) => r.fecha_reserva || "",
        fecha_entrega: (r) => r.fecha_entrega || "",
        estado_pedido: (r) => r.estado_pedido || "—",
        id_orden: (r) => r.id_orden ? `#${r.id_orden}` : "—",
        estado_produccion: (r) => r.estado_produccion || "Pendiente",
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
      doc.text(`Total de órdenes exportadas: ${rows.length}`, 50, y); y += 16;
      const proc = rows.filter((r) => (r.estado_produccion || "").toLowerCase().includes("inici") || (r.estado_produccion || "").toLowerCase().includes("proces")).length;
      const fin = rows.filter((r) => (r.estado_produccion || "").toLowerCase().includes("finaliz")).length;
      doc.text(`En proceso: ${proc}`, 50, y); y += 16;
      doc.text(`Finalizados: ${fin}`, 50, y);

      doc.save(`Produccion_Extractus_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally { setExporting(false); }
  };

  // 📊 Excel
  const handleExportExcel = async (filters = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(filters);
      if (rows.length === 0) { toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true }); return; }

      const wb = new ExcelJS.Workbook(); wb.creator = "Extractus ERP"; wb.created = new Date();
      const ws = wb.addWorksheet("Produccion");

      const allCols = [
        { key: "id", header: "ID Pedido", width: 10, extract: (r) => r.id_pedido },
        { key: "cliente", header: "Cliente", width: 25, extract: (r) => r.nombre_cliente || "" },
        { key: "fecha_reserva", header: "Fecha Reserva", width: 14, extract: (r) => r.fecha_reserva || "" },
        { key: "fecha_entrega", header: "Fecha Entrega", width: 14, extract: (r) => r.fecha_entrega || "" },
        { key: "estado_pedido", header: "Estado Pedido", width: 16, extract: (r) => r.estado_pedido || "—" },
        { key: "id_orden", header: "Orden", width: 10, extract: (r) => r.id_orden ? `#${r.id_orden}` : "—" },
        { key: "estado_produccion", header: "Estado Producción", width: 18, extract: (r) => r.estado_produccion || "Pendiente" },
      ];
      const columns_exp = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns_exp.length);

      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Producción — Extractus";
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
      saveAs(new Blob([buffer]), `Produccion_Extractus_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally { setExporting(false); }
  };

  // ── Loader ────────────────────────────────────────────────
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="60vh" bg={pageBg}>
        <VStack spacing={3}>
          <Spinner size="xl" color="green.500" thickness="4px" speed="0.7s" />
          <Text color={subtleText} fontSize="sm">Cargando módulo de producción...</Text>
        </VStack>
      </Flex>
    );
  }

  // ── RENDER PRINCIPAL ──────────────────────────────────────
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

      <Box
        bg={cardBg}
        borderColor={cardBorder}
        borderWidth="1px"
        boxShadow="md"
        borderRadius="xl"
        p={{ base: 5, md: 6 }}
        mb={6}
      >
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <HStack spacing={4}>
            <Flex
              w={10}
              h={10}
              bg="teal.100"
              borderRadius="lg"
              align="center"
              justify="center"
              flexShrink={0}
            >
              <Icon as={FaIndustry} color="teal.600" boxSize={5} />
            </Flex>
            <Box>
              <Heading size="md" color={accent} fontWeight="700">
                Módulo de Producción
              </Heading>
              <Text color={subtleText} fontSize="xs" mt={0.5}>
                Gestión de órdenes y consumo de insumos
              </Text>
            </Box>
          </HStack>

          <HStack spacing={2}>
            <Button
              size="sm"
              colorScheme="teal"
              leftIcon={<FaFileExport />}
              borderRadius="md"
              onClick={() => {
                setExpCliente(""); setExpEstadoProd("");
                setExportFormat("excel");
                setSelectedFields([...ALL_FIELD_KEYS]);
                exportModal.onOpen();
              }}
              isDisabled={exporting}
            >
              Exportar
            </Button>
            <Button
              size="sm"
              colorScheme="teal"
              variant="outline"
              borderRadius="md"
              onClick={cargarPedidos}
            >
              Actualizar
            </Button>
          </HStack>
        </Flex>

        <Divider mt={4} borderColor={cardBorder} />

        {/* ── MINI DASHBOARD — 3 tarjetas ── */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={5}>

          {/* Total */}
          <Box
            bg={statTotalBg}
            borderRadius="xl"
            p={5}
            borderWidth="1px"
            borderColor={cardBorder}
            boxShadow="sm"
            transition="transform 0.2s, box-shadow 0.2s"
            _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
          >
            <Flex justify="space-between" align="center">
              <Stat>
                <StatLabel fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
                  Total Pedidos
                </StatLabel>
                <StatNumber fontSize="3xl" fontWeight="800" color="teal.900">
                  {total}
                </StatNumber>
                <StatHelpText fontSize="xs" color={subtleText}>Pendientes / en proceso</StatHelpText>
              </Stat>
              <Flex w={11} h={11} bg="whiteAlpha.600" borderRadius="lg" align="center" justify="center">
                <Icon as={FaBoxOpen} boxSize={5} color="#009e73" />
              </Flex>
            </Flex>
          </Box>

          {/* En proceso */}
          <Box
            bg={statActivosBg}
            borderRadius="xl"
            p={5}
            borderWidth="1px"
            borderColor={cardBorder}
            boxShadow="sm"
            transition="transform 0.2s, box-shadow 0.2s"
            _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
          >
            <Flex justify="space-between" align="center">
              <Stat>
                <StatLabel fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
                  En Proceso
                </StatLabel>
                <StatNumber fontSize="3xl" fontWeight="800" color={activosNumberColor}>
                  {enProceso}
                </StatNumber>
                <StatHelpText fontSize="xs" color={subtleText}>Órdenes iniciadas</StatHelpText>
              </Stat>
              <Flex w={11} h={11} bg="whiteAlpha.600" borderRadius="lg" align="center" justify="center">
                <Icon as={FaClock} boxSize={5} color="green" />
              </Flex>
            </Flex>
          </Box>

          {/* Finalizados */}
          <Box
            bg={statInactivosBg}
            borderRadius="xl"
            p={5}
            borderWidth="1px"
            borderColor={cardBorder}
            boxShadow="sm"
            transition="transform 0.2s, box-shadow 0.2s"
            _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
          >
            <Flex justify="space-between" align="center">
              <Stat>
                <StatLabel fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
                  Finalizados
                </StatLabel>
                <StatNumber fontSize="3xl" fontWeight="800" color={inactivosNumberColor}>
                  {finalizados}
                </StatNumber>
                <StatHelpText fontSize="xs" color={subtleText}>Producción completada</StatHelpText>
              </Stat>
              <Flex w={11} h={11} bg="whiteAlpha.600" borderRadius="lg" align="center" justify="center">
                <Icon as={FaCheckCircle} boxSize={5} color="red" />
              </Flex>
            </Flex>
          </Box>
        </SimpleGrid>
      </Box>

      {/* ── TABLA DE PEDIDOS ── */}
      <Box
        bg={cardBg}
        borderRadius="xl"
        borderWidth="1px"
        borderColor={cardBorder}
        boxShadow="sm"
        overflow="hidden"
      >
        {/* Cabecera */}
        <Flex
          px={5}
          py={3}
          justify="space-between"
          align="center"
          borderBottomWidth="1px"
          borderColor={cardBorder}
        >
          <HStack spacing={2}>
            <Icon as={FaClipboardList} color="green.600" boxSize={4} />
            <Heading size="sm" color={activeColor}>
              Pedidos Pendientes de Producción
            </Heading>
          </HStack>
        </Flex>

        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr bg={tableHdrBg}>
                <Th py={3} fontSize="xs" color={subtleText} letterSpacing="wider">ID</Th>
                <Th fontSize="xs" color={subtleText} letterSpacing="wider">Cliente</Th>
                <Th fontSize="xs" color={subtleText} letterSpacing="wider">F. Reserva</Th>
                <Th fontSize="xs" color={subtleText} letterSpacing="wider">F. Entrega</Th>
                <Th fontSize="xs" color={subtleText} letterSpacing="wider">Estado Pedido</Th>
                <Th fontSize="xs" color={subtleText} letterSpacing="wider">Orden</Th>
                <Th fontSize="xs" color={subtleText} letterSpacing="wider">Producción</Th>
                <Th fontSize="xs" color={subtleText} letterSpacing="wider" textAlign="center">Acciones</Th>
              </Tr>
            </Thead>

            <Tbody>
              {pedidos.length === 0 ? (
                <Tr>
                  <Td colSpan={8}>
                    <Flex direction="column" align="center" py={14} gap={3}>
                      <Icon as={FaBoxOpen} boxSize={10} color="gray.300" />
                      <Text color={subtleText} fontSize="sm">
                        No hay pedidos pendientes de producción
                      </Text>
                    </Flex>
                  </Td>
                </Tr>
              ) : (
                pedidos.map((p) => (
                  <Tr
                    key={p.id_pedido}
                    _hover={{ bg: rowHover }}
                    transition="background 0.15s"
                  >
                    <Td>
                      <Text fontWeight="700" fontSize="sm" color="green.600">
                        #{p.id_pedido}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontWeight="500" fontSize="sm">{p.nombre_cliente}</Text>
                    </Td>
                    <Td>
                      <Text fontSize="xs" color={subtleText}>{p.fecha_reserva}</Text>
                    </Td>
                    <Td>
                      <Text fontSize="xs" color={subtleText}>{p.fecha_entrega}</Text>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme="orange"
                        borderRadius="full"
                        px={2}
                        py={0.5}
                        fontSize="xs"
                      >
                        {p.estado_pedido || "—"}
                      </Badge>
                    </Td>
                    <Td>
                      <Text fontSize="xs" color={subtleText} fontFamily="mono">
                        {p.id_orden ? `#${p.id_orden}` : "—"}
                      </Text>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <Icon
                          as={iconEstado(p.estado_produccion)}
                          color={`${colorEstado(p.estado_produccion)}.500`}
                          boxSize={3.5}
                        />
                        <Badge
                          colorScheme={colorEstado(p.estado_produccion)}
                          borderRadius="full"
                          px={2}
                          py={0.5}
                          fontSize="xs"
                        >
                          {p.estado_produccion || "Pendiente"}
                        </Badge>
                      </HStack>
                    </Td>

                    <Td>
                      <HStack spacing={1} justify="center">
                        <Tooltip label="Ver detalle">
                          <Button
                            size="xs"
                            colorScheme="green"
                            variant="outline"
                            leftIcon={<FaClipboardList />}
                            borderRadius="md"
                            onClick={() => verDetalle(p)}
                          >
                            Detalle
                          </Button>
                        </Tooltip>

                        {!p.id_orden && (
                          <Tooltip label="Iniciar producción">
                            <Button
                              size="xs"
                              colorScheme="green"
                              leftIcon={<FaPlay />}
                              borderRadius="md"
                              isLoading={accionLoading === p.id_pedido}
                              onClick={() => iniciarProduccion(p)}
                            >
                              Iniciar
                            </Button>
                          </Tooltip>
                        )}

                        {p.id_orden && p.estado_produccion !== "Finalizado" && (
                          <Tooltip label="Registrar insumos y finalizar">
                            <Button
                              size="xs"
                              colorScheme="teal"
                              leftIcon={<FaStop />}
                              borderRadius="md"
                              onClick={() => finalizarProduccion(p)}
                            >
                              Finalizar
                            </Button>
                          </Tooltip>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      </Box>


      {/* ════════════════════════════════════════════════════
          MODAL — DETALLE DEL PEDIDO
      ════════════════════════════════════════════════════ */}
      <Modal isOpen={detalleModal.isOpen} onClose={detalleModal.onClose} size="xl" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" bg="blackAlpha.400" />
        <ModalContent bg={modalBg} borderRadius="xl" overflow="hidden" boxShadow="xl">
          {/* Header verde — igual que sidebar activo */}
          <Box bg={topBarBg} px={5} py={4}>
            <HStack justify="space-between">
              <HStack spacing={3}>
                <Icon as={FaClipboardList} color="white" boxSize={4} />
                <Box>
                  <Text color="white" fontWeight="700" fontSize="md">
                    Detalle — Pedido #{pedidoSeleccionado?.id_pedido}
                  </Text>
                  <Text color="whiteAlpha.800" fontSize="xs">
                    {pedidoSeleccionado?.nombre_cliente}
                  </Text>
                </Box>
              </HStack>
              <ModalCloseButton position="static" color="white" />
            </HStack>
          </Box>

          <ModalBody p={5}>
            {/* Fechas */}
            <SimpleGrid columns={2} spacing={3} mb={4}>
              <Box bg={statTotalBg} borderRadius="lg" p={3}>
                <Text fontSize="xs" color={subtleText}>Fecha Reserva</Text>
                <Text fontWeight="600" fontSize="sm">{pedidoSeleccionado?.fecha_reserva || "—"}</Text>
              </Box>
              <Box bg={statActivosBg} borderRadius="lg" p={3}>
                <Text fontSize="xs" color={subtleText}>Fecha Entrega</Text>
                <Text fontWeight="600" fontSize="sm">{pedidoSeleccionado?.fecha_entrega || "—"}</Text>
              </Box>
            </SimpleGrid>

            <Divider mb={4} />

            {detalle.length === 0 ? (
              <Flex direction="column" align="center" py={8} gap={2}>
                <Icon as={FaBoxOpen} boxSize={8} color="gray.300" />
                <Text color={subtleText} fontSize="sm">Sin productos en este pedido</Text>
              </Flex>
            ) : (
              <Box overflowX="auto" borderRadius="lg" borderWidth="1px" borderColor={cardBorder}>
                <Table size="sm">
                  <Thead bg={tableHdrBg}>
                    <Tr>
                      <Th fontSize="xs" color={subtleText}>Producto</Th>
                      <Th fontSize="xs" color={subtleText}>Unidad</Th>
                      <Th fontSize="xs" color={subtleText} isNumeric>Cantidad</Th>
                      <Th fontSize="xs" color={subtleText} isNumeric>P. Unit.</Th>
                      <Th fontSize="xs" color={subtleText} isNumeric>Subtotal</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {detalle.map((d) => (
                      <Tr key={d.id_detalle_pedidos} _hover={{ bg: rowHover }}>
                        <Td fontWeight="500" fontSize="sm">{d.nombre}</Td>
                        <Td fontSize="xs" color={subtleText}>{d.unidad_medida}</Td>
                        <Td isNumeric fontSize="sm">{d.cantidad}</Td>
                        <Td isNumeric fontSize="sm">L. {Number(d.precio_unitario || 0).toFixed(2)}</Td>
                        <Td isNumeric fontWeight="600" color="green.600" fontSize="sm">
                          L. {Number(d.subtotal || 0).toFixed(2)}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </ModalBody>

          <ModalFooter borderTopWidth="1px" borderColor={cardBorder}>
            <Button colorScheme="green" variant="outline" borderRadius="md" onClick={detalleModal.onClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>


      {/* ════════════════════════════════════════════════════
          MODAL — INSUMOS USADOS (Finalizar)
      ════════════════════════════════════════════════════ */}
      <Modal isOpen={insumosModal.isOpen} onClose={insumosModal.onClose} size="xl" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" bg="blackAlpha.400" />
        <ModalContent bg={modalBg} borderRadius="xl" overflow="hidden" boxShadow="xl">
          <Box bg="teal.500" px={5} py={4}>
            <HStack justify="space-between">
              <HStack spacing={3}>
                <Icon as={FaStop} color="white" boxSize={4} />
                <Box>
                  <Text color="white" fontWeight="700" fontSize="md">
                    Finalizar Producción
                  </Text>
                  <Text color="whiteAlpha.800" fontSize="xs">
                    Orden #{pedidoSeleccionado?.id_orden} — {pedidoSeleccionado?.nombre_cliente}
                  </Text>
                </Box>
              </HStack>
              <ModalCloseButton position="static" color="white" />
            </HStack>
          </Box>

          <ModalBody p={5}>
            <Text fontSize="sm" color={subtleText} mb={4}>
              Registra los insumos utilizados. El inventario se actualizará automáticamente.
            </Text>

            <VStack align="stretch" spacing={2} mb={4}>
              {insumosUsados.map((fila) => (
                <HStack key={fila.filaId} spacing={2}>
                  <Select
                    placeholder="Seleccione insumo..."
                    value={fila.id_insumo}
                    onChange={(e) => actualizarInsumo(fila.filaId, "id_insumo", e.target.value)}
                    size="sm"
                    bg={inputBg}
                    borderRadius="md"
                    flex={2}
                  >
                    {insumosCatalogo.map((ins) => (
                      <option key={ins.id_insumo} value={ins.id_insumo}>
                        {ins.nombre_insumo} ({ins.unidad_medida}) — Stock: {ins.stock_actual}
                      </option>
                    ))}
                  </Select>

                  <Input
                    type="number"
                    placeholder="Cantidad"
                    min="0"
                    value={fila.cantidad_usada}
                    onChange={(e) => actualizarInsumo(fila.filaId, "cantidad_usada", e.target.value)}
                    size="sm"
                    bg={inputBg}
                    borderRadius="md"
                    flex={1}
                    w="100px"
                  />

                  <Tooltip label="Quitar fila">
                    <IconButton
                      icon={<FaTrash />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      borderRadius="md"
                      onClick={() => eliminarFilaInsumo(fila.filaId)}
                      isDisabled={insumosUsados.length === 1}
                    />
                  </Tooltip>
                </HStack>
              ))}
            </VStack>

            <Button
              size="sm"
              variant="outline"
              colorScheme="green"
              leftIcon={<FaPlus />}
              borderRadius="md"
              onClick={agregarFilaInsumo}
              mb={4}
            >
              Agregar insumo
            </Button>

            <Divider mb={4} />

            <Textarea
              value={comentariosInsumos}
              onChange={(e) => setComentariosInsumos(e.target.value)}
              placeholder="Comentarios u observaciones (opcional)..."
              rows={3}
              bg={inputBg}
              borderRadius="md"
              fontSize="sm"
            />
          </ModalBody>

          <ModalFooter borderTopWidth="1px" borderColor={cardBorder} gap={2}>
            <Button
              colorScheme="green"
              leftIcon={<FaCheckCircle />}
              borderRadius="md"
              onClick={guardarInsumos}
            >
              Guardar y Finalizar
            </Button>
            <Button variant="ghost" borderRadius="md" onClick={insumosModal.onClose}>
              Cancelar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Producción</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato</FormLabel>
              <Select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} bg={expInputBg}>
                <option value="excel">📊 Excel (.xlsx)</option>
                <option value="pdf">📄 PDF (.pdf)</option>
              </Select>
            </FormControl>

            <Divider my={4} />
            <Text fontWeight="bold" mb={3} color={accent}>Filtros de exportación</Text>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por cliente</FormLabel>
              <Input placeholder="Ej: Juan Pérez" value={expCliente} onChange={(e) => setExpCliente(e.target.value)} size="sm" bg={expInputBg} />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por estado de producción</FormLabel>
              <Select placeholder="Todos" value={expEstadoProd} onChange={(e) => setExpEstadoProd(e.target.value)} size="sm" bg={expInputBg}>
                <option value="Pendiente">Pendiente</option>
                <option value="Iniciado">Iniciado</option>
                <option value="En proceso">En Proceso</option>
                <option value="Finalizado">Finalizado</option>
              </Select>
            </FormControl>

            <Divider my={4} />

            <Flex justify="space-between" align="center" mb={3}>
              <HStack spacing={2}>
                <Text fontWeight="bold" color={accent}>Campos a exportar</Text>
                <Badge colorScheme="teal" fontSize="xs" borderRadius="full" px={2}>{selectedFields.length} / {ALL_FIELD_KEYS.length}</Badge>
              </HStack>
              <Checkbox isChecked={allFieldsSelected} isIndeterminate={selectedFields.length > 0 && !allFieldsSelected} onChange={toggleAll} colorScheme="teal" size="sm">
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
                const filters = { cliente: expCliente || undefined, estadoProd: expEstadoProd || undefined };
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
