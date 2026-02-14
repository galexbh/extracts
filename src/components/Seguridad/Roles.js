// ============================================================
// 📁 src/components/Seguridad/Roles.js
// ✅ Versión FINAL — Diseño moderno, dashboard y sin botones duplicados
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
  Checkbox,
  CheckboxGroup,
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

export default function Roles() {
  // ============================================================
  // ✅ Paleta de colores (modo claro/oscuro)
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
  const [loading, setLoading] = useState(true);

  // ============================================================
  // ✅ Accesos disponibles
  // ============================================================
  const opcionesAccesos = [
    "Ventas y Reservas",
    "Producción",
    "Inventarios",
    "Entregas",
    "Contabilidad",
    "Compras",
    "Seguridad",
    "Mantenimiento",
    "Todos",
  ];

  // ============================================================
  // ✅ Cargar Roles
  // ============================================================
  const cargarRoles = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/roles");

      const normalizados = res.data.map((r) => {
        let accesos = [];
        if (Array.isArray(r.accesos)) accesos = r.accesos;
        else if (typeof r.accesos === "string") {
          try {
            accesos = JSON.parse(r.accesos);
          } catch {
            accesos = r.accesos.split(",").map((a) => a.trim());
          }
        }
        return { ...r, accesos };
      });

      setData(normalizados);
    } catch (err) {
      toast({
        title: "Error al cargar roles",
        description: err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarRoles();
  }, [cargarRoles]);

  // ============================================================
  // ✅ Dashboard stats
  // ============================================================
  const totalRoles = data.length;
  const rolesFullAccess = data.filter((r) =>
    r.accesos?.includes("Todos")
  ).length;
  const rolesSinAccesos = data.filter(
    (r) => !r.accesos || r.accesos.length === 0
  ).length;

  // ============================================================
  // ✅ Campos del CRUD
  // ============================================================
  const fields = [
    { name: "nombre_rol", label: "Nombre del Rol", type: "text", required: true },
    { name: "descripcion", label: "Descripción", type: "textarea" },
    {
      name: "accesos",
      label: "Accesos",
      type: "custom",
      render: (value, onChange) => (
        <CheckboxGroup
          value={Array.isArray(value) ? value : []}
          onChange={(val) => onChange(val)}
        >
          <SimpleGrid columns={[2, 2]} spacing={2} mt={2}>
            {opcionesAccesos.map((acc) => (
              <Checkbox key={acc} value={acc}>
                {acc}
              </Checkbox>
            ))}
          </SimpleGrid>
        </CheckboxGroup>
      ),
    },
  ];

  const extractors = {
    "ID Rol": (r) => r.id_rol,
    "Nombre Rol": (r) => r.nombre_rol,
    "Descripción": (r) => r.descripcion || "-",
    "Accesos": (r) =>
      Array.isArray(r.accesos)
        ? r.accesos.join(", ")
        : typeof r.accesos === "string"
        ? r.accesos.replace(/[\[\]"]/g, "")
        : "-",
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
  // ✅ Render Final
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
        Roles
      </Heading>

      <Divider mb={4} borderColor={borderClr} />

      {/* ✅ DASHBOARD */}
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
              Roles Registrados
            </StatLabel>
            <StatNumber fontSize="3xl">{totalRoles}</StatNumber>
            <StatHelpText>Total configurados</StatHelpText>
          </Stat>
        </Box>

        {/* Roles con “Todos” */}
        <Box
          bg={cardBg}
          border={`1px solid ${borderClr}`}
          p={5}
          rounded="md"
          shadow="sm"
        >
          <Stat>
            <StatLabel fontSize="lg" color="green.400">
              Acceso Total
            </StatLabel>
            <StatNumber fontSize="3xl" color="green.400">
              {rolesFullAccess}
            </StatNumber>
            <StatHelpText>Rol con permisos completos</StatHelpText>
          </Stat>
        </Box>

        {/* Sin accesos */}
        <Box
          bg={cardBg}
          border={`1px solid ${borderClr}`}
          p={5}
          rounded="md"
          shadow="sm"
        >
          <Stat>
            <StatLabel fontSize="lg" color="red.400">
              Sin Accesos
            </StatLabel>
            <StatNumber fontSize="3xl" color="red.400">
              {rolesSinAccesos}
            </StatNumber>
            <StatHelpText>Roles sin permisos asignados</StatHelpText>
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
          title="Roles"
          columns={["ID Rol", "Nombre Rol", "Descripción", "Accesos"]}
          extractors={extractors}
          fields={fields}
          idKey="id_rol"
          initialData={data}
          onReload={cargarRoles}
          apiUrl="/seguridad/roles"
          preprocessSave={(item) => ({
            ...item,
            accesos: JSON.stringify(item.accesos || []),
          })}
        />
      </Box>
    </Box>
  );
}
