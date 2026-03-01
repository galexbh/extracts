// ============================================================
// 📁 src/components/Compras/Proveedores.js
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
import { useNavigate } from "react-router-dom";
import CrudTabla from "../Seguridad/CrudTabla";
import api from "../../api/apiClient";

export default function Proveedores() {
  // 🎨 Estilos Chakra
  const accent = useColorModeValue("teal.600", "teal.300");
  const btnBg = useColorModeValue("teal.100", "teal.600");
  const btnColor = useColorModeValue("teal.800", "white");
  const btnHoverBg = useColorModeValue("teal.200", "teal.500");

  const toast = useToast();
  const navigate = useNavigate();
  const username = localStorage.getItem("userEmail");

  const [data, setData] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔹 Cargar proveedores desde la API
  // ============================================================
  const cargarProveedores = useCallback(async () => {
    try {
      const res = await api.get("/compras/proveedores");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando proveedores:", err);
      toast({
        title: "Error al cargar proveedores",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  }, [toast]);

  // ============================================================
  // 🔹 Cargar estados de proveedor
  // ============================================================
  const cargarEstados = useCallback(async () => {
    try {
      const res = await api.get("/mantenimiento/estado-proveedor");
      setEstados(res.data);
    } catch (err) {
      console.error("❌ Error cargando estados:", err);
      toast({
        title: "Error al cargar estados de proveedor",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  }, [toast]);

  useEffect(() => {
    Promise.all([cargarProveedores(), cargarEstados()]).finally(() =>
      setLoading(false)
    );
  }, [cargarProveedores, cargarEstados]);

  // ============================================================
  // 🔹 Funciones de validación y sanitización
  // ============================================================
  const sanitizeTexto = (v) => {
    if (!v) return "";
    return v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
  };

  const sanitizeRTN = (v) => {
    if (!v) return "";
    return v.replace(/[^0-9\-]/g, "");
  };

  const sanitizeTelefono = (v) => {
    if (!v) return "";
    return v.replace(/[^0-9\-\+\s]/g, "");
  };

  const sanitizeDireccion = (v) => {
    if (!v) return "";
    return v.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#\-\/]/g, "");
  };

  const validarNombre = (v) => {
    if (!v || v.trim() === "") return "El nombre del proveedor es obligatorio.";
    if (v.trim().length < 3) return "El nombre debe tener al menos 3 caracteres.";
    return null;
  };

  const validarRTN = (v) => {
    if (!v || v.trim() === "") return "El RTN es obligatorio.";
    const soloDigitos = v.replace(/\-/g, "");
    if (!/^\d+$/.test(soloDigitos)) return "El RTN solo debe contener números y guiones.";
    if (soloDigitos.length < 13 || soloDigitos.length > 14) return "El RTN debe tener entre 13 y 14 dígitos.";
    return null;
  };

  const validarTelefono = (v) => {
    if (!v || v.trim() === "") return null; // Opcional
    const soloDigitos = v.replace(/[\-\+\s]/g, "");
    if (!/^\d+$/.test(soloDigitos)) return "El teléfono solo debe contener números.";
    if (soloDigitos.length < 8) return "El teléfono debe tener al menos 8 dígitos.";
    return null;
  };

  const validarCorreo = (v) => {
    if (!v || v.trim() === "") return null; // Opcional
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(v)) return "El correo electrónico no tiene un formato válido.";
    return null;
  };

  // ============================================================
  // ✅ CAMPOS DEL FORMULARIO CRUD — CON VALIDACIONES
  // ============================================================
  const fields = [
    {
      name: "nombre",
      label: "Nombre del Proveedor",
      type: "text",
      required: true,
      placeholderText: "Ej. Distribuidora Central",
      validate: validarNombre,
      sanitize: sanitizeTexto,
    },
    {
      name: "rtn",
      label: "RTN",
      type: "text",
      required: true,
      placeholderText: "Ej. 0801-1990-12345",
      validate: validarRTN,
      sanitize: sanitizeRTN,
    },
    {
      name: "telefono",
      label: "Teléfono",
      type: "text",
      placeholderText: "Ej. 9999-9999",
      validate: validarTelefono,
      sanitize: sanitizeTelefono,
    },
    {
      name: "correo",
      label: "Correo Electrónico",
      type: "email",
      placeholderText: "Ej. proveedor@empresa.com",
      validate: validarCorreo,
    },
    {
      name: "direccion",
      label: "Dirección",
      type: "text",
      placeholderText: "Ej. Col. Kennedy, Tegucigalpa",
      sanitize: sanitizeDireccion,
    },

    // ✅ SOLO EDITAR — NO mostrar al crear
    {
      name: "id_estado_proveedor",
      label: "Estado del Proveedor",
      type: "select",
      options: estados.map((e) => ({
        value: e.id_estado_proveedor,
        label: e.nombre_estado,
      })),
      required: true,
      showOnCreate: false, // ✅ ocultar en "Nuevo proveedor"
      showOnEdit: true, // ✅ mostrar en "Editar proveedor"
    },
  ];

  // ============================================================
  // 🔹 Columnas y extractores
  // ============================================================
  const columns = ["ID", "Nombre", "RTN", "Teléfono", "Correo", "Dirección", "Estado"];

  const extractors = {
    ID: (r) => r.id_proveedor,
    Nombre: (r) => r.nombre,
    RTN: (r) => r.rtn,
    Teléfono: (r) => r.telefono || "—",
    Correo: (r) => r.correo || "—",
    Dirección: (r) => r.direccion || "—",
    Estado: (r) => r.nombre_estado || "—",
  };

  // ============================================================
  // 🔹 CRUD: Insertar, Actualizar, Eliminar
  // ============================================================
  const handleInsert = async (nuevo, modo = "normal") => {
    try {
      const res = await api.post(
        "/compras/proveedores",
        { ...nuevo, modo },
        { headers: { "x-user-email": username } }
      );

      // ✅ Si proveedor ya existe y estamos creando una orden
      if (res.data.existente && modo === "orden") {
        navigate("/app/compras/orden", {
          state: {
            nuevoProveedor: {
              id_proveedor: res.data.id_proveedor,
              nombre: nuevo.nombre,
              rtn: nuevo.rtn,
              telefono: nuevo.telefono,
              correo: nuevo.correo,
              direccion: nuevo.direccion,
            },
          },
        });
        return;
      }

      // 🚨 Duplicado en modo normal
      if (res.data.existente && modo === "normal") {
        toast({
          title: "Proveedor duplicado",
          description: "Ya existe un proveedor con ese nombre o RTN.",
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      toast({
        title: "Proveedor agregado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      await cargarProveedores();

      // ✅ Redirigir a crear orden automáticamente
      if (modo === "orden") {
        navigate("/app/compras/orden", {
          state: {
            nuevoProveedor: {
              id_proveedor: res.data.id_proveedor,
              nombre: nuevo.nombre,
              rtn: nuevo.rtn,
              telefono: nuevo.telefono,
              correo: nuevo.correo,
              direccion: nuevo.direccion,
            },
          },
        });
      }
    } catch (err) {
      console.error("❌ Error al insertar proveedor:", err);
      toast({
        title: "Error al agregar proveedor",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleUpdate = async (editado) => {
    try {
      await api.put(`/compras/proveedores/${editado.id_proveedor}`, editado, {
        headers: { "x-user-email": username },
      });
      toast({
        title: "Proveedor actualizado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await cargarProveedores();
    } catch (err) {
      console.error("❌ Error al actualizar proveedor:", err);
      toast({
        title: "Error al actualizar proveedor",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/compras/proveedores/${id}`);
      toast({
        title: "Proveedor eliminado correctamente",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      await cargarProveedores();
    } catch (err) {
      console.error("❌ Error al eliminar proveedor:", err);
      toast({
        title: "Error al eliminar proveedor",
        description: err.response?.data?.error || err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

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
            boxShadow="sm"
          >
            Atrás
          </Button>
        </Tooltip>

        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent}>
            Proveedores
          </Heading>
        </Flex>
        <Divider mb={2} />
      </Box>

      <Box overflowX="auto">
        <CrudTabla
          title="Proveedores"
          columns={columns}
          extractors={extractors}
          fields={fields}
          idKey="id_proveedor"
          initialData={data}
          onInsert={(nuevo) => handleInsert(nuevo, "normal")}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReload={cargarProveedores}
          apiUrl="/compras/proveedores"
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
                  handleInsert(formData, "orden");
                  onClose();
                }}
              >
                Guardar y crear Orden
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
