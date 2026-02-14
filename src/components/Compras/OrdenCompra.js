// ============================================================
// 📁 src/components/Compras/OrdenCompra.js
// ✅ Modal se abre automáticamente + validación + botones personalizados
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
  HStack,
} from "@chakra-ui/react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import CrudTabla from "../Seguridad/CrudTabla";
import api from "../../api/apiClient";

export default function OrdenCompra() {
  // 🎨 Estilos
  const accent = useColorModeValue("teal.600", "teal.300");
  const btnBg = useColorModeValue("teal.100", "teal.600");
  const btnColor = useColorModeValue("teal.800", "white");
  const btnHoverBg = useColorModeValue("teal.200", "teal.500");

  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem("userEmail");

  // 📦 Datos desde Proveedores.js
  const nuevoProveedor = location.state?.nuevoProveedor || null;
  const abrirModalAuto = location.state?.abrirModal || false;

  // Estados
  const [data, setData] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abrirModal, setAbrirModal] = useState(false);

  // ============================================================
  // 🔹 Abrir modal automáticamente si venimos desde proveedor
  // ============================================================
  useEffect(() => {
    if (abrirModalAuto || nuevoProveedor) {
      const timer = setTimeout(() => setAbrirModal(true), 400);
      return () => clearTimeout(timer);
    }
  }, [abrirModalAuto, nuevoProveedor]);

  // ============================================================
  // 🔹 Cargar datos base
  // ============================================================
  const cargarOrdenes = useCallback(async () => {
    try {
      const res = await api.get("/compras/orden-compra");
      setData(res.data);
    } catch (err) {
      toast({
        title: "Error al cargar órdenes de compra",
        description: err.message,
        status: "error",
        duration: 4000,
      });
    }
  }, [toast]);

  const cargarProveedores = useCallback(async () => {
    try {
      const res = await api.get("/compras/proveedores");
      setProveedores(res.data);
    } catch (err) {
      console.error("❌ Error cargando proveedores:", err);
    }
  }, []);

  const cargarEstados = useCallback(async () => {
    try {
      const res = await api.get("/mantenimiento/estado-orden-compra");
      setEstados(res.data);
    } catch (err) {
      console.error("❌ Error cargando estados:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([cargarOrdenes(), cargarProveedores(), cargarEstados()]).finally(() =>
      setLoading(false)
    );
  }, [cargarOrdenes, cargarProveedores, cargarEstados]);

  // ============================================================
  // 🔹 Campos del formulario
  // ============================================================
  const fields = [
    {
      name: "id_proveedor",
      label: "Proveedor",
      type: "select",
      options: proveedores.map((p) => ({
        value: p.id_proveedor,
        label: p.nombre,
      })),
      required: true,
      readOnly: !!nuevoProveedor,
      defaultValue: nuevoProveedor?.id_proveedor || "",
    },
    {
      name: "id_estado_orden_compra",
      label: "Estado de la Orden",
      type: "select",
      options: estados.map((e) => ({
        value: e.id_estado_orden_compra,
        label: e.nombre_estado,
      })),
      required: true,
    },
    { name: "observacion", label: "Observación", type: "textarea" },
    { name: "num_factura_proveedor", label: "Factura del Proveedor", type: "text" },
  ];

  // ============================================================
  // 🔹 Columnas
  // ============================================================
  const columns = [
    "ID Orden",
    "Proveedor",
    "Estado",
    "Observación",
    "Factura",
    "Fecha de Creación",
  ];

  const extractors = {
    "ID Orden": (r) => r.id_orden_compra,
    Proveedor: (r) => r.nombre_proveedor,
    Estado: (r) => r.nombre_estado,
    Observación: (r) => r.observacion || "—",
    Factura: (r) => r.num_factura_proveedor || "—",
    "Fecha de Creación": (r) =>
      r.fecha_orden ? new Date(r.fecha_orden).toISOString().split("T")[0] : "—",
  };

  // ============================================================
  // 🔹 Validación de duplicados + guardado
  // ============================================================
  const handleInsert = async (nuevo, modo = "normal") => {
    try {
      // 🔍 Evita duplicados (mismo proveedor con estado pendiente)
      const existeDuplicado = data.some(
        (o) =>
          o.id_proveedor === Number(nuevo.id_proveedor) &&
          o.nombre_estado === "Pendiente"
      );

      if (existeDuplicado) {
        toast({
          title: "Orden duplicada",
          description: "Ya existe una orden pendiente para este proveedor.",
          status: "warning",
          duration: 4000,
        });
        return;
      }

      // Guardar orden
      const res = await api.post("/compras/orden-compra", nuevo, {
        headers: { "x-user-email": username },
      });

      toast({
        title: "✅ Orden creada correctamente",
        status: "success",
        duration: 2500,
      });

      await cargarOrdenes();

      // Si el modo es “detalle”, redirige automáticamente
      if (modo === "detalle" && res.data?.id_orden_compra) {
        navigate("/app/compras/detalle", {
          state: {
            id_orden_compra: res.data.id_orden_compra,
            abrirModal: true,
          },
        });
      }
    } catch (err) {
      console.error("❌ Error al crear orden:", err);
      toast({
        title: "Error al crear orden de compra",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
      });
    }
  };

  // ============================================================
  // 🔹 Actualizar / eliminar
  // ============================================================
  const handleUpdate = async (editado) => {
    try {
      await api.put(`/compras/orden-compra/${editado.id_orden_compra}`, editado, {
        headers: { "x-user-email": username },
      });
      toast({
        title: "Orden actualizada correctamente",
        status: "success",
        duration: 3000,
      });
      await cargarOrdenes();
    } catch (err) {
      toast({
        title: "Error al actualizar orden",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/compras/orden-compra/${id}`);
      toast({
        title: "Orden eliminada correctamente",
        status: "info",
        duration: 3000,
      });
      await cargarOrdenes();
    } catch (err) {
      toast({
        title: "Error al eliminar orden",
        description: err.response?.data?.error || err.message,
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

  // ============================================================
  // 🔹 Render principal
  // ============================================================
  return (
    <>
      <Box p={3}>
        <Tooltip label="Volver al menú Compras" placement="bottom-start">
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

        <Heading size="md" color={accent} mb={2}>
          Órdenes de Compra
        </Heading>
        <Divider mb={3} />

        {/* 💚 Info del proveedor (si viene desde Proveedores.js) */}
        {nuevoProveedor && (
          <Box
            p={3}
            mb={4}
            border="1px"
            borderColor="teal.400"
            borderRadius="md"
            bg="teal.50"
          >
            <Heading size="sm" color="teal.700">
              Creando orden para: {nuevoProveedor.nombre}
            </Heading>
            <Box fontSize="sm">RTN: {nuevoProveedor.rtn}</Box>
            <Box fontSize="sm">Teléfono: {nuevoProveedor.telefono || "—"}</Box>
            <Box fontSize="sm">Correo: {nuevoProveedor.correo || "—"}</Box>
            <Box fontSize="sm">Dirección: {nuevoProveedor.direccion || "—"}</Box>
          </Box>
        )}
      </Box>

      <Box overflowX="auto">
        <CrudTabla
          title="Órdenes de Compra"
          columns={columns}
          extractors={extractors}
          fields={fields}
          idKey="id_orden_compra"
          initialData={data}
          onInsert={(nuevo) => handleInsert(nuevo, "normal")}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReload={cargarOrdenes}
          abrirModal={abrirModal} // ✅ se abre automáticamente al venir de proveedor
          customButtons={(formData, onClose) => (
            <HStack justify="center" spacing={4} mt={4}>
              <Button
                colorScheme="teal"
                onClick={() => {
                  handleInsert(formData, "normal");
                  onClose();
                }}
              >
                Guardar
              </Button>
              <Button
                colorScheme="green"
                onClick={() => {
                  handleInsert(formData, "detalle");
                  onClose();
                }}
              >
                Guardar y crear Detalle
              </Button>
              <Button variant="outline" colorScheme="red" onClick={onClose}>
                Cancelar
              </Button>
            </HStack>
          )}
        />
      </Box>
    </>
  );
}
