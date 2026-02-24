// ============================================================
// 📁 src/components/Inicio/Inicio.js — DASHBOARD DE ESTADÍSTICAS
// ============================================================
import React, { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Spinner,
  Icon,
  Progress,
  Badge,
  SimpleGrid,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  FaBoxOpen,
  FaUsers,
  FaShoppingCart,
  FaDollarSign,
  FaTrophy,
  FaChartBar,
  FaMedal,
} from "react-icons/fa";
import { API_URL } from "../../config";

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
  });

const medalIcons = ["🥇", "🥈", "🥉", "4°", "5°"];

// ──────────────────────────────────────
// StatCard
// ──────────────────────────────────────
function StatCard({ label, value, icon, topColor, helpText }) {
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={border}
      borderTop="4px solid"
      borderTopColor={topColor}
      borderRadius="xl"
      p={5}
      shadow="sm"
      transition="all 0.2s"
      _hover={{ shadow: "md", transform: "translateY(-2px)" }}
    >
      <Flex align="center" mb={2}>
        <Box bg={topColor} p={2} borderRadius="lg" mr={3}>
          <Icon as={icon} color="white" boxSize={5} />
        </Box>
        <Text fontSize="sm" color="gray.500" fontWeight="medium">{label}</Text>
      </Flex>
      <Text fontSize="2xl" fontWeight="bold">{value}</Text>
      {helpText ? (
        <Text fontSize="xs" color="gray.400" mt={1}>{helpText}</Text>
      ) : null}
    </Box>
  );
}

// ──────────────────────────────────────
// RankCard
// ──────────────────────────────────────
function RankCard({ title, icon, items, valueKey, labelKey, formatVal, color }) {
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const barBg = useColorModeValue("gray.100", "gray.700");
  const empty = useColorModeValue("gray.500", "gray.400");

  const maxVal = items.length > 0 ? Number(items[0][valueKey]) : 1;

  return (
    <Box bg={bg} border="1px solid" borderColor={border} borderRadius="xl" p={6} shadow="sm">
      <Flex align="center" mb={5}>
        <Box bg={color} p={2} borderRadius="lg" mr={3}>
          <Icon as={icon} color="white" boxSize={5} />
        </Box>
        <Heading size="md">{title}</Heading>
      </Flex>

      {items.length === 0 ? (
        <Text color={empty} fontSize="sm">Sin datos disponibles</Text>
      ) : (
        items.map((item, idx) => {
          const pct = maxVal > 0 ? (Number(item[valueKey]) / maxVal) * 100 : 0;
          return (
            <Box key={idx} mb={4}>
              <Flex justify="space-between" mb={1} align="center">
                <Flex align="center" gap={2}>
                  <Text fontSize="lg">{medalIcons[idx]}</Text>
                  <Text fontWeight={idx === 0 ? "bold" : "normal"} fontSize="sm">
                    {item[labelKey]}
                  </Text>
                  {idx === 0 && (
                    <Badge colorScheme={color === "green.500" ? "green" : "purple"} fontSize="xs">
                      TOP 1
                    </Badge>
                  )}
                </Flex>
                <Text fontSize="sm" fontWeight="bold" color={color}>
                  {formatVal(item[valueKey])}
                </Text>
              </Flex>
              <Progress
                value={pct}
                colorScheme={color === "green.500" ? "green" : "purple"}
                size="sm"
                borderRadius="full"
                bg={barBg}
              />
            </Box>
          );
        })
      )}
    </Box>
  );
}

// ──────────────────────────────────────
// HeroCard — producto o cliente destacado
// ──────────────────────────────────────
function HeroProducto({ item }) {
  const bg = useColorModeValue(
    "linear-gradient(135deg, #f0fff6 0%, #e6ffef 100%)",
    "linear-gradient(135deg, #1a3328 0%, #0f2d22 100%)"
  );
  const heading = useColorModeValue("green.700", "green.200");
  const sub = useColorModeValue("gray.600", "gray.300");
  return (
    <Box
      bg={bg}
      border="2px solid"
      borderColor="green.300"
      borderRadius="2xl"
      p={{ base: 4, md: 6 }}
      boxShadow="0 4px 20px rgba(0,158,115,0.15)"
      transition="all 0.2s"
      _hover={{ boxShadow: "0 6px 28px rgba(0,158,115,0.28)", transform: "translateY(-2px)" }}
    >
      <Flex align="center" gap={3} mb={4} wrap="wrap">
        <Box>
          <Text fontSize="xs" color="green.600" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
            Producto más vendido
          </Text>
          <Heading size={{ base: "sm", md: "md" }} color={heading}>{item.nombre_producto}</Heading>
        </Box>
      </Flex>
      <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={{ base: 2, md: 4 }}>
        <Box>
          <Text fontSize={{ base: "2xs", md: "xs" }} color={sub}>Unidades</Text>
          <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">{Number(item.total_unidades).toLocaleString()}</Text>
        </Box>
        <Box>
          <Text fontSize={{ base: "2xs", md: "xs" }} color={sub}>Ingresos</Text>
          <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">{fmt(item.total_ventas)}</Text>
        </Box>
        <Box>
          <Text fontSize={{ base: "2xs", md: "xs" }} color={sub}>Pedidos</Text>
          <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">{item.num_pedidos}</Text>
        </Box>
      </SimpleGrid>
    </Box>
  );
}

