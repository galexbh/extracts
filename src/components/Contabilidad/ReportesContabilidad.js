import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  Flex,
  HStack,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { FaChartLine, FaShoppingCart, FaClipboardList } from "react-icons/fa";
import api from "../../api/apiClient";

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

export default function ReportesContabilidad() {
  const toast = useToast();
  const cardBg = useColorModeValue("white", "gray.900");
  const border = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("teal.50", "gray.800");
  const titleColor = useColorModeValue("teal.700", "teal.200");
  const subtleText = useColorModeValue("gray.600", "gray.400");

  // filtros generales (rango de fechas)
  const [filtros, setFiltros] = useState({
    desde: hoyISO(),
    hasta: hoyISO(),
  });

  const [productos, setProductos] = useState([]);
  const [ventasVendedor, setVentasVendedor] = useState([]);
  const [pedidosDia, setPedidosDia] = useState([]);

  const handleChangeFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  const cargarProductosMasVendidos = async () => {
    try {
      const res = await api.get("/contabilidad/reportes-contabilidad/productos-mas-vendidos", {
        params: { desde: filtros.desde, hasta: filtros.hasta, top: 10 },
      });
      setProductos(res.data || []);
    } catch (err) {
      toast({
        title: "Error cargando productos más vendidos",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };

  const cargarVentasVendedor = async () => {
    try {
      const res = await api.get("/contabilidad/reportes-contabilidad/ventas-vendedor", {
        params: { desde: filtros.desde, hasta: filtros.hasta },
      });
      setVentasVendedor(res.data || []);
    } catch (err) {
      toast({
        title: "Error cargando ventas por vendedor",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };

  const cargarPedidosDiarios = async () => {
    try {
      const res = await api.get("/contabilidad/reportes-contabilidad/pedidos-diarios", {
        params: { desde: filtros.desde, hasta: filtros.hasta },
      });
      setPedidosDia(res.data || []);
    } catch (err) {
      toast({
        title: "Error cargando pedidos diarios",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };

  // por defecto, al entrar, cargamos todo del día
  useEffect(() => {
    cargarProductosMasVendidos();
    cargarVentasVendedor();
    cargarPedidosDiarios();
    // eslint-disable-next-line
  }, []);

  return (
    <Box p={4}>
      <Heading size="lg" color={titleColor} mb={4}>
        Reportes de Contabilidad
      </Heading>

      <Card bg={cardBg} borderWidth="1px" borderColor={border} boxShadow="xl">
        <CardBody>
          {/* Filtros globales de fechas */}
          <Flex justify="space-between" align="flex-end" mb={4} gap={4} flexWrap="wrap">
            <HStack spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Desde</FormLabel>
                <Input
                  type="date"
                  name="desde"
                  value={filtros.desde}
                  onChange={handleChangeFiltro}
                  size="sm"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Hasta</FormLabel>
                <Input
                  type="date"
                  name="hasta"
                  value={filtros.hasta}
                  onChange={handleChangeFiltro}
                  size="sm"
                />
              </FormControl>
            </HStack>

            <Button
              size="sm"
              colorScheme="teal"
              onClick={() => {
                cargarProductosMasVendidos();
                cargarVentasVendedor();
                cargarPedidosDiarios();
              }}
            >
              Actualizar todos
            </Button>
          </Flex>

          {/* Tabs de reportes */}
          <Tabs colorScheme="teal" isFitted>
            <TabList mb={4}>
              <Tab>
                <HStack spacing={2}>
                  <FaShoppingCart />
                  <Text>Productos más vendidos</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FaChartLine />
                  <Text>Ventas por vendedor</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FaClipboardList />
                  <Text>Pedidos diarios</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* ---------- TAB 1: PRODUCTOS ---------- */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <Text fontSize="sm" color={subtleText}>
                    Top de productos más vendidos por cantidad en el rango seleccionado.
                  </Text>
                  <Box overflowX="auto">
                    <Table size="sm">
                      <Thead bg={headerBg}>
                        <Tr>
                          <Th>ID</Th>
                          <Th>Producto</Th>
                          <Th isNumeric>Cantidad vendida</Th>
                          <Th isNumeric>Total vendido</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {productos.map((p) => (
                          <Tr key={p.id_producto}>
                            <Td>{p.id_producto}</Td>
                            <Td>{p.nombre_producto}</Td>
                            <Td isNumeric>{p.total_cantidad}</Td>
                            <Td isNumeric>{fmtHNL.format(p.total_vendido || 0)}</Td>
                          </Tr>
                        ))}
                        {productos.length === 0 && (
                          <Tr>
                            <Td colSpan={4}>
                              <Text textAlign="center" color={subtleText} py={3}>
                                Sin datos para el rango seleccionado.
                              </Text>
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </TabPanel>

              {/* ---------- TAB 2: VENTAS POR VENDEDOR ---------- */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <Text fontSize="sm" color={subtleText}>
                    Facturas emitidas y montos vendidos por vendedor y fecha.
                  </Text>
                  <Box overflowX="auto">
                    <Table size="sm">
                      <Thead bg={headerBg}>
                        <Tr>
                          <Th>Vendedor</Th>
                          <Th>Fecha</Th>
                          <Th isNumeric># Facturas</Th>
                          <Th isNumeric>Total vendido</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {ventasVendedor.map((v, idx) => (
                          <Tr key={idx}>
                            <Td>{v.vendedor}</Td>
                            <Td>{v.fecha}</Td>
                            <Td isNumeric>{v.cantidad_facturas}</Td>
                            <Td isNumeric>{fmtHNL.format(v.total_vendido || 0)}</Td>
                          </Tr>
                        ))}
                        {ventasVendedor.length === 0 && (
                          <Tr>
                            <Td colSpan={4}>
                              <Text textAlign="center" color={subtleText} py={3}>
                                Sin datos para el rango seleccionado.
                              </Text>
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </TabPanel>

              {/* ---------- TAB 3: PEDIDOS DIARIOS ---------- */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <Text fontSize="sm" color={subtleText}>
                    Cantidad de pedidos y total diario en el rango seleccionado.
                  </Text>
                  <Box overflowX="auto">
                    <Table size="sm">
                      <Thead bg={headerBg}>
                        <Tr>
                          <Th>Fecha</Th>
                          <Th isNumeric># Pedidos</Th>
                          <Th isNumeric>Total pedidos</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {pedidosDia.map((p, idx) => (
                          <Tr key={idx}>
                            <Td>{p.fecha}</Td>
                            <Td isNumeric>{p.cantidad_pedidos}</Td>
                            <Td isNumeric>{fmtHNL.format(p.total_pedidos || 0)}</Td>
                          </Tr>
                        ))}
                        {pedidosDia.length === 0 && (
                          <Tr>
                            <Td colSpan={3}>
                              <Text textAlign="center" color={subtleText} py={3}>
                                Sin datos para el rango seleccionado.
                              </Text>
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
    </Box>
  );
}
