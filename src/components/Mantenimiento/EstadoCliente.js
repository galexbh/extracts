// ============================================================
// 📁 src/components/Mantenimiento/EstadoCliente.js
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
import CrudTabla from "../Seguridad/CrudTabla"; // ✅ Componente CRUD reutilizable
import api from "../../api/apiClient"; // ✅ Cliente Axios centralizado

export default function EstadoCliente() {
  // ============================================================
  // 🎨 Estilos dinámicos Chakra
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
  const cargarEstadosCliente = useCallback(async () => {
    try {
      const res = await api.get("/mantenimiento/estado-cliente");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando estados de cliente:", err);
      toast({
        title: "Error al cargar estados de cliente",
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
  // 🔹 Ejecutar carga inicial
  // ============================================================
  useEffect(() => {
    cargarEstadosCliente();
  }, [cargarEstadosCliente]);

  // ============================================================
  // 🔹 Definición de campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_estado",
      label: "Nombre del Estado del Cliente",
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
            Estado de Cliente
          </Heading>
        </Flex>
        <Divider mb={2} />
      </Box>
<Box overflowX="auto">
  <CrudTabla
    title="Estado de Cliente"
    columns={["ID", "Nombre del Estado"]}
    extractors={{
      ID: (r) => r.id_estado_cliente,
      "Nombre del Estado": (r) => r.nombre_estado,
    }}
    fields={fields}
    idKey="id_estado_cliente"
    initialData={data}
    onReload={cargarEstadosCliente}
    apiUrl="/mantenimiento/estado-cliente" // ✅ Endpoint del backend
  />
</Box>
    </>
  );
}