function HeroCliente({ item }) {
  const bg = useColorModeValue(
    "linear-gradient(135deg, #fdf5ff 0%, #f5e8ff 100%)",
    "linear-gradient(135deg, #2d1a3d 0%, #1e0f2d 100%)"
  );
  const heading = useColorModeValue("purple.700", "purple.200");
  const sub = useColorModeValue("gray.600", "gray.300");
  return (
    <Box
      bg={bg}
      border="2px solid"
      borderColor="purple.300"
      borderRadius="2xl"
      p={{ base: 4, md: 6 }}
      boxShadow="0 4px 20px rgba(128,0,200,0.12)"
      transition="all 0.2s"
      _hover={{ boxShadow: "0 6px 28px rgba(128,0,200,0.24)", transform: "translateY(-2px)" }}
    >
      <Flex align="center" gap={3} mb={4} wrap="wrap">
        <Box>
          <Text fontSize="xs" color="purple.600" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
            Mejor cliente
          </Text>
          <Heading size={{ base: "sm", md: "md" }} color={heading}>{item.nombre_cliente}</Heading>
        </Box>
      </Flex>
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={{ base: 2, md: 4 }}>
        <Box>
          <Text fontSize={{ base: "2xs", md: "xs" }} color={sub}>Total comprado</Text>
          <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">{fmt(item.total_comprado)}</Text>
        </Box>
        <Box>
          <Text fontSize={{ base: "2xs", md: "xs" }} color={sub}>Pedidos</Text>
          <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">{item.num_pedidos}</Text>
        </Box>
      </SimpleGrid>
    </Box>
  );
}

// ──────────────────────────────────────
// INICIO (Dashboard)
// ──────────────────────────────────────
export default function Inicio() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const bg = useColorModeValue("gray.50", "gray.900");
  const headingColor = useColorModeValue("gray.700", "gray.100");

  useEffect(() => {
    fetch(`${API_URL}/ventas/ventasyreserva/estadisticas`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error del servidor (${r.status})`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Flex minH="60vh" align="center" justify="center" direction="column" gap={3}>
        <Spinner size="xl" color="green.400" thickness="4px" />
        <Text color="gray.500" fontSize="sm">Cargando estadísticas...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Box textAlign="center" p={8}>
          <Text fontSize="3xl" mb={2}>⚠️</Text>
          <Text color="red.400" fontWeight="bold">{error}</Text>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Verifica que el servidor esté activo
          </Text>
        </Box>
      </Flex>
    );
  }

  const { productos = [], clientes = [], resumen = {} } = data || {};
  const topProducto = productos[0] || null;
  const topCliente = clientes[0] || null;

  return (
    <Box p={{ base: 4, md: 8 }} bg={bg} minH="100vh">

      {/* ENCABEZADO */}
      <Flex align="center" mb={{ base: 5, md: 8 }} gap={3} wrap="wrap">
        <Icon as={FaChartBar} boxSize={{ base: 5, md: 7 }} color="green.400" />
        <Box>
          <Heading size={{ base: "md", md: "lg" }} color={headingColor}>Panel de Estadísticas</Heading>
          <Text fontSize="sm" color="gray.500">Resumen de ventas y rendimiento</Text>
        </Box>
      </Flex>

      {/* TARJETAS DE RESUMEN */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={5} mb={8}>
        <StatCard
          label="Total de Pedidos"
          value={Number(resumen.total_pedidos || 0).toLocaleString()}
          icon={FaShoppingCart}
          topColor="blue.400"
        />
        <StatCard
          label="Ventas Totales"
          value={fmt(resumen.ventas_totales)}
          icon={FaDollarSign}
          topColor="green.400"
        />
        <StatCard
          label="Clientes con compras"
          value={Number(resumen.total_clientes || 0).toLocaleString()}
          icon={FaUsers}
          topColor="purple.400"
        />
        <StatCard
          label="Producto Estrella"
          value={topProducto ? topProducto.nombre_producto : "—"}
          icon={FaTrophy}
          topColor="yellow.400"
          helpText={
            topProducto
              ? `${Number(topProducto.total_unidades).toLocaleString()} unidades vendidas`
              : ""
          }
        />
      </SimpleGrid>

      {/* DESTACADOS */}
      {(topProducto || topCliente) && (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb={8}>
          {topProducto && <HeroProducto item={topProducto} />}
          {topCliente && <HeroCliente item={topCliente} />}
        </SimpleGrid>
      )}

      {/* RANKINGS */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
        <RankCard
          title="Top 5 Productos más vendidos"
          icon={FaBoxOpen}
          items={productos}
          valueKey="total_unidades"
          labelKey="nombre_producto"
          formatVal={(v) => `${Number(v).toLocaleString()} uds.`}
          color="green.500"
        />
        <RankCard
          title="Top 5 Mejores clientes"
          icon={FaMedal}
          items={clientes}
          valueKey="total_comprado"
          labelKey="nombre_cliente"
          formatVal={fmt}
          color="purple.500"
        />
      </Grid>

    </Box>
  );
}
