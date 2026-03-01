// ============================================================
// 📁 src/components/Seguridad/Permisos.js
// ✅ Versión FINAL — Diseño uniforme con Roles/Objetos
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
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from "@chakra-ui/react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import CrudTabla from "./CrudTabla";
import api from "../../api/apiClient";

export default function Permisos() {
  // ============================================================
  // ✅ Paleta de colores (modo claro/oscuro) — IGUAL que Roles/Objetos
  // ============================================================
  const accent = useColorModeValue("#0D9488", "#2DD4BF");
  const cardBg = useColorModeValue("#FFFFFF", "#1E293B");
  const borderClr = useColorModeValue("#E2E8F0", "#334155");

  const btnBackBg = useColorModeValue("#0D9488", "#0D9488");
  const btnBackHover = useColorModeValue("#0FAD9B", "#14B8A6");

  // ============================================================
  // ✅ Estados
  // ============================================================
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [objetos, setObjetos] = useState([]);
  const [loading, setLoading] = useState(true);

  const username = localStorage.getItem("userEmail");

  // ============================================================
  // ✅ Cargar datos
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

  const cargarRoles = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/roles");
      setRoles(res.data);
    } catch (error) {
      console.error("❌ Error cargando roles:", error);
    }
  }, []);

  const cargarObjetos = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/objetos");
      const all = Array.isArray(res.data) ? res.data : res.data.rows || [];
      setObjetos(all);
    } catch (error) {
      console.error("❌ Error cargando objetos:", error);
    }
  }, []);

  useEffect(() => {
    Promise.all([cargarPermisos(), cargarRoles(), cargarObjetos()]);
  }, [cargarPermisos, cargarRoles, cargarObjetos]);

  // ============================================================
  // ✅ Dashboard stats
  // ============================================================
  const totalPermisos = data.length;
  const permisosCompletos = data.filter(
    (p) => p.can_create && p.can_read && p.can_update && p.can_delete
  ).length;
  const permisosSoloLectura = data.filter(
    (p) => p.can_read && !p.can_create && !p.can_update && !p.can_delete
  ).length;

  // ============================================================
  // ✅ Campos del formulario CRUD
  // ============================================================
  // Validación: al menos un permiso debe estar marcado
  const validarAlMenosUno = (_val, form) => {
    const alguno = form.can_create || form.can_read || form.can_update || form.can_delete;
    if (!alguno) return "Debe asignar al menos un permiso (crear, leer, actualizar o eliminar).";
    return null;
  };

  const fields = [
    {
      name: "id_rol",
      label: "Rol",
      type: "select",
      options: roles.map((r) => ({ label: r.nombre_rol, value: r.id_rol })),
      required: true,
      validate: (v) => (!v ? "Debe seleccionar un rol." : null),
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
      validate: (v) => (!v ? "Debe seleccionar un objeto." : null),
    },
    { name: "can_create", label: "Puede crear", type: "boolean", validate: validarAlMenosUno },
    { name: "can_read", label: "Puede leer", type: "boolean", validate: validarAlMenosUno },
    { name: "can_update", label: "Puede actualizar", type: "boolean", validate: validarAlMenosUno },
    { name: "can_delete", label: "Puede eliminar", type: "boolean", validate: validarAlMenosUno },
  ];

  // ============================================================
  // ✅ Columnas y extractores
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
    Crear: (r) => (r.can_create ? "✅" : "❌"),
    Leer: (r) => (r.can_read ? "✅" : "❌"),
    Actualizar: (r) => (r.can_update ? "✅" : "❌"),
    Eliminar: (r) => (r.can_delete ? "✅" : "❌"),
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
  // ✅ Funciones CRUD
  // ============================================================
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
          headers: { "x-user-email": username },
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
      const status = err.response?.status;
      const mensaje = err.response?.data?.error || err.message;
      toast({
        title: status === 409 ? "Permiso duplicado" : "Error al agregar permiso",
        description: mensaje,
        status: status === 409 ? "warning" : "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

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
          headers: { "x-user-email": username },
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
      const status = err.response?.status;
      const mensaje = err.response?.data?.error || err.message;
      toast({
        title: status === 409 ? "Combinación duplicada" : "Error al actualizar permiso",
        description: mensaje,
        status: status === 409 ? "warning" : "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/seguridad/permisos/${id}`, {
        headers: { "x-user-email": username },
      });
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
  // ✅ Loader
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh">
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ============================================================
  // ✅ Render Final — Diseño uniforme con Roles/Objetos
  // ============================================================
  return (
    <Box p={4}>
      {/* 🔙 Botón Atrás */}
      <Tooltip label="Volver al módulo Seguridad" placement="bottom-start">
        <Button
          leftIcon={<Icon as={FaArrowLeft} />}
          bg={btnBackBg}
          color="white"
          _hover={{ bg: btnBackHover }}
          onClick={() => navigate("/app/seguridad")}
          size="sm"
          mb={4}
        >
          Atrás
        </Button>
      </Tooltip>

      {/* 🏷️ Título */}
      <Heading size="lg" color={accent} mb={3}>
        Permisos por Rol / Objeto
      </Heading>

      <Divider mb={4} borderColor={borderClr} />

      {/* ✅ DASHBOARD */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color={accent}>Permisos Registrados</StatLabel>
            <StatNumber fontSize="3xl">{totalPermisos}</StatNumber>
            <StatHelpText>Total configurados</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="green.400">Acceso Completo</StatLabel>
            <StatNumber fontSize="3xl" color="green.400">{permisosCompletos}</StatNumber>
            <StatHelpText>CRUD total (crear+leer+editar+eliminar)</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="orange.400">Solo Lectura</StatLabel>
            <StatNumber fontSize="3xl" color="orange.400">{permisosSoloLectura}</StatNumber>
            <StatHelpText>Permiso solo de consulta</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* ✅ TABLA CRUD */}
      <Box
        bg={cardBg}
        p={3}
        rounded="md"
        border={`1px solid ${borderClr}`}
        shadow="sm"
      >
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
    </Box>
  );
}
