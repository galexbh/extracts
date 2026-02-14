// ============================================================
// 📁 src/components/Mantenimiento/EstadoInventarioInsumo.js
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
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
import CrudTabla from "../Seguridad/CrudTabla"; // ✅ Reutilizable
import api from "../../api/apiClient";

export default function EstadoInventarioInsumo() {
  // ============================================================
  // 🎨 Estilos Chakra
  // ============================================================
  const accent = useColorModeValue("teal.600", "teal.300");
  const btnBg = useColorModeValue("teal.100", "teal.600");
  const btnColor = useColorModeValue("teal.800", "white");
  const btnHoverBg = useColorModeValue("teal.200", "teal.500");

  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔹 Cargar estados desde la API
  // ============================================================
  const cargarEstadosInventarioInsumo = useCallback(async () => {
    try {
      const res = await api.get("/mantenimiento/estado-inventario-insumo");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando estados de inventario de insumo:", err);
      toast({
        title: "Error al cargar estados de inventario de insumo",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ============================================================
  // 🔹 Carga inicial
  // ============================================================
  useEffect(() => {
    cargarEstadosInventarioInsumo();
  }, [cargarEstadosInventarioInsumo]);

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_estado",
      label: "Nombre del Estado del Inventario de Insumo",
      type: "text",
      required: true,
    },
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
        <Tooltip label="Volver al menú Mantenimiento" placement="bottom-start">
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
            Estado de Inventario de Insumo
          </Heading>
        </Flex>
        <Divider mb={2} />
      </Box>

      <Box overflowX="auto">
        <CrudTabla
          title="Estado de Inventario de Insumo"
          columns={["ID", "Nombre del Estado"]}
          extractors={{
            ID: (r) => r.id_estado_inventario_insumo,
            "Nombre del Estado": (r) => r.nombre_estado,
          }}
          fields={fields}
          idKey="id_estado_inventario_insumo"
          initialData={data}
          onReload={cargarEstadosInventarioInsumo}
          apiUrl="/mantenimiento/estado-inventario-insumo" // ✅ Endpoint backend
        />
      </Box>
    </>
  );
}
