// ============================================================
// 📁 src/components/Ventas/Pedidos.js
// 💎 ERP - Pedidos (Ventas & Reservas) — VERSIÓN MEJORADA
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Heading,
  Divider,
  Flex,
  Button,
  Select,
  Input,
  Textarea,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  useToast,
  Spinner,
  Badge,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  HStack,
  useColorModeValue,
  Tooltip,
  Text,
  Tag,
  TagLabel,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  FormLabel,
  FormControl,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@chakra-ui/react";
import {
  FaPlus,
  FaTrash,
  FaSave,
  FaSync,
  FaEdit,
  FaFilePdf,
  FaFileExcel,
  FaFileExport,
  FaTimes,
  FaArrowLeft,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { DownloadIcon } from "@chakra-ui/icons";

import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";

// =====================================================================
// ✨ Pedidos — con filtros, paginación, estados dinámicos y bugs corregidos
// =====================================================================

const ITEMS_PER_PAGE = 10;

export default function Pedidos() {
  const toast = useToast();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [estadosPedido, setEstadosPedido] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pedidoAEliminar, setPedidoAEliminar] = useState(null);
  const [editando, setEditando] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Export modal
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expCliente, setExpCliente] = useState("");
  const [expEstado, setExpEstado] = useState("");
  const [expDesde, setExpDesde] = useState("");
  const [expHasta, setExpHasta] = useState("");

  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const modalInputBg = useColorModeValue("white", "gray.600");

  const [idCliente, setIdCliente] = useState("");
  const [fechaReserva, setFechaReserva] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [idEstadoPedido, setIdEstadoPedido] = useState(1);

  const [productosPedido, setProductosPedido] = useState([]);

  // Filtros de la tabla
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  // ── Multi-usuario: leer email y rol del usuario autenticado ──
  const userEmail = localStorage.getItem("userEmail") || "";
  const userRol = (localStorage.getItem("userRol") || "").trim().toLowerCase();
  const esAdmin = userRol === "administrador" || userRol === "admin" || userRol === "todos";

  // Estilos
  const bgMain = useColorModeValue("gray.100", "gray.900");
  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const tableHeader = useColorModeValue("teal.100", "teal.700");
  const inputBg = useColorModeValue("gray.50", "gray.700");
  const shadow = useColorModeValue("xl", "dark-lg");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const tealHeaderBg = useColorModeValue("teal.500", "teal.700");
  const emptyTextColor = useColorModeValue("gray.400", "gray.500");
  const labelColor = useColorModeValue("gray.500", "gray.300");

  const formatearL = (n) =>
    `L. ${Number(n || 0).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // ============================================================
  // 📡 Cargar catálogos
  // ============================================================
  const cargarCatalogos = useCallback(async () => {
    try {
      const [clientesRes, productosRes, pedidosRes, estadosRes] = await Promise.all([
        api.get("/ventas/ventasyreserva/clientes"),
        api.get("/produccion/productos"),
        api.get("/ventas/ventasyreserva/pedidos"),
        api.get("/ventas/ventasyreserva/estados-pedido"),
      ]);

      setClientes(clientesRes.data || []);
      setProductos(productosRes.data || []);
      setPedidos(pedidosRes.data || []);
      setEstadosPedido(estadosRes.data || []);
    } catch (err) {
      console.error("❌ Error cargando catálogos:", err);
      toast({
        title: "Error cargando datos",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  const buscarProducto = (idProducto) =>
    productos.find((p) => p.id_producto === Number(idProducto));

  // ============================================================
  // 🔹 Filtrado + Paginación
  // ============================================================
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const matchCliente = filtroCliente
        ? p.nombre_cliente?.toLowerCase().includes(filtroCliente.toLowerCase())
        : true;
      const matchEstado = filtroEstado
        ? p.estado_pedido === filtroEstado
        : true;
      return matchCliente && matchEstado;
    });
  }, [pedidos, filtroCliente, filtroEstado]);

  const totalPaginas = Math.ceil(pedidosFiltrados.length / ITEMS_PER_PAGE);

  const pedidosPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_PER_PAGE;
    return pedidosFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [pedidosFiltrados, paginaActual]);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroCliente, filtroEstado]);

  // ============================================================
  // 🔹 Añadir productos al pedido
  // ============================================================
  const agregarProducto = () =>
    setProductosPedido((prev) => [
      ...prev,
      {
        id_producto: "",
        cantidad: 1,
      },
    ]);

  const eliminarProducto = (i) => {
    const prod = buscarProducto(productosPedido[i]?.id_producto);
    const nombre = prod ? prod.nombre_producto : `Línea ${i + 1}`;
    if (window.confirm(`¿Desea eliminar "${nombre}" del pedido?`)) {
      setProductosPedido((prev) => prev.filter((_, idx) => idx !== i));
    }
  };

  const actualizarProducto = (i, campo, valor) => {
    const nuevos = [...productosPedido];
    nuevos[i][campo] = valor;
    setProductosPedido(nuevos);
  };

  // ============================================================
  // 🔹 Validaciones
  // ============================================================
  const validarPedido = () => {
    if (!idCliente) {
      toast({ title: "Seleccione un cliente", status: "warning" });
      return false;
    }

    if (!fechaReserva || !fechaEntrega) {
      toast({
        title: "Fechas requeridas",
        description: "Debe ingresar fecha de reserva y fecha de entrega",
        status: "warning",
      });
      return false;
    }

    if (new Date(fechaEntrega) < new Date(fechaReserva)) {
      toast({
        title: "Fechas inválidas",
        description: "La entrega no puede ser antes de la reserva.",
        status: "error",
      });
      return false;
    }

    if (productosPedido.length === 0) {
      toast({
        title: "Debe agregar productos",
        status: "warning",
      });
      return false;
    }

    const invalidos = productosPedido.some(
      (p) => !p.id_producto || Number(p.cantidad) <= 0
    );
    if (invalidos) {
      toast({
        title: "Detalle incompleto",
        description: "Debe seleccionar producto y cantidad > 0",
        status: "warning",
      });
      return false;
    }

    return true;
  };

  // ============================================================
  // 🔹 Guardar pedido
  // ============================================================
  const guardarPedido = async () => {
    try {
      if (!validarPedido()) return;
      setIsSaving(true);

      const payload = {
        id_cliente: Number(idCliente),
        fecha_reserva: fechaReserva,
        fecha_entrega: fechaEntrega,
        observaciones,
        id_metodo_pago: 1,
        id_estado_pedido: Number(idEstadoPedido),
        productos: productosPedido.map((p) => ({
          id_producto: Number(p.id_producto),
          cantidad: Number(p.cantidad),
        })),
      };

      if (editando && pedidoSeleccionado) {
        await api.put(
          `/ventas/ventasyreserva/pedidos/${pedidoSeleccionado.id_pedido}`,
          payload
        );
        toast({ title: "Pedido actualizado", status: "success" });
      } else {
        await api.post("/ventas/ventasyreserva/pedidos", payload);
        toast({ title: "Pedido creado", status: "success" });
      }

      cancelarEdicion();
      cargarCatalogos();
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      toast({
        title: "Error guardando pedido",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // 🔹 Cargar pedido para edición
  // ============================================================
  const seleccionarPedido = async (pedido) => {
    try {
      const res = await api.get(
        `/ventas/ventasyreserva/pedidos/${pedido.id_pedido}`
      );

      const { pedido: cab, detalle } = res.data;

      setIdCliente(cab.id_cliente);
      setFechaReserva(cab.fecha_reserva?.substring(0, 10));
      setFechaEntrega(cab.fecha_entrega?.substring(0, 10));
      setObservaciones(cab.observaciones || "");
      setIdEstadoPedido(cab.id_estado_pedido || 1);

      setProductosPedido(
        detalle.map((d) => ({
          id_producto: d.id_producto,
          cantidad: Number(d.cantidad),
        }))
      );

      setEditando(true);
      setPedidoSeleccionado(pedido);

      // Scroll al formulario
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("❌ Error al cargar pedido:", err);
      toast({
        title: "Error cargando pedido",
        description: err.message,
        status: "error",
      });
    }
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setPedidoSeleccionado(null);
    setProductosPedido([]);
    setIdCliente("");
    setFechaEntrega("");
    setFechaReserva("");
    setObservaciones("");
    setIdEstadoPedido(1);
  };

  // ============================================================
  // 🔹 Eliminar pedido
  // ============================================================
  const confirmarEliminar = (pedido) => {
    setPedidoAEliminar(pedido);
    onOpen();
  };

  const eliminarPedido = async () => {
    try {
      await api.delete(
        `/ventas/ventasyreserva/pedidos/${pedidoAEliminar.id_pedido}`
      );
      toast({ title: "Pedido eliminado", status: "info" });
      onClose();
      cargarCatalogos();
    } catch (err) {
      console.error("❌ Error al eliminar pedido:", err);
      toast({
        title: "Error al eliminar",
        description: err.message,
        status: "error",
      });
    }
  };

  // ============================================================
  // 📄 Exportación individual (per-row) — sin cambios
  // ============================================================
  const exportarPDFIndividual = async (pedido) => {
    try {
      const doc = new jsPDF();
      doc.addImage(logo, "PNG", 15, 10, 25, 15);
      doc.setFontSize(16);
      doc.text("EXTRACTUS - Detalle de Pedido", 105, 20, { align: "center" });

      const res = await api.get(`/ventas/ventasyreserva/pedidos/${pedido.id_pedido}`);
      const enc = res.data.pedido;
      const detalle = res.data.detalle;

      doc.setFontSize(12);
      doc.text(`Pedido #${enc.id_pedido}`, 14, 40);
      doc.text(`Cliente: ${enc.nombre_cliente}`, 14, 46);
      doc.text(`Reserva: ${enc.fecha_reserva?.substring(0, 10)}`, 14, 52);
      doc.text(`Entrega: ${enc.fecha_entrega?.substring(0, 10)}`, 14, 58);

      autoTable(doc, {
        startY: 68,
        head: [["Producto", "Unidad", "Cantidad", "Precio Unitario", "Subtotal"]],
        body: detalle.map(d => [
          d.nombre_producto, d.unidad_medida, d.cantidad,
          formatearL(d.precio_unitario), formatearL(d.subtotal),
        ]),
        headStyles: { fillColor: [0, 128, 128] },
      });

      const total = detalle.reduce((acc, d) => acc + Number(d.subtotal), 0);
      doc.text(`Total: ${formatearL(total)}`, 160, doc.lastAutoTable.finalY + 10);
      doc.save(`Pedido_${pedido.id_pedido}.pdf`);
    } catch (err) {
      toast({ title: "Error exportando PDF", description: err.message, status: "error" });
    }
  };

  const exportarExcelIndividual = async (pedido) => {
    try {
      const res = await api.get(`/ventas/ventasyreserva/pedidos/${pedido.id_pedido}`);
      const wb = new ExcelJS.Workbook();
      wb.creator = "Extractus ERP";
      wb.created = new Date();
      const ws = wb.addWorksheet(`Pedido_${pedido.id_pedido}`);

      // Título profesional
      ws.mergeCells("A1:E1");
      const titleCell = ws.getCell("A1");
      titleCell.value = `Detalle de Pedido #${pedido.id_pedido} — Extractus`;
      titleCell.font = { bold: true, size: 14, color: { argb: "FF008080" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells("A2:E2");
      const infoCell = ws.getCell("A2");
      infoCell.value = `Cliente: ${pedido.nombre_cliente || "—"}  |  Generado: ${new Date().toLocaleString()}`;
      infoCell.font = { size: 9, italic: true, color: { argb: "FF666666" } };
      infoCell.alignment = { horizontal: "center" };

      // Encabezados con formato
      const headers = ["Producto", "Unidad", "Cantidad", "Precio Unitario", "Subtotal"];
      headers.forEach((h, i) => {
        const cell = ws.getCell(4, i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF008080" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Datos
      res.data.detalle.forEach((d, idx) => {
        const row = 5 + idx;
        ws.getCell(row, 1).value = d.nombre_producto;
        ws.getCell(row, 2).value = d.unidad_medida;
        ws.getCell(row, 3).value = Number(d.cantidad);
        ws.getCell(row, 4).value = Number(d.precio_unitario);
        ws.getCell(row, 5).value = Number(d.subtotal);
        if (idx % 2 === 1) {
          for (let i = 1; i <= 5; i++) {
            ws.getCell(row, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2F1" } };
          }
        }
      });

      // Auto-width
      [20, 14, 12, 16, 16].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Pedido_${pedido.id_pedido}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500 });
    } catch (err) {
      toast({ title: "Error exportando Excel", description: err.message, status: "error" });
    }
  };

  // ============================================================
  // 🔧 Helpers de exportación masiva
  // ============================================================
  const buildFilterText = (f = {}) => {
    const parts = [];
    if (f.cliente) parts.push(`Cliente: ${f.cliente}`);
    if (f.estado) parts.push(`Estado: ${f.estado}`);
    if (f.desde) parts.push(`Desde: ${f.desde}`);
    if (f.hasta) parts.push(`Hasta: ${f.hasta}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredExportData = (f = {}) => {
    let data = [...pedidos];
    if (f.cliente) {
      const q = f.cliente.toLowerCase();
      data = data.filter(p => (p.nombre_cliente || "").toLowerCase().includes(q));
    }
    if (f.estado) {
      data = data.filter(p => p.estado_pedido === f.estado);
    }
    if (f.desde) {
      data = data.filter(p => p.fecha_reserva && p.fecha_reserva.substring(0, 10) >= f.desde);
    }
    if (f.hasta) {
      data = data.filter(p => p.fecha_entrega && p.fecha_entrega.substring(0, 10) <= f.hasta);
    }
    return data;
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
  // 📤 Exportar PDF masivo — Estilo profesional
  // ============================================================
  const exportarPDFMasivo = async (filters = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredExportData(filters);
      if (rows.length === 0) {
        toast({ title: "No hay pedidos para exportar", status: "warning", duration: 3000 });
        return;
      }

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;

      try {
        const dataURL = await imgToDataURL(logo);
        doc.addImage(dataURL, "PNG", 40, 20, 45, 45);
      } catch (e) { /* sin logo */ }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(25, 55, 80);
      doc.text("REPORTE DE PEDIDOS", pageWidth / 2, 45, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 62, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(filters)}`, pageWidth / 2, 78, { align: "center" });

      doc.setDrawColor(0, 128, 128);
      doc.setLineWidth(1);
      doc.line(40, 90, pageWidth - 40, 90);

      const tableData = rows.map(p => [
        p.id_pedido,
        p.nombre_cliente || "",
        p.creado_por || "—",
        p.fecha_reserva?.substring(0, 10) || "",
        p.fecha_entrega?.substring(0, 10) || "",
        p.estado_pedido || "",
        formatearL(p.total),
      ]);

      autoTable(doc, {
        startY: 105,
        head: [["ID", "Cliente", "Vendedor", "F. Reserva", "F. Entrega", "Estado", "Total"]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
        headStyles: { fillColor: [0, 128, 128], textColor: 255, fontStyle: "bold" },
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
      doc.text(`Total de pedidos: ${rows.length}`, 50, y); y += 16;
      const totalVentas = rows.reduce((a, p) => a + Number(p.total || 0), 0);
      doc.text(`Monto total: ${formatearL(totalVentas)}`, 50, y);

      doc.save(`Pedidos_Extractus_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500 });
    } catch (err) {
      toast({ title: "Error al generar PDF", description: err.message, status: "error" });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // 📊 Exportar Excel masivo — Estilo profesional
  // ============================================================
  const exportarExcelMasivo = async (filters = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredExportData(filters);
      if (rows.length === 0) {
        toast({ title: "No hay pedidos para exportar", status: "warning", duration: 3000 });
        return;
      }

      const wb = new ExcelJS.Workbook();
      wb.creator = "Extractus ERP";
      wb.created = new Date();
      const ws = wb.addWorksheet("Pedidos");

      ws.mergeCells("A1:G1");
      const titleCell = ws.getCell("A1");
      titleCell.value = "Reporte de Pedidos — Extractus";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF008080" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells("A2:G2");
      const filterCell = ws.getCell("A2");
      filterCell.value = `Filtros: ${buildFilterText(filters)}  |  Generado: ${new Date().toLocaleString()}`;
      filterCell.font = { size: 9, italic: true, color: { argb: "FF666666" } };
      filterCell.alignment = { horizontal: "center" };

      const columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Cliente", key: "cliente", width: 25 },
        { header: "Vendedor", key: "vendedor", width: 22 },
        { header: "F. Reserva", key: "reserva", width: 14 },
        { header: "F. Entrega", key: "entrega", width: 14 },
        { header: "Estado", key: "estado", width: 14 },
        { header: "Total", key: "total", width: 16 },
      ];

      const headerRow = 4;
      columns.forEach((col, i) => {
        const cell = ws.getCell(headerRow, i + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF008080" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { bottom: { style: "thin", color: { argb: "FF006666" } } };
      });

      rows.forEach((p, idx) => {
        const rowNum = headerRow + 1 + idx;
        const values = [
          p.id_pedido,
          p.nombre_cliente || "",
          p.creado_por || "—",
          p.fecha_reserva?.substring(0, 10) || "",
          p.fecha_entrega?.substring(0, 10) || "",
          p.estado_pedido || "",
          Number(p.total || 0),
        ];
        values.forEach((v, i) => { ws.getCell(rowNum, i + 1).value = v; });
        if (idx % 2 === 1) {
          for (let i = 1; i <= columns.length; i++) {
            ws.getCell(rowNum, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2F1" } };
          }
        }
      });

      columns.forEach((col, i) => {
        let maxLen = col.header.length;
        rows.forEach(p => {
          const vals = [p.id_pedido, p.nombre_cliente, p.creado_por, p.fecha_reserva?.substring(0, 10), p.fecha_entrega?.substring(0, 10), p.estado_pedido, String(p.total)];
          const v = String(vals[i] ?? "");
          if (v.length > maxLen) maxLen = v.length;
        });
        ws.getColumn(i + 1).width = Math.min(Math.max(col.width, maxLen + 2), 50);
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Pedidos_Extractus_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500 });
    } catch (err) {
      toast({ title: "Error al generar Excel", description: err.message, status: "error" });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // Helpers de badge color por estado
  // ============================================================
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

  // ============================================================
  // Loader
  // ============================================================
  if (loading)
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="xl" color="teal.400" />
      </Flex>
    );

  // ============================================================
  // 🎨 UI PRINCIPAL
  // ============================================================
  return (
    <Box bg={bgMain} minH="100vh" color={textColor}>
      {/* Barra Superior */}
      <Flex
        justify="space-between"
        align="center"
        px={6}
        py={4}
        bg={tealHeaderBg}
        color="white"
      >
        <HStack spacing={3}>
          <Tooltip label="Volver al menú de Ventas">
            <IconButton
              icon={<FaArrowLeft />}
              colorScheme="whiteAlpha"
              variant="ghost"
              onClick={() => navigate("/app/ventas")}
            />
          </Tooltip>
          <Heading size="md">📦 Gestión de Pedidos</Heading>
        </HStack>

        <HStack spacing={3}>
          <Button
            leftIcon={<FaFileExport />}
            colorScheme="whiteAlpha"
            onClick={() => {
              setExpCliente(""); setExpEstado(""); setExpDesde(""); setExpHasta("");
              setExportFormat("excel");
              exportModal.onOpen();
            }}
            isDisabled={exporting}
          >
            Exportar
          </Button>
        </HStack>
      </Flex>

      {/* ============================ */}
      {/* Formulario del Pedido        */}
      {/* ============================ */}
      <Box p={6}>
        <Box bg={bgCard} p={6} borderRadius="2xl" boxShadow={shadow} mb={10}>
          <Heading size="md" mb={4} color="teal.400">
            {editando ? `✏️ Editar Pedido #${pedidoSeleccionado?.id_pedido}` : "🆕 Nuevo Pedido"}
          </Heading>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
            {/* Cliente */}
            <FormControl>
              <FormLabel fontSize="xs" color={labelColor} mb={1}>Cliente</FormLabel>
              <Select
                placeholder="Seleccione Cliente"
                value={idCliente}
                onChange={(e) => setIdCliente(e.target.value)}
                bg={inputBg}
                size="sm"
              >
                {clientes.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.nombre_cliente}
                  </option>
                ))}
              </Select>
            </FormControl>

            {/* Fecha Reserva */}
            <FormControl>
              <FormLabel fontSize="xs" color={labelColor} mb={1}>Fecha de Reserva</FormLabel>
              <Input
                type="date"
                value={fechaReserva}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFechaReserva(e.target.value)}
                bg={inputBg}
                size="sm"
              />
            </FormControl>

            {/* Fecha Entrega */}
            <FormControl>
              <FormLabel fontSize="xs" color={labelColor} mb={1}>Fecha de Entrega</FormLabel>
              <Input
                type="date"
                value={fechaEntrega}
                min={fechaReserva} // Validación nativa extra
                onChange={(e) => setFechaEntrega(e.target.value)}
                bg={inputBg}
                size="sm"
              />
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
            {/* Observaciones */}
            <FormControl>
              <FormLabel fontSize="xs" color={labelColor} mb={1}>Observaciones</FormLabel>
              <Textarea
                placeholder="Observaciones (opcional)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                bg={inputBg}
                size="sm"
                rows={2}
              />
            </FormControl>

            {/* Estado — solo visible al editar */}
            {editando && (
              <FormControl>
                <FormLabel fontSize="xs" color="gray.500" mb={1}>Estado del Pedido</FormLabel>
                <Select
                  value={idEstadoPedido}
                  onChange={(e) => setIdEstadoPedido(e.target.value)}
                  bg={inputBg}
                  size="sm"
                >
                  {estadosPedido.length > 0
                    ? estadosPedido.map((e) => (
                      <option key={e.id_estado_pedido} value={e.id_estado_pedido}>
                        {e.nombre}
                      </option>
                    ))
                    : <option value={1}>Pendiente</option>
                  }
                </Select>
              </FormControl>
            )}
          </SimpleGrid>

          <Divider mb={3} />

          {/* ============================ */}
          {/* DETALLE                      */}
          {/* ============================ */}
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="bold" color="teal.400">
              Detalle del Pedido
            </Text>

            <Button
              leftIcon={<FaPlus />}
              size="sm"
              colorScheme="teal"
              onClick={agregarProducto}
            >
              Agregar Producto
            </Button>
          </Flex>

          {/* Tabla de Detalle */}
          <Box
            overflowX="auto"
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="lg"
            mb={4}
          >
            <Table size="sm" variant="striped" colorScheme="teal">
              <Thead bg={tableHeader}>
                <Tr>
                  <Th>Producto</Th>
                  <Th textAlign="center">Cantidad</Th>
                  <Th textAlign="center">Precio</Th>
                  <Th textAlign="center">Subtotal</Th>
                  <Th></Th>
                </Tr>
              </Thead>

              <Tbody>
                {productosPedido.length === 0 ? (
                  <Tr>
                    <Td colSpan={5} textAlign="center" py={6} color={emptyTextColor}>
                      Sin productos — haz clic en "Agregar Producto"
                    </Td>
                  </Tr>
                ) : (
                  productosPedido.map((p, i) => {
                    const prod = buscarProducto(p.id_producto);

                    return (
                      <Tr key={i}>
                        {/* Producto */}
                        <Td>
                          <Select
                            placeholder="Seleccione producto"
                            value={p.id_producto}
                            onChange={(e) =>
                              actualizarProducto(i, "id_producto", e.target.value)
                            }
                            bg={inputBg}
                            size="sm"
                          >
                            {productos.map((prod) => (
                              <option
                                key={prod.id_producto}
                                value={prod.id_producto}
                              >
                                {prod.nombre_producto}{" "}
                                {prod.unidad_medida
                                  ? `(${prod.unidad_medida})`
                                  : ""}
                              </option>
                            ))}
                          </Select>
                        </Td>

                        {/* Cantidad */}
                        <Td textAlign="center">
                          <Input
                            type="number"
                            min="1"
                            max="9999"
                            value={p.cantidad}
                            onChange={(e) => {
                              const val = Math.min(Math.max(1, Number(e.target.value)), 9999);
                              actualizarProducto(i, "cantidad", val);
                            }}
                            bg={inputBg}
                            size="sm"
                            w="80px"
                          />
                        </Td>

                        {/* Precio */}
                        <Td textAlign="center">
                          {prod ? formatearL(prod.precio_unitario) : "—"}
                        </Td>

                        {/* Subtotal */}
                        <Td textAlign="center">
                          {prod
                            ? formatearL(
                              Number(prod.precio_unitario) *
                              Number(p.cantidad || 0)
                            )
                            : "—"}
                        </Td>

                        {/* Acciones */}
                        <Td>
                          <IconButton
                            icon={<FaTrash />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => eliminarProducto(i)}
                          />
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </Box>

          {/* Total + Acciones */}
          <Flex justify="space-between" align="center">
            <Tag size="lg" colorScheme="teal" borderRadius="full" px={6}>
              <TagLabel fontSize="xl" fontWeight="bold">
                Total:{" "}
                {formatearL(
                  productosPedido.reduce((acc, p) => {
                    const prod = buscarProducto(p.id_producto);
                    return (
                      acc +
                      (prod
                        ? Number(prod.precio_unitario) *
                        Number(p.cantidad || 0)
                        : 0)
                    );
                  }, 0)
                )}
              </TagLabel>
            </Tag>

            <HStack spacing={3}>
              <Button
                leftIcon={<FaSave />}
                colorScheme="green"
                onClick={guardarPedido}
                isLoading={isSaving}
                loadingText="Guardando..."
              >
                {editando ? "Actualizar" : "Guardar"}
              </Button>

              {editando && (
                <Button
                  leftIcon={<FaTimes />}
                  colorScheme="gray"
                  onClick={cancelarEdicion}
                >
                  Cancelar
                </Button>
              )}

              <Button leftIcon={<FaSync />} variant="outline" onClick={cargarCatalogos}>
                Refrescar
              </Button>
            </HStack>
          </Flex>
        </Box>

        {/* ============================ */}
        {/* TABLA DE PEDIDOS             */}
        {/* ============================ */}
        <Box bg={bgCard} p={6} borderRadius="2xl" boxShadow={shadow}>
          <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
            <Heading size="md" color="teal.400">
              Pedidos Registrados
            </Heading>

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
                {estadosPedido.map((e) => (
                  <option key={e.id_estado_pedido} value={e.nombre}>
                    {e.nombre}
                  </option>
                ))}
              </Select>

              {(filtroCliente || filtroEstado) && (
                <Tooltip label="Limpiar filtros">
                  <IconButton
                    icon={<FaTimes />}
                    size="sm"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={() => { setFiltroCliente(""); setFiltroEstado(""); }}
                  />
                </Tooltip>
              )}
            </HStack>
          </Flex>

          <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
            <Table size="sm" variant="simple">
              <Thead bg={tableHeader}>
                <Tr>
                  <Th>ID</Th>
                  <Th>Cliente</Th>
                  {esAdmin && <Th>Vendedor</Th>}
                  <Th>F. Reserva</Th>
                  <Th>F. Entrega</Th>
                  <Th>Estado</Th>
                  <Th textAlign="right">Total</Th>
                  <Th textAlign="center">Acciones</Th>
                </Tr>
              </Thead>

              <Tbody>
                {pedidosPagina.length === 0 ? (
                  <Tr>
                    <Td colSpan={esAdmin ? 8 : 7} textAlign="center" py={10} color={emptyTextColor}>
                      {filtroCliente || filtroEstado
                        ? "No se encontraron pedidos con los filtros aplicados."
                        : "No hay pedidos registrados aún."}
                    </Td>
                  </Tr>
                ) : (
                  pedidosPagina.map((p) => (
                    <Tr key={p.id_pedido}>
                      <Td fontWeight="bold">{p.id_pedido}</Td>
                      <Td>{p.nombre_cliente}</Td>
                      {esAdmin && (
                        <Td fontSize="xs" color="gray.500">
                          {p.creado_por || "—"}
                        </Td>
                      )}
                      <Td>{p.fecha_reserva?.substring(0, 10)}</Td>
                      <Td>{p.fecha_entrega?.substring(0, 10)}</Td>

                      <Td>
                        {/* Bug #3 corregido: campo correcto es estado_pedido */}
                        <Badge colorScheme={colorPorEstado(p.estado_pedido)}>
                          {p.estado_pedido || "Desconocido"}
                        </Badge>
                      </Td>

                      <Td textAlign="right" fontFamily="monospace">
                        {formatearL(p.total)}
                      </Td>

                      <Td textAlign="center">
                        <HStack justify="center" spacing={1}>
                          <Tooltip label="Editar">
                            <IconButton
                              icon={<FaEdit />}
                              size="sm"
                              colorScheme="blue"
                              onClick={() => seleccionarPedido(p)}
                            />
                          </Tooltip>

                          {/* Solo admin puede eliminar cualquier pedido;
                              un vendedor solo puede eliminar los suyos */}
                          {(esAdmin || p.creado_por?.toLowerCase() === userEmail.toLowerCase()) && (
                            <Tooltip label="Eliminar">
                              <IconButton
                                icon={<FaTrash />}
                                size="sm"
                                colorScheme="red"
                                onClick={() => confirmarEliminar(p)}
                              />
                            </Tooltip>
                          )}

                          <Tooltip label="PDF">
                            <IconButton
                              icon={<FaFilePdf />}
                              size="sm"
                              colorScheme="red"
                              onClick={() => exportarPDFIndividual(p)}
                            />
                          </Tooltip>

                          <Tooltip label="Excel">
                            <IconButton
                              icon={<FaFileExcel />}
                              size="sm"
                              colorScheme="green"
                              onClick={() => exportarExcelIndividual(p)}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <Flex justify="space-between" align="center" mt={4}>
              <Text fontSize="sm" color="gray.500">
                Mostrando {Math.min((paginaActual - 1) * ITEMS_PER_PAGE + 1, pedidosFiltrados.length)}
                –{Math.min(paginaActual * ITEMS_PER_PAGE, pedidosFiltrados.length)} de {pedidosFiltrados.length} pedidos
              </Text>
              <HStack spacing={2}>
                <IconButton
                  icon={<FaChevronLeft />}
                  size="sm"
                  isDisabled={paginaActual === 1}
                  onClick={() => setPaginaActual((p) => p - 1)}
                  aria-label="Página anterior"
                />
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPaginas || Math.abs(n - paginaActual) <= 1)
                  .reduce((acc, n, i, arr) => {
                    if (i > 0 && n - arr[i - 1] > 1) acc.push("...");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <Text key={`dots-${idx}`} px={2} color="gray.400">…</Text>
                    ) : (
                      <Button
                        key={item}
                        size="sm"
                        colorScheme={paginaActual === item ? "teal" : "gray"}
                        variant={paginaActual === item ? "solid" : "outline"}
                        onClick={() => setPaginaActual(item)}
                      >
                        {item}
                      </Button>
                    )
                  )}
                <IconButton
                  icon={<FaChevronRight />}
                  size="sm"
                  isDisabled={paginaActual === totalPaginas}
                  onClick={() => setPaginaActual((p) => p + 1)}
                  aria-label="Página siguiente"
                />
              </HStack>
            </Flex>
          )}
        </Box>
      </Box>

      {/* Modal eliminar */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg={bgCard}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="teal.500">
              Eliminar Pedido
            </AlertDialogHeader>

            <AlertDialogBody>
              ¿Seguro que deseas eliminar el pedido #
              {pedidoAEliminar?.id_pedido}? Esta acción no se puede deshacer.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancelar
              </Button>
              <Button colorScheme="red" onClick={eliminarPedido} ml={3}>
                Eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Pedidos</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
              Sin filtros se exportarán todos los pedidos.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato</FormLabel>
              <Select value={exportFormat} onChange={e => setExportFormat(e.target.value)} bg={modalInputBg}>
                <option value="excel">📊 Excel (.xlsx)</option>
                <option value="pdf">📄 PDF (.pdf)</option>
              </Select>
            </FormControl>

            <Divider my={4} />

            <Text fontWeight="bold" mb={3} color="teal.400">Filtros de exportación</Text>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por cliente</FormLabel>
              <Input placeholder="Ej: Juan Perez" value={expCliente} onChange={e => setExpCliente(e.target.value)} size="sm" bg={modalInputBg} />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por estado</FormLabel>
              <Select placeholder="Todos los estados" value={expEstado} onChange={e => setExpEstado(e.target.value)} size="sm" bg={modalInputBg}>
                {estadosPedido.map(e => (
                  <option key={e.id_estado_pedido} value={e.nombre}>{e.nombre}</option>
                ))}
              </Select>
            </FormControl>

            <Flex gap={3}>
              <FormControl>
                <FormLabel fontSize="sm">Desde</FormLabel>
                <Input type="date" value={expDesde} onChange={e => setExpDesde(e.target.value)} size="sm" bg={modalInputBg} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Hasta</FormLabel>
                <Input type="date" value={expHasta} onChange={e => setExpHasta(e.target.value)} size="sm" bg={modalInputBg} />
              </FormControl>
            </Flex>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="teal"
              leftIcon={<DownloadIcon />}
              isLoading={exporting}
              loadingText="Generando..."
              onClick={async () => {
                const filters = {
                  cliente: expCliente || undefined,
                  estado: expEstado || undefined,
                  desde: expDesde || undefined,
                  hasta: expHasta || undefined,
                };
                if (exportFormat === "pdf") {
                  await exportarPDFMasivo(filters);
                } else {
                  await exportarExcelMasivo(filters);
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
