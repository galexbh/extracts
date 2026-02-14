// ============================================================
// 📁 src/components/Seguridad/Permisos.js
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

export default function Permisos() {
  const accent = useColorModeValue("teal.600", "teal.300");
  const btnBg = useColorModeValue("teal.100", "teal.600");
  const btnColor = useColorModeValue("teal.800", "white");
  const btnHoverBg = useColorModeValue("teal.200", "teal.500");

  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [objetos, setObjetos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔹 Obtener el correo (username) del usuario logueado
  // ============================================================
  const username = localStorage.getItem("userEmail"); // 👈 guardado al iniciar sesión (Firebase)

  // ============================================================
  // 🔹 Cargar permisos desde API
  // ============================================================
  const cargarPermisos = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/permisos");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando permisos:", err);
      toast({
        title: "Error al cargar permisos",
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
  // 🔹 Cargar roles
  // ============================================================
  const cargarRoles = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/roles");
      setRoles(res.data);
    } catch (error) {
      console.error("❌ Error cargando roles:", error);
    }
  }, []);

  // ============================================================
  // 🔹 Cargar objetos
  // ============================================================
  const cargarObjetos = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/objetos");
      setObjetos(res.data);
    } catch (error) {
      console.error("❌ Error cargando objetos:", error);
    }
  }, []);

  // ============================================================
  // 🔹 Carga inicial
  // ============================================================
  useEffect(() => {
    Promise.all([cargarPermisos(), cargarRoles(), cargarObjetos()]);
  }, [cargarPermisos, cargarRoles, cargarObjetos]);

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "id_rol",
      label: "Rol",
      type: "select",
      options: roles.map((r) => ({ label: r.nombre_rol, value: r.id_rol })),
      required: true,
    },
    {
      name: "id_objeto",
      label: "Objeto",
      type: "select",
      options: objetos.map((o) => ({
        label: o.nombre_objeto,
        value: o.id_objeto,
      })),
      required: true,
    },
    { name: "can_create", label: "Puede crear", type: "boolean" },
    { name: "can_read", label: "Puede leer", type: "boolean" },
    { name: "can_update", label: "Puede actualizar", type: "boolean" },
    { name: "can_delete", label: "Puede eliminar", type: "boolean" },
  ];

  // ============================================================
  // 🔹 Funciones CRUD
  // ============================================================

  // ➕ Insertar nuevo permiso
  const handleInsert = async (nuevo) => {
    try {
      await api.post(
        "/seguridad/permisos",
        {
          id_rol: nuevo.id_rol,
          id_objeto: nuevo.id_objeto,
          can_create: nuevo.can_create || false,
          can_read: nuevo.can_read || false,
          can_update: nuevo.can_update || false,
          can_delete: nuevo.can_delete || false,
        },
        {
          headers: { "x-user-email": username }, // 👈 Envía el usuario logueado
        }
      );

      toast({
        title: "Permiso agregado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await cargarPermisos();
    } catch (err) {
      console.error("❌ Error insertando permiso:", err);
      toast({
        title: "Error al agregar permiso",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // ✏️ Actualizar permiso existente
  const handleUpdate = async (editado) => {
    try {
      await api.put(
        `/seguridad/permisos/${editado.id_permiso}`,
        {
          id_rol: editado.id_rol,
          id_objeto: editado.id_objeto,
          can_create: editado.can_create || false,
          can_read: editado.can_read || false,
          can_update: editado.can_update || false,
          can_delete: editado.can_delete || false,
        },
        {
          headers: { "x-user-email": username }, // 👈 registra el usuario modificador
        }
      );

      toast({
        title: "Permiso actualizado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await cargarPermisos();
    } catch (err) {
      console.error("❌ Error actualizando permiso:", err);
      toast({
        title: "Error al actualizar permiso",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // 🗑️ Eliminar permiso
  const handleDelete = async (id) => {
    try {
      await api.delete(`/seguridad/permisos/${id}`);
      toast({
        title: "Permiso eliminado correctamente",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      await cargarPermisos();
    } catch (err) {
      console.error("❌ Error eliminando permiso:", err);
      toast({
        title: "Error al eliminar permiso",
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
  // 🔹 Definición de columnas y extractores
  // ============================================================
  const columns = [
    "ID Permiso",
    "Rol",
    "Objeto",
    "Crear",
    "Leer",
    "Actualizar",
    "Eliminar",
    "Usuario Creado",
    "Fecha Creado",
    "Usuario Modificado",
    "Fecha Modificado",
  ];

  const extractors = {
    "ID Permiso": (r) => r.id_permiso,
    Rol: (r) => r.nombre_rol,
    Objeto: (r) => r.nombre_objeto,
    Crear: (r) => (r.can_create ? "Sí" : "No"),
    Leer: (r) => (r.can_read ? "Sí" : "No"),
    Actualizar: (r) => (r.can_update ? "Sí" : "No"),
    Eliminar: (r) => (r.can_delete ? "Sí" : "No"),
    "Usuario Creado": (r) => r.usuario_creado || "—",
    "Fecha Creado": (r) =>
      r.fecha_creado
        ? new Date(r.fecha_creado).toISOString().split("T")[0]
        : "—",
    "Usuario Modificado": (r) => r.usuario_modificado || "—",
    "Fecha Modificado": (r) =>
      r.fecha_modificado
        ? new Date(r.fecha_modificado).toISOString().split("T")[0]
        : "—",
  };

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
            Permisos
          </Heading>
        </Flex>
        <Divider mb={2} />
      </Box>

      <Box overflowX="auto">
        <CrudTabla
          title="Permisos"
          columns={columns}
          extractors={extractors}
          fields={fields}
          idKey="id_permiso"
          initialData={data}
          onInsert={handleInsert}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReload={cargarPermisos}
          apiUrl="/seguridad/permisos"
        />
      </Box>
    </>
  );
}
