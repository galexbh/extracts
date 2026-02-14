// ============================================================
// 📁 src/components/Seguridad/Objetos.js
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
import CrudTabla from "./CrudTabla";
import api from "../../api/apiClient"; // ✅ Cliente Axios centralizado

export default function Objetos() {
  const accent = useColorModeValue("teal.600", "teal.300");
  const btnBg = useColorModeValue("teal.100", "teal.600");
  const btnColor = useColorModeValue("teal.800", "white");
  const btnHoverBg = useColorModeValue("teal.200", "teal.500");

  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔹 Obtener el correo (username) del usuario logueado
  // ============================================================
  const username = localStorage.getItem("userEmail"); // 👈 Guardado al iniciar sesión (Firebase)

  // ============================================================
  // 🔹 Cargar objetos desde la API
  // ============================================================
  const cargarObjetos = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/objetos");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando objetos:", err);
      toast({
        title: "Error al cargar objetos",
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
    cargarObjetos();
  }, [cargarObjetos]);

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    { name: "nombre_objeto", label: "Nombre del Objeto", type: "text", required: true },
    { name: "descripcion", label: "Descripción", type: "textarea" },
  ];

  // ============================================================
  // 🔹 Definición de columnas y extractores
  // ============================================================
  const columns = [
    "ID Objeto",
    "Nombre Objeto",
    "Descripción",
    "Usuario Creado",
    "Fecha Creado",
    "Usuario Modificado",
    "Fecha Modificado",
  ];

  const extractors = {
    "ID Objeto": (r) => r.id_objeto,
    "Nombre Objeto": (r) => r.nombre_objeto,
    "Descripción": (r) => r.descripcion || "-",
    "Usuario Creado": (r) => r.usuario_creado || "—",
    "Fecha Creado": (r) =>
      r.fecha_creado ? new Date(r.fecha_creado).toISOString().split("T")[0] : "—",
    "Usuario Modificado": (r) => r.usuario_modificado || "—",
    "Fecha Modificado": (r) =>
      r.fecha_modificado ? new Date(r.fecha_modificado).toISOString().split("T")[0] : "—",
  };

  // ============================================================
  // 🔹 Funciones CRUD (Insertar / Actualizar / Eliminar)
  // ============================================================

  // ➕ Insertar nuevo objeto
  const handleInsert = async (nuevo) => {
    try {
      await api.post(
        "/seguridad/objetos",
        {
          nombre_objeto: nuevo.nombre_objeto,
          descripcion: nuevo.descripcion,
        },
        {
          headers: { "x-user-email": username }, // 👈 Envía el usuario logueado al backend
        }
      );

      toast({
        title: "Objeto agregado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await cargarObjetos();
    } catch (err) {
      console.error("❌ Error insertando objeto:", err);
      toast({
        title: "Error al agregar objeto",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // ✏️ Actualizar objeto existente
  const handleUpdate = async (editado) => {
    try {
      await api.put(
        `/seguridad/objetos/${editado.id_objeto}`,
        {
          nombre_objeto: editado.nombre_objeto,
          descripcion: editado.descripcion,
        },
        {
          headers: { "x-user-email": username },
        }
      );

      toast({
        title: "Objeto actualizado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await cargarObjetos();
    } catch (err) {
      console.error("❌ Error actualizando objeto:", err);
      toast({
        title: "Error al actualizar objeto",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // 🗑️ Eliminar objeto
  const handleDelete = async (id) => {
    try {
      await api.delete(`/seguridad/objetos/${id}`);
      toast({
        title: "Objeto eliminado correctamente",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      await cargarObjetos();
    } catch (err) {
      console.error("❌ Error eliminando objeto:", err);
      toast({
        title: "Error al eliminar objeto",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

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
        <Tooltip label="Volver al menú Seguridad" placement="bottom-start">
          <Button
            leftIcon={<Icon as={FaArrowLeft} />}
            bg={btnBg}
            color={btnColor}
            _hover={{ bg: btnHoverBg, transform: "scale(1.05)" }}
            onClick={() => navigate("/app/seguridad")}
            size="sm"
            mb={3}
            boxShadow="sm"
          >
            Atrás
          </Button>
        </Tooltip>

        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent}>
            Objetos
          </Heading>
        </Flex>
        <Divider mb={2} />
      </Box>

      <Box overflowX="auto">
        <CrudTabla
          title="Objetos"
          columns={columns}
          extractors={extractors}
          fields={fields}
          idKey="id_objeto"
          initialData={data}
          onInsert={handleInsert}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReload={cargarObjetos}
          apiUrl="/seguridad/objetos"
        />
      </Box>
    </>
  );
}
