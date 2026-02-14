// ============================================================
// 📁 src/components/Mantenimiento/EstadoInsumo.js
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
import CrudTabla from "../Seguridad/CrudTabla";
import api from "../../api/apiClient";

export default function EstadoInsumo() {
  // 🎨 Estilos
  const accent = useColorModeValue("teal.600", "teal.300");
  const btnBg = useColorModeValue("teal.100", "teal.600");
  const btnColor = useColorModeValue("teal.800", "white");
  const btnHoverBg = useColorModeValue("teal.200", "teal.500");

  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔹 Cargar estados de insumo
  // ============================================================
  const cargarEstados = useCallback(async () => {
    try {
      const res = await api.get("/mantenimiento/estado-insumo");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando estados:", err);
      toast({
        title: "Error al cargar estados de insumo",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  }, [toast]);

  useEffect(() => {
    cargarEstados().finally(() => setLoading(false));
  }, [cargarEstados]);

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_estado",
      label: "Nombre del Estado",
      type: "text",
      required: true,
    },
  ];

  // ============================================================
  // 🔹 Columnas y extractores
  // ============================================================
  const columns = ["ID Estado", "Nombre"];
  const extractors = {
    "ID Estado": (r) => r.id_estado_insumo,
    Nombre: (r) => r.nombre_estado,
  };

  // ============================================================
  // 🔹 CRUD funciones
  // ============================================================
  const handleInsert = async (nuevo) => {
    try {
      await api.post("/mantenimiento/estado-insumo", nuevo);
      toast({ title: "Estado agregado correctamente", status: "success" });
      await cargarEstados();
    } catch (err) {
      console.error("❌ Error al insertar:", err);
      toast({
        title: "Error al agregar estado",
        description: err.message,
        status: "error",
      });
    }
  };

  const handleUpdate = async (editado) => {
    try {
      await api.put(
        `/mantenimiento/estado-insumo/${editado.id_estado_insumo}`,
        editado
      );
      toast({ title: "Estado actualizado", status: "success" });
      await cargarEstados();
    } catch (err) {
      toast({
        title: "Error al actualizar",
        description: err.message,
        status: "error",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/mantenimiento/estado-insumo/${id}`);
      toast({ title: "Estado eliminado", status: "info" });
      await cargarEstados();
    } catch (err) {
      toast({
        title: "Error al eliminar",
        description: err.message,
        status: "error",
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
            Gestión de Estados de Insumo
          </Heading>
        </Flex>
        <Divider mb={2} />
      </Box>

      <Box overflowX="auto">
        <CrudTabla
          title="Estados de Insumo"
          columns={columns}
          extractors={extractors}
          fields={fields}
          idKey="id_estado_insumo"
          initialData={data}
          onInsert={handleInsert}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReload={cargarEstados}
          apiUrl="/mantenimiento/estado-insumo"
        />
      </Box>
    </>
  );
}
