// ============================================================
// 📁 src/components/Produccion/Insumos.js
// 💎 Gestión de Insumos con control de stock mínimo y máximo
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
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
  HStack,
} from "@chakra-ui/react";
import {
  FaArrowLeft,
  FaBoxOpen,
  FaCheckCircle,
  FaTimesCircle
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import CrudTabla from "../Seguridad/CrudTabla"; // ✅ Reutilizable
import api from "../../api/apiClient"; // ✅ Axios centralizado

export default function Insumos() {
  // ============================================================
  // 🎨 Estilos Chakra
  // ============================================================
  // 🎨 Colores adaptados a día/noche (Idénticos al módulo Clientes)
  const accent = useColorModeValue("#009e73", "teal.300");
  const pageBg = useColorModeValue("#f7faf8", "#020617");
  const cardBg = useColorModeValue("white", "#0b1120");
  const borderColor = useColorModeValue("#c2d4c3", "#1f2937");

  const btnBackBg = useColorModeValue("teal.100", "teal.600");
  const btnBackColor = useColorModeValue("teal.800", "white");
  const btnBackHoverBg = useColorModeValue("teal.200", "teal.500");
  const topBarBg = useColorModeValue("teal.600", "teal.800");

  const statTotalBg = useColorModeValue("#e8f7f0", "rgba(0,158,115,0.12)");
  const statActivosBg = useColorModeValue("#e9f9ee", "rgba(56,161,105,0.12)");
  const statInactivosBg = useColorModeValue("#ffe9e9", "rgba(245,101,101,0.12)");

  const subtitleColor = useColorModeValue("gray.600", "gray.300");
  const activosNumberColor = useColorModeValue("green.600", "green.300");
  const inactivosNumberColor = useColorModeValue("red.500", "red.300");

  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔹 Cargar insumos
  // ============================================================
  const cargarInsumos = useCallback(async () => {
    try {
      const res = await api.get("/produccion/insumos");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando insumos:", err);
      toast({
        title: "Error al cargar insumos",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  }, [toast]);

  // ============================================================
  // 🔹 Cargar estados de insumo
  // ============================================================
  const cargarEstados = useCallback(async () => {
    try {
      const res = await api.get("/mantenimiento/estado-insumo");
      setEstados(res.data);
    } catch (err) {
      console.warn("⚠️ No se pudieron cargar los estados:", err.message);
      setEstados([]);
    }
  }, []);

  // ============================================================
  // 🔹 Cargar ambos al inicio
  // ============================================================
  useEffect(() => {
    Promise.all([cargarInsumos(), cargarEstados()]).finally(() =>
      setLoading(false)
    );
  }, [cargarInsumos, cargarEstados]);

  // ============================================================
  // 🔹 Calculadora de Estadísticas para Dashboard Frontal
  // ============================================================
  const { totalInsumos, insActivos, insInactivos } = React.useMemo(() => {
    const total = data.length;

    const activos = data.filter((r) => {
      const estado = (r.estado_insumo || r.nombre_estado_insumo || "")
        .toString()
        .toLowerCase();
      return estado === "activo";
    }).length;

    const inactivos = total - activos;

    return {
      totalInsumos: total,
      insActivos: activos,
      insInactivos: inactivos,
    };
  }, [data]);

  // ============================================================
  // 🔹 Utilidades de Validación (Inyectadas para CrudTabla)
  // ============================================================
  const validarRequerido = (valor, campo) => {
    if (!valor || String(valor).trim() === "") return `El campo ${campo} es obligatorio.`;
    return null;
  };

  const validarSoloLetras = (valor, campo) => {
    const errorReq = validarRequerido(valor, campo);
    if (errorReq) return errorReq;
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regex.test(valor)) {
      return `El campo ${campo} solo debe contener letras y espacios.`;
    }
    return null;
  };

  const sanitizeTexto = (valor) => {
    if (!valor) return "";
    return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""); // Borra números al tipear
  };

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_insumo",
      label: "Nombre del Insumo",
      type: "text",
      required: true,
      placeholderText: "Ej. Sal, Azucar",
      validate: (v) => validarSoloLetras(v, "Nombre del Insumo"),
      sanitize: sanitizeTexto,
    },
    {
      name: "unidad_medida",
      label: "Unidad de Medida",
      type: "select",
      required: true,
      options: [
        { value: "Litro", label: "Litro" },
        { value: "Galón", label: "Galón" }
      ],
      validate: (v) => {
        if (!v) return "Debe seleccionar una unidad de medida.";
        return null;
      }
    },
    {
      name: "precio_unitario",
      label: "Precio Unitario (Lps)",
      type: "number",
      step: "0.01",
      min: "0.01",
      required: true,
      validate: (v) => {
        if (!v || Number(v) <= 0) return "El precio debe ser mayor a 0.";
        return null;
      }
    },
    {
      name: "stock_minimo",
      label: "Stock Mínimo",
      type: "number",
      step: "0.01",
      min: "0",
      required: true,
      validate: (v) => {
        if (v === "" || v === undefined) return "El Stock Mínimo es obligatorio";
        if (Number(v) < 0) return "El stock no puede ser negativo";
        return null;
      }
    },
    {
      name: "stock_maximo",
      label: "Stock Máximo",
      type: "number",
      step: "0.01",
      min: "0",
      required: true,
      validate: (v, formData) => {
        if (v === "" || v === undefined) return "El Stock Máximo es obligatorio";
        const valMax = Number(v);
        const valMin = Number(formData.stock_minimo);
        if (valMax < 0) return "El stock no puede ser negativo";
        if (valMax < valMin) {
          return `El Stock Máximo (${valMax}) no puede ser menor al Mínimo (${valMin}).`;
        }
        return null;
      }
    },
    {
      name: "id_estado_insumo",
      label: "Estado del Insumo",
      type: "select",
      required: true,
      options: estados
        .filter((e) => e.nombre_estado.toLowerCase() === "activo" || e.nombre_estado.toLowerCase() === "inactivo")
        .map((e) => ({
          value: e.id_estado_insumo,
          label: e.nombre_estado,
        })),
      validate: (v) => {
        if (!v) return "Debe seleccionar un estado.";
        return null;
      }
    },
  ];

  // ============================================================
  // 🔹 Columnas y extractores
  // ============================================================
  const columns = [
    "ID Insumo",
    "Nombre",
    "Unidad",
    "Precio Unitario",
    "Stock Mínimo",
    "Stock Máximo",
    "Estado",
    "Fecha Creación",
  ];

  const extractors = {
    "ID Insumo": (r) => r.id_insumo,
    Nombre: (r) => r.nombre_insumo,
    Unidad: (r) => r.unidad_medida,
    "Precio Unitario": (r) =>
      `L. ${parseFloat(r.precio_unitario || 0).toFixed(2)}`,
    "Stock Mínimo": (r) => parseFloat(r.stock_minimo || 0).toFixed(2),
    "Stock Máximo": (r) => parseFloat(r.stock_maximo || 0).toFixed(2),
    Estado: (r) => r.nombre_estado_insumo || "—",
    "Fecha Creación": (r) =>
      r.fecha_creacion
        ? new Date(r.fecha_creacion).toLocaleString("es-HN", {
          timeZone: "America/Tegucigalpa",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        : "—",
  };

  // ============================================================
  // 🔹 CRUD operaciones
  // ============================================================
  const handleInsert = async (nuevo) => {
    try {
      await api.post("/produccion/insumos", {
        ...nuevo,
        stock_minimo: parseFloat(nuevo.stock_minimo) || 0,
        stock_maximo: parseFloat(nuevo.stock_maximo) || 0,
      });

      // 🔄 Refrescar datos después de insertar
      const res = await api.get("/produccion/insumos");
      setData(res.data);

      toast({
        title: "✅ Insumo agregado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error("❌ Error al insertar insumo:", err);
      toast({
        title: "Error al agregar insumo",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleUpdate = async (editado) => {
    try {
      await api.put(`/produccion/insumos/${editado.id_insumo}`, {
        ...editado,
        stock_minimo: parseFloat(editado.stock_minimo) || 0,
        stock_maximo: parseFloat(editado.stock_maximo) || 0,
      });

      // 🔄 Refrescar datos después de actualizar
      const res = await api.get("/produccion/insumos");
      setData(res.data);

      toast({
        title: "✏️ Insumo actualizado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error("❌ Error al actualizar insumo:", err);
      toast({
        title: "Error al actualizar insumo",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/produccion/insumos/${id}`);

      // 🔄 Refrescar datos después de eliminar
      const res = await api.get("/produccion/insumos");
      setData(res.data);

      toast({
        title: "🗑️ Insumo eliminado correctamente",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error("❌ Error al eliminar insumo:", err);
      toast({
        title: "Error al eliminar insumo",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // ============================================================
  // 🔹 Loader (mientras carga)
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
    <Box bg={pageBg} minH="100vh" p={4}>
      {/* Botón Atrás */}
      <Tooltip label="Volver al menú Producción" placement="bottom-start">
        <Button
          leftIcon={<Icon as={FaArrowLeft} />}
          bg={btnBackBg}
          color={btnBackColor}
          _hover={{ bg: btnBackHoverBg, transform: "scale(1.03)" }}
          onClick={() => navigate("/app/produccion")}
          size="sm"
          mb={4}
          boxShadow="sm"
          borderRadius="full"
        >
          Atrás
        </Button>
      </Tooltip>

      <Card
        bg={cardBg}
        borderColor={borderColor}
        borderWidth="1px"
        boxShadow="md"
      >
        {/* Encabezado con título estilo Clientes */}
        <CardHeader pb={3}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Box>
              <HStack spacing={2}>
                <FaBoxOpen color={accent} size={24} />
                <Heading size="md" color={accent}>
                  Gestión de Insumos
                </Heading>
              </HStack>
              <Text fontSize="sm" color={subtitleColor} mt={1}>
                Administra el catálogo de insumos y límites de stock
              </Text>
            </Box>
          </Flex>

          <Divider mt={4} borderColor={borderColor} />

          {/* Mini-Dashboard idéntico a Clientes */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={5} mb={2}>
            <Stat bg={statTotalBg} p={4} borderRadius="lg">
              <HStack spacing={2} mb={1}>
                <FaBoxOpen color="#009e73" />
                <StatLabel fontWeight="bold" color="teal.800">
                  Total de Insumos
                </StatLabel>
              </HStack>
              <StatNumber fontSize="3xl" color="teal.900">
                {totalInsumos}
              </StatNumber>
              <StatHelpText m={0} color="teal.700">
                Registrados en BD
              </StatHelpText>
            </Stat>

            <Stat bg={statActivosBg} p={4} borderRadius="lg">
              <HStack spacing={2} mb={1}>
                <FaCheckCircle color="green" />
                <StatLabel fontWeight="bold" color="green.800">
                  Insumos Activos
                </StatLabel>
              </HStack>
              <StatNumber fontSize="3xl" color={activosNumberColor}>
                {insActivos}
              </StatNumber>
              <StatHelpText m={0} color="green.700">
                Disponibles para producción
              </StatHelpText>
            </Stat>

            <Stat bg={statInactivosBg} p={4} borderRadius="lg">
              <HStack spacing={2} mb={1}>
                <FaTimesCircle color="red" />
                <StatLabel fontWeight="bold" color="red.800">
                  Insumos Inactivos
                </StatLabel>
              </HStack>
              <StatNumber fontSize="3xl" color={inactivosNumberColor}>
                {insInactivos}
              </StatNumber>
              <StatHelpText m={0} color="red.700">
                Uso suspendido o agotado
              </StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardHeader>

        <CardBody pt={0} px={{ base: 2, md: 6 }}>
          <CrudTabla
            title="Insumos"
            columns={columns}
            extractors={extractors}
            fields={fields}
            idKey="id_insumo"
            initialData={data}
            onInsert={handleInsert}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onReload={cargarInsumos}
            apiUrl="/produccion/insumos"
          />
        </CardBody>
      </Card>
    </Box>
  );
}
