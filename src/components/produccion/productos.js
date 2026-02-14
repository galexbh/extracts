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
} from "@chakra-ui/react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import CrudTabla from "../Seguridad/CrudTabla";
import api from "../../api/apiClient";

export default function Productos() {
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
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_producto",
      label: "Nombre del Producto",
      type: "text",
      required: true,
    },
    {
      name: "descripcion",
      label: "Descripción",
      type: "text",
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
      min: 0,
      required: true,
    },
    {
      name: "stock_maximo",
      label: "Stock Máximo",
      type: "number",
      min: 0,
      required: true,
    },
  {
  name: "id_estado_producto",
  label: "Estado del Producto",
  type: "select",
  required: true,
  options: estados.map((e) => ({
    value: e.id_estado_producto,
    label: e.nombre_estado,
  })),
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
    <>
      <Box p={3}>
        <Tooltip label="Volver al menú Producción" placement="bottom-start">
          <Button
            leftIcon={<Icon as={FaArrowLeft} />}
            bg={btnBg}
            color={btnColor}
            _hover={{ bg: btnHoverBg }}
            onClick={() => navigate("/app/produccion")}
            size="sm"
            mb={3}
          >
            Atrás
          </Button>
        </Tooltip>

        <Heading size="md" color={accent}>
          Gestión de Productos
        </Heading>
        <Divider mb={2} />
      </Box>

      <Box overflowX="auto">
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
      </Box>
    </>
  );
}
