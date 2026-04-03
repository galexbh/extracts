// ============================================================
// 💎 Movimientos de Productos — Export Modal Clientes-style
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td,
  Heading, Spinner, useToast, Button,
  HStack, Flex, Input, Card, SimpleGrid,
  Text, Modal, ModalBody, ModalHeader,
  ModalOverlay, ModalContent, ModalFooter, ModalCloseButton,
  Select, Divider,
  useDisclosure, FormControl, FormLabel,
  Checkbox, Badge, useColorModeValue,
} from "@chakra-ui/react";

import { FaSync, FaBroom, FaFileExport, FaArrowLeft } from "react-icons/fa";
import { DownloadIcon } from "@chakra-ui/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "../../api/apiClient";
import extractusLogo from "../login/log.png";
import { useNavigate } from "react-router-dom";

// ── Campos disponibles para exportación ──
const EXPORT_FIELDS = [
  { key: "id", label: "ID" },
  { key: "producto", label: "Producto" },
  { key: "tipo", label: "Tipo" },
  { key: "cantidad", label: "Cantidad" },
  { key: "um", label: "Unidad Medida" },
  { key: "fecha", label: "Fecha" },
  { key: "usuario", label: "Usuario" },
  { key: "observacion", label: "Observación" },
];
const ALL_FIELD_KEYS = EXPORT_FIELDS.map((f) => f.key);

