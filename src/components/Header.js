// ============================================================
// 📁 src/components/Header.jsx — FINAL
// ============================================================

import React from "react";
import {
  Flex,
  IconButton,
  Text,
  useColorMode,
  useColorModeValue,
  Avatar,
  Tooltip,
  HStack,
} from "@chakra-ui/react";

import { FaBars, FaSun, FaMoon, FaSignOutAlt } from "react-icons/fa";

export default function Header({ onOpenSidebar }) {
  const { colorMode, toggleColorMode } = useColorMode();

  const bg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const userEmail = localStorage.getItem("userEmail");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <Flex
      bg={bg}
      borderBottom="1px solid"
      borderColor={borderColor}
      px="4"
      py="3"
      align="center"
      justify="space-between"
      position="sticky"
      top="0"
      zIndex="20"
      boxShadow="md"
    >
      <HStack spacing="4">
        <IconButton
          icon={<FaBars />}
          display={{ base: "flex", md: "none" }}
          onClick={onOpenSidebar}
          variant="outline"
        />

        <Text fontSize="xl" fontWeight="bold">
          Extractus ERP
        </Text>
      </HStack>

      <HStack spacing="4">
        <Tooltip label="Cambiar tema" hasArrow>
          <IconButton
            icon={colorMode === "light" ? <FaMoon /> : <FaSun />}
            onClick={toggleColorMode}
            variant="ghost"
          />
        </Tooltip>

        <Tooltip label="Cerrar sesión" hasArrow>
          <IconButton
            icon={<FaSignOutAlt />}
            variant="ghost"
            onClick={handleLogout}
          />
        </Tooltip>

        <Tooltip label={userEmail || "Usuario"}>
          <Avatar
            name={userEmail}
            size="sm"
            bg="green.500"
            color="white"
          />
        </Tooltip>
      </HStack>
    </Flex>
  );
}
