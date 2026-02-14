// ============================================================
// 💎 Historial de Movimientos de Insumos (Versión Empresarial Completa)
// ============================================================

import React, { useEffect, useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Spinner,
  useToast,
  Button,
  HStack,
  Flex,
  Input,
  Card,
  CardBody,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";

import { FaSync, FaFilter, FaBroom, FaFilePdf, FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "../../api/apiClient";
import logoSrc from "../login/log.png";

export default function MovimientosInsumos() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const toast = useToast();

  // ============================================================
  // 📡 Cargar movimientos desde el backend
  // ============================================================
  const cargarMovimientos = async (params = null) => {
    try {
      setLoading(true);

      const { data } = await api.get("/inventario/movimientos", {
        params,
      });

      setMovimientos(data || []);
    } catch (error) {
      toast({
        title: "Error al cargar movimientos",
        description: error.message,
        status: "error",
        duration: 3000,
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Filtrado dinámico automático
  useEffect(() => {
    const filtros = {};

    if (fechaInicio) filtros.fecha_inicio = fechaInicio;
    if (fechaFin) filtros.fecha_fin = fechaFin;

    if (fechaInicio || fechaFin) {
      cargarMovimientos(filtros);
    } else {
      cargarMovimientos(); // sin filtros
    }
  }, [fechaInicio, fechaFin]);

  // 🔄 Botón limpiar
  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
  };

  // ============================================================
  // 📝 Exportar PDF
  // ============================================================
const exportarPDF = () => {
  const doc = new jsPDF("p", "mm", "a4");

  // ================================
  // LOGO
  // ================================
  const img = new Image();
  img.src = logoSrc;
  doc.addImage(img, "PNG", 15, 10, 20, 20);

  // ================================
  // TÍTULO
  // ================================
  doc.setFontSize(16);
  doc.text("Historial de Movimientos de Insumos", 105, 20, { align: "center" });

  // ================================
// FECHA Y HORA
// ================================
const fecha = new Date();
const fechaStr = fecha.toLocaleDateString("es-HN");
const horaStr = fecha.toLocaleTimeString("es-HN", { hour12: true });

doc.setFontSize(10);
doc.setTextColor(100);
doc.text(`Generado: ${fechaStr} - ${horaStr}`, 105, 27, { align: "center" });
doc.setTextColor(0);

  // ================================
  // TABLA
  // ================================
  autoTable(doc, {
    startY: 35,
    head: [["ID", "Insumo", "Tipo", "Cantidad", "Fecha", "Usuario", "Observación"]],
    body: movimientos.map((m) => [
      m.id_movimiento,
      m.nombre_insumo,
      m.tipo_movimiento,
      m.cantidad,
      new Date(m.fecha_movimiento).toLocaleString("es-HN"),
      m.usuario_registro || "Sistema",
      m.observacion || "—",
    ]),
    headStyles: { fillColor: [0, 158, 115], textColor: 255, halign: "center" },
    bodyStyles: { halign: "center" },
    alternateRowStyles: { fillColor: [245, 252, 247] },
    didDrawPage: (data) => {
      // ============================
      // NÚMERO DE PÁGINA
      // ============================
      const pageNumber = doc.internal.getNumberOfPages();
      doc.setFontSize(9);
      doc.text(
        `Página ${pageNumber}`,
        doc.internal.pageSize.width - 20,
        doc.internal.pageSize.height - 10,
        { align: "right" }
      );
    }
  });

  // ================================
  // CALCULAMOS Y PONEMOS EL RESUMEN
  // JUSTO DESPUÉS DE LA TABLA
  // ================================
 let y = doc.lastAutoTable.finalY + 12;

// Si no cabe en la página, crear nueva
if (y > 240) {
  doc.addPage();
  y = 20;
}

// ================================
// 🎨 ESTILO DEL TÍTULO (gris profesional)
// ================================
doc.setFont("helvetica", "bold");
doc.setFontSize(13);
doc.setTextColor(80); // gris elegante
doc.text("RESUMEN DE MOVIMIENTOS", 15, y);

y += 8; // menos espacio, compacto
doc.setTextColor(0); // texto normal negro
doc.setFontSize(11);
doc.setFont("helvetica", "normal");

// ======================================
// Helper para filas (alineación perfecta)
// ======================================
const addRow = (label, value) => {
  doc.text(label, 15, y);        // columna izquierda
  doc.text(String(value), 90, y); // columna derecha CERCANA
  y += 7; // más compacto
};

// ======================================
// 📊 Calcular valores
// ======================================
const totalMovimientos = movimientos.length;
const totalEntradas = movimientos.filter((m) => m.tipo_movimiento === "Entrada").length;
const totalSalidas = movimientos.filter((m) => m.tipo_movimiento === "Salida").length;

const cantidadEntradas = movimientos
  .filter((m) => m.tipo_movimiento === "Entrada")
  .reduce((acc, m) => acc + Number(m.cantidad || 0), 0);

const cantidadSalidas = movimientos
  .filter((m) => m.tipo_movimiento === "Salida")
  .reduce((acc, m) => acc + Number(m.cantidad || 0), 0);

// ======================================
// 🧾 IMPRESIÓN EXACTA
// ======================================
addRow("Total Movimientos:", totalMovimientos);
addRow("Entradas:", totalEntradas);
addRow("Salidas:", totalSalidas);
addRow("Cantidad Entradas:", cantidadEntradas);
addRow("Cantidad Salidas:", cantidadSalidas);

// ================================
// NUMERO DE PÁGINA
// ================================
const pageNumber = doc.internal.getNumberOfPages();
doc.setFontSize(9);
doc.text(
  `Página ${pageNumber}`,
  doc.internal.pageSize.width - 20,
  doc.internal.pageSize.height - 10,
  { align: "right" }
);

  // ================================
  // GUARDAR PDF
  // ================================
  doc.save("Movimientos_Insumos.pdf");
};

  // ============================================================
  // 📊 Exportar Excel
  // ============================================================
  const exportarExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Movimientos");

    ws.addRow(["EXTRACTUS - MOVIMIENTOS DE INSUMOS"]);
    ws.addRow([]);
    ws.addRow([
      "ID",
      "Insumo",
      "Tipo",
      "Cantidad",
      "Fecha",
      "Usuario",
      "Observación",
    ]);

    movimientos.forEach((m) => {
      ws.addRow([
        m.id_movimiento,
        m.nombre_insumo,
        m.tipo_movimiento,
        m.cantidad,
        new Date(m.fecha_movimiento).toLocaleString("es-HN"),
        m.usuario_registro || "Sistema",
        m.observacion || "—",
      ]);
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Movimientos_Insumos.xlsx");
  };

  return (
    <Box p={6}>
      {/* ====================================================== */}
      {/* 🔹 Mini Dashboard */}
      {/* ====================================================== */}
      <SimpleGrid columns={[1, 4]} spacing={4} mb={6}>
        <Card p={4} borderRadius="lg" bg="#e8f7f0">
          <Text fontSize="sm" color="gray.600">Total Movimientos</Text>
          <Text fontSize="2xl" fontWeight="bold" color="#006e52">
            {movimientos.length}
          </Text>
        </Card>

        <Card p={4} borderRadius="lg" bg="#e9f9ee">
          <Text fontSize="sm" color="gray.600">Entradas</Text>
          <Text fontSize="2xl" fontWeight="bold" color="green.600">
            {movimientos.filter((m) => m.tipo_movimiento === "Entrada").length}
          </Text>
        </Card>

        <Card p={4} borderRadius="lg" bg="#ffe9e9">
          <Text fontSize="sm" color="gray.600">Salidas</Text>
          <Text fontSize="2xl" fontWeight="bold" color="red.600">
            {movimientos.filter((m) => m.tipo_movimiento === "Salida").length}
          </Text>
        </Card>

        <Card p={4} borderRadius="lg" bg="#fff4e6">
          <Text fontSize="sm" color="gray.600">Último Movimiento</Text>
          <Text fontSize="md" fontWeight="bold">
            {movimientos[0]
              ? new Date(movimientos[0].fecha_movimiento).toLocaleString("es-HN")
              : "—"}
          </Text>
        </Card>
      </SimpleGrid>

      {/* ====================================================== */}
      {/* 🔹 Filtros */}
      {/* ====================================================== */}
      <Flex justify="space-between" align="center" mb={5}>
        <Heading size="md" color="teal.700">
          Historial de Movimientos de Insumos
        </Heading>

        <HStack>
          <Button
            colorScheme="gray"
            leftIcon={<FaBroom />}
            onClick={limpiarFiltros}
            size="sm"
          >
            Limpiar
          </Button>

          <Button
            colorScheme="teal"
            leftIcon={<FaSync />}
            onClick={() => cargarMovimientos()}
            size="sm"
          >
            Refrescar
          </Button>

          <Button colorScheme="red" leftIcon={<FaFilePdf />} size="sm" onClick={exportarPDF}>
            PDF
          </Button>

          <Button colorScheme="green" leftIcon={<FaFileExcel />} size="sm" onClick={exportarExcel}>
            Excel
          </Button>
        </HStack>
      </Flex>

      {/* Inputs de Fecha */}
      <HStack mb={4} spacing={3}>
        <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} maxW="200px" />
        <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} maxW="200px" />
      </HStack>

      {/* ====================================================== */}
      {/* 🔹 Tabla */}
      {/* ====================================================== */}
      <Table size="sm" variant="simple">
        <Thead bg="gray.100">
          <Tr>
            <Th>ID</Th>
            <Th>Insumo</Th>
            <Th>Tipo</Th>
            <Th>Cantidad</Th>
            <Th>Fecha</Th>
            <Th>Usuario</Th>
            <Th>Observación</Th>
          </Tr>
        </Thead>

        <Tbody>
          {loading ? (
            <Tr>
              <Td colSpan={7} textAlign="center" py={10}>
                <Spinner size="lg" color="teal.500" />
              </Td>
            </Tr>
          ) : (
            movimientos.map((m) => (
              <Tr key={m.id_movimiento}>
                <Td>{m.id_movimiento}</Td>
                <Td>{m.nombre_insumo}</Td>
                <Td color={m.tipo_movimiento === "Entrada" ? "green.600" : "red.600"}>
                  {m.tipo_movimiento}
                </Td>
                <Td>{m.cantidad}</Td>
                <Td>{new Date(m.fecha_movimiento).toLocaleString("es-HN")}</Td>
                <Td>{m.usuario_registro || "Sistema"}</Td>
                <Td>{m.observacion || "—"}</Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </Box>
  );
}
