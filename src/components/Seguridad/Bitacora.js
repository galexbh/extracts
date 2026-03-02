// ============================================================
// 📂 src/components/Seguridad/Bitacora.js
// ============================================================
import React, { useEffect, useState } from "react";
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td,
  Spinner, Text, HStack, Input, Button, useToast,
  IconButton, Select, Flex, Badge,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  useDisclosure, Code, VStack
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, RepeatIcon, DownloadIcon, ViewIcon } from "@chakra-ui/icons";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "../../api/apiClient";

// ============================================================
// 🔧 Helpers
// ============================================================

// Convierte "seguridad.tbl_ms_bitacora" → "Bitácora", "tbl_permisos" → "Permisos"
const limpiarTabla = (raw) => {
  if (!raw) return "—";
  let name = raw
    .replace(/^[a-z]+\./i, "")      // quitar esquema (seguridad., ventasyreserva.)
    .replace(/^tbl_ms_/i, "")        // quitar prefijo tbl_ms_
    .replace(/^tbl_/i, "")           // quitar prefijo tbl_
    .replace(/_/g, " ");             // guiones bajos → espacios
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Traduce la acción a texto amigable
const accionTexto = (accion) => {
  const map = { INSERT: "Creación", UPDATE: "Actualización", DELETE: "Eliminación", LOGIN: "Inicio de sesión" };
  return map[accion] || accion;
};

// Limpia descripciones técnicas a lenguaje natural
const limpiarDescripcion = (desc, accion) => {
  if (!desc) return "—";

  // Patrón: "Operación INSERT en la tabla tbl_permisos"
  const match = desc.match(/^Operación\s+(INSERT|UPDATE|DELETE)\s+en la tabla\s+(.+)$/i);
  if (match) {
    const tabla = limpiarTabla(match[2]);
    const verbos = { INSERT: "Se creó un registro en", UPDATE: "Se actualizó un registro en", DELETE: "Se eliminó un registro de" };
    return `${verbos[match[1].toUpperCase()] || "Operación en"} ${tabla}`;
  }

  // Limpiar nombres de tabla dentro de descripciones existentes
  let cleaned = desc
    .replace(/seguridad\.tbl_ms_/g, "")
    .replace(/seguridad\.tbl_/g, "")
    .replace(/ventasyreserva\.tbl_/g, "")
    .replace(/inventario\.tbl_/g, "")
    .replace(/produccion\.tbl_/g, "")
    .replace(/tbl_ms_/g, "")
    .replace(/tbl_/g, "");

  return cleaned;
};

// Formatea el objeto detalle para mostrar en el modal — user-friendly
const LABELS = {
  // Permisos
  can_create: "Puede crear", can_read: "Puede ver", can_update: "Puede editar", can_delete: "Puede eliminar",
  id_rol: "Rol", id_objeto: "Objeto", nombre_rol: "Rol", nombre_objeto: "Objeto",
  // Facturas / Pedidos
  numero_factura: "N° de factura", id_cliente: "ID Cliente", id_factura: "ID Factura",
  total: "Total", items: "Cantidad de productos", productos: "Cantidad de productos",
  id_pedido: "ID Pedido", id_estado_pedido: "Estado del pedido", productos_devueltos: "Productos devueltos",
  // Usuarios
  nombre_usuario: "Nombre", username: "Correo", nombre_rol: "Rol",
  estado_usuario: "Estado", firebase_uid: "UID Firebase",
  // Roles
  nombre_rol: "Nombre del rol", descripcion: "Descripción",
  // General
  antes: "Datos anteriores", despues: "Datos nuevos",
};

// Campos técnicos que NO se muestran al usuario
const CAMPOS_OCULTOS = new Set([
  "id_usuario_creado", "id_usuario_modificado", "fecha_creado", "fecha_modificado",
  "id_permiso", "id_estado_objeto", "id_rol", "id_objeto",
]);

const formatearValor = (key, val) => {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "✅ Sí" : "❌ No";
  if (typeof val === "number") return String(val);
  if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(val).toLocaleString();
  }
  if (typeof val === "object") return null; // Will be handled as sub-section
  return String(val);
};

