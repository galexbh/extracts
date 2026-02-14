// ============================================================
// 📁 src/components/Compras/DetalleCompra.js
// ✅ Soporta nuevos campos fiscales e integra con SP backend
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
  Select,
  HStack,
  Text,
} from "@chakra-ui/react";
import { FaArrowLeft, FaShoppingCart } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import CrudTabla from "../Seguridad/CrudTabla";
import api from "../../api/apiClient";

export default function DetalleCompra() {
  const accent = useColorModeValue("teal.600", "teal.300");
  const btnBg = useColorModeValue("teal.100", "teal.600");
  const btnColor = useColorModeValue("teal.800", "white");
  const btnHoverBg = useColorModeValue("teal.200", "teal.500");

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const ordenSeleccionada = location.state?.id_orden_compra || null;
  const [data, setData] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🧩 Estado del formulario
  // ============================================================
  const [formData, setFormData] = useState({
    id_orden_compra: "",
    id_insumo: "",
    cantidad_solicitada: 0,
    precio_unitario: 0,
    descuento_renglon: 0,
    tasa_impuesto_renglon: 15,
    categoria_impuesto: "GRAVADO_1",
    base_imponible: 0,
    impuesto_renglon: 0,
    subtotal: 0,
  });

  // ============================================================
  // 📡 Cargar datos
  // ============================================================
  const cargarDetalles = useCallback(async () => {
    try {
      const res = await api.get("/compras/detalle-orden-compra");
      setData(res.data || []);
    } catch (err) {
      toast({
        title: "Error al cargar detalles",
        description: err.message,
        status: "error",
      });
    }
  }, [toast]);

  const cargarOrdenes = useCallback(async () => {
    try {
      const res = await api.get("/compras/orden-compra");
      setOrdenes(res.data || []);
      if (ordenSeleccionada) {
        const info = res.data.find(
          (o) => o.id_orden_compra === Number(ordenSeleccionada)
        );
        setFormData((prev) => ({
          ...prev,
          id_orden_compra: Number(ordenSeleccionada),
        }));
      }
    } catch (err) {
      console.error("Error cargando órdenes:", err);
    }
  }, [ordenSeleccionada]);

  const cargarInsumos = useCallback(async () => {
    try {
      const res = await api.get("/produccion/insumos");
      setInsumos(res.data || []);
    } catch (err) {
      console.error("Error cargando insumos:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([cargarDetalles(), cargarOrdenes(), cargarInsumos()]).finally(() =>
      setLoading(false)
    );
  }, [cargarDetalles, cargarOrdenes, cargarInsumos]);

  // ============================================================
  // 🧮 Recalcular totales del renglón
  // ============================================================
  useEffect(() => {
    const { cantidad_solicitada, precio_unitario, descuento_renglon, tasa_impuesto_renglon, categoria_impuesto } = formData;

    const subtotal = cantidad_solicitada * precio_unitario;
    const base = subtotal - descuento_renglon;
    const impuesto =
      categoria_impuesto === "GRAVADO_1"
        ? base * (tasa_impuesto_renglon / 100)
        : 0;

    setFormData((prev) => ({
      ...prev,
      subtotal: Number(subtotal.toFixed(2)),
      base_imponible: Number(base.toFixed(2)),
      impuesto_renglon: Number(impuesto.toFixed(2)),
    }));
  }, [
    formData.cantidad_solicitada,
    formData.precio_unitario,
    formData.descuento_renglon,
    formData.tasa_impuesto_renglon,
    formData.categoria_impuesto,
  ]);

  // ============================================================
  // 📋 Campos del CRUD
  // ============================================================
  const fields = [
    {
      name: "id_orden_compra",
      label: "Orden de Compra",
      type: "select",
      options: ordenes.map((o) => ({
        value: o.id_orden_compra,
        label: `OC-${o.id_orden_compra} | ${o.nombre_proveedor || "Sin proveedor"}`,
      })),
    },
    {
      name: "id_insumo",
      label: "Insumo",
      type: "select",
      options: insumos.map((i) => ({
        value: i.id_insumo,
        label: i.nombre_insumo,
      })),
    },
    { name: "cantidad_solicitada", label: "Cantidad", type: "number" },
    { name: "precio_unitario", label: "Precio Unitario", type: "number" },
    { name: "descuento_renglon", label: "Descuento", type: "number" },
    {
      name: "categoria_impuesto",
      label: "Categoría Impuesto",
      type: "select",
      options: [
        { value: "GRAVADO_1", label: "Gravado 15%" },
        { value: "EXENTO", label: "Exento" },
        { value: "EXONERADO", label: "Exonerado" },
      ],
    },
    {
      name: "tasa_impuesto_renglon",
      label: "Tasa Impuesto (%)",
      type: "number",
    },
    { name: "base_imponible", label: "Base Imponible", type: "number", isReadOnly: true },
    { name: "impuesto_renglon", label: "Impuesto", type: "number", isReadOnly: true },
    { name: "subtotal", label: "Subtotal", type: "number", isReadOnly: true },
  ];

  // ============================================================
  // 🧾 Columnas de la tabla
  // ============================================================
  const columns = [
    "ID",
    "Orden de Compra",
    "Insumo",
    "Cantidad",
    "Precio Unitario",
    "Descuento",
    "Categoría",
    "Tasa %",
    "Base Imponible",
    "Impuesto",
    "Subtotal",
  ];

  const extractors = {
    ID: (r) => r.id_detalle_oc,
    "Orden de Compra": (r) =>
      `OC-${r.id_orden_compra} | ${r.nombre_proveedor || "Sin proveedor"}`,
    Insumo: (r) => r.nombre_insumo || "—",
    Cantidad: (r) => r.cantidad_solicitada,
    "Precio Unitario": (r) => `L. ${parseFloat(r.precio_unitario || 0).toFixed(2)}`,
    Descuento: (r) => `L. ${parseFloat(r.descuento_renglon || 0).toFixed(2)}`,
    Categoría: (r) => r.categoria_impuesto,
    "Tasa %": (r) => `${parseFloat(r.tasa_impuesto_renglon || 0).toFixed(2)}%`,
    "Base Imponible": (r) => `L. ${parseFloat(r.base_imponible || 0).toFixed(2)}`,
    Impuesto: (r) => `L. ${parseFloat(r.impuesto_renglon || 0).toFixed(2)}`,
    Subtotal: (r) => `L. ${parseFloat(r.subtotal || 0).toFixed(2)}`,
  };

  // ============================================================
  // 💡 Elimina botón "+ Agregar" del DOM
  // ============================================================
  useEffect(() => {
    const interval = setInterval(() => {
      document.querySelectorAll("button").forEach((btn) => {
        if (btn.textContent.trim().includes("Agregar")) btn.style.display = "none";
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // 🧱 Render principal
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="xl" color="teal.400" />
      </Flex>
    );
  }

  return (
    <Box p={3}>
      <Tooltip label="Volver al menú de Compras" placement="bottom-start">
        <Button
          leftIcon={<Icon as={FaArrowLeft} />}
          bg={btnBg}
          color={btnColor}
          _hover={{ bg: btnHoverBg, transform: "scale(1.05)" }}
          onClick={() => navigate("/app/compras")}
          size="sm"
          mb={3}
        >
          Atrás
        </Button>
      </Tooltip>

      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="md" color={accent}>
          Detalle de Órdenes de Compra
        </Heading>

        <Button
          leftIcon={<FaShoppingCart />}
          colorScheme="teal"
          size="sm"
          onClick={() => navigate("/app/compras")}
        >
          Ir a Compras
        </Button>
      </Flex>

      <Divider mb={4} />

      <Box overflowX="auto">
        <CrudTabla
          title="Detalle de Órdenes de Compra"
          columns={columns}
          extractors={extractors}
          fields={fields}
          idKey="id_detalle_oc"
          initialData={data}
          formData={formData}
          setFormData={setFormData}
          apiUrl="/compras/detalle-orden-compra"
          onReload={cargarDetalles}
        />
      </Box>
    </Box>
  );
}
