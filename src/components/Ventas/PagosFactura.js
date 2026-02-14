// ============================================================
// 📁 src/components/Ventas/PagosFactura.jsx
// Módulo independiente: Pagos de Facturas (Versión COMPLETA)
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Divider,
  Button,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  HStack,
  VStack,
  Text,
  useToast,
  useColorModeValue,
  Card,
  CardBody,
} from "@chakra-ui/react";
import { FaMoneyBillWave, FaSearch, FaTrash } from "react-icons/fa";
import api from "../../api/apiClient";

// ================================
// Utiles
// ================================
const fmtHNL = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const hoyISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function PagosFactura() {
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.900");
  const border = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("teal.50", "gray.800");
  const titleColor = useColorModeValue("teal.700", "teal.200");
  const subtleText = useColorModeValue("gray.600", "gray.400");
  const rowHover = useColorModeValue("gray.50", "gray.800");

  // ================================
  // Estados principales
  // ================================
  const [resumen, setResumen] = useState([]);
  const [loading, setLoading] = useState(false);

  // Métodos de pago
  const [metodosPago, setMetodosPago] = useState([]);

  // Filtros
  const [filter, setFilter] = useState({
    cliente: "",
    numero: "",
    estado: "",
  });

  // Modal pago
  const {
    isOpen: isPagoOpen,
    onOpen: onPagoOpen,
    onClose: onPagoClose,
  } = useDisclosure();

  const [selFactura, setSelFactura] = useState(null);

  const [nuevoPago, setNuevoPago] = useState({
    fecha_pago: hoyISO(),
    monto_pagado: "",
    id_metodo_pago: "",
    observacion: "",
    almacen: "TGU",
  });

  const [errorMonto, setErrorMonto] = useState("");

  // Modal detalle
  const {
    isOpen: isDetalleOpen,
    onOpen: onDetalleOpen,
    onClose: onDetalleClose,
  } = useDisclosure();
  const [detalleFactura, setDetalleFactura] = useState(null);

  // ================================
  // Cargar métodos + resumen
  // ================================
  const cargarMetodosPago = async () => {
    try {
      const res = await api.get("/ventas/pagos-factura/metodos-pago");
      setMetodosPago(res.data || []);
    } catch (err) {
      console.error("❌ Error cargando métodos de pago:", err);
    }
  };

  const cargarResumen = async () => {
    try {
      setLoading(true);
      const res = await api.get("/ventas/pagos-factura/resumen");
      setResumen(res.data || []);
    } catch (err) {
      toast({
        title: "Error cargando datos",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMetodosPago();
    cargarResumen();
  }, []);

  // ================================
  // Filtrado front-end
  // ================================
  const filtradas = useMemo(() => {
    const cl = filter.cliente.trim().toLowerCase();
    const num = filter.numero.trim().toLowerCase();
    const est = filter.estado;

    return resumen.filter((f) => {
      const matchCli = !cl || (f.cliente || "").toLowerCase().includes(cl);
      const matchNum =
        !num || (f.numero_factura || "").toString().toLowerCase().includes(num);
      const matchEst = !est || f.estado === est;
      return matchCli && matchNum && matchEst;
    });
  }, [resumen, filter]);

  // ================================
  // Abrir modal registrar pago
  // ================================
  const abrirModalPago = (factura) => {
    setSelFactura(factura);

    setNuevoPago({
      fecha_pago: hoyISO(),
      monto_pagado:
        factura.saldo_pendiente && Number(factura.saldo_pendiente) > 0
          ? Number(factura.saldo_pendiente).toFixed(2)
          : "",
      id_metodo_pago: "",
      observacion: "",
      almacen: "TGU",
    });

    setErrorMonto("");
    onPagoOpen();
  };

  const cerrarModalPago = () => {
    setSelFactura(null);
    setErrorMonto("");
    onPagoClose();
  };

  // ================================
  // Cambios en input
  // ================================
  const actualizarPagoCampo = (e) => {
    const { name, value } = e.target;
    setNuevoPago((p) => ({ ...p, [name]: value }));
  };

  // Validación del monto
  const handleMontoChange = (value) => {
    const monto = Number(value);
    const pendiente = Number(selFactura?.saldo_pendiente || 0);

    setNuevoPago((p) => ({ ...p, monto_pagado: value }));

    if (!value) {
      setErrorMonto("Debe ingresar un monto");
      return;
    }

    if (monto <= 0) {
      setErrorMonto("El monto debe ser mayor a 0");
      return;
    }

    if (monto > pendiente) {
      setErrorMonto(
        `No puede pagar más del saldo pendiente (L ${pendiente.toFixed(2)})`
      );
      return;
    }

    setErrorMonto("");
  };

  // ================================
  // Guardar pago
  // ================================
  const guardarPago = async () => {
    if (!selFactura) return;

    const monto = Number(nuevoPago.monto_pagado || 0);
    const pendiente = Number(selFactura?.saldo_pendiente || 0);

    if (errorMonto) {
      toast({
        title: "Monto inválido",
        description: errorMonto,
        status: "warning",
      });
      return;
    }

    if (!nuevoPago.id_metodo_pago) {
      toast({
        title: "Método de pago requerido",
        status: "warning",
      });
      return;
    }

    const payload = {
      id_factura: selFactura.id_factura,
      fecha_pago: nuevoPago.fecha_pago,
      monto_pagado: monto,
      id_metodo_pago: Number(nuevoPago.id_metodo_pago),
      observacion: nuevoPago.observacion,
      almacen: nuevoPago.almacen,
    };

    try {
      const res = await api.post("/ventas/pagos-factura", payload);

      toast({
        title: "Pago registrado",
        description: res.data?.message || "Pago guardado correctamente",
        status: "success",
      });

      await cargarResumen();
      cerrarModalPago();
    } catch (err) {
      toast({
        title: "Error guardando pago",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };

  // ================================
  // Detalle pagos
  // ================================
  const abrirDetallePagos = async (factura) => {
    try {
      const res = await api.get(`/ventas/pagos-factura/${factura.id_factura}`);
      setDetalleFactura(res.data || null);
      onDetalleOpen();
    } catch (err) {
      toast({
        title: "Error al cargar detalle",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };

  const eliminarPago = async (id_pago, id_factura) => {
    if (!window.confirm("¿Seguro que desea eliminar este pago?")) return;

    try {
      const res = await api.delete(`/ventas/pagos-factura/${id_pago}`);

      toast({
        title: "Pago eliminado",
        description: res.data?.message || "Pago eliminado correctamente",
        status: "success",
      });

      await cargarResumen();

      const detRes = await api.get(`/ventas/pagos-factura/${id_factura}`);
      setDetalleFactura(detRes.data || null);
    } catch (err) {
      toast({
        title: "Error eliminando pago",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <Box p={4}>
      <Flex justify="space-between" mb={4}>
        <Heading size="lg" color={titleColor}>
          Pagos de Facturas
        </Heading>
      </Flex>

      <Divider mb={4} />

      {/* =========================== */}
      {/* RESUMEN TABLA */}
      {/* =========================== */}
      <Card bg={cardBg} borderWidth="1px" borderColor={border} boxShadow="xl">
        <CardBody>
          {/* Filtros */}
          <Flex
            justify="space-between"
            align="flex-end"
            mb={4}
            gap={4}
            flexWrap="wrap"
          >
            <HStack spacing={3}>
              <FormControl>
                <FormLabel fontSize="xs">Cliente</FormLabel>
                <Input
                  size="sm"
                  value={filter.cliente}
                  onChange={(e) =>
                    setFilter((f) => ({ ...f, cliente: e.target.value }))
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs">N°. Factura</FormLabel>
                <Input
                  size="sm"
                  value={filter.numero}
                  onChange={(e) =>
                    setFilter((f) => ({ ...f, numero: e.target.value }))
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs">Estado</FormLabel>
                <Select
                  size="sm"
                  value={filter.estado}
                  onChange={(e) =>
                    setFilter((f) => ({ ...f, estado: e.target.value }))
                  }
                >
                  <option value="">Todos</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagada">Pagada</option>
                  <option value="Anulada">Anulada</option>
                </Select>
              </FormControl>
            </HStack>

            <Button
              size="sm"
              leftIcon={<FaSearch />}
              variant="outline"
              onClick={cargarResumen}
              isLoading={loading}
            >
              Actualizar
            </Button>
          </Flex>

          {/* Tabla */}
          <Box overflowX="auto">
            <Table size="sm">
              <Thead bg={headerBg}>
                <Tr>
                  <Th>N°</Th>
                  <Th>Cliente</Th>
                  <Th>Fecha</Th>
                  <Th isNumeric>Total</Th>
                  <Th isNumeric>Pagado</Th>
                  <Th isNumeric>Saldo</Th>
                  <Th>Estado</Th>
                  <Th>Almacén</Th>
                  <Th>Acciones</Th>
                </Tr>
              </Thead>

              <Tbody>
                {filtradas.map((f) => (
                  <Tr key={f.id_factura} _hover={{ bg: rowHover }}>
                    <Td>{f.numero_factura}</Td>
                    <Td>{f.cliente}</Td>
                    <Td>{f.fecha_emision?.substring(0, 10)}</Td>
                    <Td isNumeric>{fmtHNL.format(f.total_factura)}</Td>
                    <Td isNumeric>{fmtHNL.format(f.total_pagado)}</Td>
                    <Td isNumeric>{fmtHNL.format(f.saldo_pendiente)}</Td>
                    <Td>{f.estado}</Td>
                    <Td>{f.almacen_ultimo_pago || "—"}</Td>

                    <Td>
                      <HStack>
                        <Button
                          size="xs"
                          colorScheme="teal"
                          leftIcon={<FaMoneyBillWave />}
                          onClick={() => abrirModalPago(f)}
                        >
                          Pagar
                        </Button>

                        <IconButton
                          size="xs"
                          colorScheme="blue"
                          icon={<FaSearch />}
                          onClick={() => abrirDetallePagos(f)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* ============================================================
         MODAL REGISTRAR PAGO
      ============================================================ */}
      <Modal isOpen={isPagoOpen} onClose={cerrarModalPago} size="lg">
        <ModalOverlay />
        <ModalContent bg={cardBg} borderWidth="1px" borderColor={border}>
          <ModalHeader>Registrar Pago</ModalHeader>
          <ModalBody>
            {selFactura && (
              <VStack align="stretch" spacing={4}>
                {/* Resumen factura */}
                <Box borderWidth="1px" borderColor={border} p={3} borderRadius="md">
                  <Text fontSize="sm" color={subtleText}>Factura:</Text>
                  <Text fontWeight="bold">
                    {selFactura.numero_factura} — {selFactura.cliente}
                  </Text>

                  <HStack mt={2} justify="space-between" fontSize="sm">
                    <Text>Total: {fmtHNL.format(selFactura.total_factura)}</Text>
                    <Text>Pagado: {fmtHNL.format(selFactura.total_pagado)}</Text>
                    <Text fontWeight="bold">
                      Saldo: {fmtHNL.format(selFactura.saldo_pendiente)}
                    </Text>
                  </HStack>
                </Box>

                {/* Formulario */}
                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">Fecha</FormLabel>
                    <Input
                      type="date"
                      name="fecha_pago"
                      value={nuevoPago.fecha_pago}
                      onChange={actualizarPagoCampo}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Monto</FormLabel>
                    <Input
                      type="number"
                      step="0.01"
                      value={nuevoPago.monto_pagado}
                      onChange={(e) => handleMontoChange(e.target.value)}
                    />
                    {errorMonto && (
                      <Text fontSize="sm" color="red.500">
                        {errorMonto}
                      </Text>
                    )}
                  </FormControl>
                </HStack>

                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">Método de pago</FormLabel>
                    <Select
                      name="id_metodo_pago"
                      value={nuevoPago.id_metodo_pago}
                      onChange={actualizarPagoCampo}
                    >
                      <option value="">Seleccione método</option>
                      {metodosPago.map((m) => (
                        <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                          {m.nombre_metodo}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Almacén</FormLabel>
                    <Select
                      name="almacen"
                      value={nuevoPago.almacen}
                      onChange={actualizarPagoCampo}
                    >
                      <option value="TGU">Tegucigalpa</option>
                      <option value="SPS">San Pedro Sula</option>
                    </Select>
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormLabel fontSize="sm">Observación</FormLabel>
                  <Textarea
                    name="observacion"
                    value={nuevoPago.observacion}
                    onChange={actualizarPagoCampo}
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={cerrarModalPago}>
              Cancelar
            </Button>

            <Button
              colorScheme="teal"
              onClick={guardarPago}
              isDisabled={!!errorMonto || !nuevoPago.monto_pagado}
            >
              Guardar pago
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ============================================================
         MODAL DETALLE PAGOS
      ============================================================ */}
      <Modal isOpen={isDetalleOpen} onClose={onDetalleClose} size="lg">
        <ModalOverlay />
        <ModalContent bg={cardBg} borderWidth="1px" borderColor={border}>
          <ModalHeader>Detalle de Pagos</ModalHeader>
          <ModalBody>
            {detalleFactura && (
              <VStack align="stretch" spacing={4}>
                {/* Resumen */}
                <Box borderWidth="1px" borderColor={border} p={3} borderRadius="md">
                  <Text fontSize="sm">Factura:</Text>
                  <Text fontWeight="bold">
                    {detalleFactura.factura.numero_factura} —{" "}
                    {detalleFactura.factura.cliente}
                  </Text>

                  <HStack mt={2} justify="space-between" fontSize="sm">
                    <Text>Total: {fmtHNL.format(detalleFactura.factura.total_factura)}</Text>
                    <Text>Pagado: {fmtHNL.format(detalleFactura.factura.total_pagado)}</Text>
                    <Text fontWeight="bold">
                      Saldo: {fmtHNL.format(detalleFactura.factura.saldo_pendiente)}
                    </Text>
                  </HStack>
                </Box>

                {/* Tabla pagos */}
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead bg={headerBg}>
                      <Tr>
                        <Th>Fecha</Th>
                        <Th isNumeric>Monto</Th>
                        <Th>Método</Th>
                        <Th>Almacén</Th>
                        <Th>Observación</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {detalleFactura.pagos.map((p) => (
                        <Tr key={p.id_pago} _hover={{ bg: rowHover }}>
                          <Td>{p.fecha_pago?.substring(0, 10)}</Td>
                          <Td isNumeric>{fmtHNL.format(p.monto_pagado)}</Td>
                          <Td>{p.nombre_metodo}</Td>
                          <Td>{p.almacen}</Td>
                          <Td>{p.observacion}</Td>
                          <Td>
                            <IconButton
                              size="xs"
                              colorScheme="red"
                              variant="ghost"
                              icon={<FaTrash />}
                              onClick={() =>
                                eliminarPago(p.id_pago, detalleFactura.factura.id_factura)
                              }
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={onDetalleClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
