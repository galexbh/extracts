// ============================================================
// 📁 src/components/Mantenimiento/Menumantenimiento.js
// ============================================================
import React from "react";
import {
  Box,
  SimpleGrid,
  Heading,
  Text,
  Icon,
  useColorModeValue,
  Card,
  CardBody,
  Flex,
  LinkBox,
  LinkOverlay,
  Divider,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import {
  FaUser,
  FaBoxes,
  FaProductHunt,
  FaClipboardList,
  FaMoneyCheckAlt,
  FaCogs,
  FaUsers,       // 👥 Tipo de Persona
  FaPhoneAlt,    // 📞 Tipo de Teléfono
  FaUserShield,  // 🧍 Estado de Usuario
  FaAddressCard, // 🧩 Tipo de Cliente
  FaIdBadge,
  FaTags,
   FaFlask  // 🧩 Estado de Cliente
} from "react-icons/fa";

// ============================================================
// 🔹 ÍTEMS DEL MENÚ
// ============================================================
const ITEMS = [
  { label: "Clientes",    to: "/app/mantenimiento/clientes",    icon: FaUser,          desc: "Gestión de clientes." },
  { label: "Proveedores", to: "/app/mantenimiento/proveedores", icon: FaBoxes,         desc: "Gestión de proveedores." },
  { label: "Productos",   to: "/app/mantenimiento/productos",   icon: FaProductHunt,   desc: "Gestión de productos." },
  { label: "Pedidos",     to: "/app/mantenimiento/pedidos",     icon: FaClipboardList, desc: "Gestión de pedidos." },
  { label: "Facturas",    to: "/app/mantenimiento/facturas",    icon: FaMoneyCheckAlt, desc: "Generación de facturas." },
  { label: "Inventarios", to: "/app/mantenimiento/inventarios", icon: FaCogs,          desc: "Gestión de inventarios." },

  // ✅ Nuevos ítems de mantenimiento general
  { label: "Tipo de Persona", to: "/app/mantenimiento/tipo-persona", icon: FaUsers, desc: "Clasificación de personas (Natural o Jurídica)." },
  { label: "Tipo de Teléfono", to: "/app/mantenimiento/tipo-telefono", icon: FaPhoneAlt, desc: "Tipos de teléfonos (Celular, Casa, WhatsApp, etc.)." },
  { label: "Estado de Usuario", to: "/app/mantenimiento/estado-usuario", icon: FaUserShield, desc: "Estados activos, inactivos o suspendidos de usuarios." },

  // ✅ Nuevos ítems: Catálogos de Cliente
  { label: "Tipo de Cliente", to: "/app/mantenimiento/tipo-cliente", icon: FaAddressCard, desc: "Clasificación de clientes (Ej. Mayorista, Minorista, Distribuidor)." },
  { label: "Estado de Cliente", to: "/app/mantenimiento/estado-cliente", icon: FaIdBadge, desc: "Estados de los clientes (Ej. Activo, Inactivo, Bloqueado)." },
  { label: "Estado de Proveedor", to: "/app/mantenimiento/estado-proveedor", icon: FaCogs, desc: "Estados de los proveedores (Ej. Activo, Suspendido, Inactivo)." },
  {  label: "Estado de Orden de Compra", to: "/app/mantenimiento/estado-orden-compra", icon: FaClipboardList, desc: "Estados de las órdenes de compra (Pendiente, Aprobada, Cancelada, etc)." },
  { label: "Estado de Producto", to: "/app/mantenimiento/estado-producto", icon: FaTags, desc: "Controla los estados actuales de los productos (activo, inactivo, dañado, etc)." },
  { label: "Estado de Insumo", to: "/app/mantenimiento/estado-insumo", icon: FaFlask, desc: "Controla los estados de los insumos (Disponible, Agotado, Dañado, etc.)." },
  { label: "Estado de Inventario de Insumo", to: "/app/mantenimiento/estado-inventario-insumo", icon: FaBoxes, desc: "Define los estados de los inventarios de insumos (Ej. Activo, Inactivo, Dañado, Bloqueado, etc.)." },

];



// ============================================================
// 🔹 COMPONENTE PRINCIPAL
// ============================================================
export default function Menumantenimiento() {
  const containerBg = useColorModeValue("gray.50", "gray.900");
  const cardBg      = useColorModeValue("white",   "gray.800");
  const cardHover   = useColorModeValue("gray.50", "gray.700");
  const border      = useColorModeValue("gray.200","gray.700");
  const muted       = useColorModeValue("gray.600","gray.300");
  const accent      = useColorModeValue("teal.600","teal.200");
  const iconBg      = useColorModeValue("teal.50", "teal.900");

  return (
    <Box
      bg={containerBg}
      minH="80vh"
      px={{ base: 4, md: 8 }}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box w="100%" maxW="1100px" textAlign="center">
        {/* 🔹 Título */}
        <Box mb={8}>
          <Heading
            as="h1"
            fontWeight="semibold"
            fontSize={{ base: "2xl", md: "3xl" }}
          >
            Mantenimiento
          </Heading>
          <Divider
            mt={3}
            borderColor={accent}
            borderWidth="2px"
            opacity={1}
            w={{ base: "60%", md: "40%" }}
            mx="auto"
          />
        </Box>

        {/* 🔹 Grid de Tarjetas */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} justifyItems="center">
          {ITEMS.map(({ label, to, icon, desc }) => (
            <LinkBox
              as={Card}
              key={label}
              role="group"
              bg={cardBg}
              border="1px solid"
              borderColor={border}
              borderRadius="lg"
              boxShadow="sm"
              transition="all .2s ease"
              _hover={{
                bg: cardHover,
                transform: "translateY(-2px)",
                boxShadow: "md",
                borderColor: accent,
              }}
              _focusWithin={{
                borderColor: accent,
                boxShadow: "0 0 0 2px rgba(56,178,172,0.3)",
              }}
              maxW="320px"
              w="100%"
            >
              <CardBody>
                <Flex align="center" gap={4}>
                  <Box
                    p={3}
                    rounded="full"
                    bg={iconBg}
                    border="1px solid"
                    borderColor={border}
                    transition="all .2s"
                    _groupHover={{ borderColor: accent }}
                  >
                    <Icon as={icon} boxSize={5} color={accent} />
                  </Box>

                  <Box textAlign="left">
                    <LinkOverlay as={RouterLink} to={to}>
                      <Text fontWeight="semibold" noOfLines={1}>
                        {label}
                      </Text>
                    </LinkOverlay>
                    <Text fontSize="sm" color={muted} noOfLines={2}>
                      {desc}
                    </Text>
                  </Box>
                </Flex>
              </CardBody>
            </LinkBox>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
}
