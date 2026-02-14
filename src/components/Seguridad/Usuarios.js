// ============================================================
// 📁 src/components/Seguridad/Usuarios.js
// ✅ Versión FINAL con dashboard y SIN botón refrescar
// ============================================================

import React, { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Divider,
  useColorModeValue,
  Spinner,
  useToast,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from "@chakra-ui/react";

import { FaArrowLeft } from "react-icons/fa";
import CrudTabla from "./CrudTabla";
import api from "../../api/apiClient";

// ************************************************************
// ✅ NUEVAS LÍNEAS A AGREGAR
// ************************************************************
import {
  validarRequerido,
  validarEmailSeguridad,
  validarLongitudMinima,
  // Necesitamos una función para validar contraseñas si aplica
} from "../../utils/validaciones"; // Asume esta ruta

export default function Usuarios() {
  const toast = useToast();

  // ============================================================
  // ✅ Paleta unificada claro/oscuro
  // ============================================================
  const accent = useColorModeValue("#0D9488", "#2DD4BF");
  const cardBg = useColorModeValue("#FFFFFF", "#1E293B");
  const borderClr = useColorModeValue("#E2E8F0", "#334155");

  const btnBackBg = useColorModeValue("#0D9488", "#0D9488");
  const btnBackHover = useColorModeValue("#0FAD9B", "#14B8A6");

  // ============================================================
  // ✅ Estados
  // ============================================================
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [estados, setEstados] = useState([]);

  // ============================================================
  // ✅ Cargar datos
  // ============================================================
  const cargarTodo = async () => {
    try {
      setLoading(true);

      const [rU, rR, rE] = await Promise.all([
        api.get("/seguridad/usuarios"),
        api.get("/seguridad/roles"),
        api.get("/mantenimiento/estado-usuario"),
      ]);

      setUsuarios(Array.isArray(rU.data) ? rU.data : []);
      setRoles(Array.isArray(rR.data) ? rR.data : []);
      setEstados(Array.isArray(rE.data) ? rE.data : []);
    } catch (err) {
      toast({
        title: "Error cargando datos",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // ============================================================
  // ✅ Dashboard estadísticas
  // ============================================================
  const totalUsuarios = usuarios.length;

  const activos = usuarios.filter(
    (u) =>
      u.nombre_estado_usuario?.toLowerCase() === "activo" ||
      u.id_estado_usuario === 1
  ).length;

  const inactivos = usuarios.filter(
    (u) =>
      u.nombre_estado_usuario?.toLowerCase() === "inactivo" ||
      u.id_estado_usuario === 2
  ).length;

  // ============================================================
  // ✅ Campos CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_usuario",
      label: "Nombre del Usuario",
      type: "text",
      required: true,
       // Requerido + Mínimo 3 caracteres
      validate: (valor) => 
        validarRequerido(valor, "El Nombre de Usuario") || 
        validarLongitudMinima(valor, "El Nombre de Usuario", 3),
      placeholderText: "Ej. Juan Perez"
    },
    {
      name: "username",
      label: "Correo",
      type: "text",
      required: true,
      // Requerido + Mínimo 3 caracteres + Formato de Email (tu versión)
      validate: (valor) =>
        validarRequerido(valor, "El Correo") || 
        validarLongitudMinima(valor, "El Correo", 3) || 
        validarEmailSeguridad(valor), // ✅ ¡Aquí está el cambio!
      placeholderText: "Ej. usuario@dominio.com",
    },
    {
      name: "password",
      label: "Contraseña",
      type: "password",
      required: false,
      // ✅ VALIDACIÓN
      validate: (valor, form) => {
        // Si estamos creando un nuevo usuario (sin id), la contraseña es obligatoria
        if (!form.id_usuario && !valor) {
          return "La Contraseña es obligatoria al crear un nuevo usuario.";
        }
        // Opcional: Agregar aquí una validación de complejidad (mínimo 8 caracteres, etc.)
        return null;
      },
      // ✅ PLACEHOLDER
      placeholderText: "Ingrese una contraseña (mín. 8 caracteres)",
    },
    {
      name: "id_rol",
      label: "Rol",
      type: "select",
      required: true,
      // ✅ VALIDACIÓN: Requerido para Select
      validate: (valor) => validarRequerido(valor, "El Rol"),
      options: roles.map((r) => ({
        label: r.nombre_rol,
        value: r.id_rol,
      })),
      // ✅ PLACEHOLDER
      placeholderText: "Seleccione un Rol",
    },
    {
      name: "id_estado_usuario",
      label: "Estado",
      type: "select",
      required: true,
      // ✅ VALIDACIÓN: Requerido para Select
      validate: (valor) => validarRequerido(valor, "El Estado"),
      options: estados.map((e) => ({
        label: e.nombre_estado,
        value: e.id_estado_usuario ?? e.id_estado_usuar,
      })),
      // ✅ PLACEHOLDER
      placeholderText: "Seleccione un Estado",
    },
  ];

  const columns = [
    "ID Usuario",
    "Nombre del Usuario",
    "Correo",
    "Rol",
    "Estado",
    "Fecha Creación",
  ];

  const extractors = {
    "ID Usuario": (r) => r.id_usuario,
    "Nombre del Usuario": (r) => r.nombre_usuario || "—",
    Correo: (r) => r.username,
    Rol: (r) => r.nombre_rol || "—",
    Estado: (r) => r.nombre_estado_usuario || "—",
    "Fecha Creación": (r) =>
      r.fecha_creacion
        ? new Date(r.fecha_creacion).toLocaleString("es-HN", {
            timeZone: "America/Tegucigalpa",
          })
        : "—",
  };

  // ============================================================
  // ✅ Loading
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh">
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ============================================================
  // ✅ Render final
  // ============================================================
  return (
    <Box p={4}>
      {/* Botón Atrás */}
      <Button
        leftIcon={<FaArrowLeft />}
        bg={btnBackBg}
        color="white"
        _hover={{ bg: btnBackHover }}
        size="sm"
        mb={4}
        onClick={() => window.history.back()}
      >
        Atrás
      </Button>

      {/* Título */}
      <Heading size="lg" color={accent} mb={3}>
        Usuarios
      </Heading>

      <Divider mb={4} borderColor={borderClr} />

      {/* ======================================================
           ✅ DASHBOARD
      ====================================================== */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
        
        {/* Total */}
        <Box
          bg={cardBg}
          border={`1px solid ${borderClr}`}
          p={5}
          rounded="md"
          shadow="sm"
        >
          <Stat>
            <StatLabel fontSize="lg" color={accent}>
              Usuarios Registrados
            </StatLabel>
            <StatNumber fontSize="3xl">{totalUsuarios}</StatNumber>
            <StatHelpText>Total en el sistema</StatHelpText>
          </Stat>
        </Box>

        {/* Activos */}
        <Box
          bg={cardBg}
          border={`1px solid ${borderClr}`}
          p={5}
          rounded="md"
          shadow="sm"
        >
          <Stat>
            <StatLabel fontSize="lg" color="green.400">
              Activos
            </StatLabel>
            <StatNumber fontSize="3xl" color="green.400">
              {activos}
            </StatNumber>
            <StatHelpText>Usuarios con acceso</StatHelpText>
          </Stat>
        </Box>

        {/* Inactivos */}
        <Box
          bg={cardBg}
          border={`1px solid ${borderClr}`}
          p={5}
          rounded="md"
          shadow="sm"
        >
          <Stat>
            <StatLabel fontSize="lg" color="red.400">
              Inactivos
            </StatLabel>
            <StatNumber fontSize="3xl" color="red.400">
              {inactivos}
            </StatNumber>
            <StatHelpText>Sin acceso al sistema</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* ======================================================
           ✅ TABLA CRUD (sin refrescar arriba)
      ====================================================== */}
      <Box
        bg={cardBg}
        p={3}
        rounded="md"
        border={`1px solid ${borderClr}`}
        shadow="sm"
      >
        <CrudTabla
          title="Usuarios"
          columns={columns}
          extractors={extractors}
          fields={fields}
          idKey="id_usuario"
          apiUrl="/seguridad/usuarios"
          initialData={usuarios}
          onReload={cargarTodo}
        />
      </Box>
    </Box>
  );
}
