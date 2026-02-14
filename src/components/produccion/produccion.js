// ============================================================
// 📁 src/components/Produccion/Produccion.js
// 🎯 Versión final SIN usar produccion.tbl_insumos
//     Catálogo = inventario.tbl_inventario_insumo
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
} from "@chakra-ui/react";
import { FaPlay, FaStop, FaClipboardList } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";


// ============================================================
// 🔧 Normalizar pedidos duplicados por JOIN
// ============================================================
const normalizarPedidos = (lista) => {
  const mapa = new Map();
  lista.forEach((p) => {
    if (!mapa.has(p.id_pedido)) mapa.set(p.id_pedido, p);
  });
  return [...mapa.values()];
};


export default function Produccion() {
  // 🎨 Colores
  const bgPage = useColorModeValue("gray.50", "gray.900");
  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("teal.500", "teal.600");

  // 🔁 Estados
  const [pedidos, setPedidos] = useState([]);
  const [detalle, setDetalle] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  const [insumosCatalogo, setInsumosCatalogo] = useState([]);
  const [insumosUsados, setInsumosUsados] = useState([]);
  const [comentariosInsumos, setComentariosInsumos] = useState("");

  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const detalleModal = useDisclosure();
  const insumosModal = useDisclosure();


  // ============================================================
  // 📡 Cargar pedidos pendientes
  // ============================================================
  const cargarPedidos = useCallback(async () => {
    try {
      const res = await api.get("/produccion/pedidos-pendientes");
      setPedidos(normalizarPedidos(res.data || []));
    } catch (err) {
      toast({
        title: "Error cargando pedidos",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarPedidos();
  }, [cargarPedidos]);


  // ============================================================
  // 📋 Ver detalle del pedido
  // ============================================================
  const verDetalle = async (pedido) => {
    try {
      setPedidoSeleccionado(pedido);
      const res = await api.get(`/produccion/pedidos/${pedido.id_pedido}/detalle`);
      setDetalle(res.data || []);
      detalleModal.onOpen();
    } catch (err) {
      toast({
        title: "Error obteniendo detalle",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };


  // ============================================================
  // ▶️ Iniciar producción
  // ============================================================
  const iniciarProduccion = async (pedido) => {
    try {
      const res = await api.post(`/produccion/ordenes/iniciar/${pedido.id_pedido}`);

      toast({
        title: "Producción iniciada",
        description: res.data?.message,
        status: "success",
      });

      cargarPedidos();
    } catch (err) {
      toast({
        title: "Error iniciando producción",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };


  // ============================================================
  // 🧪 Abrir modal de insumos usados
  // ============================================================
  const prepararInsumos = async () => {
    try {
      // ⚠️ AQUÍ SE USA SOLO INVENTARIO, NO PRODUCCIÓN
      const res = await api.get("/inventario/inventario-insumos");


      setInsumosCatalogo(
        res.data.filter((i) => i.id_insumo && i.nombre_insumo)
      );

      setInsumosUsados([
        { filaId: 1, id_insumo: "", cantidad_usada: "" },
      ]);
    } catch (err) {
      toast({
        title: "Error cargando inventario",
        description: err.message,
        status: "error",
      });
    }
  };


  const finalizarProduccion = async (pedido) => {
    setPedidoSeleccionado(pedido);
    await prepararInsumos();
    insumosModal.onOpen();
  };


  const agregarFilaInsumo = () => {
    setInsumosUsados((prev) => [
      ...prev,
      {
        filaId: prev.length ? prev[prev.length - 1].filaId + 1 : 1,
        id_insumo: "",
        cantidad_usada: "",
      },
    ]);
  };


  const actualizarInsumo = (filaId, campo, valor) => {
    setInsumosUsados((prev) =>
      prev.map((f) => (f.filaId === filaId ? { ...f, [campo]: valor } : f))
    );
  };


  // ============================================================
  // 💾 Guardar consumo de insumos
  // ============================================================
  const guardarInsumos = async () => {
    const insumosValidos = insumosUsados.filter((i) => {
  const valor = Number(i.cantidad_usada);

  return (
    i.id_insumo &&
    i.cantidad_usada !== "" &&
    !isNaN(valor) &&
    valor > 0
  );
});



    if (insumosValidos.length === 0) {
      return toast({
        title: "Agrega insumos",
        description: "Debes agregar al menos 1 insumo.",
        status: "warning",
      });
    }

   try {
  console.log("📦 Enviando insumos al backend:", insumosValidos);
  console.log("📩 Cuerpo completo enviado:", {
    insumos: insumosValidos.map((i) => ({
      id_insumo: i.id_insumo,
      cantidad_utilizada: Number(i.cantidad_usada),
    })),
    comentarios: comentariosInsumos || null,
  });

  await api.post(
    `/produccion/ordenes/${pedidoSeleccionado.id_orden}/insumos`,
    {
      insumos: insumosValidos.map((i) => ({
        id_insumo: i.id_insumo,
        cantidad_utilizada: Number(i.cantidad_usada),
      })),
      comentarios: comentariosInsumos || null,
    }
  );


      toast({
        title: "Producción finalizada",
        status: "success",
      });

      insumosModal.onClose();
      cargarPedidos();
    } catch (err) {
      toast({
        title: "Error guardando insumos",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };


  // ============================================================
  // Loader inicial
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="xl" color="teal.400" />
      </Flex>
    );
  }


  // ============================================================
  // UI PRINCIPAL
  // ============================================================
  return (
    <Box bg={bgPage} minH="100vh" p={6}>
      <Box bg={headerBg} color="white" px={6} py={4} borderRadius="2xl" mb={6}>
        <Heading size="md">🏭 Módulo de Producción</Heading>
        <Text fontSize="sm" opacity={0.8}>
          Gestiona pedidos y registra consumo real de insumos.
        </Text>
      </Box>

      {/* TABLA */}
      <Box bg={bgCard} p={5} borderRadius="2xl" borderWidth="1px" borderColor={borderColor}>
        <Heading size="sm" color="teal.400" mb={4}>
          Pedidos pendientes / en proceso
        </Heading>

        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>ID Pedido</Th>
                <Th>Cliente</Th>
                <Th>F. Reserva</Th>
                <Th>F. Entrega</Th>
                <Th>Estado Pedido</Th>
                <Th>Orden</Th>
                <Th>Producción</Th>
                <Th>Acciones</Th>
              </Tr>
            </Thead>

            <Tbody>
              {pedidos.length === 0 ? (
                <Tr>
                  <Td colSpan={8} textAlign="center">
                    No hay pedidos
                  </Td>
                </Tr>
              ) : (
                pedidos.map((p) => (
                  <Tr key={p.id_pedido}>
                    <Td>{p.id_pedido}</Td>
                    <Td>{p.nombre_cliente}</Td>
                    <Td>{p.fecha_reserva}</Td>
                    <Td>{p.fecha_entrega}</Td>
                    <Td><Badge colorScheme="yellow">{p.estado_pedido}</Badge></Td>
                    <Td>{p.id_orden || "-"}</Td>
                    <Td>
                      <Badge colorScheme={p.estado_produccion === "Finalizado" ? "green" : "blue"}>
                        {p.estado_produccion}
                      </Badge>
                    </Td>

                    <Td>
                      <HStack>
                        <Button
                          size="xs"
                          colorScheme="blue"
                          leftIcon={<FaClipboardList />}
                          onClick={() => verDetalle(p)}
                        >
                          Detalle
                        </Button>

                        {!p.id_orden && (
                          <Button
                            size="xs"
                            colorScheme="green"
                            leftIcon={<FaPlay />}
                            onClick={() => iniciarProduccion(p)}
                          >
                            Iniciar
                          </Button>
                        )}

                        {p.id_orden && (
                          <Button
                            size="xs"
                            colorScheme="orange"
                            leftIcon={<FaStop />}
                            onClick={() => finalizarProduccion(p)}
                          >
                            Finalizar
                          </Button>
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

      {/* MODAL INSUMOS */}
      <Modal isOpen={insumosModal.isOpen} onClose={insumosModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent bg={bgCard}>
          <ModalHeader>Insumos usados — Orden #{pedidoSeleccionado?.id_orden}</ModalHeader>
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              {insumosUsados.map((fila) => (
                <HStack key={fila.filaId}>
                  <Select
                    placeholder="Seleccione insumo"
                    value={fila.id_insumo}
                    onChange={(e) =>
                      actualizarInsumo(fila.filaId, "id_insumo", e.target.value)
                    }
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
                    onChange={(e) =>
                      actualizarInsumo(fila.filaId, "cantidad_usada", e.target.value)
                    }
                  />
                </HStack>
              ))}

              <Button variant="outline" onClick={agregarFilaInsumo}>
                + Agregar línea
              </Button>

              <Textarea
                value={comentariosInsumos}
                onChange={(e) => setComentariosInsumos(e.target.value)}
                placeholder="Comentarios (opcional)"
              />
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="teal" mr={3} onClick={guardarInsumos}>
              Guardar y Finalizar
            </Button>
            <Button onClick={insumosModal.onClose}>Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
