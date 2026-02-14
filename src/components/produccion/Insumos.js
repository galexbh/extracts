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
} from "@chakra-ui/react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import CrudTabla from "../Seguridad/CrudTabla"; // ✅ Reutilizable
import api from "../../api/apiClient"; // ✅ Axios centralizado

export default function Insumos() {
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
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_insumo",
      label: "Nombre del Insumo",
      type: "text",
      required: true,
    },
    {
      name: "unidad_medida",
      label: "Unidad de Medida",
      type: "text",
      required: true,
    },
    {
      name: "precio_unitario",
      label: "Precio Unitario (Lps)",
      type: "number",
      step: "0.01",
      min: "0",
      required: true,
    },
    {
      name: "stock_minimo",
      label: "Stock Mínimo",
      type: "number",
      step: "0.01",
      min: "0",
      required: true,
    },
    {
      name: "stock_maximo",
      label: "Stock Máximo",
      type: "number",
      step: "0.01",
      min: "0",
      required: true,
    },
    {
      name: "id_estado_insumo",
      label: "Estado del Insumo",
      type: "select",
      required: true,
      options: estados.map((e) => ({
        value: e.id_estado_insumo,
        label: e.nombre_estado,
      })),
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
    <>
      <Box p={3}>
        <Tooltip label="Volver al menú Producción" placement="bottom-start">
          <Button
            leftIcon={<Icon as={FaArrowLeft} />}
            bg={btnBg}
            color={btnColor}
            _hover={{ bg: btnHoverBg, transform: "scale(1.05)" }}
            onClick={() => navigate("/app/produccion")}
            size="sm"
            mb={3}
            boxShadow="sm"
          >
            Atrás
          </Button>
        </Tooltip>

        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent}>
            Gestión de Insumos
          </Heading>
        </Flex>
        <Divider mb={2} />
      </Box>

      <Box overflowX="auto">
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
      </Box>
    </>
  );
}
