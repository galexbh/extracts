import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  IconButton,
  Select,
  useDisclosure,
  useToast,
  Heading,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { FaSyncAlt, FaFilePdf, FaFileExcel, FaSearch, FaTimes } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";
import api from "../../api/apiClient";

const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Pedidos";

const colorPorEstado = (estado) => {
  const mapa = {
    Pendiente: "yellow",
    "En proceso": "blue",
    Completado: "green",
    Entregado: "teal",
    Cancelado: "red",
  };
  return mapa[estado] || "gray";
};

const formatearL = (n) =>
  `L. ${Number(n || 0).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Función de exportación a PDF
const exportToPDF = (data) => {
  const doc = new jsPDF();
  const m = 14;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString("es-ES");

  doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
  doc.setFontSize(14).setTextColor(102, 187, 106).text(REPORT_TITLE, w / 2, 30, { align: "center" });
  doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

  try {
    const img = doc.getImageProperties(logo);
    const imgW = 20;
    const imgH = (img.height * imgW) / img.width;
    doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
  } catch { }

  doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

  autoTable(doc, {
    startY: 40,
    head: [["ID", "Cliente", "F. Reserva", "F. Entrega", "Estado", "Total"]],
    body: data.map((p) => [
      p.id_pedido,
      p.nombre_cliente,
      p.fecha_reserva?.substring(0, 10),
      p.fecha_entrega?.substring(0, 10),
      p.estado_pedido || "—",
      formatearL(p.total),
    ]),
    theme: "grid",
    headStyles: { fillColor: [0, 128, 128], textColor: [255, 255, 255] },
    margin: { left: m, right: m },
    styles: { fontSize: 8, cellPadding: 2 },
    didDrawPage: () => {
      const p = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
    },
  });

  doc.save("reporte_pedidos.pdf");
};

// Función de exportación a Excel
const exportToExcel = async (data) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pedidos");
  const dateStr = new Date().toLocaleDateString("es-ES");

  ws.mergeCells("A1:F1");
  Object.assign(ws.getCell("A1"), {
    value: COMPANY_NAME,
    font: { size: 14, bold: true, color: { argb: "2E7D32" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:F2");
  Object.assign(ws.getCell("A2"), {
    value: REPORT_TITLE,
    font: { size: 12, bold: true, color: { argb: "66BB6A" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(2).height = 20;

  ws.mergeCells("A3:F3");
  Object.assign(ws.getCell("A3"), {
    value: `Fecha: ${dateStr}`,
    font: { size: 10 },
    alignment: { horizontal: "left", vertical: "middle" },
  });
  ws.getRow(3).height = 18;

  ws.addRow([]);

  const columns = ["ID", "Cliente", "F. Reserva", "F. Entrega", "Estado", "Total"];
  const hdr = ws.addRow(columns);
  hdr.height = 20;
  hdr.eachCell((cell) => {
    Object.assign(cell, {
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "008080" } },
      font: { bold: true, color: { argb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    });
  });

  data.forEach((p) => {
    const r = ws.addRow([
      p.id_pedido,
      p.nombre_cliente,
      p.fecha_reserva?.substring(0, 10),
      p.fecha_entrega?.substring(0, 10),
      p.estado_pedido || "—",
      Number(p.total || 0),
    ]);
    r.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  ws.columns.forEach((col) => {
    const vals = col.values.slice(1);
    const mx = vals.reduce((m, v) => Math.max(m, (v ?? "").toString().length), 0);
    col.width = Math.min(mx + 5, 40);
  });

  ws.headerFooter = { oddFooter: "&CPágina &P" };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), "reporte_pedidos.xlsx");
};

// Componente principal
const MantenimientoPedidos = () => {
  const toast = useToast();
  const { isOpen: _isOpen } = useDisclosure();

  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const bgCard = useColorModeValue("white", "gray.800");
  const tableHeader = useColorModeValue("teal.100", "teal.700");
  const inputBg = useColorModeValue("gray.50", "gray.700");
  const emptyColor = useColorModeValue("gray.400", "gray.500");

  // Cargar pedidos desde la API real
  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ventas/ventasyreserva/pedidos");
      setPedidos(res.data || []);
    } catch (err) {
      console.error("❌ Error cargando pedidos:", err);
      toast({
        title: "Error cargando pedidos",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Eliminar pedido
  const handleDeletePedido = async (id) => {
    try {
      await api.delete(`/ventas/ventasyreserva/pedidos/${id}`);
      toast({ title: "Pedido eliminado", status: "info" });
      cargarPedidos();
    } catch (err) {
      toast({
        title: "Error al eliminar",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };

  // Filtrar pedidos
  const filteredPedidos = pedidos.filter((p) => {
    const matchCliente = filtroCliente
      ? p.nombre_cliente?.toLowerCase().includes(filtroCliente.toLowerCase())
      : true;
    const matchEstado = filtroEstado
      ? p.estado_pedido === filtroEstado
      : true;
    return matchCliente && matchEstado;
  });

  const estadosUnicos = [...new Set(pedidos.map((p) => p.estado_pedido).filter(Boolean))];

  if (loading)
    return (
      <Flex justify="center" align="center" minH="40vh">
        <Spinner size="xl" color="teal.400" />
      </Flex>
    );

  return (
    <Box p={5} bg={bgCard} borderRadius="xl" boxShadow="lg">
      <Heading mb={4} size="md" color="teal.500">
        📋 Mantenimiento de Pedidos
      </Heading>

      <Button mb={3} size="sm" onClick={() => window.history.back()}>
        ← Volver
      </Button>

      {/* Barra de acciones */}
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
        {/* Filtros */}
        <HStack spacing={3} flexWrap="wrap">
          <InputGroup size="sm" w="200px">
            <InputLeftElement pointerEvents="none">
              <FaSearch color="gray" />
            </InputLeftElement>
            <Input
              placeholder="Buscar cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              bg={inputBg}
              pl={8}
            />
          </InputGroup>

          <Select
            size="sm"
            w="170px"
            placeholder="Todos los estados"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            bg={inputBg}
          >
            {estadosUnicos.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </Select>

          {(filtroCliente || filtroEstado) && (
            <IconButton
              icon={<FaTimes />}
              size="sm"
              variant="ghost"
              onClick={() => { setFiltroCliente(""); setFiltroEstado(""); }}
              aria-label="Limpiar filtros"
            />
          )}
        </HStack>

        {/* Exportar + Refrescar */}
        <HStack spacing={2}>
          <Menu>
            <MenuButton as={Button} colorScheme="teal" size="sm" rightIcon={<FaFilePdf />}>
              Reporte
            </MenuButton>
            <MenuList>
              <MenuItem icon={<FaFilePdf />} onClick={() => exportToPDF(filteredPedidos)}>
                Exportar PDF
              </MenuItem>
              <MenuItem icon={<FaFileExcel />} onClick={() => exportToExcel(filteredPedidos)}>
                Exportar Excel
              </MenuItem>
            </MenuList>
          </Menu>

          <IconButton
            colorScheme="gray"
            size="sm"
            aria-label="Recargar"
            icon={<FaSyncAlt />}
            onClick={cargarPedidos}
          />
        </HStack>
      </Flex>

      {/* Tabla de pedidos */}
      <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
        <Table variant="simple" size="sm">
          <Thead bg={tableHeader}>
            <Tr>
              <Th>ID</Th>
              <Th>Cliente</Th>
              <Th>F. Reserva</Th>
              <Th>F. Entrega</Th>
              <Th>Estado</Th>
              <Th textAlign="right">Total</Th>
              <Th textAlign="center">Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredPedidos.length === 0 ? (
              <Tr>
                <Td colSpan={7} textAlign="center" py={10} color={emptyColor}>
                  {filtroCliente || filtroEstado
                    ? "No se encontraron pedidos con esos filtros."
                    : "No hay pedidos registrados."}
                </Td>
              </Tr>
            ) : (
              filteredPedidos.map((pedido) => (
                <Tr key={pedido.id_pedido}>
                  <Td fontWeight="bold">{pedido.id_pedido}</Td>
                  <Td>{pedido.nombre_cliente}</Td>
                  <Td>{pedido.fecha_reserva?.substring(0, 10)}</Td>
                  <Td>{pedido.fecha_entrega?.substring(0, 10)}</Td>
                  <Td>
                    <Badge colorScheme={colorPorEstado(pedido.estado_pedido)}>
                      {pedido.estado_pedido || "—"}
                    </Badge>
                  </Td>
                  <Td textAlign="right" fontFamily="monospace">
                    {formatearL(pedido.total)}
                  </Td>
                  <Td textAlign="center">
                    <Button
                      size="xs"
                      colorScheme="red"
                      leftIcon={<FaTimes />}
                      onClick={() => handleDeletePedido(pedido.id_pedido)}
                    >
                      Eliminar
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      <Text fontSize="xs" color={emptyColor} mt={3}>
        {filteredPedidos.length} pedido(s) mostrado(s)
        {filteredPedidos.length !== pedidos.length && ` de ${pedidos.length} total`}
      </Text>
    </Box>
  );
};

export default MantenimientoPedidos;
