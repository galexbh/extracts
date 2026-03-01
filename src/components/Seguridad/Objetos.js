// ============================================================
// 📁 src/components/Seguridad/Objetos.js
// ✅ Versión FINAL — Diseño uniforme + Paginación + Validaciones
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
  HStack,
  Text,
  Select,
  IconButton,
} from "@chakra-ui/react";
import { FaArrowLeft } from "react-icons/fa";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import CrudTabla from "./CrudTabla";
import api from "../../api/apiClient";

export default function Objetos() {
  // ============================================================
  // ✅ Paleta de colores (modo claro/oscuro) — IGUAL que Roles
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

  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Dashboard stats (se cargan del total sin paginar)
  const [statsData, setStatsData] = useState({ total: 0, activos: 0, inactivos: 0 });

  const username = localStorage.getItem("userEmail");

  // ============================================================
  // ✅ Cargar estadísticas (sin paginación)
  // ============================================================
  const cargarStats = useCallback(async () => {
    try {
      const res = await api.get("/seguridad/objetos"); // sin params = retorna todo
      const all = Array.isArray(res.data) ? res.data : res.data.rows || [];
      setStatsData({
        total: all.length,
        activos: all.filter((o) => o.estado === "activo").length,
        inactivos: all.filter((o) => o.estado === "inactivo").length,
      });
    } catch (err) {
      console.error("❌ Error cargando stats:", err);
    }
  }, []);

  // ============================================================
  // ✅ Cargar objetos paginados
  // ============================================================
  const cargarObjetos = useCallback(async (currentPage = page) => {
    try {
      setLoading(true);
      const res = await api.get("/seguridad/objetos", {
        params: { page: currentPage, limit },
      });

      if (res.data && res.data.rows) {
        setData(res.data.rows);
        setTotalPages(res.data.totalPages);
        setPage(res.data.page);
        setTotalRecords(res.data.total);
      } else if (Array.isArray(res.data)) {
        // Fallback: si el backend retorna array directo
        setData(res.data);
        setTotalPages(1);
        setTotalRecords(res.data.length);
      }
    } catch (err) {
      console.error("❌ Error cargando objetos:", err);
      toast({
        title: "Error al cargar objetos",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, toast]);

  useEffect(() => {
    cargarObjetos(page);
    cargarStats();
  }, [page, limit, cargarObjetos, cargarStats]);

  // ============================================================
  // ✅ Funciones de validación y sanitización
  // ============================================================
  const sanitizeTexto = (valor) => {
    if (!valor) return "";
    return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s._\-]/g, "");
  };

  const validarNombreObjeto = (v) => {
    if (!v || v.trim() === "") return "El nombre del objeto es obligatorio.";
    if (v.trim().length < 2) return "El nombre debe tener al menos 2 caracteres.";
    if (v.trim().length > 100) return "El nombre no puede exceder 100 caracteres.";
    if (/\d/.test(v)) return "El nombre del objeto no debe contener números.";
    return null;
  };

  const validarDescripcion = (v) => {
    if (v && v.length > 500) return "La descripción no puede exceder 500 caracteres.";
    return null;
  };

  const validarTipoObjeto = (v) => {
    const tiposValidos = ["pantalla", "reporte", "menu", "proceso", "boton", "dashboard", "formulario", "catalogo", "modulo"];
    if (!v || !tiposValidos.includes(v)) return "Debe seleccionar un tipo de objeto válido.";
    return null;
  };

  const validarEstado = (v) => {
    if (!v || !["activo", "inactivo"].includes(v)) return "Debe seleccionar un estado válido.";
    return null;
  };

  // ============================================================
  // ✅ Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_objeto",
      label: "Nombre del Objeto",
      type: "text",
      required: true,
      placeholderText: "Ej. Módulo Ventas, Botón Reportes",
      validate: validarNombreObjeto,
      sanitize: sanitizeTexto,
    },
    {
      name: "descripcion",
      label: "Descripción",
      type: "textarea",
      placeholderText: "Describe brevemente la función del objeto",
      validate: validarDescripcion,
      sanitize: sanitizeTexto,
    },
    {
      name: "tipo_objeto",
      label: "Tipo de Objeto",
      type: "select",
      required: true,
      validate: validarTipoObjeto,
      options: [
        { label: "Pantalla", value: "pantalla" },
        { label: "Reporte", value: "reporte" },
        { label: "Menú", value: "menu" },
        { label: "Proceso", value: "proceso" },
        { label: "Botón", value: "boton" },
        { label: "Dashboard", value: "dashboard" },
        { label: "Formulario", value: "formulario" },
        { label: "Catálogo", value: "catalogo" },
        { label: "Módulo", value: "modulo" },
      ],
    },
    {
      name: "estado",
      label: "Estado",
      type: "select",
      required: true,
      validate: validarEstado,
      options: [
        { label: "Activo", value: "activo" },
        { label: "Inactivo", value: "inactivo" },
      ],
    },
  ];

  // ============================================================
  // ✅ Definición de columnas y extractores
  // ============================================================
  const columns = [
    "ID Objeto",
    "Nombre Objeto",
    "Descripción",
    "Tipo",
    "Estado",
    "Usuario Creado",
    "Fecha Creado",
    "Usuario Modificado",
    "Fecha Modificado",
  ];

  const extractors = {
    "ID Objeto": (r) => r.id_objeto,
    "Nombre Objeto": (r) => r.nombre_objeto,
    "Descripción": (r) => r.descripcion || "-",
    "Tipo": (r) => {
      const tipos = { pantalla: "Pantalla", reporte: "Reporte", menu: "Menú", proceso: "Proceso", boton: "Botón", dashboard: "Dashboard", formulario: "Formulario", catalogo: "Catálogo", modulo: "Módulo" };
      return tipos[r.tipo_objeto] || r.tipo_objeto || "Pantalla";
    },
    "Estado": (r) => r.estado === "activo" ? "✅ Activo" : "❌ Inactivo",
    "Usuario Creado": (r) => r.usuario_creado || "—",
    "Fecha Creado": (r) =>
      r.fecha_creado ? new Date(r.fecha_creado).toISOString().split("T")[0] : "—",
    "Usuario Modificado": (r) => r.usuario_modificado || "—",
    "Fecha Modificado": (r) =>
      r.fecha_modificado ? new Date(r.fecha_modificado).toISOString().split("T")[0] : "—",
  };

  // ============================================================
  // ✅ Funciones CRUD
  // ============================================================
  const recargarTodo = async () => {
    await cargarObjetos(page);
    await cargarStats();
  };

  const handleInsert = async (nuevo) => {
    try {
      await api.post(
        "/seguridad/objetos",
        {
          nombre_objeto: nuevo.nombre_objeto,
          descripcion: nuevo.descripcion,
          tipo_objeto: nuevo.tipo_objeto || "pantalla",
          estado: nuevo.estado || "activo",
        },
        {
          headers: { "x-user-email": username },
        }
      );

      toast({
        title: "Objeto agregado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await recargarTodo();
    } catch (err) {
      console.error("❌ Error insertando objeto:", err);
      const status = err.response?.status;
      const mensaje = err.response?.data?.error || err.message;
      toast({
        title: status === 409 ? "Objeto duplicado" : "Error al agregar objeto",
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
        `/seguridad/objetos/${editado.id_objeto}`,
        {
          nombre_objeto: editado.nombre_objeto,
          descripcion: editado.descripcion,
          tipo_objeto: editado.tipo_objeto,
          estado: editado.estado,
        },
        {
          headers: { "x-user-email": username },
        }
      );

      toast({
        title: "Objeto actualizado correctamente",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await recargarTodo();
    } catch (err) {
      console.error("❌ Error actualizando objeto:", err);
      const status = err.response?.status;
      const mensaje = err.response?.data?.error || err.message;
      toast({
        title: status === 409 ? "Nombre duplicado" : "Error al actualizar objeto",
        description: mensaje,
        status: status === 409 ? "warning" : "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/seguridad/objetos/${id}`, {
        headers: { "x-user-email": username },
      });
      toast({
        title: "Objeto eliminado correctamente",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      await recargarTodo();
    } catch (err) {
      console.error("❌ Error eliminando objeto:", err);
      const status = err.response?.status;
      const mensaje = err.response?.data?.error || err.message;
      toast({
        title: status === 409 ? "No se puede eliminar" : "Error al eliminar objeto",
        description: mensaje,
        status: status === 409 ? "warning" : "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  // ============================================================
  // ✅ Loader
  // ============================================================
  if (loading && data.length === 0) {
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
        Objetos
      </Heading>

      <Divider mb={4} borderColor={borderClr} />

      {/* ✅ DASHBOARD */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color={accent}>Objetos Registrados</StatLabel>
            <StatNumber fontSize="3xl">{statsData.total}</StatNumber>
            <StatHelpText>Total configurados</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="green.400">Activos</StatLabel>
            <StatNumber fontSize="3xl" color="green.400">{statsData.activos}</StatNumber>
            <StatHelpText>Objetos habilitados</StatHelpText>
          </Stat>
        </Box>

        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="red.400">Inactivos</StatLabel>
            <StatNumber fontSize="3xl" color="red.400">{statsData.inactivos}</StatNumber>
            <StatHelpText>Objetos deshabilitados</StatHelpText>
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
          title="Objetos"
          columns={columns}
          extractors={extractors}
          fields={fields}
          idKey="id_objeto"
          initialData={data}
          onInsert={handleInsert}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReload={() => recargarTodo()}
          apiUrl="/seguridad/objetos"
        />

        {/* ✅ Paginación */}
        {totalRecords > 0 && (
          <Flex justify="space-between" align="center" mt={4} p={2} borderTop="1px solid" borderColor={borderClr}>
            <HStack>
              <Text fontSize="sm" color="gray.500">
                Mostrando {Math.min(data.length, limit)} de {totalRecords} objetos
              </Text>
              <Select
                size="sm"
                width="80px"
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Select>
            </HStack>

            <HStack>
              <IconButton
                icon={<ChevronLeftIcon />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                isDisabled={page === 1}
                size="sm"
                aria-label="Anterior"
              />
              <Text fontSize="sm">
                Página {page} de {totalPages}
              </Text>
              <IconButton
                icon={<ChevronRightIcon />}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                isDisabled={page === totalPages}
                size="sm"
                aria-label="Siguiente"
              />
            </HStack>
          </Flex>
        )}
      </Box>
    </Box>
  );
}
