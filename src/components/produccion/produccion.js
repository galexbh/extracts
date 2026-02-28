// ============================================================
// 📁 src/components/Produccion/Produccion.js
// 🎨 Paleta UNIFORME con el sistema:
//    - Verde (green) = primario  → Sidebar usa green.50/100/600/700
//    - Teal          = acento    → Header avatar usa teal.500
//    - Fondos: white/gray.900, bordes: gray.200/gray.700
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
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

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
  // 🎨 Paleta idéntica a Sidebar + Header del sistema
  const pageBg = useColorModeValue("gray.50", "gray.900");   // igual que body
  const cardBg = useColorModeValue("white", "gray.900");   // igual que sidebar bg
  const cardBorder = useColorModeValue("gray.200", "gray.700");   // igual que sidebar border
  const headerBg = useColorModeValue("green.600", "green.700");  // green primario sistema
  const tableHdrBg = useColorModeValue("green.50", "gray.800");   // igual que hoverBg sidebar
  const rowHover = useColorModeValue("green.50", "gray.800");   // igual que hoverBg sidebar
  const activeColor = useColorModeValue("green.800", "white");      // igual que textActive sidebar
  const subtleText = useColorModeValue("gray.500", "gray.500");   // igual que textInactive sidebar
  const inputBg = useColorModeValue("gray.50", "gray.800");
  const modalBg = useColorModeValue("white", "gray.900");

  // Fondos de stats
  const statBg1 = useColorModeValue("green.50", "rgba(56,161,105,0.10)");
  const statBg2 = useColorModeValue("teal.50", "rgba(56,178,172,0.10)");
  const statBg3 = useColorModeValue("green.100", "rgba(56,161,105,0.15)");

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
    <Box bg={pageBg} minH="100vh" p={{ base: 3, md: 6 }}>

      {/* ── HEADER — verde primario del sistema ── */}
      <Box
        bg={headerBg}
        borderRadius="xl"
        p={{ base: 5, md: 6 }}
        mb={6}
        boxShadow="0 4px 20px rgba(56,161,105,0.20)"
      >
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <HStack spacing={4}>
            <Flex
              w={10}
              h={10}
              bg="whiteAlpha.200"
              borderRadius="lg"
              align="center"
              justify="center"
              flexShrink={0}
            >
              <Icon as={FaIndustry} color="white" boxSize={5} />
            </Flex>
            <Box>
              <Heading size="md" color="white" fontWeight="700">
                Módulo de Producción
              </Heading>
              <Text color="whiteAlpha.800" fontSize="xs" mt={0.5}>
                Gestión de órdenes y consumo de insumos
              </Text>
            </Box>
          </HStack>

          <HStack spacing={2}>
            <Button
              size="sm"
              variant="solid"
              bg="whiteAlpha.200"
              color="white"
              _hover={{ bg: "whiteAlpha.300" }}
              borderRadius="md"
              onClick={cargarPedidos}
            >
              Actualizar
            </Button>
            <Button
              leftIcon={<FaArrowLeft />}
              size="sm"
              variant="solid"
              bg="whiteAlpha.200"
              color="white"
              _hover={{ bg: "whiteAlpha.300" }}
              borderRadius="md"
              onClick={() => navigate("/app/produccion")}
            >
              Volver
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* ── MINI DASHBOARD — 3 tarjetas ── */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>

        {/* Total */}
        <Box
          bg={statBg1}
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
              <StatNumber fontSize="3xl" fontWeight="800" color="green.600">
                {total}
              </StatNumber>
              <StatHelpText fontSize="xs" color={subtleText}>Pendientes / en proceso</StatHelpText>
            </Stat>
            <Flex w={11} h={11} bg="green.100" borderRadius="lg" align="center" justify="center">
              <Icon as={FaBoxOpen} boxSize={5} color="green.600" />
            </Flex>
          </Flex>
        </Box>

        {/* En proceso */}
        <Box
          bg={statBg2}
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
              <StatNumber fontSize="3xl" fontWeight="800" color="teal.500">
                {enProceso}
              </StatNumber>
              <StatHelpText fontSize="xs" color={subtleText}>Órdenes iniciadas</StatHelpText>
            </Stat>
            <Flex w={11} h={11} bg="teal.100" borderRadius="lg" align="center" justify="center">
              <Icon as={FaClock} boxSize={5} color="teal.500" />
            </Flex>
          </Flex>
        </Box>

        {/* Finalizados */}
        <Box
          bg={statBg3}
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
              <StatNumber fontSize="3xl" fontWeight="800" color="green.700">
                {finalizados}
              </StatNumber>
              <StatHelpText fontSize="xs" color={subtleText}>Producción completada</StatHelpText>
            </Stat>
            <Flex w={11} h={11} bg="green.200" borderRadius="lg" align="center" justify="center">
              <Icon as={FaCheckCircle} boxSize={5} color="green.700" />
            </Flex>
          </Flex>
        </Box>
      </SimpleGrid>

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
          <Box bg={headerBg} px={5} py={4}>
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
              <Box bg={statBg1} borderRadius="lg" p={3}>
                <Text fontSize="xs" color={subtleText}>Fecha Reserva</Text>
                <Text fontWeight="600" fontSize="sm">{pedidoSeleccionado?.fecha_reserva || "—"}</Text>
              </Box>
              <Box bg={statBg2} borderRadius="lg" p={3}>
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
    </Box>
  );
}
