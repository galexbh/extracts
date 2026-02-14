// ============================================================
// 📁 src/components/Ventas/Clientes.js
// 🎯 Clientes con mini dashboard, PDF/Excel, validaciones y soporte claro/oscuro
// ============================================================

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
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
  FaFilePdf,
  FaFileExcel,
  FaUserFriends,
  FaCheckCircle,
  FaUserSlash,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import CrudTabla from "../Seguridad/CrudTabla";
import api from "../../api/apiClient";

// 📦 Exportación
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// 🖼️ Logo SOLO para el PDF
import extractusLogo from "../login/log.png";

// ✅ Validaciones
import {
  validarRequerido,
  soloLetras,
  validarTelefono,
  validarRTN,
  validarEmail,
} from "../../utils/validaciones";

export default function Clientes() {
  // 🎨 Colores adaptados a día/noche
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
  const [tiposCliente, setTiposCliente] = useState([]);
  const [estadosCliente, setEstadosCliente] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔹 Cargar clientes desde la API
  // ============================================================
  const cargarClientes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/ventas/clientes");
      setData(res.data);
    } catch (err) {
      console.error("❌ Error cargando clientes:", err);
      toast({
        title: "Error al cargar clientes",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ============================================================
  // 🔹 Cargar tipos y estados (catálogos)
  // ============================================================
  const cargarTiposYEstados = useCallback(async () => {
    try {
      const [tipos, estados] = await Promise.all([
        api.get("/mantenimiento/tipo-cliente"),
        api.get("/mantenimiento/estado-cliente"),
      ]);
      setTiposCliente(tipos.data);
      setEstadosCliente(estados.data);
    } catch (err) {
      console.error("❌ Error cargando catálogos:", err);
      toast({
        title: "Error al cargar catálogos",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }
  }, [toast]);

  // ============================================================
  // 🔹 Carga inicial
  // ============================================================
  useEffect(() => {
    Promise.all([cargarClientes(), cargarTiposYEstados()]);
  }, [cargarClientes, cargarTiposYEstados]);

  // ============================================================
  // 📊 Mini dashboard (totales)
  // ============================================================
  const { totalClientes, clientesActivos, clientesInactivos } = useMemo(() => {
    const total = data.length;

    const activos = data.filter((r) => {
      const estado = (r.estado_cliente || r.nombre_estado || "")
        .toString()
        .toLowerCase();
      return estado === "activo";
    }).length;

    const inactivos = total - activos;

    return {
      totalClientes: total,
      clientesActivos: activos,
      clientesInactivos: inactivos,
    };
  }, [data]);

  // ============================================================
  // 🔹 Campos del formulario CRUD
  // ============================================================
  const fields = [
    {
      name: "nombre_cliente",
      label: "Nombre del Cliente",
      type: "text",
      required: true,
    },
    { name: "rtn", label: "RTN / ID", type: "text" },
    {
      name: "id_tipo_cliente",
      label: "Tipo de Cliente",
      type: "select",
      options: tiposCliente.map((t) => ({
        label: t.nombre_tipo,
        value: t.id_tipo_cliente,
      })),
      required: true,
    },
    { name: "direccion", label: "Dirección", type: "text", required: true },
    { name: "telefono", label: "Teléfono", type: "text", required: true },
    { name: "correo_electronico", label: "Correo Electrónico", type: "email" },
    {
      name: "id_estado_cliente",
      label: "Estado del Cliente",
      type: "select",
      options: estadosCliente.map((e) => ({
        label: e.nombre_estado,
        value: e.id_estado_cliente,
      })),
      required: true,
    },
  ];

  // ============================================================
  // 🔍 Validadores por campo (se pasan al CrudTabla)
// ============================================================
  const validators = {
    nombre_cliente: (v) =>
      validarRequerido(v, "Nombre del cliente") ||
      (!soloLetras(v) ? "El nombre solo debe contener letras." : null),

    rtn: (v) => (v ? validarRTN(v) : null),

    telefono: (v) =>
      validarRequerido(v, "Teléfono") || validarTelefono(v),

    correo_electronico: (v) =>
      v ? validarEmail(v) : null,
  };

  // ============================================================
  // 🧾 Exportar PDF (logo + fecha/hora)
  // ============================================================
  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF("landscape");
      const fechaHora = new Date().toLocaleString("es-HN");

      const img = new Image();
      img.src = extractusLogo;

      await new Promise((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, "PNG", 245, 5, 20, 15);
          resolve();
        };
        img.onerror = (err) => reject(err);
      });

      doc.setFontSize(14);
      doc.text("Listado de Clientes", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generado: ${fechaHora}`, 14, 22);

      const columns = [
        "ID",
        "Nombre",
        "RTN / ID",
        "Tipo Cliente",
        "Dirección",
        "Teléfono",
        "Correo",
        "Estado",
        "Fecha Creación",
      ];

      const rows = data.map((r) => [
        r.id_cliente,
        r.nombre_cliente,
        r.rtn || "",
        r.tipo_cliente || r.nombre_tipo || "",
        r.direccion || "",
        r.telefono || "",
        r.correo_electronico || "",
        r.estado_cliente || r.nombre_estado || "",
        r.fecha_creacion
          ? new Date(r.fecha_creacion).toISOString().split("T")[0]
          : "",
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 158, 115] },
      });

      doc.save(`Clientes_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("❌ Error exportando PDF:", err);
      toast({
        title: "Error al exportar PDF",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }
  };

  // ============================================================
  // 📊 Exportar Excel
  // ============================================================
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Clientes");

      sheet.addRow([
        "ID",
        "Nombre",
        "RTN / ID",
        "Tipo Cliente",
        "Dirección",
        "Teléfono",
        "Correo",
        "Estado",
        "Fecha Creación",
      ]);

      data.forEach((r) => {
        sheet.addRow([
          r.id_cliente,
          r.nombre_cliente,
          r.rtn || "",
          r.tipo_cliente || r.nombre_tipo || "",
          r.direccion || "",
          r.telefono || "",
          r.correo_electronico || "",
          r.estado_cliente || r.nombre_estado || "",
          r.fecha_creacion
            ? new Date(r.fecha_creacion).toISOString().split("T")[0]
            : "",
        ]);
      });

      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((col) => {
        col.width = 20;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `Clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({
        title: "Error al exportar Excel",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }
  };

  // ============================================================
  // 🔹 Loader
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh" bg={pageBg}>
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ============================================================
  // 🔹 Render principal
  // ============================================================
  return (
    <Box bg={pageBg} minH="100vh" p={4}>
      {/* Botón Atrás */}
      <Tooltip label="Volver al menú Ventas" placement="bottom-start">
        <Button
          leftIcon={<Icon as={FaArrowLeft} />}
          bg={btnBackBg}
          color={btnBackColor}
          _hover={{ bg: btnBackHoverBg, transform: "scale(1.03)" }}
          onClick={() => navigate("/app/ventas")}
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
        {/* Encabezado con título + botones */}
        <CardHeader pb={3}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Box>
              <HStack spacing={2}>
                <FaUserFriends color={accent} />
                <Heading size="md" color={accent}>
                  Gestión de Clientes
                </Heading>
              </HStack>
              <Text fontSize="sm" color={subtitleColor}>
                Mini resumen de clientes y tabla editable en la parte inferior.
              </Text>
            </Box>

            <HStack spacing={2}>
              <Tooltip label="Exportar listado a PDF">
                <Button
                  size="sm"
                  colorScheme="red"
                  leftIcon={<FaFilePdf />}
                  onClick={handleExportPDF}
                >
                  PDF
                </Button>
              </Tooltip>
              <Tooltip label="Exportar listado a Excel">
                <Button
                  size="sm"
                  colorScheme="green"
                  leftIcon={<FaFileExcel />}
                  onClick={handleExportExcel}
                >
                  Excel
                </Button>
              </Tooltip>
            </HStack>
          </Flex>
        </CardHeader>

        <CardBody pt={0}>
          {/* MINI DASHBOARD */}
          <Box py={3}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Box
                as={Stat}
                p={4}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                bg={statTotalBg}
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <StatLabel>Total de clientes</StatLabel>
                    <StatNumber>{totalClientes}</StatNumber>
                    <StatHelpText fontSize="xs">
                      Registrados en el sistema
                    </StatHelpText>
                  </Box>
                  <Icon as={FaUserFriends} boxSize={8} color={accent} />
                </Flex>
              </Box>

              <Box
                as={Stat}
                p={4}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                bg={statActivosBg}
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <StatLabel>Clientes activos</StatLabel>
                    <StatNumber color={activosNumberColor}>
                      {clientesActivos}
                    </StatNumber>
                    <StatHelpText fontSize="xs">
                      En estado &quot;Activo&quot;
                    </StatHelpText>
                  </Box>
                  <Icon as={FaCheckCircle} boxSize={8} color="green.400" />
                </Flex>
              </Box>

              <Box
                as={Stat}
                p={4}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={borderColor}
                bg={statInactivosBg}
              >
                <Flex justify="space-between" align="center">
                  <Box>
                    <StatLabel>Clientes inactivos</StatLabel>
                    <StatNumber color={inactivosNumberColor}>
                      {clientesInactivos}
                    </StatNumber>
                    <StatHelpText fontSize="xs">
                      No activos / dados de baja
                    </StatHelpText>
                  </Box>
                  <Icon as={FaUserSlash} boxSize={8} color="red.400" />
                </Flex>
              </Box>
            </SimpleGrid>
          </Box>

          <Divider my={4} />

          {/* TABLA CRUD */}
          <Box overflowX="auto">
            <CrudTabla
              title="Clientes"
              columns={[
                "ID Cliente",
                "Nombre Cliente",
                "RTN / ID",
                "Tipo Cliente",
                "Dirección",
                "Teléfono",
                "Correo Electrónico",
                "Estado Cliente",
                "Fecha Creación",
              ]}
              extractors={{
                "ID Cliente": (r) => r.id_cliente,
                "Nombre Cliente": (r) => r.nombre_cliente,
                "RTN / ID": (r) => r.rtn,
                "Tipo Cliente": (r) => r.tipo_cliente || r.nombre_tipo,
                "Dirección": (r) => r.direccion,
                "Teléfono": (r) => r.telefono,
                "Correo Electrónico": (r) => r.correo_electronico,
                "Estado Cliente": (r) =>
                  r.estado_cliente || r.nombre_estado,
                "Fecha Creación": (r) =>
                  r.fecha_creacion
                    ? new Date(r.fecha_creacion).toISOString().split("T")[0]
                    : "",
              }}
              fields={fields}
              idKey="id_cliente"
              initialData={data}
              onReload={cargarClientes}
              apiUrl="/ventas/clientes"
              validators={validators}
              showReloadButton={false} // 👈 sin botón Refrescar al lado de Agregar
            />
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
}
