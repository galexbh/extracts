// ============================================================
// 📂 src/components/Seguridad/Bitacora.js
// ============================================================
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td,
  Spinner, Text, HStack, Input, Button, useToast,
  IconButton, Select, Flex, Badge,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, Code, VStack, FormControl, FormLabel, Divider,
  useColorModeValue
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, RepeatIcon, DownloadIcon, ViewIcon } from "@chakra-ui/icons";
import { FaFileExport } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  id_rol: "Rol", id_objeto: "Objeto", nombre_objeto: "Objeto",
  // Facturas / Pedidos
  numero_factura: "N° de factura", id_cliente: "ID Cliente", id_factura: "ID Factura",
  total: "Total", items: "Cantidad de productos", productos: "Cantidad de productos",
  id_pedido: "ID Pedido", id_estado_pedido: "Estado del pedido", productos_devueltos: "Productos devueltos",
  // Usuarios
  nombre_usuario: "Nombre", username: "Correo",
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
  // 🎨 Paleta de colores (modo claro / oscuro)
  // ============================================================
  const cardBg = useColorModeValue("white", "gray.800");
  const filterBg = useColorModeValue("gray.50", "gray.700");
  const inputBg = useColorModeValue("white", "gray.600");
  const accent = useColorModeValue("teal.600", "teal.200");
  const theadBg = useColorModeValue("teal.50", "teal.900");
  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const subtleText = useColorModeValue("gray.600", "gray.300");
  const mutedText = useColorModeValue("gray.400", "gray.500");
  const detailBg = useColorModeValue("gray.50", "gray.700");
  const borderClr = useColorModeValue("gray.200", "gray.600");

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

  // Modal de exportación
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expUsuario, setExpUsuario] = useState("");
  const [expAccion, setExpAccion] = useState("");
  const [expDesde, setExpDesde] = useState("");
  const [expHasta, setExpHasta] = useState("");

  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  // ============================================================
  // 🔄 Cargar datos desde backend
  // ============================================================
  const load = useCallback(async (currentPage = 1, filters = {}) => {
    try {
      setLoading(true);
      setError("");

      const params = { page: currentPage, limit };
      if (filters.usuario) params.usuario = filters.usuario;
      if (filters.tabla) params.tabla = filters.tabla;
      if (filters.accion) params.accion = filters.accion;
      if (filters.desde) params.desde = filters.desde;
      if (filters.hasta) params.hasta = filters.hasta;

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
  }, [limit]);

  // 🔍 Auto-búsqueda con debounce (400ms)
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setPage(1);
      load(1, { usuario, tabla, accion, desde, hasta });
    }, 400);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, tabla, accion, desde, hasta, limit]);

  // Paginación: cargar al cambiar de página
  useEffect(() => {
    load(page, { usuario, tabla, accion, desde, hasta });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => { setPage(1); load(1, { usuario, tabla, accion, desde, hasta }); };
  const handleClear = () => {
    setUsuario(""); setTabla(""); setAccion(""); setDesde(""); setHasta("");
    // El useEffect con debounce se encargará de recargar automáticamente
  };

  const openDetalle = (row) => { setSelectedRow(row); onOpen(); };

  // ============================================================
  // 🔧 Helper: construir texto de filtros activos
  // ============================================================
  const buildFilterText = (overrides = {}) => {
    const u = overrides.usuario ?? usuario;
    const a = overrides.accion ?? accion;
    const t = overrides.tabla ?? tabla;
    const d = overrides.desde ?? desde;
    const h = overrides.hasta ?? hasta;
    const parts = [];
    if (u) parts.push(`Usuario: ${u}`);
    if (a) parts.push(`Acción: ${accionTexto(a)}`);
    if (t) parts.push(`Tabla: ${t}`);
    if (d) parts.push(`Desde: ${d}`);
    if (h) parts.push(`Hasta: ${h}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  // Helper: obtener todos los registros (con filtros del modal de export)
  const fetchAllForExport = async (overrides = {}) => {
    const params = { page: 1, limit: 10000 };
    const u = overrides.usuario ?? usuario;
    const a = overrides.accion ?? accion;
    const t = overrides.tabla ?? tabla;
    const d = overrides.desde ?? desde;
    const h = overrides.hasta ?? hasta;
    if (u) params.usuario = u;
    if (t) params.tabla = t;
    if (a) params.accion = a;
    if (d) params.desde = d;
    if (h) params.hasta = h;

    const { data } = await api.get("/bitacora", { params });
    return data.rows || [];
  };

  // Helper: cargar logo como DataURL
  const imgToDataURL = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = src;
    });

  // ============================================================
  // 📤 Exportar a PDF — Estilo profesional con logo y filtros
  // ============================================================
  const exportPDF = async (filters = {}) => {
    try {
      setExporting(true);
      const rowsToExport = await fetchAllForExport(filters);

      if (rowsToExport.length === 0) {
        toast({ title: "No hay datos para exportar", status: "warning", duration: 3000 });
        return;
      }

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;

      // ── Logo ──
      try {
        const logoMod = await import("../login/log.png");
        const dataURL = await imgToDataURL(logoMod.default || logoMod);
        doc.addImage(dataURL, "PNG", 40, 20, 45, 45);
      } catch (e) { /* sin logo */ }

      // ── Título ──
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(25, 55, 80);
      doc.text("REPORTE DE BITÁCORA DEL SISTEMA", pageWidth / 2, 45, { align: "center" });

      // ── Fecha generación ──
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 62, { align: "center" });

      // ── Filtros aplicados ──
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(filters)}`, pageWidth / 2, 78, { align: "center" });

      // ── Línea separadora ──
      doc.setDrawColor(20, 120, 110);
      doc.setLineWidth(1);
      doc.line(40, 90, pageWidth - 40, 90);

      // ── Tabla ──
      const tableData = rowsToExport.map(r => [
        r.id_bitacora || "—",
        r.usuario || "Sistema",
        limpiarTabla(r.tabla),
        accionTexto(r.accion),
        limpiarDescripcion(r.descripcion, r.accion),
        r.fecha ? new Date(r.fecha).toLocaleString() : "—",
      ]);

      autoTable(doc, {
        startY: 105,
        head: [["ID", "Usuario", "Módulo", "Acción", "Descripción", "Fecha"]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
        headStyles: {
          fillColor: [20, 120, 110],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 40 },
          4: { cellWidth: 200 },
        },
        didDrawPage: () => {
          const ps = doc.internal.pageSize;
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(
            `Página ${doc.getNumberOfPages()}`,
            ps.getWidth() - 80,
            ps.getHeight() - 20
          );
        },
      });

      // ── Resumen ──
      const finalY = doc.lastAutoTable.finalY + 25;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(25, 55, 80);
      doc.text("RESUMEN", 40, finalY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60);
      let y = finalY + 18;
      doc.text(`Total de registros exportados: ${rowsToExport.length}`, 50, y);
      y += 16;

      const inserts = rowsToExport.filter(r => r.accion === "INSERT").length;
      const updates = rowsToExport.filter(r => r.accion === "UPDATE").length;
      const deletes = rowsToExport.filter(r => r.accion === "DELETE").length;
      const logins = rowsToExport.filter(r => r.accion === "LOGIN").length;

      if (inserts) { doc.text(`Creaciones: ${inserts}`, 50, y); y += 16; }
      if (updates) { doc.text(`Actualizaciones: ${updates}`, 50, y); y += 16; }
      if (deletes) { doc.text(`Eliminaciones: ${deletes}`, 50, y); y += 16; }
      if (logins) { doc.text(`Inicios de sesión: ${logins}`, 50, y); }

      doc.save(`Bitacora_Extractus_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", status: "error", duration: 4000, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // 📊 Exportar a Excel — Estilo profesional con filtros y auto-width
  // ============================================================
  const exportExcel = async (filters = {}) => {
    try {
      setExporting(true);
      const rowsToExport = await fetchAllForExport(filters);

      if (rowsToExport.length === 0) {
        toast({ title: "No hay datos para exportar", status: "warning", duration: 3000 });
        return;
      }

      const wb = new ExcelJS.Workbook();
      wb.creator = "Extractus ERP";
      wb.created = new Date();

      const ws = wb.addWorksheet("Bitácora");

      // ── Header con filtros ──
      ws.mergeCells("A1:G1");
      const titleRow = ws.getCell("A1");
      titleRow.value = "Reporte de Bitácora — Extractus";
      titleRow.font = { bold: true, size: 14, color: { argb: "FF147870" } };
      titleRow.alignment = { horizontal: "center" };

      ws.mergeCells("A2:G2");
      const filterRow = ws.getCell("A2");
      filterRow.value = `Filtros: ${buildFilterText(filters)}  |  Generado: ${new Date().toLocaleString()}`;
      filterRow.font = { size: 9, italic: true, color: { argb: "FF666666" } };
      filterRow.alignment = { horizontal: "center" };

      // ── Columnas ──
      const columns = [
        { header: "ID", key: "id_bitacora", width: 10 },
        { header: "Usuario", key: "usuario", width: 25 },
        { header: "Módulo", key: "tabla", width: 20 },
        { header: "Acción", key: "accion", width: 18 },
        { header: "Descripción", key: "descripcion", width: 50 },
        { header: "Detalle", key: "detalle", width: 55 },
        { header: "Fecha", key: "fecha", width: 22 },
      ];

      // Escribir header en fila 4
      const headerRowNum = 4;
      columns.forEach((col, i) => {
        const cell = ws.getCell(headerRowNum, i + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF147870" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FF0D5E56" } },
        };
      });

      // ── Datos ──
      rowsToExport.forEach((r, idx) => {
        const rowNum = headerRowNum + 1 + idx;
        const values = [
          r.id_bitacora,
          r.usuario || "Sistema",
          limpiarTabla(r.tabla),
          accionTexto(r.accion),
          limpiarDescripcion(r.descripcion, r.accion),
          r.detalle ? (typeof r.detalle === "object" ? JSON.stringify(r.detalle) : r.detalle) : "—",
          r.fecha ? new Date(r.fecha).toLocaleString() : "—",
        ];
        values.forEach((v, i) => {
          ws.getCell(rowNum, i + 1).value = v;
        });
        // Alterne colores (zebra)
        if (idx % 2 === 1) {
          for (let i = 1; i <= columns.length; i++) {
            ws.getCell(rowNum, i).fill = {
              type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDFA" },
            };
          }
        }
      });

      // ── Auto-width ──
      columns.forEach((col, i) => {
        let maxLen = col.header.length;
        rowsToExport.forEach(r => {
          let v = "";
          switch (col.key) {
            case "tabla": v = limpiarTabla(r.tabla); break;
            case "accion": v = accionTexto(r.accion); break;
            case "descripcion": v = limpiarDescripcion(r.descripcion, r.accion); break;
            default: v = String(r[col.key] ?? "");
          }
          if (v.length > maxLen) maxLen = v.length;
        });
        ws.getColumn(i + 1).width = Math.min(Math.max(col.width, maxLen + 2), 65);
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Bitacora_Extractus_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error(err);
      toast({ title: "Error al generar Excel", status: "error", duration: 2500, isClosable: true });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // 🎨 Renderizado
  // ============================================================
  return (
    <Box p={6} bg={cardBg} boxShadow="md" borderRadius="lg">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md" color={accent}>Bitácora del Sistema</Heading>
        <Button
          leftIcon={<FaFileExport />}
          colorScheme="teal"
          size="sm"
          onClick={() => {
            setExpUsuario(""); setExpAccion(""); setExpDesde(""); setExpHasta("");
            setExportFormat("excel");
            exportModal.onOpen();
          }}
          isDisabled={exporting}
        >
          Exportar
        </Button>
      </Flex>

      {/* 🔍 Filtros */}
      <Box mb={6} p={4} bg={filterBg} borderRadius="md" borderWidth="1px" borderColor={borderClr}>
        <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
          <Input placeholder="Usuario" value={usuario} onChange={e => setUsuario(e.target.value)} bg={inputBg} />
          <Input placeholder="Tabla" value={tabla} onChange={e => setTabla(e.target.value)} bg={inputBg} />
          <Select placeholder="Acción" value={accion} onChange={e => setAccion(e.target.value)} bg={inputBg}>
            <option value="INSERT">Creación</option>
            <option value="UPDATE">Actualización</option>
            <option value="DELETE">Eliminación</option>
            <option value="LOGIN">Inicio de sesión</option>
          </Select>
        </Flex>
        <Flex direction={{ base: "column", md: "row" }} gap={4} align="center">
          <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} bg={inputBg} />
          <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} bg={inputBg} />
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
              <Thead bg={theadBg}>
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
                <Text fontSize="sm" color={subtleText}>
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

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Bitácora</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
              Si no aplicas filtros, se exportarán todos los registros.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato</FormLabel>
              <Select value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
                <option value="excel">📊 Excel (.xlsx)</option>
                <option value="pdf">📄 PDF (.pdf)</option>
              </Select>
            </FormControl>

            <Divider my={4} />

            <Text fontWeight="bold" mb={3} color={accent}>Filtros de exportación</Text>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por usuario</FormLabel>
              <Input
                placeholder="Ej: admin@extractus.com"
                value={expUsuario}
                onChange={e => setExpUsuario(e.target.value)}
                size="sm"
              />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por acción</FormLabel>
              <Select placeholder="Todas las acciones" value={expAccion} onChange={e => setExpAccion(e.target.value)} size="sm">
                <option value="INSERT">Creación</option>
                <option value="UPDATE">Actualización</option>
                <option value="DELETE">Eliminación</option>
                <option value="LOGIN">Inicio de sesión</option>
              </Select>
            </FormControl>

            <Flex gap={3}>
              <FormControl>
                <FormLabel fontSize="sm">Desde</FormLabel>
                <Input type="date" value={expDesde} onChange={e => setExpDesde(e.target.value)} size="sm" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Hasta</FormLabel>
                <Input type="date" value={expHasta} onChange={e => setExpHasta(e.target.value)} size="sm" />
              </FormControl>
            </Flex>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="teal"
              leftIcon={<DownloadIcon />}
              isLoading={exporting}
              loadingText="Generando..."
              onClick={async () => {
                const filters = {
                  usuario: expUsuario || undefined,
                  accion: expAccion || undefined,
                  desde: expDesde || undefined,
                  hasta: expHasta || undefined,
                };
                if (exportFormat === "pdf") {
                  await exportPDF(filters);
                } else {
                  await exportExcel(filters);
                }
                exportModal.onClose();
              }}
            >
              Exportar
            </Button>
            <Button ml={3} onClick={exportModal.onClose}>Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 📋 Modal de Detalle */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay bg="blackAlpha.400" />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
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
                  <Text fontSize="sm" color={subtleText}>{limpiarDescripcion(selectedRow.descripcion, selectedRow.accion)}</Text>
                  <Text fontSize="xs" color={mutedText} mt={1}>{new Date(selectedRow.fecha).toLocaleString()}</Text>
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
                        <Box bg={detailBg} p={4} borderRadius="md" borderWidth="1px" borderColor={borderClr}>
                          <Text fontWeight="bold" mb={2} fontSize="sm" color={accent}>{title}</Text>
                          <Table size="sm" variant="simple">
                            <Tbody>
                              {entries.map(([key, val]) => (
                                <Tr key={key}>
                                  <Td fontWeight="semibold" fontSize="sm" color={subtleText} border="none" py={1} px={2} w="45%">
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
