// ============================================================
// 📁 src/components/Produccion/Productos.js
// 💎 Gestión de Productos con control de stock y estados
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
import CrudTabla from "../Seguridad/CrudTabla";
import api from "../../api/apiClient";

export default function Productos() {
  // 🎨 Colores adaptados a día/noche (Idénticos al módulo Clientes)
  const accent = useColorModeValue("#009e73", "teal.300");
  const pageBg = useColorModeValue("#f7faf8", "#020617");
  const cardBg = useColorModeValue("white", "#0b1120");
  const borderColor = useColorModeValue("#c2d4c3", "#1f2937");

  const btnBackBg = useColorModeValue("teal.100", "teal.600");
  const btnBackColor = useColorModeValue("teal.800", "white");
  const btnBackHoverBg = useColorModeValue("teal.200", "teal.500");

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
  // 🔹 Cargar productos
  // ============================================================
  const cargarProductos = useCallback(async () => {
    try {
      const res = await api.get("/produccion/productos");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando productos:", err);
      toast({
        title: "Error al cargar productos",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  }, [toast]);

  // ============================================================
  // 🔹 Cargar estados
  // ============================================================
  const cargarEstados = useCallback(async () => {
    try {
      const res = await api.get("/mantenimiento/estado-producto");
      setEstados(res.data);
    } catch (err) {
      console.error("❌ Error cargando estados de producto:", err);
      setEstados([]);
    }
  }, []);


  useEffect(() => {
    Promise.all([cargarProductos(), cargarEstados()]).finally(() =>
      setLoading(false)
    );
  }, [cargarProductos, cargarEstados]);

  // ============================================================
  // 🔹 Calculadora de Estadísticas para Dashboard Frontal
  // ============================================================
  const { totalProductos, prodActivos, prodInactivos } = React.useMemo(() => {
    const total = data.length;

    const activos = data.filter((r) => {
      const estado = (r.estado_producto || r.nombre_estado || "")
        .toString()
        .toLowerCase();
      return estado === "activo";
    }).length;

    const inactivos = total - activos;

    return {
      totalProductos: total,
      prodActivos: activos,
      prodInactivos: inactivos,
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
      return `El campo ${campo} solo debe contener letras y espacios (sin números ni símbolos).`;
    }
    return null;
  };

  const sanitizeTexto = (valor) => {
    if (!valor) return "";
    return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""); // Borra lo que no sea letra al momento de tipear
  };

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_producto",
      label: "Nombre del Producto",
      type: "text",
      required: true,
      placeholderText: "Ej. Jugo de Naranja",
      validate: (v) => validarSoloLetras(v, "Nombre del Producto"),
      sanitize: sanitizeTexto,
    },
    {
      name: "descripcion",
      label: "Descripción",
      type: "textarea",
      placeholderText: "Opcional: detalles del producto",
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
      placeholderText: "Mayor a 0",
      validate: (v) => {
        if (!v || Number(v) <= 0) return "El precio debe ser mayor a 0.";
        return null;
      }
    },
    {
      name: "stock_minimo",
      label: "Stock Mínimo",
      type: "number",
      min: 0,
      required: true,
      placeholderText: "Ej. 10",
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
      min: 0,
      required: true,
      placeholderText: "Ej. 100",
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
      name: "id_estado_producto",
      label: "Estado del Producto",
      type: "select",
      required: true,
      options: estados
        .filter((e) => e.nombre_estado.toLowerCase() === "activo" || e.nombre_estado.toLowerCase() === "inactivo")
        .map((e) => ({
          value: e.id_estado_producto,
          label: e.nombre_estado,
        })),
      validate: (v) => {
        if (!v) return "Debe seleccionar un estado.";
        return null;
      }
    }
  ];

  // ============================================================
  // 🔹 Columnas tabla
  // ============================================================
  const columns = [
    "ID",
    "Nombre",
    "Unidad",
    "Precio",
    "Stock Min",
    "Stock Max",
    "Estado",
    "Fecha",
  ];

  const extractors = {
    ID: (r) => r.id_producto,
    Nombre: (r) => r.nombre_producto,
    Unidad: (r) => r.unidad_medida,
    Precio: (r) => `L. ${parseFloat(r.precio_unitario || 0).toFixed(2)}`,
    "Stock Min": (r) => r.stock_minimo,
    "Stock Max": (r) => r.stock_maximo,
    Estado: (r) => r.estado_producto || "—",
    Fecha: (r) =>
      r.fecha_creacion
        ? new Date(r.fecha_creacion).toLocaleString("es-HN", {
          timeZone: "America/Tegucigalpa",
        })
        : "—",
  };

  // ============================================================
  // 🔹 CRUD
  // ============================================================

  const handleInsert = async (nuevo) => {
    try {
      await api.post("/produccion/productos", nuevo);
      await cargarProductos();

      toast({
        title: "Producto agregado",
        status: "success",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error al agregar",
        description: err.message,
        status: "error",
      });
    }
  };

  const handleUpdate = async (editado) => {
    try {
      await api.put(`/produccion/productos/${editado.id_producto}`, editado);
      await cargarProductos();

      toast({
        title: "Producto actualizado",
        status: "success",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error al actualizar",
        description: err.message,
        status: "error",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/produccion/productos/${id}`);
      await cargarProductos();

      toast({
        title: "Producto eliminado",
        status: "info",
      });
    } catch (err) {
      console.error(err);
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
                  Gestión de Productos
                </Heading>
              </HStack>
              <Text fontSize="sm" color={subtitleColor} mt={1}>
                Administra inventarios, medidas y precios de producción
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
                  Total de Productos
                </StatLabel>
              </HStack>
              <StatNumber fontSize="3xl" color="teal.900">
                {totalProductos}
              </StatNumber>
              <StatHelpText m={0} color="teal.700">
                Registrados en BD
              </StatHelpText>
            </Stat>

            <Stat bg={statActivosBg} p={4} borderRadius="lg">
              <HStack spacing={2} mb={1}>
                <FaCheckCircle color="green" />
                <StatLabel fontWeight="bold" color="green.800">
                  Prod. Activos
                </StatLabel>
              </HStack>
              <StatNumber fontSize="3xl" color={activosNumberColor}>
                {prodActivos}
              </StatNumber>
              <StatHelpText m={0} color="green.700">
                Listos para facturar
              </StatHelpText>
            </Stat>

            <Stat bg={statInactivosBg} p={4} borderRadius="lg">
              <HStack spacing={2} mb={1}>
                <FaTimesCircle color="red" />
                <StatLabel fontWeight="bold" color="red.800">
                  Prod. Inactivos
                </StatLabel>
              </HStack>
              <StatNumber fontSize="3xl" color={inactivosNumberColor}>
                {prodInactivos}
              </StatNumber>
              <StatHelpText m={0} color="red.700">
                Confección/Venta detenida
              </StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardHeader>

        <CardBody pt={0} px={{ base: 2, md: 6 }}>
          <CrudTabla
            title="Productos"
            columns={columns}
            extractors={extractors}
            fields={fields}
            idKey="id_producto"
            initialData={data}
            onInsert={handleInsert}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onReload={cargarProductos}
            apiUrl="/produccion/productos"
          />
        </CardBody>
      </Card>
    </Box>
  );
}
