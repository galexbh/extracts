// src/components/Seguridad/MenuUsuarios.jsx
import React from 'react';
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
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import {
  FaUserAlt,
  FaUserShield,
  FaCubes,
  FaKey,
  FaCog,
  FaHistory,
  FaClipboardList,
} from 'react-icons/fa';

const ITEMS = [
  // EXISTENTES
 { label: 'Gestión de Empleados', to: '/app/seguridad/personas', icon: FaUserAlt, desc: 'Administración completa de los empleados.' },


  { label: 'Gestión de Usuarios', to: '/app/seguridad/usuarios', icon: FaUserAlt,    desc: 'Creación, edición y estado de usuarios.' },
  { label: 'Gestión de Roles',    to: '/app/seguridad/roles',    icon: FaUserShield, desc: 'Permisos y asignación de privilegios.' },

  // NUEVOS (dirigen a las tablas del módulo de seguridad)
  { label: 'Objetos',                 to: '/app/seguridad/objetos',               icon: FaCubes,         desc: 'Catálogo de objetos del sistema.' },
  { label: 'Permisos por Rol/Objeto', to: '/app/seguridad/permisos',              icon: FaKey,           desc: 'Matriz de permisos CRUD.' },

  { label: 'Bitácora',                to: '/app/seguridad/bitacora',              icon: FaClipboardList, desc: 'Eventos y auditoría del sistema.' },

];

export default function MenuUsuarios() {
  const containerBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg      = useColorModeValue('white',   'gray.800');
  const cardHover   = useColorModeValue('gray.50', 'gray.700');
  const border      = useColorModeValue('gray.200','gray.700');
  const muted       = useColorModeValue('gray.600','gray.300');

  const accent      = useColorModeValue('teal.600','teal.200');
  const iconBg      = useColorModeValue('teal.50', 'teal.900');

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
        {/* Título grande + línea marcada */}
        <Box mb={8}>
          <Heading
            as="h1"
            fontWeight="semibold"
            fontSize={{ base: '2xl', md: '3xl' }}
          >
            Seguridad
          </Heading>
          <Divider
            mt={3}
            borderColor={accent}
            borderWidth="2px"
            opacity={1}
            w={{ base: '60%', md: '40%' }}
            mx="auto"
          />
        </Box>

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
              _hover={{ bg: cardHover, transform: 'translateY(-2px)', boxShadow: 'md', borderColor: accent }}
              _focusWithin={{ borderColor: accent, boxShadow: '0 0 0 2px rgba(56,178,172,0.3)' }}
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
                      <Text fontWeight="semibold" noOfLines={1}>{label}</Text>
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
