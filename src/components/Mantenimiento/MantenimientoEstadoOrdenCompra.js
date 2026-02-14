// ============================================================
// 📁 src/components/Mantenimiento/MantenimientoEstadoOrdenCompra.js
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

export default function MantenimientoEstadoOrdenCompra() {
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
  // 🔹 Cargar estados de orden de compra desde la API
  // ============================================================
  const cargarEstadosOrdenCompra = useCallback(async () => {
    try {
      const res = await api.get("/mantenimiento/estado-orden-compra");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando estados de orden de compra:", err);
      toast({
        title: "Error al cargar estados de orden de compra",
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
  // 🔹 Cargar al iniciar
  // ============================================================
  useEffect(() => {
    cargarEstadosOrdenCompra();
  }, [cargarEstadosOrdenCompra]);

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_estado",
      label: "Nombre del Estado de la Orden de Compra",
      type: "text",
      required: true,
    },
  ];

  // ============================================================
  // 🔹 Columnas y extractores
  // ============================================================
  const columns = ["ID", "Nombre del Estado"];

  const extractors = {
    ID: (r) => r.id_estado_orden_compra,
    "Nombre del Estado": (r) => r.nombre_estado,
  };

  // ============================================================
  // 🔹 CRUD: Insertar / Actualizar / Eliminar
  // ============================================================

  // ➕ Insertar nuevo
  const handleInsert = async (nuevo) => {
    try {
      await api.post("/mantenimiento/estado-orden-compra", nuevo);
      toast({
        title: "Estado agregado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await cargarEstadosOrdenCompra();
    } catch (err) {
      console.error("❌ Error al insertar estado:", err);
      toast({
        title: "Error al agregar estado",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // ✏️ Actualizar
  const handleUpdate = async (editado) => {
    try {
      await api.put(`/mantenimiento/estado-orden-compra/${editado.id_estado_orden_compra}`, editado);
      toast({
        title: "Estado actualizado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await cargarEstadosOrdenCompra();
    } catch (err) {
      console.error("❌ Error al actualizar estado:", err);
      toast({
        title: "Error al actualizar estado",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // 🗑️ Eliminar
  const handleDelete = async (id) => {
    try {
      await api.delete(`/mantenimiento/estado-orden-compra/${id}`);
      toast({
        title: "Estado eliminado correctamente",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      await cargarEstadosOrdenCompra();
    } catch (err) {
      console.error("❌ Error al eliminar estado:", err);
      toast({
        title: "Error al eliminar estado",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // ============================================================
  // 🔹 Loader
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
            Estado de Orden de Compra
          </Heading>
        </Flex>
        <Divider mb={2} />
      </Box>

      <Box overflowX="auto">
        <CrudTabla
          title="Estado de Orden de Compra"
          columns={columns}
          extractors={extractors}
          fields={fields}
          idKey="id_estado_orden_compra"
          initialData={data}
          onInsert={handleInsert}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReload={cargarEstadosOrdenCompra}
          apiUrl="/mantenimiento/estado-orden-compra"
        />
      </Box>
    </>
  );
}
