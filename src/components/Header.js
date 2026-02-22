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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from "@chakra-ui/react";

import { FaBars, FaSun, FaMoon, FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Header({ onOpenSidebar }) {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();

  const bg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const subtleColor = useColorModeValue("gray.500", "gray.400");

  const userEmail = localStorage.getItem("userEmail") || "";

  const doLogout = async () => {
    onClose();
    try { await signOut(auth); } catch (_) { }
    // Limpiar sesión respetando rememberMe
    const keep = ["rememberMe", "rememberEmail", "rememberPass"];
    Object.keys(localStorage).forEach((k) => {
      if (!keep.includes(k)) localStorage.removeItem(k);
    });
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <>
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
        boxShadow="sm"
      >
        <HStack spacing="4">
          {/* Botón hamburguesa solo en móvil */}
          <IconButton
            icon={<FaBars />}
            display={{ base: "flex", md: "none" }}
            onClick={onOpenSidebar}
            variant="outline"
            aria-label="Abrir menú"
          />
          <Text fontSize="xl" fontWeight="bold">
            Extractus ERP
          </Text>
        </HStack>

        <HStack spacing="3">
          <Tooltip label="Cambiar tema" hasArrow>
            <IconButton
              icon={colorMode === "light" ? <FaMoon /> : <FaSun />}
              onClick={toggleColorMode}
              variant="ghost"
              aria-label="Cambiar tema"
            />
          </Tooltip>

          <Tooltip label="Cerrar sesión" hasArrow>
            <IconButton
              icon={<FaSignOutAlt />}
              variant="ghost"
              colorScheme="red"
              onClick={onOpen}
              aria-label="Cerrar sesión"
            />
          </Tooltip>

          <Tooltip label={userEmail || "Usuario"} hasArrow>
            <Avatar
              name={userEmail}
              size="sm"
              bg="teal.500"
              color="white"
            />
          </Tooltip>
        </HStack>
      </Flex>

      {/* Modal confirmación logout */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent borderRadius="xl">
          <ModalHeader color="red.500" display="flex" alignItems="center" gap={2}>
            <FaSignOutAlt /> Cerrar sesión
          </ModalHeader>
          <ModalBody pb={4}>
            <Text fontSize="sm" color={subtleColor}>
              ¿Estás seguro de que deseas cerrar la sesión?
            </Text>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button colorScheme="red" size="sm" leftIcon={<FaSignOutAlt />} onClick={doLogout}>
              Sí, cerrar sesión
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
