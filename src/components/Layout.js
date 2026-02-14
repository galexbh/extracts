// ============================================================
// 📁 src/components/Layout.jsx — FINAL OPTIMIZADO
// ============================================================

import React from "react";
import { Flex, Box, useDisclosure, useColorModeValue } from "@chakra-ui/react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";

export default function Layout() {
  const sidebar = useDisclosure();
  const isMobile = window.innerWidth < 768;

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
