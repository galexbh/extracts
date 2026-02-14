// ============================================================
// 📁 src/components/Ventas/Pedidos.js
// 💎 ERP - Pedidos (Ventas & Reservas) — VERSIÓN CORREGIDA
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
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
} from "@chakra-ui/react";
import {
  FaPlus,
  FaTrash,
  FaSave,
  FaSync,
  FaEdit,
  FaFilePdf,
  FaFileExcel,
  FaTimes,
  FaArrowLeft,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";

// =====================================================================
// ✨ Pedidos — versión limpia, usando precios/unidades del BACKEND ✨
// =====================================================================

export default function Pedidos() {
  const toast = useToast();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pedidoAEliminar, setPedidoAEliminar] = useState(null);
  const [editando, setEditando] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  const [idCliente, setIdCliente] = useState("");
  const [fechaReserva, setFechaReserva] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Solo se envían estos campos al backend
  const [productosPedido, setProductosPedido] = useState([]);

  // Estilos
  const bgMain = useColorModeValue("gray.100", "gray.900");
  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const tableHeader = useColorModeValue("teal.100", "teal.700");
  const inputBg = useColorModeValue("gray.50", "gray.700");
  const shadow = useColorModeValue("xl", "dark-lg");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const tealHeaderBg = useColorModeValue("teal.500", "teal.700");

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
      const [clientesRes, productosRes, pedidosRes] = await Promise.all([
        api.get("/ventas/ventasyreserva/clientes"),
        api.get("/produccion/productos"), // 👈 YA CORREGIDO
        api.get("/ventas/ventasyreserva/pedidos"),
      ]);

      setClientes(clientesRes.data || []);
      setProductos(productosRes.data || []);
      setPedidos(pedidosRes.data || []);
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

  const eliminarProducto = (i) =>
    setProductosPedido((prev) => prev.filter((_, idx) => idx !== i));

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

      const payload = {
        id_cliente: Number(idCliente),
        fecha_reserva: fechaReserva,
        fecha_entrega: fechaEntrega,
        observaciones,
        id_metodo_pago: 1,
        id_estado_pedido: 1, // Pendiente
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

      setProductosPedido(
        detalle.map((d) => ({
          id_producto: d.id_producto,
          cantidad: Number(d.cantidad),
        }))
      );

      setEditando(true);
      setPedidoSeleccionado(pedido);
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
  // 📄 Exportación PDF / Excel
  // ============================================================
  const exportarPDF = async (pedido = null) => {
    try {
      const doc = new jsPDF();
      doc.addImage(logo, "PNG", 15, 10, 25, 15);
      doc.setFontSize(16);
      doc.text("EXTRACTUS - Detalle de Pedidos", 105, 20, {
        align: "center",
      });

      const renderPedido = (enc, detalle) => {
        const startY = doc.lastAutoTable
          ? doc.lastAutoTable.finalY + 20
          : 40;

        doc.setFontSize(12);
        doc.text(`Pedido #${enc.id_pedido}`, 14, startY);
        doc.text(`Cliente: ${enc.nombre_cliente}`, 14, startY + 6);
        doc.text(`Reserva: ${enc.fecha_reserva}`, 14, startY + 12);
        doc.text(`Entrega: ${enc.fecha_entrega}`, 14, startY + 18);

        autoTable(doc, {
          startY: startY + 28,
          head: [
            ["Producto", "Unidad", "Cantidad", "Precio Unitario", "Subtotal"],
          ],
          body: detalle.map((d) => [
            d.nombre_producto,
            d.unidad_medida,
            d.cantidad,
            formatearL(d.precio_unitario),
            formatearL(d.subtotal),
          ]),
          headStyles: { fillColor: [0, 128, 128] },
        });

        const total = detalle.reduce((acc, d) => acc + Number(d.subtotal), 0);
        doc.text(
          `Total: ${formatearL(total)}`,
          160,
          doc.lastAutoTable.finalY + 10
        );
      };

      if (pedido) {
        const res = await api.get(
          `/ventas/ventasyreserva/pedidos/${pedido.id_pedido}`
        );
        renderPedido(res.data.pedido, res.data.detalle);
        doc.save(`Pedido_${pedido.id_pedido}.pdf`);
        return;
      }

      for (const p of pedidos) {
        const res = await api.get(
          `/ventas/ventasyreserva/pedidos/${p.id_pedido}`
        );
        if (doc.lastAutoTable) doc.addPage();
        renderPedido(res.data.pedido, res.data.detalle);
      }

      doc.save("Pedidos_Completos.pdf");
    } catch (err) {
      toast({
        title: "Error exportando PDF",
        description: err.message,
        status: "error",
      });
    }
  };

  const exportarExcel = async (pedido = null) => {
    try {
      const wb = new ExcelJS.Workbook();

      if (pedido) {
        const res = await api.get(
          `/ventas/ventasyreserva/pedidos/${pedido.id_pedido}`
        );
        const ws = wb.addWorksheet(`Pedido_${pedido.id_pedido}`);

        ws.addRow([
          "Producto",
          "Unidad",
          "Cantidad",
          "Precio Unitario",
          "Subtotal",
        ]);

        res.data.detalle.forEach((d) =>
          ws.addRow([
            d.nombre_producto,
            d.unidad_medida,
            d.cantidad,
            d.precio_unitario,
            d.subtotal,
          ])
        );
      } else {
        const ws = wb.addWorksheet("Pedidos");

        ws.addRow(["ID", "Cliente", "Reserva", "Entrega", "Total"]);

        for (const p of pedidos) {
          const res = await api.get(
            `/ventas/ventasyreserva/pedidos/${p.id_pedido}`
          );

          const total = res.data.detalle.reduce(
            (acc, d) => acc + Number(d.subtotal),
            0
          );

          ws.addRow([
            p.id_pedido,
            p.nombre_cliente,
            p.fecha_reserva,
            p.fecha_entrega,
            total,
          ]);
        }
      }

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer]),
        pedido ? `Pedido_${pedido.id_pedido}.xlsx` : "Pedidos.xlsx"
      );
    } catch (err) {
      toast({
        title: "Error exportando Excel",
        description: err.message,
        status: "error",
      });
    }
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
            leftIcon={<FaFilePdf />}
            colorScheme="whiteAlpha"
            onClick={() => exportarPDF()}
          >
            Exportar PDF
          </Button>
          <Button
            leftIcon={<FaFileExcel />}
            colorScheme="whiteAlpha"
            onClick={() => exportarExcel()}
          >
            Exportar Excel
          </Button>
        </HStack>
      </Flex>

      {/* ============================ */}
      {/* Formulario del Pedido */}
      {/* ============================ */}
      <Box p={6}>
        <Box bg={bgCard} p={6} borderRadius="2xl" boxShadow={shadow} mb={10}>
          <Heading size="md" mb={4} color="teal.400">
            {editando ? "Editar Pedido" : "Nuevo Pedido"}
          </Heading>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
            {/* Cliente */}
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

            {/* Fechas */}
            <Input
              type="date"
              value={fechaReserva}
              onChange={(e) => setFechaReserva(e.target.value)}
              bg={inputBg}
              size="sm"
            />
            <Input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              bg={inputBg}
              size="sm"
            />
          </SimpleGrid>

          <Textarea
            placeholder="Observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            bg={inputBg}
            size="sm"
            mb={4}
          />

          <Divider mb={3} />

          {/* ============================ */}
          {/* DETALLE */}
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
                {productosPedido.map((p, i) => {
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
                          value={p.cantidad}
                          onChange={(e) =>
                            actualizarProducto(i, "cantidad", e.target.value)
                          }
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
                })}
              </Tbody>
            </Table>
          </Box>

          {/* Total */}
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
        {/* TABLA DE PEDIDOS */}
        {/* ============================ */}
        <Box bg={bgCard} p={6} borderRadius="2xl" boxShadow={shadow}>
          <Heading size="md" mb={4} color="teal.400">
            Pedidos Registrados
          </Heading>

          <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
            <Table size="sm" variant="simple">
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
                {pedidos.map((p) => (
                  <Tr key={p.id_pedido}>
                    <Td>{p.id_pedido}</Td>
                    <Td>{p.nombre_cliente}</Td>
                    <Td>{p.fecha_reserva}</Td>
                    <Td>{p.fecha_entrega}</Td>

                    <Td>
                      <Badge colorScheme="teal">
                        {p.nombre_estado || "Pendiente"}
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

                        <Tooltip label="Eliminar">
                          <IconButton
                            icon={<FaTrash />}
                            size="sm"
                            colorScheme="red"
                            onClick={() => confirmarEliminar(p)}
                          />
                        </Tooltip>

                        <Tooltip label="PDF">
                          <IconButton
                            icon={<FaFilePdf />}
                            size="sm"
                            colorScheme="red"
                            onClick={() => exportarPDF(p)}
                          />
                        </Tooltip>

                        <Tooltip label="Excel">
                          <IconButton
                            icon={<FaFileExcel />}
                            size="sm"
                            colorScheme="green"
                            onClick={() => exportarExcel(p)}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
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
              {pedidoAEliminar?.id_pedido}?
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
    </Box>
  );
}
