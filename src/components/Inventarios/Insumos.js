// ============================================================
// 💎 Dashboard Inventario Extractus Verde Empresarial (CORREGIDO FINAL DEFINITIVO)
// ============================================================

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Flex,
  Heading,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Card,
  CardBody,
  CardHeader,
  useColorModeValue,
  Spinner,
  HStack,
  Button,
  Input,
  Badge,
  useToast,
  Divider,
  Checkbox,
  CheckboxGroup,
  Stack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Select as CSelect,
  useDisclosure,
  Text,
} from "@chakra-ui/react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  FaFilePdf,
  FaFileExcel,
  FaSync,
  FaBroom,
  FaBoxes,
  FaSlidersH,
  FaFileExport,
  FaArrowLeft,
} from "react-icons/fa";
import { DownloadIcon } from "@chakra-ui/icons";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "../../api/apiClient";
import logoSrc from "../login/log.png";
import { useNavigate } from "react-router-dom";




const imgToDataURL = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = src;
  });

const formatearFecha = (fecha) => {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-HN");
};

const formatearHora = (fecha = new Date()) => {
  return new Date(fecha).toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatearMoneda = (valor) => {
  return Number(valor || 0).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function InventarioDashboardVerde() {
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("pdf");

  const [selectedFields, setSelectedFields] = useState([
    "nombre_insumo",
    "stock_minimo",
    "stock_maximo",
    "total_entradas",
    "total_salidas",
    "inventario_final",
    "unidad_medida",
    "fecha_movimiento",
    "nivel",
  ]);

  const audioRef = useRef(null);

  const bg = useColorModeValue("#f7faf8", "#1a202c");
  const cardBg = useColorModeValue("white", "#2d3748");
  const accent = useColorModeValue("#009e73", "teal.300");
  const headBg = useColorModeValue("#f1f8f4", "gray.700");
  const pageBg = useColorModeValue("#f7faf8", "#0f172a");
  const sectionBg = useColorModeValue("white", "#1e293b");
  const borderColor = useColorModeValue("#c2d4c3", "#334155");
  const mutedText = useColorModeValue("gray.600", "gray.300");
  const strongText = useColorModeValue("gray.800", "white");
  const inputBg = useColorModeValue("white", "#0f172a");

  const cardTotalBg = useColorModeValue("#e8f7f0", "#16352b");
  const cardTotalIconBg = useColorModeValue("#c4ecdf", "#1f5a46");

  const cardNormalBg = useColorModeValue("#fff4e6", "#4a3419");
  const cardNormalIconBg = useColorModeValue("#ffe1bf", "#6b4a1f");

  const cardExcedenteBg = useColorModeValue("#e9f9ee", "#183824");
  const cardExcedenteIconBg = useColorModeValue("#c9f0d6", "#1f5a34");

  const cardSinBg = useColorModeValue("#ffe9e9", "#4a1f24");
  const cardSinIconBg = useColorModeValue("#ffcfcf", "#6b2a30");

  const chartCardBg = useColorModeValue("white", "#1e293b");
  const tableCardBg = useColorModeValue("white", "#1e293b");

  // ============================================================
  // 📡 Cargar inventario usando datos reales de la BD (CORREGIDO)
  // ============================================================
  const cargarInventario = async (paramsFechas = null) => {
    try {
      setLoading(true);

      if (paramsFechas) {
        const { data } = await api.get("/inventario/inventario-diario", {
          params: paramsFechas,
        });
        setInventario(data);
        return;
      }

      const inv = await api.get("/inventario/inventario-insumos");

      // ⭐⭐⭐⭐⭐ MOSTRAR ENTRADAS / SALIDAS / STOCK REAL ⭐⭐⭐⭐⭐
      const inventarioConDatosReales = inv.data.map((i) => ({
        ...i,
        total_entradas: i.entradas ?? 0,
        total_salidas: i.salidas ?? 0,
        inventario_final: i.stock_actual ?? 0,
        fecha_movimiento: i.fecha_de_movimiento || null,
      }));

      setInventario(inventarioConDatosReales);
    } catch (err) {
      toast({
        title: "Error al cargar inventario",
        description: err.message,
        status: "error",
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFin) params.fecha_fin = fechaFin;

    if (fechaInicio || fechaFin) cargarInventario(params);
    else cargarInventario();
  }, [fechaInicio, fechaFin]);

  const limpiarFiltros = async () => {
    setFechaInicio("");
    setFechaFin("");
    await cargarInventario();
  };

  // ============================================================
  // 📊 Reglas para niveles
  // ============================================================
  const sinExistencia = inventario.filter(
    (i) => Number(i.inventario_final) === 0
  );

  const insumosBajos = inventario.filter(
    (i) =>
      Number(i.inventario_final) > 0 &&
      Number(i.inventario_final) < Number(i.stock_minimo)
  );

  const insumosAltos = inventario.filter(
    (i) => Number(i.inventario_final) > Number(i.stock_maximo)
  );

  const insumosNormales = inventario.filter(
    (i) =>
      Number(i.inventario_final) >= Number(i.stock_minimo) &&
      Number(i.inventario_final) <= Number(i.stock_maximo)
  );

  const totalInsumos = inventario.length;

  const calcularNivel = (i) => {
    const stock = Number(i.inventario_final);
    const min = Number(i.stock_minimo);
    const max = Number(i.stock_maximo);

    if (stock === 0) return { text: "Sin existencia", color: "red" };
    if (stock < min) return { text: "Bajo", color: "orange" };
    if (stock > max) return { text: "Excedente", color: "green" };
    return { text: "Normal", color: "yellow" };
  };

  const chartData = useMemo(
    () =>
      inventario
        .map((i) => ({
          name: i.nombre_insumo,
          Stock: Number(i.inventario_final ?? 0),
        }))
        .sort((a, b) => b.Stock - a.Stock)
        .slice(0, 8),
    [inventario]
  );

  // ============================================================
  // 🔔 Alertas
  // ============================================================
  useEffect(() => {
    if (inventario.length === 0) return;

    const play = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
      }
    };

    if (insumosBajos.length > 0) {
      toast({
        title: "⚠️ Inventario Bajo",
        description: insumosBajos.map((i) => i.nombre_insumo).join(", "),
        status: "warning",
        duration: 9000,
        position: "top-right",
        isClosable: true,
      });
      play();
    }

    if (insumosAltos.length > 0) {
      toast({
        title: "🚨 Inventario Excedente",
        description: insumosAltos.map((i) => i.nombre_insumo).join(", "),
        status: "error",
        duration: 9000,
        position: "top-right",
        isClosable: true,
      });
      play();
    }

    if (sinExistencia.length > 0) {
      toast({
        title: "❌ Sin existencia",
        description: sinExistencia.map((i) => i.nombre_insumo).join(", "),
        status: "error",
        duration: 9000,
        position: "top-right",
        isClosable: true,
      });
      play();
    }
  }, [inventario]);

  // ============================================================
  // 🧾 Exportar PDF / Excel  (SIN CAMBIOS)
  // ============================================================
  const columnasDisponibles = [
    { id: "nombre_insumo", label: "Insumo" },
    { id: "stock_minimo", label: "Stock Mínimo" },
    { id: "stock_maximo", label: "Stock Máximo" },
    { id: "total_entradas", label: "Entradas" },
    { id: "total_salidas", label: "Salidas" },
    { id: "inventario_final", label: "Stock Actual" },
    { id: "unidad_medida", label: "Unidad" },
    { id: "fecha_movimiento", label: "Fecha Movimiento" },
    { id: "nivel", label: "Nivel" },
  ];

  const exportarPDF = async () => {
    try {
      if (
        fechaInicio &&
        fechaFin &&
        fechaFin < fechaInicio
      ) {
        toast({
          title: "Rango de fechas inválido",
          description: "La fecha final no puede ser menor que la fecha inicial.",
          status: "warning",
          position: "top",
        });
        return;
      }

      if (!inventario.length) {
        toast({
          title: "No hay datos para exportar",
          status: "warning",
          position: "top",
        });
        return;
      }

      const fechaGeneracion = new Date();
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;

      const columnasExportar = columnasDisponibles.filter((c) =>
        selectedFields.includes(c.id)
      );

      const rows = inventario.map((i) => ({
        ...i,
        nivel_texto: calcularNivel(i).text,
        fecha_movimiento_fmt: i.fecha_movimiento
          ? formatearFecha(i.fecha_movimiento)
          : "—",
      }));

      // Cabecera
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 145, "F");

      try {
        const dataURL = await imgToDataURL(logoSrc);
        doc.addImage(dataURL, "PNG", 40, 26, 45, 45);
      } catch (e) {
        console.warn("No se pudo cargar logo", e);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text("REPORTE DE INVENTARIO DE INSUMOS", pageWidth / 2, 42, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);

      doc.text(`Fecha: ${formatearFecha(fechaGeneracion)}`, 40, 88);
      doc.text(`Hora: ${formatearHora(fechaGeneracion)}`, 40, 103);
      doc.text(
        `Rango aplicado: ${fechaInicio || fechaFin
          ? `${fechaInicio || "—"} a ${fechaFin || "—"}`
          : "Sin filtro de fechas"
        }`,
        40,
        118
      );
      doc.text(`Total de insumos: ${inventario.length}`, pageWidth - 170, 88);

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(1.2);
      doc.line(40, 132, pageWidth - 40, 132);

      autoTable(doc, {
        startY: 150,
        head: [columnasExportar.map((c) => c.label)],
        body: rows.map((r) =>
          columnasExportar.map((c) => {
            switch (c.id) {
              case "nombre_insumo":
                return r.nombre_insumo ?? "";
              case "stock_minimo":
                return Number(r.stock_minimo ?? 0).toLocaleString("es-HN");
              case "stock_maximo":
                return Number(r.stock_maximo ?? 0).toLocaleString("es-HN");
              case "total_entradas":
                return Number(r.total_entradas ?? 0).toLocaleString("es-HN");
              case "total_salidas":
                return Number(r.total_salidas ?? 0).toLocaleString("es-HN");
              case "inventario_final":
                return Number(r.inventario_final ?? 0).toLocaleString("es-HN");
              case "unidad_medida":
                return r.unidad_medida ?? "";
              case "fecha_movimiento":
                return r.fecha_movimiento_fmt;
              case "nivel":
                return r.nivel_texto;
              default:
                return "";
            }
          })
        ),
        styles: {
          fontSize: 8.5,
          cellPadding: 5,
          valign: "middle",
          textColor: [40, 40, 40],
          lineColor: [220, 220, 220],
          lineWidth: 0.4,
        },
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 40, right: 40 },
        didDrawPage: () => {
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.getHeight();

          doc.setFontSize(9);
          doc.setTextColor(120);
          doc.text(
            `Página ${doc.getNumberOfPages()}`,
            pageSize.getWidth() - 80,
            pageHeight - 20
          );
        },
      });

      const finalY = doc.lastAutoTable.finalY + 25;

      const totalEntradas = inventario.reduce(
        (acc, i) => acc + Number(i.total_entradas || 0),
        0
      );
      const totalSalidas = inventario.reduce(
        (acc, i) => acc + Number(i.total_salidas || 0),
        0
      );
      const totalStock = inventario.reduce(
        (acc, i) => acc + Number(i.inventario_final || 0),
        0
      );

      doc.setDrawColor(210, 210, 210);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(40, finalY, 260, 110, 6, 6, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text("RESUMEN INFORMATIVO", 55, finalY + 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      let y = finalY + 45;

      const addRow = (label, value, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(label, 55, y);
        doc.text(`${Number(value || 0).toLocaleString("es-HN")}`, 285, y, {
          align: "right",
        });
        y += 18;
      };

      addRow("Total entradas:", totalEntradas);
      addRow("Total salidas:", totalSalidas);
      addRow("Stock actual acumulado:", totalStock, true);

      doc.save("reporte_inventario_insumos.pdf");

      toast({
        title: "PDF exportado correctamente",
        status: "success",
        position: "top",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error al exportar PDF",
        description: error.message,
        status: "error",
        position: "top",
      });
    }
  };

  const exportarExcel = async () => {
    try {
      if (
        fechaInicio &&
        fechaFin &&
        fechaFin < fechaInicio
      ) {
        toast({
          title: "Rango de fechas inválido",
          description: "La fecha final no puede ser menor que la fecha inicial.",
          status: "warning",
          position: "top",
        });
        return;
      }

      if (!inventario.length) {
        toast({
          title: "No hay datos para exportar",
          status: "warning",
          position: "top",
        });
        return;
      }

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Inventario");

      const fechaGeneracion = new Date();
      const columnasExportar = columnasDisponibles.filter((c) =>
        selectedFields.includes(c.id)
      );

      // Encabezado
      ws.mergeCells("A1:F1");
      ws.getCell("A1").value = "REPORTE DE INVENTARIO DE INSUMOS";
      ws.getCell("A1").font = { bold: true, size: 18 };
      ws.getCell("A1").alignment = { horizontal: "center" };

      ws.getCell("A2").value = `Fecha de generación: ${formatearFecha(fechaGeneracion)}`;
      ws.getCell("A3").value = `Hora de generación: ${formatearHora(fechaGeneracion)}`;
      ws.getCell("A4").value =
        `Rango de fechas aplicado: ${fechaInicio || fechaFin
          ? `${fechaInicio || "—"} a ${fechaFin || "—"}`
          : "Sin filtro de fechas"
        }`;
      ws.getCell("A5").value = `Total de insumos: ${inventario.length}`;

      ws.addRow([]);
      ws.addRow(columnasExportar.map((c) => c.label));

      const filaEncabezado = 7;

      inventario.forEach((i) => {
        ws.addRow(
          columnasExportar.map((c) => {
            switch (c.id) {
              case "nombre_insumo":
                return i.nombre_insumo ?? "";
              case "stock_minimo":
                return Number(i.stock_minimo ?? 0);
              case "stock_maximo":
                return Number(i.stock_maximo ?? 0);
              case "total_entradas":
                return Number(i.total_entradas ?? 0);
              case "total_salidas":
                return Number(i.total_salidas ?? 0);
              case "inventario_final":
                return Number(i.inventario_final ?? 0);
              case "unidad_medida":
                return i.unidad_medida ?? "";
              case "fecha_movimiento":
                return i.fecha_movimiento
                  ? formatearFecha(i.fecha_movimiento)
                  : "—";
              case "nivel":
                return calcularNivel(i).text;
              default:
                return "";
            }
          })
        );
      });

      ws.getRow(filaEncabezado).font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      ws.getRow(filaEncabezado).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F766E" },
      };
      ws.getRow(filaEncabezado).alignment = { horizontal: "center" };

      columnasExportar.forEach((c, i) => {
        let max = c.label.length;

        inventario.forEach((row) => {
          let value = "";
          switch (c.id) {
            case "nombre_insumo":
              value = row.nombre_insumo ?? "";
              break;
            case "stock_minimo":
              value = String(row.stock_minimo ?? "");
              break;
            case "stock_maximo":
              value = String(row.stock_maximo ?? "");
              break;
            case "total_entradas":
              value = String(row.total_entradas ?? "");
              break;
            case "total_salidas":
              value = String(row.total_salidas ?? "");
              break;
            case "inventario_final":
              value = String(row.inventario_final ?? "");
              break;
            case "unidad_medida":
              value = row.unidad_medida ?? "";
              break;
            case "fecha_movimiento":
              value = row.fecha_movimiento
                ? formatearFecha(row.fecha_movimiento)
                : "—";
              break;
            case "nivel":
              value = calcularNivel(row).text;
              break;
            default:
              value = "";
          }

          if (String(value).length > max) max = String(value).length;
        });

        ws.getColumn(i + 1).width = Math.min(Math.max(15, max + 2), 35);
      });

      const totalEntradas = inventario.reduce(
        (acc, i) => acc + Number(i.total_entradas || 0),
        0
      );
      const totalSalidas = inventario.reduce(
        (acc, i) => acc + Number(i.total_salidas || 0),
        0
      );
      const totalStock = inventario.reduce(
        (acc, i) => acc + Number(i.inventario_final || 0),
        0
      );

      const filaResumen = ws.rowCount + 3;

      ws.getCell(`A${filaResumen}`).value = "RESUMEN INFORMATIVO";
      ws.getCell(`A${filaResumen}`).font = { bold: true, size: 14 };

      const resumen = [
        ["Total entradas", totalEntradas],
        ["Total salidas", totalSalidas],
        ["Stock actual acumulado", totalStock],
      ];

      resumen.forEach(([label, value], index) => {
        const fila = filaResumen + 1 + index;
        ws.getCell(`A${fila}`).value = label;
        ws.getCell(`B${fila}`).value = Number(value || 0);
        ws.getCell(`B${fila}`).numFmt = '#,##0';
      });

      ws.getCell(`A${filaResumen + 3}`).font = { bold: true };
      ws.getCell(`B${filaResumen + 3}`).font = { bold: true };

      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf]), "reporte_inventario_insumos.xlsx");

      toast({
        title: "Excel exportado correctamente",
        status: "success",
        position: "top",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error al exportar Excel",
        description: error.message,
        status: "error",
        position: "top",
      });
    }
  };

  const exportarReporte = async () => {
    if (exportFormat === "pdf") {
      await exportarPDF();
    } else {
      await exportarExcel();
    }
    exportModal.onClose();
  };

  // ============================================================
  // 💎 Render
  // ============================================================
  return (
    <Box bg={pageBg} minH="100vh" p={8}>
      <audio ref={audioRef}>
        <source
          src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
          type="audio/ogg"
        />
      </audio>

      {/* ENCABEZADO */}
      <Flex justify="space-between" mb={4} wrap="wrap" gap={3}>
        <HStack spacing={3}>

          <Button
            size="sm"
            variant="outline"
            colorScheme="teal"
            leftIcon={<FaArrowLeft />}
            onClick={() => navigate("/app/inventarios")}
          >
            Atrás
          </Button>

          <HStack spacing={2}>
            <FaBoxes color={accent} size="18" />
            <Heading size="md" color={accent}>
              Inventario de Insumos
            </Heading>
          </HStack>

        </HStack>
      </Flex>

      {/* TARJETAS */}
      <SimpleGrid columns={[2, 4]} spacing={5} mb={6}>
        <Card p={4} bg={cardTotalBg} border="1px solid" borderColor={borderColor}>
          <HStack>
            <Box bg={cardTotalIconBg} p={3} borderRadius="full">
              <FaBoxes color="#008f6b" size="22" />
            </Box>
            <Box>
              <Text color={mutedText}>Total de Insumos</Text>
              <Text fontSize="2xl" fontWeight="bold" color={strongText}>
                {totalInsumos}
              </Text>
            </Box>
          </HStack>
        </Card>

        <Card p={4} bg={cardNormalBg} border="1px solid" borderColor={borderColor}>
          <HStack>
            <Box bg={cardNormalIconBg} p={3} borderRadius="full">
              <FaBoxes color="#cc6e14" size="22" />
            </Box>
            <Box>
              <Text color={mutedText}>Insumos Abastecidos</Text>
              <Text fontSize="2xl" fontWeight="bold" color={strongText}>
                {insumosNormales.length}
              </Text>
            </Box>
          </HStack>
        </Card>

        <Card p={4} bg={cardExcedenteBg} border="1px solid" borderColor={borderColor}>
          <HStack>
            <Box bg={cardExcedenteIconBg} p={3} borderRadius="full">
              <FaBoxes color="#2f855a" size="22" />
            </Box>
            <Box>
              <Text color={mutedText}>Insumos Excedentes</Text>
              <Text fontSize="2xl" fontWeight="bold" color={strongText}>
                {insumosAltos.length}
              </Text>
            </Box>
          </HStack>
        </Card>

        <Card p={4} bg={cardSinBg} border="1px solid" borderColor={borderColor}>
          <HStack>
            <Box bg={cardSinIconBg} p={3} borderRadius="full">
              <FaBoxes color="#c53030" size="22" />
            </Box>
            <Box>
              <Text color={mutedText}>Sin Existencia</Text>
              <Text fontSize="2xl" fontWeight="bold" color={strongText}>
                {sinExistencia.length}
              </Text>
            </Box>
          </HStack>
        </Card>
      </SimpleGrid>

      {/* CHART */}
      <Card bg={chartCardBg} mb={8} border="1px solid" borderColor={borderColor}>
        <CardHeader>
          <Heading size="sm" color={accent}>
            Stock Actual por Insumo
          </Heading>
        </CardHeader>
        <CardBody>
          {loading ? (
            <Flex justify="center">
              <Spinner color={accent} />
            </Flex>
          ) : (
            <Box h="260px">
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accent} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={accent} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="Stock" stroke={accent} fill="url(#cStock)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardBody>
      </Card>

      {/* TABLA */}
      <Card bg={tableCardBg} border="1px solid" borderColor={borderColor}>
        <CardHeader>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Heading size="sm" color={accent}>
              Detalle de Inventario
            </Heading>

            <HStack spacing={2} wrap="wrap">
              <Input
                type="date"
                size="xs"
                w="110px"
                bg={inputBg}
                color={strongText}
                borderColor={borderColor}
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />

              <Input
                type="date"
                size="xs"
                w="110px"
                bg={inputBg}
                color={strongText}
                borderColor={borderColor}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
              <Button size="sm" leftIcon={<FaBroom />} onClick={limpiarFiltros}>
                Limpiar
              </Button>
              <Button
                size="sm"
                colorScheme="teal"
                variant="outline"
                leftIcon={<FaSync />}
                onClick={() => cargarInventario()}
              >
                Refrescar
              </Button>
              <Button
                size="sm"
                colorScheme="teal"
                leftIcon={<FaFileExport />}
                onClick={exportModal.onOpen}
              >
                Exportar
              </Button>
            </HStack>
          </Flex>
        </CardHeader>

        <Divider />

        <CardBody>
          {loading ? (
            <Flex justify="center">
              <Spinner color={accent} />
            </Flex>
          ) : (
            <Table size="sm">
              <Thead bg={headBg}>
                <Tr>
                  {columnasDisponibles
                    .filter((c) => selectedFields.includes(c.id))
                    .map((col) => (
                      <Th key={col.id} color={accent}>
                        {col.label}
                      </Th>
                    ))}
                </Tr>
              </Thead>

              <Tbody color={strongText}>
                {inventario.map((i) => (
                  <Tr key={i.id_insumo}>
                    {selectedFields.includes("nombre_insumo") && (
                      <Td>{i.nombre_insumo}</Td>
                    )}

                    {selectedFields.includes("stock_minimo") && (
                      <Td>{i.stock_minimo}</Td>
                    )}

                    {selectedFields.includes("stock_maximo") && (
                      <Td>{i.stock_maximo}</Td>
                    )}

                    {selectedFields.includes("total_entradas") && (
                      <Td>{Number(i.total_entradas).toFixed(0)}</Td>
                    )}

                    {selectedFields.includes("total_salidas") && (
                      <Td>{Number(i.total_salidas).toFixed(0)}</Td>
                    )}

                    {selectedFields.includes("inventario_final") && (
                      <Td>{Number(i.inventario_final).toFixed(0)}</Td>
                    )}

                    {selectedFields.includes("unidad_medida") && (
                      <Td>{i.unidad_medida}</Td>
                    )}

                    {selectedFields.includes("fecha_movimiento") && (
                      <Td>
                        {i.fecha_movimiento
                          ? new Date(i.fecha_movimiento).toLocaleDateString("es-HN")
                          : "—"}
                      </Td>
                    )}

                    {selectedFields.includes("nivel") && (
                      <Td>
                        <Badge colorScheme={calcularNivel(i).color}>
                          {calcularNivel(i).text}
                        </Badge>
                      </Td>
                    )}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={useColorModeValue("teal.50", "gray.700")} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Inventario de Insumos</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato</FormLabel>
              <CSelect value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} bg={inputBg}>
                <option value="pdf">📄 PDF (.pdf)</option>
                <option value="excel">📊 Excel (.xlsx)</option>
              </CSelect>
            </FormControl>

            <Divider my={4} />

            <Flex justify="space-between" align="center" mb={3}>
              <HStack spacing={2}>
                <Text fontWeight="bold" color={accent}>Campos a exportar</Text>
                <Badge colorScheme="teal" fontSize="xs" borderRadius="full" px={2}>
                  {selectedFields.length} / {columnasDisponibles.length}
                </Badge>
              </HStack>
              <Checkbox
                isChecked={selectedFields.length === columnasDisponibles.length}
                isIndeterminate={selectedFields.length > 0 && selectedFields.length < columnasDisponibles.length}
                onChange={() => setSelectedFields(selectedFields.length === columnasDisponibles.length ? [] : columnasDisponibles.map(c => c.id))}
                colorScheme="teal"
                size="sm"
              >
                <Text fontSize="xs">Seleccionar todos</Text>
              </Checkbox>
            </Flex>

            <SimpleGrid columns={2} spacing={2}>
              {columnasDisponibles.map((col) => (
                <Checkbox
                  key={col.id}
                  isChecked={selectedFields.includes(col.id)}
                  onChange={() => setSelectedFields(prev => prev.includes(col.id) ? prev.filter(k => k !== col.id) : [...prev, col.id])}
                  colorScheme="teal"
                  size="sm"
                >
                  {col.label}
                </Checkbox>
              ))}
            </SimpleGrid>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="teal" leftIcon={<DownloadIcon />} onClick={exportarReporte} isDisabled={selectedFields.length === 0}>
              Exportar
            </Button>
            <Button ml={3} onClick={exportModal.onClose}>
              Cancelar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* MODAL COLUMNAS */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg={sectionBg} color={strongText}>
          <ModalHeader>Seleccionar columnas</ModalHeader>
          <ModalBody>
            <CheckboxGroup value={selectedFields} onChange={(vals) => setSelectedFields(vals)}>
              <Stack spacing={2}>
                {columnasDisponibles.map((col) => (
                  <Checkbox key={col.id} value={col.id}>
                    {col.label}
                  </Checkbox>
                ))}
              </Stack>
            </CheckboxGroup>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="teal" onClick={onClose}>
              Aceptar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
