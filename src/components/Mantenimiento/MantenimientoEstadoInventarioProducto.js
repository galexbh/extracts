// ============================================================
// 📁 src/components/Mantenimiento/MantenimientoEstadoInventarioProducto.js
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import { API_URL } from "../../config";
import {
  Box,
  Flex,
  Heading,
  Divider,
  Spinner,
  useToast,
  useColorModeValue,
  Button,
  Tooltip,
  Icon,
} from "@chakra-ui/react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import CrudTabla from "../Seguridad/CrudTabla"; // ✅ Usa el componente CRUD base

export default function MantenimientoEstadoInventarioProducto() {
  const accent = useColorModeValue("teal.600", "teal.300");
  const btnBg = useColorModeValue("teal.100", "teal.600");
  const btnColor = useColorModeValue("teal.800", "white");
  const btnHoverBg = useColorModeValue("teal.200", "teal.500");

  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔹 Cargar estados de inventarios de productos 
  // ============================================================
  const cargarEstadosInventarioProducto = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/mantenimiento/estado-inventario-producto`
      );
      if (!res.ok) throw new Error("Error al obtener los estados de inventario de producto");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("❌ Error cargando estados de inventario de producto:", err);
      toast({
        title: "Error al cargar estados de inventario de producto",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    cargarEstadosInventarioProducto();
  }, [cargarEstadosInventarioProducto]);

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    { name: "nombre_estado", label: "Nombre del Estado", type: "text", required: true },
  ];

  // ============================================================
  // 🔹 Loader (spinner)
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh">
        <Spinner size="xl" color="teal.400" />
      </Flex>
    );
  }

  // ============================================================
  // 🔹 Render principal
  // ============================================================
  return (
    <>
      <Box p={3}>
        <Tooltip label="Volver al menú de Mantenimiento" placement="bottom-start">
          <Button
            leftIcon={<Icon as={FaArrowLeft} />}
            bg={btnBg}
            color={btnColor}
            _hover={{ bg: btnHoverBg, transform: "scale(1.05)" }}
            onClick={() => navigate("/app/mantenimiento")}
            size="sm"
            mb={3}
            boxShadow="sm"
          >
            Atrás
          </Button>
        </Tooltip>

        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent}>
            Estados de Inventario de Producto
          </Heading>
        </Flex>
        <Divider mb={2} />
      </Box>

      <Box overflowX="auto">
        <CrudTabla
          title="Estados de Inventario de Producto"
          columns={["ID Estado Inventario de Producto", "Nombre del Estado"]}
          extractors={{
            "ID Estado Inventario de Producto": (r) => r.id_estado_inventario_producto, // ✅ CORREGIDO 
            "Nombre del Estado": (r) => r.nombre_estado,
          }}
          fields={fields}
          idKey="id_estado_inventario_producto" // ✅ CORREGIDO
          initialData={data}
          onReload={cargarEstadosInventarioProducto}
          apiUrl={`${API_URL}/mantenimiento/estado-inventario-producto`}
        />
      </Box>
    </>
  );
}