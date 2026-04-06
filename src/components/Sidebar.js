// ============================================================
// 📁 src/components/Sidebar.jsx
// 💎 Sidebar dinámico + responsive + bloqueo de navegación
// ============================================================

import React, { useEffect, useState } from "react";
import {
  Box,
  VStack,
  Text,
  Icon,
  Flex,
  Tooltip,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  DrawerCloseButton,
  Spinner,
} from "@chakra-ui/react";

import { NavLink, useNavigate } from "react-router-dom";

import {
  FaHome,
  FaRegMoneyBillAlt,
  FaCogs,
  FaBoxes,
  FaTruck,
  FaMoneyCheckAlt,
  FaShoppingCart,
  FaShieldAlt,
  FaTools,
} from "react-icons/fa";

import api from "../api/apiClient";

// ============================================================
// 🔹 Módulos disponibles en el sistema
// ============================================================
const menuItems = [
  { label: "Inicio", icon: FaHome, to: "/app" },
  { label: "Ventas y Reservas", icon: FaRegMoneyBillAlt, to: "/app/ventas" },
  { label: "Producción", icon: FaCogs, to: "/app/produccion" },
  { label: "Inventarios", icon: FaBoxes, to: "/app/inventarios" },
  //{ label: "Entregas", icon: FaTruck, to: "/app/entregas" },
  { label: "Contabilidad", icon: FaMoneyCheckAlt, to: "/app/contabilidad" },
  { label: "Compras", icon: FaShoppingCart, to: "/app/compras" },
  { label: "Seguridad", icon: FaShieldAlt, to: "/app/seguridad" },
  //{ label: "Mantenimiento", icon: FaTools, to: "/app/mantenimiento" },
];

// ============================================================
// 🔥 COMPONENTE PRINCIPAL
// ============================================================
export default function Sidebar({ isMobile, isOpen, onClose }) {
  const navigate = useNavigate();
  const salirModal = useDisclosure();
  const [rutaPendiente, setRutaPendiente] = useState(null);
  const [userAccess, setUserAccess] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🎨 COLORES — TODOS LOS HOOKS VAN AQUÍ
  // ============================================================

  const bgSidebar = useColorModeValue("white", "gray.900");
  const borderSidebar = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("green.50", "green.800");
  const bgActive = useColorModeValue("green.100", "green.700");
  const textActive = useColorModeValue("green.800", "white");
  const textInactive = useColorModeValue("gray.500", "gray.500");
  const tituloColor = useColorModeValue("green.600", "green.300");

  // ============================================================
  // 📡 Cargar accesos del usuario
  // ============================================================
  useEffect(() => {
    const fetchAccess = async () => {
      try {
        const response = await api.get(`/seguridad/accesos`);
        const rawAccess = response.data?.accesos;

        let accesos = [];
        if (Array.isArray(rawAccess)) {
          accesos = rawAccess;
        } else if (typeof rawAccess === "string") {
          try {
            accesos = JSON.parse(rawAccess);
          } catch {
            accesos = rawAccess
              .replace(/[\[\]"]/g, "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
          }
        }

        if (accesos.includes("Todos")) {
          setUserAccess(menuItems.map((m) => m.label));
          return;
        }

        setUserAccess(accesos);
      } catch (err) {
        console.error("❌ Error cargando accesos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccess();
  }, []);

  // ============================================================
  // ⏳ Estado de carga
  // ============================================================
  if (loading) {
    return (
      <Box
        bg={bgSidebar}
        w={{ base: "80px", md: "240px" }}
        p="6"
        borderRight="1px solid"
        borderColor={borderSidebar}
        display="flex"
        justifyContent="center"
      >
        <Spinner color="green.400" />
      </Box>
    );
  }

  // ============================================================
  // 📌 CONTENIDO PRINCIPAL DEL MENÚ
  // ============================================================
  const Content = (
    <Box
      bg={bgSidebar}
      w={{ base: "full", md: "240px" }}
      minH="100vh"
      p="6"
      borderRight={{ md: "1px solid" }}
      borderColor={borderSidebar}
    >
      {/* TÍTULO */}
      <Text
        fontWeight="bold"
        fontSize="2xl"
        mb="6"
        color={tituloColor}
        textAlign={{ base: "center", md: "left" }}
      >
        Menú
      </Text>

      {/* OPCIONES DEL MENÚ */}
      <VStack align="stretch" spacing="2">
        {menuItems.map(({ label, icon, to }) => {
          const hasAccess = userAccess.includes(label);
          const IconComp = icon;

          return (
            <Tooltip
              key={label}
              label={hasAccess ? label : "Sin permiso"}
              placement="right"
              hasArrow
            >
              <Flex
                as={hasAccess ? NavLink : "div"}
                to={hasAccess ? to : undefined}
                align="center"
                p="3"
                borderRadius="md"
                cursor={hasAccess ? "pointer" : "not-allowed"}
                color={hasAccess ? textActive : textInactive}
                _hover={
                  hasAccess
                    ? { bg: hoverBg }
                    : { cursor: "not-allowed", bg: "transparent" }
                }
                onClick={(e) => {
                  if (!hasAccess) return;

                  if (isMobile) onClose();

                  if (window.__CAMBIOS_COMPRAS__) {
                    e.preventDefault();
                    setRutaPendiente(to);
                    salirModal.onOpen();
                  }
                }}
              >
                <Icon as={IconComp} boxSize="6" mr="3" />
                <Text fontWeight="medium">{label}</Text>
              </Flex>
            </Tooltip>
          );
        })}
      </VStack>
    </Box>
  );

  // ============================================================
  // 📌 RENDER FINAL
  // ============================================================
  return (
    <>
      {/* MODAL SALIR SIN GUARDAR */}
      <Modal isOpen={salirModal.isOpen} onClose={salirModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Salir sin guardar</ModalHeader>
          <ModalBody>
            Tienes cambios sin guardar en Compras. ¿Deseas salir?
          </ModalBody>
          <ModalFooter>
            <Button onClick={salirModal.onClose}>Cancelar</Button>
            <Button
              colorScheme="red"
              ml={3}
              onClick={() => {
                window.__CAMBIOS_COMPRAS__ = false;
                salirModal.onClose();
                navigate(rutaPendiente);
              }}
            >
              Salir sin guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* SIDEBAR DESKTOP */}
      <Box display={{ base: "none", md: "block" }}>{Content}</Box>

      {/* SIDEBAR MÓVIL */}
      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerBody p="0">{Content}</DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
