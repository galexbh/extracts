// ============================================================
// 📁 src/components/Compras/ReporteCompras.js
// ✅ Reporte simple de compras con métricas y totales
// ============================================================

import React, { useEffect, useState } from "react";
import {
  Box,
  SimpleGrid,
  Heading,
  Text,
  Flex,
  Icon,
  useColorModeValue,
  Spinner,
} from "@chakra-ui/react";
import { FaShoppingBag, FaMoneyBillWave, FaClipboardList } from "react-icons/fa";
import api from "../../api/apiClient";

export default function ReporteCompras() {
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const accent = useColorModeValue("teal.600", "teal.200");

  const [loading, setLoading] = useState(true);
  const [ordenes, setOrdenes] = useState([]);
  const [detalles, setDetalles] = useState([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [o, d] = await Promise.all([
          api.get("/compras/orden-compra"),
          api.get("/compras/detalle-orden-compra"),
        ]);

        setOrdenes(o.data || []);
        setDetalles(d.data || []);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // ✅ Total de órdenes
  const totalOrdenes = ordenes.length;

  // ✅ Total gastado
  const totalGastado = detalles.reduce(
    (acc, d) => acc + Number(d.subtotal || 0),
    0
  );

  // ✅ Promedio por orden
  const promedio =
    totalOrdenes > 0 ? (totalGastado / totalOrdenes).toFixed(2) : 0;

  if (loading) {
    return (
      <Flex minH="40vh" justify="center" align="center">
        <Spinner size="xl" color="teal.500" />
      </Flex>
    );
  }

  return (
    <Box>
      <Heading size="lg" color={accent} mb={6} textAlign="center">
        Reporte General de Compras
      </Heading>

      {/* TARJETAS DE MÉTRICA */}
      <SimpleGrid columns={[1, 3]} spacing={6} mb={10}>
        {/* TOTAL ORDENES */}
        <Box
          p={5}
          bg={cardBg}
          border="1px solid"
          borderColor={border}
          borderRadius="lg"
          boxShadow="sm"
        >
          <Flex align="center" gap={4}>
            <Icon as={FaClipboardList} color="teal.500" boxSize={10} />
            <Box>
              <Text fontSize="lg" fontWeight="bold">
                {totalOrdenes}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Órdenes registradas
              </Text>
            </Box>
          </Flex>
        </Box>

        {/* TOTAL GASTADO */}
        <Box
          p={5}
          bg={cardBg}
          border="1px solid"
          borderColor={border}
          borderRadius="lg"
          boxShadow="sm"
        >
          <Flex align="center" gap={4}>
            <Icon as={FaMoneyBillWave} color="green.500" boxSize={10} />
            <Box>
              <Text fontSize="lg" fontWeight="bold">
                L. {totalGastado.toFixed(2)}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Total gastado
              </Text>
            </Box>
          </Flex>
        </Box>

        {/* PROMEDIO */}
        <Box
          p={5}
          bg={cardBg}
          border="1px solid"
          borderColor={border}
          borderRadius="lg"
          boxShadow="sm"
        >
          <Flex align="center" gap={4}>
            <Icon as={FaShoppingBag} color="purple.500" boxSize={10} />
            <Box>
              <Text fontSize="lg" fontWeight="bold">
                L. {promedio}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Gasto promedio / orden
              </Text>
            </Box>
          </Flex>
        </Box>
      </SimpleGrid>

      {/* TABLA RESUMEN */}
      <Box
        p={5}
        bg={cardBg}
        border="1px solid"
        borderColor={border}
        borderRadius="lg"
        boxShadow="sm"
      >
        <Heading size="md" color={accent} mb={4}>
          Resumen de Actividad
        </Heading>

        <Text fontSize="md" color="gray.600" mb={2}>
          ✅ Órdenes creadas: <strong>{totalOrdenes}</strong>
        </Text>
        <Text fontSize="md" color="gray.600" mb={2}>
          ✅ Insumos comprados: <strong>{detalles.length}</strong>
        </Text>
        <Text fontSize="md" color="gray.600">
          ✅ Gasto total:{" "}
          <strong>L. {totalGastado.toFixed(2)}</strong>
        </Text>
      </Box>
    </Box>
  );
}
