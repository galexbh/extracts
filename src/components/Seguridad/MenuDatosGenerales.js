// ============================================================
// 📁 src/components/Seguridad/MenuDatosGenerales.js
// ============================================================

import React from "react";
import {
  Box,
  SimpleGrid,
  Heading,
  Text,
  Icon,
  Card,
  CardBody,
  Flex,
  LinkBox,
  LinkOverlay,
  Divider,
  Button,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaMapMarkedAlt, FaPhone, FaArrowLeft } from "react-icons/fa";

const ITEMS = [
  {
    label: "Personas",
    to: "/app/seguridad/datosgenerales/personas",
    icon: FaUser,
    desc: "Registro de personas en el sistema.",
  },
  {
    label: "Correos",
    to: "/app/seguridad/datosgenerales/correos",
    icon: FaEnvelope,
    desc: "Direcciones de correo electrónico asociadas.",
  },
  {
    label: "Direcciones",
    to: "/app/seguridad/datosgenerales/direcciones",
    icon: FaMapMarkedAlt,
    desc: "Direcciones físicas registradas.",
  },
  {
    label: "Teléfonos",
    to: "/app/seguridad/datosgenerales/telefonos",
    icon: FaPhone,
    desc: "Números de teléfono de contacto.",
  },
];

export default function MenuDatosGenerales() {
  const navigate = useNavigate();
  const accent = useColorModeValue("teal.600", "teal.300");
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const hover = useColorModeValue("gray.50", "gray.700");
  const btnBg = useColorModeValue("teal.100", "teal.600");
  const btnHover = useColorModeValue("teal.200", "teal.500");
  const btnColor = useColorModeValue("teal.800", "white");

  return (
    <Box px={8} py={10} textAlign="center">
      {/* 🔙 Botón Atrás */}
      <Flex mb={4} justify="flex-start">
        <Tooltip label="Volver al menú de Seguridad" placement="bottom-start">
          <Button
            leftIcon={<FaArrowLeft />}
            bg={btnBg}
            color={btnColor}
            _hover={{ bg: btnHover, transform: "scale(1.05)" }}
            onClick={() => navigate("/app/seguridad")}
            size="sm"
            boxShadow="sm"
          >
            Atrás
          </Button>
        </Tooltip>
      </Flex>

      {/* 🔹 Título principal */}
      <Heading mb={4}>Datos Generales</Heading>
      <Divider mb={8} borderColor={accent} borderWidth="2px" />

      {/* 🔹 Tarjetas */}
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
            transition="all .2s ease"
            _hover={{
              bg: hover,
              transform: "translateY(-2px)",
              boxShadow: "md",
              borderColor: accent,
            }}
            maxW="320px"
            w="100%"
          >
            <CardBody>
              <Flex align="center" gap={4}>
                <Box p={3} rounded="full" bg="teal.100">
                  <Icon as={icon} boxSize={5} color={accent} />
                </Box>
                <Box textAlign="left">
                  <LinkOverlay as={RouterLink} to={to}>
                    <Text fontWeight="semibold">{label}</Text>
                  </LinkOverlay>
                  <Text fontSize="sm" color="gray.500" noOfLines={2}>
                    {desc}
                  </Text>
                </Box>
              </Flex>
            </CardBody>
          </LinkBox>
        ))}
      </SimpleGrid>
    </Box>
  );
}
