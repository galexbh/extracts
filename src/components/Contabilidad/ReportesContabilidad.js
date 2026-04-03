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
  SimpleGrid,
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow, Icon, Spinner
} from "@chakra-ui/react";
import { FaChartLine, FaShoppingCart, FaClipboardList, FaArrowRight, FaClock } from "react-icons/fa";
import { Link as RouterLink } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
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
  const [loading, setLoading] = useState(false);

  const COLORS = ["#3182CE", "#38A169", "#D69E2E", "#E53E3E", "#805AD5", "#319795"];

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
    } catch (err) { }
  };

  const cargarPedidosDiarios = async () => {
    try {
      const res = await api.get("/contabilidad/reportes-contabilidad/pedidos-diarios", {
        params: { desde: filtros.desde, hasta: filtros.hasta },
      });
      setPedidosDia(res.data || []);
    } catch (err) { }
  };

  const cargarDatos = async () => {
    setLoading(true);
    await Promise.all([
      cargarProductosMasVendidos(),
      cargarVentasVendedor(),
      cargarPedidosDiarios(),
    ]);
    setLoading(false);
  };

  // por defecto, al entrar, cargamos todo del día
  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line
  }, []);

  // KPIs Calculados
  const ingresosTotales = ventasVendedor.reduce((acc, curr) => acc + (Number(curr.total_vendido) || 0), 0);
  const totalPedidos = pedidosDia.reduce((acc, curr) => acc + (Number(curr.cantidad_pedidos) || 0), 0);
  const totalUnidadesVendidas = productos.reduce((acc, curr) => acc + (Number(curr.total_cantidad) || 0), 0);

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
                  max={filtros.hasta || undefined}
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
                  min={filtros.desde || undefined}
                  size="sm"
                />
              </FormControl>
            </HStack>

            <Button
              size="sm"
              colorScheme="teal"
              onClick={() => {
                if (filtros.desde && filtros.hasta && new Date(filtros.desde) > new Date(filtros.hasta)) {
                  toast({
                    title: "Rango de fechas inválido",
                    description: "La fecha 'Desde' no puede ser mayor que la fecha 'Hasta'.",
                    status: "warning",
                  });
                  return;
                }
                cargarDatos();
              }}
            >
              Actualizar Dashboard
            </Button>
          </Flex>

          {loading ? (
            <Flex justify="center" align="center" minH="30vh">
              <Spinner size="xl" color="teal.500" thickness="4px" />
            </Flex>
          ) : (
            <Box mt={6}>
              {/* KPIs Principales (Corporate Level) */}
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
                <Card bgGradient="linear(to-br, teal.400, teal.600)" color="white" boxShadow="xl" borderRadius="xl">
                  <CardBody>
                    <Stat>
                      <StatLabel fontSize="sm" fontWeight="semibold" opacity={0.9}>Ingresos Generados</StatLabel>
                      <StatNumber fontSize="3xl" fontWeight="extrabold">{fmtHNL.format(ingresosTotales)}</StatNumber>
                      <StatHelpText opacity={0.8}>En el periodo seleccionado</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bgGradient="linear(to-br, blue.400, blue.600)" color="white" boxShadow="xl" borderRadius="xl">
                  <CardBody>
                    <Stat>
                      <StatLabel fontSize="sm" fontWeight="semibold" opacity={0.9}>Volumen de Pedidos</StatLabel>
                      <StatNumber fontSize="3xl" fontWeight="extrabold">{totalPedidos}</StatNumber>
                      <StatHelpText opacity={0.8}>Transacciones registradas</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bgGradient="linear(to-br, purple.400, purple.600)" color="white" boxShadow="xl" borderRadius="xl">
                  <CardBody>
                    <Stat>
                      <StatLabel fontSize="sm" fontWeight="semibold" opacity={0.9}>Unidades Movilizadas</StatLabel>
                      <StatNumber fontSize="3xl" fontWeight="extrabold">{totalUnidadesVendidas}</StatNumber>
                      <StatHelpText opacity={0.8}>Productos despachados</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Contenedores de Gráficos Duales */}
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} mb={8}>

                {/* GRAFICO 1: VENTAS POR VENDEDOR */}
                <Card variant="outline" borderColor={border} borderRadius="xl" boxShadow="sm">
                  <CardBody>
                    <Flex justify="space-between" align="center" mb={4}>
                      <HStack>
                        <Icon as={FaChartLine} color="blue.500" boxSize={5} />
                        <Heading size="sm">Rendimiento por Vendedor</Heading>
                      </HStack>
                      <Button as={RouterLink} to="/app/contabilidad/reportes/ventas-usuarios" rightIcon={<FaArrowRight />} size="xs" colorScheme="blue" variant="ghost">Ver Detalles</Button>
                    </Flex>
                    <Box h="300px">
                      {ventasVendedor.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ventasVendedor} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="vendedor" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} width={80} />
                            <Tooltip formatter={(value) => fmtHNL.format(value)} />
                            <Bar dataKey="total_vendido" fill="#3182CE" radius={[4, 4, 0, 0]} name="Ventas (HNL)" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Flex h="100%" align="center" justify="center"><Text color={subtleText}>Sin datos</Text></Flex>
                      )}
                    </Box>
                  </CardBody>
                </Card>

                {/* GRAFICO 2: PRODUCTOS MAS VENDIDOS (PIE) */}
                <Card variant="outline" borderColor={border} borderRadius="xl" boxShadow="sm">
                  <CardBody>
                    <Flex justify="space-between" align="center" mb={4}>
                      <HStack>
                        <Icon as={FaShoppingCart} color="green.500" boxSize={5} />
                        <Heading size="sm">Distribución de Productos</Heading>
                      </HStack>
                      <Button as={RouterLink} to="/app/contabilidad/reportes/productos-vendidos" rightIcon={<FaArrowRight />} size="xs" colorScheme="green" variant="ghost">Ver Detalles</Button>
                    </Flex>
                    <Box h="300px">
                      {productos.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={productos}
                              dataKey="total_cantidad"
                              nameKey="nombre_producto"
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {productos.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} unidades`} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <Flex h="100%" align="center" justify="center"><Text color={subtleText}>Sin datos</Text></Flex>
                      )}
                    </Box>
                  </CardBody>
                </Card>

              </SimpleGrid>

              {/* CONTENEDOR ANCHO INFERIOR */}
              <SimpleGrid columns={1} spacing={8}>
                {/* GRAFICO 3: FLUJO DE PEDIDOS DIARIOS */}
                <Card variant="outline" borderColor={border} borderRadius="xl" boxShadow="sm">
                  <CardBody>
                    <Flex justify="space-between" align="center" mb={4}>
                      <HStack>
                        <Icon as={FaClock} color="purple.500" boxSize={5} />
                        <Heading size="sm">Flujo de Transacciones Diarias (HNL)</Heading>
                      </HStack>
                      <Button as={RouterLink} to="/app/contabilidad/reportes/pedidos-diarios" rightIcon={<FaArrowRight />} size="xs" colorScheme="purple" variant="ghost">Ver Detalles</Button>
                    </Flex>
                    <Box h="300px">
                      {pedidosDia.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={pedidosDia} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} width={80} />
                            <Tooltip formatter={(value) => fmtHNL.format(value)} />
                            <Line type="monotone" dataKey="total_pedidos" stroke="#805AD5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Ingreso Diario" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <Flex h="100%" align="center" justify="center"><Text color={subtleText}>Sin datos</Text></Flex>
                      )}
                    </Box>
                  </CardBody>
                </Card>
              </SimpleGrid>

            </Box>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}