export default function MovimientosProductos() {
  const navigate = useNavigate();
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);

  // Campos del modal registro
  const [nuevo, setNuevo] = useState({
    id_producto: "", tipo_movimiento: "", cantidad: "",
    unidad_medida: "", observacion: "", origen: "",
    id_origen: "", id_detalle_op: "", id_orden_produccion: ""
  });

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const toast = useToast();

  // Colores
  const accent = useColorModeValue("#009e73", "teal.300");
  const modalHeadBg = useColorModeValue("teal.50", "gray.700");
  const modalInputBg = useColorModeValue("white", "gray.600");

  // Modal exportación
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");
  const [expProducto, setExpProducto] = useState("");
  const [expTipo, setExpTipo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedFields, setSelectedFields] = useState([...ALL_FIELD_KEYS]);

  const toggleField = (key) =>
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  const allSelected = selectedFields.length === ALL_FIELD_KEYS.length;
  const toggleAll = () =>
    setSelectedFields(allSelected ? [] : [...ALL_FIELD_KEYS]);

  // ============================================================
  // 📡 Cargar movimientos
  // ============================================================
  const cargarMovimientos = async (params = null) => {
    try {
      setLoading(true);
      const { data } = await api.get("/inventario/movimientos-productos", { params });
      setMovimientos(data || []);
    } catch (error) {
      toast({ title: "Error al cargar movimientos", description: error.message, status: "error", duration: 3000, position: "top" });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Cargar productos para el select
  const cargarProductos = async () => {
    try {
      const { data } = await api.get("/produccion/productos");
      setProductos(data);
    } catch (err) { console.error(err); }
  };

  // 🎯 Filtros automáticos
  useEffect(() => {
    const filtros = {};
    if (fechaInicio) filtros.fecha_inicio = fechaInicio;
    if (fechaFin) filtros.fecha_fin = fechaFin;
    if (fechaInicio || fechaFin) cargarMovimientos(filtros);
    else cargarMovimientos();
    cargarProductos();
  }, [fechaInicio, fechaFin]);

  // 🧽 Limpiar filtros
  const limpiarFiltros = () => { setFechaInicio(""); setFechaFin(""); };

  // ➕ Registrar Movimiento
  const registrarMovimiento = async () => {
    try {
      await api.post("/inventario/movimiento-producto", nuevo);
      toast({ title: "Movimiento registrado", status: "success", duration: 3000 });
      setModal(false);
      cargarMovimientos();
    } catch (err) {
      toast({ title: "Error al registrar", description: err.message, status: "error" });
    }
  };

  // ============================================================
  // 🔧 Export helpers
  // ============================================================
  const buildFilterText = (filters = {}) => {
    const parts = [];
    if (filters.producto) parts.push(`Producto: ${filters.producto}`);
    if (filters.tipo) parts.push(`Tipo: ${filters.tipo}`);
    if (fechaInicio) parts.push(`Desde: ${fechaInicio}`);
    if (fechaFin) parts.push(`Hasta: ${fechaFin}`);
    return parts.length > 0 ? parts.join("  |  ") : "Sin filtros aplicados";
  };

  const getFilteredData = useCallback(
    (filters = {}) => {
      let filtered = [...movimientos];
      if (filters.producto) {
        const q = filters.producto.toLowerCase();
        filtered = filtered.filter((r) => (r.nombre_producto || "").toLowerCase().includes(q));
      }
      if (filters.tipo) {
        filtered = filtered.filter((r) => (r.tipo_movimiento || "").toLowerCase() === filters.tipo.toLowerCase());
      }
      return filtered;
    },
    [movimientos]
  );

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
  // 📤 Exportar PDF
  // ============================================================
  const handleExportPDF = async (filters = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(filters);
      if (rows.length === 0) { toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true }); return; }

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;

      try { const dataURL = await imgToDataURL(extractusLogo); doc.addImage(dataURL, "PNG", 40, 20, 45, 45); } catch (e) { /* sin logo */ }

      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(25, 55, 80);
      doc.text("MOVIMIENTOS DE PRODUCTOS", pageWidth / 2, 45, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 62, { align: "center" });
      doc.setFontSize(9); doc.setTextColor(120);
      doc.text(`Filtros: ${buildFilterText(filters)}`, pageWidth / 2, 78, { align: "center" });
      doc.setDrawColor(0, 158, 115); doc.setLineWidth(1); doc.line(40, 90, pageWidth - 40, 90);

      const fieldExtractors = {
        id: (r) => r.id_movimiento,
        producto: (r) => r.nombre_producto || "",
        tipo: (r) => r.tipo_movimiento || "",
        cantidad: (r) => r.cantidad,
        um: (r) => r.unidad_medida || "—",
        fecha: (r) => r.fecha_movimiento ? new Date(r.fecha_movimiento).toLocaleString("es-HN") : "",
        usuario: (r) => r.usuario_registro || "Sistema",
        observacion: (r) => r.observacion || "—",
      };

      const activeFields = EXPORT_FIELDS.filter((f) => selectedFields.includes(f.key));
      const headers = activeFields.map((f) => f.label);
      const tableData = rows.map((r) => activeFields.map((f) => fieldExtractors[f.key](r)));

      autoTable(doc, {
        startY: 105, head: [headers], body: tableData,
        styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
        headStyles: { fillColor: [0, 158, 115], textColor: 255, fontStyle: "bold" },
        didDrawPage: () => { const ps = doc.internal.pageSize; doc.setFontSize(8); doc.setTextColor(120); doc.text(`Página ${doc.getNumberOfPages()}`, ps.getWidth() - 80, ps.getHeight() - 20); },
      });

      const finalY = doc.lastAutoTable.finalY + 25;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(25, 55, 80);
      doc.text("RESUMEN", 40, finalY);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60);
      let y = finalY + 18;
      doc.text(`Total movimientos exportados: ${rows.length}`, 50, y); y += 16;
      const entradas = rows.filter((m) => m.tipo_movimiento === "Entrada").length;
      const salidas = rows.filter((m) => m.tipo_movimiento === "Salida").length;
      doc.text(`Entradas: ${entradas}`, 50, y); y += 16;
      doc.text(`Salidas: ${salidas}`, 50, y);

      doc.save(`Movimientos_Productos_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally { setExporting(false); }
  };

  // ============================================================
  // 📊 Exportar Excel
  // ============================================================
  const handleExportExcel = async (filters = {}) => {
    try {
      setExporting(true);
      const rows = getFilteredData(filters);
      if (rows.length === 0) { toast({ title: "No hay datos para exportar", status: "warning", duration: 3000, isClosable: true }); return; }

      const wb = new ExcelJS.Workbook(); wb.creator = "Extractus ERP"; wb.created = new Date();
      const ws = wb.addWorksheet("Movimientos Productos");

      const allCols = [
        { key: "id", header: "ID", width: 8, extract: (r) => r.id_movimiento },
        { key: "producto", header: "Producto", width: 22, extract: (r) => r.nombre_producto || "" },
        { key: "tipo", header: "Tipo", width: 12, extract: (r) => r.tipo_movimiento || "" },
        { key: "cantidad", header: "Cantidad", width: 12, extract: (r) => r.cantidad },
        { key: "um", header: "Unidad Medida", width: 14, extract: (r) => r.unidad_medida || "—" },
        { key: "fecha", header: "Fecha", width: 20, extract: (r) => r.fecha_movimiento ? new Date(r.fecha_movimiento).toLocaleString("es-HN") : "" },
        { key: "usuario", header: "Usuario", width: 18, extract: (r) => r.usuario_registro || "Sistema" },
        { key: "observacion", header: "Observación", width: 25, extract: (r) => r.observacion || "—" },
      ];
      const columns_exp = allCols.filter((c) => selectedFields.includes(c.key));
      const lastColLetter = String.fromCharCode(64 + columns_exp.length);

      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell("A1");
      titleCell.value = "Movimientos de Productos — Extractus";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF009E73" } };
      titleCell.alignment = { horizontal: "center" };

      ws.mergeCells(`A2:${lastColLetter}2`);
      const filterCell = ws.getCell("A2");
      filterCell.value = `Filtros: ${buildFilterText(filters)}  |  Generado: ${new Date().toLocaleString()}`;
      filterCell.font = { size: 9, italic: true, color: { argb: "FF666666" } };
      filterCell.alignment = { horizontal: "center" };

      const headerRow = 4;
      columns_exp.forEach((col, i) => {
        const cell = ws.getCell(headerRow, i + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009E73" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { bottom: { style: "thin", color: { argb: "FF007A5A" } } };
      });

      rows.forEach((r, idx) => {
        const rowNum = headerRow + 1 + idx;
        columns_exp.forEach((col, i) => { ws.getCell(rowNum, i + 1).value = col.extract(r); });
        if (idx % 2 === 1) {
          for (let i = 1; i <= columns_exp.length; i++) {
            ws.getCell(rowNum, i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F7F0" } };
          }
        }
      });

      columns_exp.forEach((col, i) => {
        let maxLen = col.header.length;
        rows.forEach((r) => { const v = String(col.extract(r) ?? ""); if (v.length > maxLen) maxLen = v.length; });
        ws.getColumn(i + 1).width = Math.min(Math.max(col.width, maxLen + 2), 50);
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Movimientos_Productos_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500, isClosable: true });
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({ title: "Error al generar Excel", description: err.message, status: "error", duration: 4000, isClosable: true });
    } finally { setExporting(false); }
  };

  // ============================================================
  // 🖥️ RENDER
  // ============================================================
  return (
    <Box p={6}>
      {/* DASHBOARD */}
      <SimpleGrid columns={[1, 4]} spacing={4} mb={6}>
        <Card p={4}><Text>Total</Text><Text fontSize="2xl">{movimientos.length}</Text></Card>
        <Card p={4}><Text>Entradas</Text><Text fontSize="2xl" color="green.600">{movimientos.filter(x => x.tipo_movimiento === "Entrada").length}</Text></Card>
        <Card p={4}><Text>Salidas</Text><Text fontSize="2xl" color="red.600">{movimientos.filter(x => x.tipo_movimiento === "Salida").length}</Text></Card>
        <Card p={4}><Text>Último</Text><Text>{movimientos[0] ? new Date(movimientos[0].fecha_movimiento).toLocaleString("es-HN") : "—"}</Text></Card>
      </SimpleGrid>

      {/* BOTONES */}
      <Flex justify="space-between" mb={5}>
        <HStack spacing={3}>
          <Button size="sm" variant="outline" colorScheme="teal" leftIcon={<FaArrowLeft />} onClick={() => navigate("/app/inventarios")}>
            Atrás
          </Button>
          <Heading size="md" color="teal.700">Movimientos de Productos</Heading>
        </HStack>

        <HStack>
          <Button leftIcon={<FaBroom />} onClick={limpiarFiltros}>Limpiar</Button>
          <Button leftIcon={<FaSync />} colorScheme="teal" onClick={() => cargarMovimientos()}>Refrescar</Button>
          <Button
            leftIcon={<FaFileExport />}
            colorScheme="teal"
            onClick={() => {
              setExpProducto(""); setExpTipo("");
              setExportFormat("excel");
              setSelectedFields([...ALL_FIELD_KEYS]);
              exportModal.onOpen();
            }}
            isDisabled={exporting}
          >
            Exportar
          </Button>
        </HStack>
      </Flex>

      {/* FILTROS */}
      <HStack mb={4}>
        <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} maxW="200px" />
        <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} maxW="200px" />
      </HStack>

      {/* TABLA */}
      <Table size="sm">
        <Thead bg="gray.100">
          <Tr>
            <Th>ID</Th>
            <Th>Producto</Th>
            <Th>Tipo</Th>
            <Th>Cantidad</Th>
            <Th>UM</Th>
            <Th>Fecha</Th>
            <Th>Usuario</Th>
            <Th>Observación</Th>
          </Tr>
        </Thead>

        <Tbody>
          {loading ? (
            <Tr><Td colSpan={8} textAlign="center"><Spinner /></Td></Tr>
          ) : movimientos.map((m) => (
            <Tr key={m.id_movimiento}>
              <Td>{m.id_movimiento}</Td>
              <Td>{m.nombre_producto}</Td>
              <Td color={m.tipo_movimiento === "Entrada" ? "green.600" : "red.600"}>{m.tipo_movimiento}</Td>
              <Td>{m.cantidad}</Td>
              <Td>{m.unidad_medida || "—"}</Td>
              <Td>{new Date(m.fecha_movimiento).toLocaleString("es-HN")}</Td>
              <Td>{m.usuario_registro}</Td>
              <Td>{m.observacion || "—"}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* ============================================================
         MODAL: Registrar Movimiento
      ============================================================ */}
      <Modal isOpen={modal} onClose={() => setModal(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Registrar Movimiento</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Select placeholder="Seleccione un producto"
              value={nuevo.id_producto}
              onChange={e => setNuevo({ ...nuevo, id_producto: e.target.value })}
              mb={3}>
              {productos.map(p => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre_producto}
                </option>
              ))}
            </Select>

            <Select placeholder="Tipo de Movimiento"
              value={nuevo.tipo_movimiento}
              onChange={e => setNuevo({ ...nuevo, tipo_movimiento: e.target.value })}
              mb={3}>
              <option value="Entrada">Entrada</option>
              <option value="Salida">Salida</option>
            </Select>

            <Input placeholder="Cantidad" type="number"
              value={nuevo.cantidad}
              onChange={e => setNuevo({ ...nuevo, cantidad: e.target.value })}
              mb={3} />

            <Input placeholder="Unidad de medida"
              value={nuevo.unidad_medida}
              onChange={e => setNuevo({ ...nuevo, unidad_medida: e.target.value })}
              mb={3} />

            <Input placeholder="Observación"
              value={nuevo.observacion}
              onChange={e => setNuevo({ ...nuevo, observacion: e.target.value })}
              mb={3} />

            <Select placeholder="Origen"
              value={nuevo.origen}
              onChange={e => setNuevo({ ...nuevo, origen: e.target.value })}
              mb={3}>
              <option value="Manual">Manual</option>
              <option value="Producción">Producción</option>
              <option value="Orden Producción">Orden de Producción</option>
              <option value="Otros">Otros</option>
            </Select>

            <Input placeholder="ID Origen" value={nuevo.id_origen}
              onChange={e => setNuevo({ ...nuevo, id_origen: e.target.value })}
              mb={3} />

            <Input placeholder="ID Detalle OP"
              value={nuevo.id_detalle_op}
              onChange={e => setNuevo({ ...nuevo, id_detalle_op: e.target.value })}
              mb={3} />

            <Input placeholder="ID Orden Producción"
              value={nuevo.id_orden_produccion}
              onChange={e => setNuevo({ ...nuevo, id_orden_produccion: e.target.value })}
              mb={3} />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" onClick={registrarMovimiento}>Guardar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg={modalHeadBg} borderTopRadius="md">
            <HStack spacing={2}>
              <DownloadIcon color="teal.500" />
              <Text>Exportar Movimientos de Productos</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={5}>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Selecciona el formato y los filtros para generar tu reporte.
            </Text>

            <FormControl mb={4}>
              <FormLabel fontWeight="bold">Formato</FormLabel>
              <Select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} bg={modalInputBg}>
                <option value="excel">📊 Excel (.xlsx)</option>
                <option value="pdf">📄 PDF (.pdf)</option>
              </Select>
            </FormControl>

            <Divider my={4} />
            <Text fontWeight="bold" mb={3} color={accent}>Filtros de exportación</Text>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por producto</FormLabel>
              <Input placeholder="Ej: Jugo de Naranja" value={expProducto} onChange={(e) => setExpProducto(e.target.value)} size="sm" bg={modalInputBg} />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel fontSize="sm">Por tipo de movimiento</FormLabel>
              <Select placeholder="Todos" value={expTipo} onChange={(e) => setExpTipo(e.target.value)} size="sm" bg={modalInputBg}>
                <option value="Entrada">Entrada</option>
                <option value="Salida">Salida</option>
              </Select>
            </FormControl>

            <Divider my={4} />

            <Flex justify="space-between" align="center" mb={3}>
              <HStack spacing={2}>
                <Text fontWeight="bold" color={accent}>Campos a exportar</Text>
                <Badge colorScheme="teal" fontSize="xs" borderRadius="full" px={2}>{selectedFields.length} / {ALL_FIELD_KEYS.length}</Badge>
              </HStack>
              <Checkbox isChecked={allSelected} isIndeterminate={selectedFields.length > 0 && !allSelected} onChange={toggleAll} colorScheme="teal" size="sm">
                <Text fontSize="xs">Seleccionar todos</Text>
              </Checkbox>
            </Flex>

            <SimpleGrid columns={2} spacing={2}>
              {EXPORT_FIELDS.map((f) => (
                <Checkbox key={f.key} isChecked={selectedFields.includes(f.key)} onChange={() => toggleField(f.key)} colorScheme="teal" size="sm">
                  {f.label}
                </Checkbox>
              ))}
            </SimpleGrid>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="teal" leftIcon={<DownloadIcon />} isLoading={exporting} loadingText="Generando..." isDisabled={selectedFields.length === 0}
              onClick={async () => {
                if (selectedFields.length === 0) { toast({ title: "Selecciona al menos un campo", status: "warning", duration: 3000, isClosable: true }); return; }
                const filters = { producto: expProducto || undefined, tipo: expTipo || undefined };
                if (exportFormat === "pdf") { await handleExportPDF(filters); } else { await handleExportExcel(filters); }
                exportModal.onClose();
              }}
            >
              Exportar
            </Button>
            <Button ml={3} onClick={exportModal.onClose}>Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
