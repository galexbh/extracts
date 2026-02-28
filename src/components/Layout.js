// ============================================================
// 📁 src/components/Layout.jsx — FINAL OPTIMIZADO
// ============================================================

import React, { useState, useEffect } from "react";
import {
  Flex,
  Box,
  useDisclosure,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";
import useIdleTimeout from "../hooks/useIdleTimeout";

// ⏱️ Inactividad máxima: 30 minutos
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export default function Layout() {
  const sidebar = useDisclosure();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const toast = useToast();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ──────────────────────────────────────────────────────────
  // 🔐 Cierre automático de sesión por inactividad (30 min)
  // ──────────────────────────────────────────────────────────
  useIdleTimeout(IDLE_TIMEOUT_MS, () => {
    toast({
      title: "Sesión cerrada",
      description:
        "Tu sesión fue cerrada por inactividad (30 minutos sin actividad).",
      status: "warning",
      duration: 6000,
      isClosable: true,
      position: "top",
    });
  });

  return (
    <Flex minH="100vh">
      {/* Sidebar fijo */}
      <Box
        as="aside"
        w={{ base: "0", md: "240px" }}
        position="fixed"
        left="0"
        top="0"
        h="100vh"
        zIndex="2"
        display={{ base: "none", md: "block" }}
      >
        <Sidebar
          isMobile={isMobile}
          isOpen={sidebar.isOpen}
          onClose={sidebar.onClose}
        />
      </Box>

      {/* Contenido principal */}
      <Box
        flex="1"
        ml={{ base: 0, md: "240px" }}
        bg={useColorModeValue("gray.50", "gray.800")}
        minH="100vh"
      >
        <Header onOpenSidebar={sidebar.onOpen} />

        <Box p="6">
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
}
