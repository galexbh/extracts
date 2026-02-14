// src/components/Contabilidad/Reportes.js
import React, { useMemo, useState } from 'react'
import {
  Box,
  Heading,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Input,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  Text,
  useColorModeValue,
  Link as ChakraLink,
  Button,
  Flex,
} from '@chakra-ui/react'
import { SearchIcon, CloseIcon } from '@chakra-ui/icons'
import {
  MdTrendingUp,
  MdCalendarToday,
  MdPerson,
  MdOutlineReport,
  MdArrowForward,
} from 'react-icons/md'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

const REPORTES = [
  {
    label: 'Producto más vendido',
    to: '/app/contabilidad/reportes/productos-vendidos',
    icon: MdTrendingUp,
    description: 'Producto número uno en ventas/ingresos.',
  },
  {
    label: 'Pedidos diarios',
    to: '/app/contabilidad/reportes/pedidos-diarios',
    icon: MdCalendarToday,
    description: 'Pedidos agregados por fecha',
  },
  {
    label: 'Ventas por Usuario',
    to: '/app/contabilidad/reportes/ventas-usuarios',
    icon: MdPerson,
    description: 'Resumen y detalle por usuario y producto.',
  },
  {
    label: 'Clientes en Mora',
    to: '/app/contabilidad/reportes/clientes-en-mora',
    icon: MdOutlineReport,
    description: 'Créditos vencidos con deuda y días en mora.',
  },
]

export default function DashboardReportes() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const bg         = useColorModeValue('white', 'gray.800')
  const cardBg     = useColorModeValue('white', 'gray.700')
  const cardHover  = useColorModeValue('gray.50', 'gray.600')
  const iconWrapBg = useColorModeValue('teal.50', 'teal.900')
  const iconColor  = useColorModeValue('teal.600', 'teal.200')
  const muted      = useColorModeValue('gray.600', 'gray.300')
  const border     = useColorModeValue('gray.200', 'gray.700')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return REPORTES
    return REPORTES.filter(r =>
      r.label.toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    )
  }, [search])

  return (
    <Box p={8} bg={bg} minH="80vh">
      {/* Encabezado con botón atrás */}
      <Flex align="center" justify="space-between" mb={4} wrap="wrap" gap={3}>
        <Flex align="center" gap={3}>
          <Button size="sm" onClick={() => navigate(-1)} w="fit-content">←</Button>
          <Heading size="md" m={0}>Reportes de Contabilidad</Heading>
        </Flex>
        <Text fontSize="sm" color={muted}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </Text>
      </Flex>

      <InputGroup maxW="420px" mb={6}>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.500" />
        </InputLeftElement>
        <Input
          placeholder="Buscar reporte..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          bg={useColorModeValue('white','gray.900')}
        />
        {search && (
          <InputRightElement>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
            >
              <CloseIcon boxSize={2.5} />
            </Button>
          </InputRightElement>
        )}
      </InputGroup>

      {filtered.length === 0 ? (
        <Box
          p={6}
          border="1px solid"
          borderColor={border}
          borderRadius="md"
          textAlign="center"
        >
          <Text color={muted}>No se encontraron reportes con ese criterio.</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={5}>
          {filtered.map((r) => (
            <ChakraLink
              key={r.label}
              as={RouterLink}
              to={r.to}
              _hover={{ textDecoration: 'none' }}
            >
              <Card
                role="group"
                bg={cardBg}
                border="1px solid"
                borderColor={border}
                borderRadius="lg"
                boxShadow="sm"
                transition="all 0.2s"
                _hover={{ bg: cardHover, transform: 'translateY(-2px)' }}
              >
                <CardBody>
                  <Flex align="center" justify="space-between" gap={4}>
                    <Flex align="center" gap={4} minW={0}>
                      <Box
                        p={2.5}
                        borderRadius="md"
                        bg={iconWrapBg}
                        border="1px solid"
                        borderColor={border}
                      >
                        <Icon as={r.icon} boxSize={5} color={iconColor} />
                      </Box>
                      <Box minW={0}>
                        <Text fontWeight="semibold" noOfLines={1}>
                          {r.label}
                        </Text>
                        {r.description && (
                          <Text fontSize="sm" color={muted} noOfLines={2}>
                            {r.description}
                          </Text>
                        )}
                      </Box>
                    </Flex>
                    <Icon
                      as={MdArrowForward}
                      boxSize={5}
                      color={muted}
                      opacity={0}
                      transform="translateX(-4px)"
                      transition="all 0.2s"
                      _groupHover={{ opacity: 1, transform: 'translateX(0)' }}
                    />
                  </Flex>
                </CardBody>
              </Card>
            </ChakraLink>
          ))}
        </SimpleGrid>
      )}
    </Box>
  )
}