const getLabel = (key) => LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

export default function Bitacora() {
  // ============================================================
  // 🎯 Estados
  // ============================================================
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState("");
  const [tabla, setTabla] = useState("");
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [error, setError] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal de detalle
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedRow, setSelectedRow] = useState(null);

  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  // ============================================================
  // 🔄 Cargar datos desde backend
  // ============================================================
  const load = async (currentPage = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = { page: currentPage, limit };
      if (usuario) params.usuario = usuario;
      if (tabla) params.tabla = tabla;
      if (accion) params.accion = accion;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;

      const { data } = await api.get("/bitacora", { params });

      if (data && Array.isArray(data.rows)) {
        setRows(data.rows);
        setTotalPages(data.totalPages);
        setPage(data.page);
        setTotalRecords(data.total);
      } else {
        setRows([]);
        setTotalPages(1);
        setTotalRecords(0);
      }
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar la bitácora");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const handleSearch = () => { setPage(1); load(1); };
  const handleClear = () => {
    setUsuario(""); setTabla(""); setAccion(""); setDesde(""); setHasta("");
    setPage(1); load(1);
  };

  const openDetalle = (row) => { setSelectedRow(row); onOpen(); };

  // ============================================================
  // 📤 Exportar a PDF
  // ============================================================
  const exportPDF = async () => {
    try {
      setExporting(true);
      const limitExport = totalRecords > 0 ? totalRecords : 10000;
      const params = { page: 1, limit: limitExport };
      if (usuario) params.usuario = usuario;
      if (tabla) params.tabla = tabla;
      if (accion) params.accion = accion;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;

      const { data } = await api.get("/bitacora", { params });
      const rowsToExport = data.rows || [];

      if (rowsToExport.length === 0) {
        toast({ title: "No hay datos para exportar", status: "warning", duration: 3000 });
        setExporting(false);
        return;
      }

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Reporte de Bitácora - Extractus", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 20);

      const tableData = rowsToExport.map(r => {
        let fechaFmt = "—";
        try { if (r.fecha) fechaFmt = new Date(r.fecha).toLocaleString(); } catch (e) { }
        return [
          r.id_bitacora || "—",
          r.usuario || "Sistema",
          limpiarTabla(r.tabla),
          accionTexto(r.accion),
          limpiarDescripcion(r.descripcion, r.accion),
          fechaFmt,
        ];
      });

      doc.autoTable({
        head: [["ID", "Usuario", "Tabla", "Acción", "Descripción", "Fecha"]],
        body: tableData,
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 120, 170] },
        theme: 'grid'
      });

      doc.save(`Bitacora_Extractus_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500 });
    } catch (err) {
      console.error("Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", status: "error", duration: 4000 });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // 📊 Exportar a Excel
  // ============================================================
  const exportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Bitácora");

      ws.columns = [
        { header: "ID", key: "id_bitacora", width: 10 },
        { header: "Usuario", key: "usuario", width: 25 },
        { header: "Tabla", key: "tabla", width: 20 },
        { header: "Acción", key: "accion", width: 15 },
        { header: "Descripción", key: "descripcion", width: 45 },
        { header: "Detalle", key: "detalle", width: 50 },
        { header: "Fecha", key: "fecha", width: 22 },
      ];

      rows.forEach(r => {
        ws.addRow({
          id_bitacora: r.id_bitacora,
          usuario: r.usuario || "Sistema",
          tabla: limpiarTabla(r.tabla),
          accion: accionTexto(r.accion),
          descripcion: limpiarDescripcion(r.descripcion, r.accion),
          detalle: r.detalle ? (typeof r.detalle === 'object' ? JSON.stringify(r.detalle) : r.detalle) : "—",
          fecha: new Date(r.fecha).toLocaleString(),
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "Bitacora_Extractus.xlsx");
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500 });
    } catch (err) {
      console.error(err);
      toast({ title: "Error al generar Excel", status: "error", duration: 2500 });
    }
  };

  // ============================================================
  // 🎨 Renderizado
  // ============================================================
  return (
    <Box p={6} bg="white" boxShadow="md" borderRadius="lg">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md" color="teal.600">Bitácora del Sistema</Heading>
        <HStack>
          <Button leftIcon={<DownloadIcon />} colorScheme="blue" size="sm" onClick={exportPDF} isLoading={exporting} loadingText="Generando...">PDF</Button>
          <Button leftIcon={<DownloadIcon />} colorScheme="green" size="sm" onClick={exportExcel}>Excel</Button>
        </HStack>
      </Flex>

      {/* 🔍 Filtros */}
      <Box mb={6} p={4} bg="gray.50" borderRadius="md" borderWidth="1px">
        <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
          <Input placeholder="Usuario" value={usuario} onChange={e => setUsuario(e.target.value)} bg="white" />
          <Input placeholder="Tabla" value={tabla} onChange={e => setTabla(e.target.value)} bg="white" />
          <Select placeholder="Acción" value={accion} onChange={e => setAccion(e.target.value)} bg="white">
            <option value="INSERT">Creación</option>
            <option value="UPDATE">Actualización</option>
            <option value="DELETE">Eliminación</option>
            <option value="LOGIN">Inicio de sesión</option>
          </Select>
        </Flex>
        <Flex direction={{ base: "column", md: "row" }} gap={4} align="center">
          <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} bg="white" />
          <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} bg="white" />
          <Button colorScheme="teal" onClick={handleSearch} minW="100px">Filtrar</Button>
          <Button colorScheme="gray" onClick={handleClear} leftIcon={<RepeatIcon />}>Limpiar</Button>
        </Flex>
      </Box>

      {/* 🧾 Tabla */}
      {loading ? (
        <Flex justify="center" py={10}><Spinner size="xl" color="teal.500" /></Flex>
      ) : error ? (
        <Text color="red.400" textAlign="center">{error}</Text>
      ) : (
        <>
          <Box overflowX="auto">
            <Table size="sm" variant="striped" colorScheme="gray">
              <Thead bg="teal.50">
                <Tr>
                  <Th>ID</Th>
                  <Th>Usuario</Th>
                  <Th>Módulo</Th>
                  <Th>Acción</Th>
                  <Th>Descripción</Th>
                  <Th>Detalle</Th>
                  <Th>Fecha</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.length === 0 ? (
                  <Tr><Td colSpan={7} textAlign="center" py={4}><Text color="gray.500">No hay registros</Text></Td></Tr>
                ) : (
                  rows.map(r => (
                    <Tr key={r.id_bitacora}>
                      <Td fontWeight="bold">{r.id_bitacora}</Td>
                      <Td>
                        <Badge colorScheme="purple">{r.usuario}</Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme="cyan" variant="subtle">{limpiarTabla(r.tabla)}</Badge>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={
                            r.accion === 'DELETE' ? 'red' :
                              r.accion === 'INSERT' ? 'green' :
                                r.accion === 'UPDATE' ? 'blue' : 'gray'
                          }
                        >
                          {accionTexto(r.accion)}
                        </Badge>
                      </Td>
                      <Td maxW="350px" isTruncated title={limpiarDescripcion(r.descripcion, r.accion)}>{limpiarDescripcion(r.descripcion, r.accion)}</Td>
                      <Td>
                        {r.detalle ? (
                          <IconButton
                            icon={<ViewIcon />}
                            size="xs"
                            colorScheme="teal"
                            variant="outline"
                            aria-label="Ver detalle"
                            onClick={() => openDetalle(r)}
                          />
                        ) : (
                          <Text fontSize="xs" color="gray.400">—</Text>
                        )}
                      </Td>
                      <Td fontSize="xs" whiteSpace="nowrap">{new Date(r.fecha).toLocaleString()}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>

          {/* Paginación */}
          {rows.length > 0 && (
            <Flex justify="space-between" align="center" mt={4} p={2}>
              <HStack>
                <Text fontSize="sm" color="gray.600">
                  Mostrando {Math.min(rows.length, limit)} de {totalRecords} registros
                </Text>
                <Select size="sm" width="80px" value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </Select>
              </HStack>

              <HStack>
                <IconButton icon={<ChevronLeftIcon />} onClick={() => setPage(p => Math.max(1, p - 1))} isDisabled={page === 1} size="sm" aria-label="Anterior" />
                <Text fontSize="sm">Página {page} de {totalPages}</Text>
                <IconButton icon={<ChevronRightIcon />} onClick={() => setPage(p => Math.min(totalPages, p + 1))} isDisabled={page === totalPages} size="sm" aria-label="Siguiente" />
              </HStack>
            </Flex>
          )}
        </>
      )}

      {/* 📋 Modal de Detalle */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay bg="blackAlpha.400" />
        <ModalContent>
          <ModalHeader bg="teal.50" borderTopRadius="md">
            <HStack spacing={3}>
              <ViewIcon color="teal.500" />
              <Text>Detalle de Registro #{selectedRow?.id_bitacora}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            {selectedRow && (
              <VStack align="stretch" spacing={4}>
                {/* Info general */}
                <Box>
                  <HStack mb={2}>
                    <Badge colorScheme="purple">{selectedRow.usuario}</Badge>
                    <Badge
                      colorScheme={
                        selectedRow.accion === 'DELETE' ? 'red' :
                          selectedRow.accion === 'INSERT' ? 'green' :
                            selectedRow.accion === 'UPDATE' ? 'blue' : 'gray'
                      }
                    >
                      {accionTexto(selectedRow.accion)}
                    </Badge>
                    <Badge colorScheme="cyan">{limpiarTabla(selectedRow.tabla)}</Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">{limpiarDescripcion(selectedRow.descripcion, selectedRow.accion)}</Text>
                  <Text fontSize="xs" color="gray.400" mt={1}>{new Date(selectedRow.fecha).toLocaleString()}</Text>
                </Box>

                {/* Datos del detalle */}
                {selectedRow.detalle && (() => {
                  try {
                    const raw = selectedRow.detalle;
                    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
                    if (!obj) return null;

                    // Renderiza una sección de campos
                    const renderFields = (data, title) => {
                      const entries = Object.entries(data).filter(
                        ([k]) => !CAMPOS_OCULTOS.has(k) && typeof data[k] !== "object"
                      );
                      if (entries.length === 0) return null;
                      return (
                        <Box bg="gray.50" p={4} borderRadius="md" borderWidth="1px">
                          <Text fontWeight="bold" mb={2} fontSize="sm" color="teal.600">{title}</Text>
                          <Table size="sm" variant="simple">
                            <Tbody>
                              {entries.map(([key, val]) => (
                                <Tr key={key}>
                                  <Td fontWeight="semibold" fontSize="sm" color="gray.600" border="none" py={1} px={2} w="45%">
                                    {getLabel(key)}
                                  </Td>
                                  <Td fontSize="sm" border="none" py={1} px={2}>
                                    {formatearValor(key, val)}
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      );
                    };

                    // Si tiene antes/despues (UPDATE), mostrar separados
                    if (obj.antes && obj.despues) {
                      return (
                        <VStack spacing={3} align="stretch">
                          {renderFields(obj.antes, "📋 Datos anteriores")}
                          {renderFields(obj.despues, "✏️ Datos nuevos")}
                        </VStack>
                      );
                    }

                    // Si no, mostrar campos planos
                    return renderFields(obj, "📋 Datos del cambio");
                  } catch (e) {
                    return <Code p={3} borderRadius="md" whiteSpace="pre-wrap" fontSize="xs">{String(selectedRow.detalle)}</Code>;
                  }
                })()}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
