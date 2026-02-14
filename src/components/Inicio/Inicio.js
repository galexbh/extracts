import React from "react";
import {
  Box,
  SimpleGrid,
  Heading,
  VStack,
  Link,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";

import {
  FaMoneyBillAlt,
  FaCogs,
  FaBoxes,
  FaTruck,
  FaChartLine,
  FaShoppingCart,
  FaShieldAlt,
  FaTools,
} from "react-icons/fa";

// ============================================================
// 🎨 CONFIG DE SECCIONES (ICONOS + COLOR)
// ============================================================
const sectionConfig = {
  "Ventas y Reservas": { icon: FaMoneyBillAlt, color: "green.500" },
  "Producción": { icon: FaCogs, color: "green.500" },
  Inventarios: { icon: FaBoxes, color: "green.500" },
  Entregas: { icon: FaTruck, color: "green.500" },
  Contabilidad: { icon: FaChartLine, color: "green.500" },
  Compras: { icon: FaShoppingCart, color: "green.500" },
  Seguridad: { icon: FaShieldAlt, color: "green.500" },
  Mantenimiento: { icon: FaTools, color: "green.500" },
};

// ============================================================
// 📍 LISTA DE ITEMS POR MÓDULO
// ============================================================
const ventasYReservas = ["Clientes", "Factura", "Pedidos"];
const produccion = ["Productos", "Recetas", "Produccion", "Insumos usados"];
const inventarios = ["Productos", "Insumos", "Movimientos"];
const entregas = ["Entregas", "Detalle de Entregas"];
const contabilidad = ["Créditos", "Pagos", "Mora", "Reportes"];
const compras = ["Órdenes de Compra", "Detalle de Compras", "Proveedores"];
const mantenimiento = [
  "Clientes",
  "Proveedores",
  "Productos",
  "Pedidos",
  "Facturas",
  "Inventarios",
];

const seguridad = [
  { label: "Usuarios", to: "/app/seguridad/usuarios" },
  { label: "Roles", to: "/app/seguridad/roles" },
  { label: "Objetos", to: "/app/seguridad/objetos" },
  { label: "Permisos", to: "/app/seguridad/permisos" },
  { label: "Bitácora", to: "/app/seguridad/bitacora" },
  { label: "Cambiar Contraseña", to: "/app/seguridad/cambiarcontrasena" },
];

// ============================================================
// ORDEN PRINCIPAL DEL MENÚ
// ============================================================
const menuConfig = [
  { title: "Ventas y Reservas", items: ventasYReservas, basePath: "/app/Ventas" },
  { title: "Producción", items: produccion, basePath: "/app/produccion" },
  { title: "Inventarios", items: inventarios, basePath: "/app/inventarios" },
  { title: "Entregas", items: entregas, basePath: "/app/entregas" },
  { title: "Contabilidad", items: contabilidad, basePath: "/app/contabilidad" },
  { title: "Compras", items: compras, basePath: "/app/compras" },
  { title: "Seguridad", items: seguridad, basePath: "/app/seguridad" },
  { title: "Mantenimiento", items: mantenimiento, basePath: "/app/mantenimiento" },
];

// ============================================================
// Convertidor slug → url-friendly
// ============================================================
const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Correcciones de rutas especiales
const routeOverrides = {
  "/app/entregas/entregas": "/app/entregas/gestion",
  "/app/entregas/detalle-de-entregas": "/app/entregas/detalle",

  "/app/compras/órdenes-de-compra": "/app/compras/orden",
  "/app/compras/detalle-de-compras": "/app/compras/detalle",
};

const Inicio = () => {
  const location = useLocation();

  // 🎨 SINGLE COLOR MODE
  const bgContainer = useColorModeValue("gray.50", "gray.900");
  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBgCard = useColorModeValue("gray.100", "gray.700");
  const textTitleColor = useColorModeValue("green.600", "green.300");

  // ============================================================
  // Render por cada módulo
  // ============================================================
  const renderSection = ({ title, items, basePath }) => {
    const cfg = sectionConfig[title];
    const IconComponent = cfg.icon;

    const isSeguridad = title === "Seguridad";

    return (
      <Box
        key={title}
        bg={bgCard}
        border="1px solid"
        borderColor={borderColor}
        borderLeft="5px solid"
        borderLeftColor={cfg.color}
        borderRadius="lg"
        p={5}
        transition="0.2s"
        _hover={{ shadow: "md" }}
      >
        {/* Título */}
        <Heading
          as="h3"
          size="md"
          mb={4}
          display="flex"
          alignItems="center"
          color={textTitleColor}
        >
          <Icon as={IconComponent} boxSize="6" mr={3} />
          {title}
        </Heading>

        {/* ITEMS */}
        {isSeguridad ? (
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
            {items.map(({ label, to }) => {
              const finalTo = routeOverrides[to] || to;
              const isActive = location.pathname === finalTo;

              return (
                <Link
                  key={label}
                  as={RouterLink}
                  to={finalTo}
                  p={2}
                  borderRadius="md"
                  bg={isActive ? hoverBgCard : "transparent"}
                  fontSize="sm"
                >
                  {label}
                </Link>
              );
            })}
          </SimpleGrid>
        ) : (
          <VStack align="stretch" spacing={2}>
            {items.map((item) => {
              const defaultTo = `${basePath}/${slugify(item)}`;
              const finalTo = routeOverrides[defaultTo] || defaultTo;
              const isActive = location.pathname === finalTo;

              return (
                <Link
                  key={item}
                  as={RouterLink}
                  to={finalTo}
                  p={2}
                  borderRadius="md"
                  bg={isActive ? hoverBgCard : "transparent"}
                  fontSize="sm"
                >
                  {item}
                </Link>
              );
            })}
          </VStack>
        )}
      </Box>
    );
  };

  return (
    <Box p={6} bg={bgContainer} minH="100vh">
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        {menuConfig.map(renderSection)}
      </SimpleGrid>
    </Box>
  );
};

export default Inicio;
