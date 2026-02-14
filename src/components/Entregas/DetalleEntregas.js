// src/components/Entregas/DetalleEntregas.jsx
import React, { useMemo, useState } from "react";
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  IconButton,
  Checkbox,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useColorModeValue,
  useToast,
  Heading,
  Divider,
  HStack,
  Select,
  Stack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt, FaFilePdf, FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";

/** =======================
 *  Utilidades comunes
 *  ======================= */
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Detalle de Entregas";
const fmtHNL = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});
const excelCol = (n) => {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};

/** =======================
 *  Columnas (lista visible)
 *  ======================= */
const allColumns = [
  "ID Detalle",
  "Entrega",
  "Factura",
  "Cliente",
  "Producto",
  "Cantidad",
  "Unidad",
  "Precio Unitario",
  "Total (HNL)",
];

const columnExtractors = {
  "ID Detalle": (e) => e.id_detalle_entrega,
  Entrega: (e) => e.id_entrega,
  Factura: (e) => e.numero_factura ?? e.id_factura,
  Cliente: (e) => e.cliente,
  Producto: (e) => e.producto,
  Cantidad: (e) => e.cantidad_entregada,
  Unidad: (e) => e.unidad,
  "Precio Unitario": (e) =>
    e.precio_unitario != null ? fmtHNL.format(e.precio_unitario) : "",
  "Total (HNL)": (e) =>
    e.precio_unitario != null
      ? fmtHNL.format((+e.cantidad_entregada || 0) * (+e.precio_unitario || 0))
      : "",
};

/** =======================
 *  Exportar a PDF (una entrega por hoja)
 *  ======================= */
const exportToPDF = (rows) => {
  if (!rows.length) return;

  // Agrupar por id_entrega
  const grupos = Object.values(
    rows
      .sort((a, b) =>
        a.id_entrega === b.id_entrega
          ? a.id_detalle_entrega - b.id_detalle_entrega
          : a.id_entrega - b.id_entrega
      )
      .reduce((acc, r) => {
        const k = r.id_entrega;
        if (!acc[k]) acc[k] = { meta: r, items: [] };
        acc[k].items.push(r);
        return acc;
      }, {})
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const m = 14;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString("es-ES");

  const drawHeader = () => {
    doc
      .setFontSize(18)
      .setTextColor(46, 125, 50)
      .text(COMPANY_NAME, W / 2, 17, { align: "center" });
    doc
      .setFontSize(13)
      .setTextColor(102, 187, 106)
      .text(REPORT_TITLE, W / 2, 26, { align: "center" });
    doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 18);

    try {
      const img = doc.getImageProperties(logo);
      const imgW = 20,
        imgH = (img.height * imgW) / img.width;
      doc.addImage(logo, "PNG", W - imgW - m, 8, imgW, imgH);
    } catch {}
    doc.setDrawColor(0).setLineWidth(0.5).line(m, 33, W - m, 33);
  };

  grupos.forEach((g, idx) => {
    const { meta, items } = g;
    if (idx > 0) doc.addPage(); // ✅ siempre nueva hoja para cada entrega
    drawHeader();

    let y = 38;

    // Encabezado de la mini factura (Cliente/Dirección fuera de la tabla)
    doc
      .setFont("helvetica", "bold")
      .setFontSize(11)
      .setTextColor(0, 80, 0)
      .text(
        `Entrega #${meta.id_entrega} — Factura N° ${meta.numero_factura ?? meta.id_factura ?? ""}`,
        m,
        y
      );
    y += 6;

    const drawKV = (k, v) => {
      doc.setFont("helvetica", "bold").setTextColor(0, 80, 0).setFontSize(10);
      doc.text(`${k}:`, m, y);
      doc.setFont("helvetica", "normal").setTextColor(40).setFontSize(10);
      const txt = doc.splitTextToSize(v || "-", W - m * 2 - 26);
      doc.text(txt, m + 26, y);
      y += Math.max(6, txt.length * 5);
    };

    drawKV("Cliente", meta.cliente || "-");
    drawKV("Dirección", meta.direccion_entrega || "-");
    y += 2;

    // Tabla (reservamos espacio para firmas)
    const cols = ["Producto", "Cantidad", "Unidad", "Precio Unitario", "Total (HNL)"];
    const body = items.map((r) => [
      r.producto || "",
      r.cantidad_entregada ?? "",
      r.unidad ?? "",
      r.precio_unitario != null ? fmtHNL.format(r.precio_unitario) : "",
      r.precio_unitario != null
        ? fmtHNL.format((+r.cantidad_entregada || 0) * (+r.precio_unitario || 0))
        : "",
    ]);

    autoTable(doc, {
      startY: y,
      head: [cols],
      body,
      theme: "grid",
      headStyles: { fillColor: [200, 255, 200], textColor: [0, 80, 0], fontSize: 8 },
      styles: { fontSize: 9, cellPadding: 2, halign: "center" },
      margin: { left: m, right: m, bottom: 42 },
      didDrawPage: () => {
        const p = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(9).setTextColor(0).text(`Página ${p}`, W / 2, H - 10, { align: "center" });
      },
    });

    const endY = doc.lastAutoTable?.finalY || y;

    // Totales por entrega
    const totalCant = items.reduce((a, r) => a + (+r.cantidad_entregada || 0), 0);
    const totalHNL = items.reduce(
      (a, r) => a + ((+r.cantidad_entregada || 0) * (+r.precio_unitario || 0)),
      0
    );

    // Si no cabe totales+firmas, saltamos de hoja (pero misma entrega)
    const needed = 38;
    if (endY + needed > H - m) {
      doc.addPage();
      drawHeader();
      y = 38;
    } else {
      y = endY + 6;
    }

    // Totales
    doc.setFont("helvetica", "bold").setTextColor(0, 80, 0).setFontSize(10);
    doc.text(`Total Cantidad: ${totalCant}`, m, y);
    doc.text(`Total (HNL): ${fmtHNL.format(totalHNL)}`, W - m, y, { align: "right" });

    // Firmas al pie
    const signY = H - 30;
    doc.setDrawColor(150);
    doc.line(m, signY, W / 2 - 10, signY);
    doc.line(W / 2 + 10, signY, W - m, signY);
    doc.setFontSize(9).setTextColor(60);
    doc.text("Entregado por (Nombre y Firma)", m + 2, signY + 5);
    doc.text("Recibido por (Nombre y Firma)", W / 2 + 12, signY + 5);
  });

  doc.save("detalle_entregas.pdf");
};

/** =======================
 *  Exportar a Excel
 *  ======================= */
const exportToExcel = async (rows, columns) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Detalle Entregas", { views: [{ state: "frozen", ySplit: 4 }] });

  const dateStr = new Date().toLocaleDateString("es-ES");
  const lastCol = excelCol(columns.length);

  ws.mergeCells(`A1:${lastCol}1`);
  Object.assign(ws.getCell("A1"), {
    value: COMPANY_NAME,
    font: { size: 14, bold: true, color: { argb: "2E7D32" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.mergeCells(`A2:${lastCol}2`);
  Object.assign(ws.getCell("A2"), {
    value: REPORT_TITLE,
    font: { size: 12, bold: true, color: { argb: "66BB6A" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.mergeCells(`A3:${lastCol}3`);
  Object.assign(ws.getCell("A3"), {
    value: `Fecha: ${dateStr}`,
    font: { size: 10 },
    alignment: { horizontal: "left", vertical: "middle" },
  });
  ws.addRow([]);

  const hdr = ws.addRow(columns);
  hdr.height = 20;
  hdr.eachCell((cell) => {
    Object.assign(cell, {
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "CCFFCC" } },
      font: { bold: true, color: { argb: "005000" } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    });
  });

  rows.forEach((r) => {
    const row = ws.addRow(columns.map((c) => columnExtractors[c](r)));
    row.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  ws.columns.forEach((col) => {
    const vals = col.values.slice(1);
    const mx = vals.reduce((m, v) => Math.max(m, (v ?? "").toString().length), 0);
    col.width = Math.min(mx + 5, 34);
  });

  ws.headerFooter = { oddFooter: "&CPágina &P" };
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), "detalle_entregas.xlsx");
};

/** =======================
 *  Componente principal
 *  ======================= */
export default function DetalleEntregas() {
  const navigate = useNavigate();
  const toast = useToast();

  const bgContainer = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgFilter = useColorModeValue("gray.200", "gray.700");
  const modalBg = useColorModeValue("white", "gray.800");
  const accent = useColorModeValue("teal.600", "teal.300");

  // 🔰 Datos de ejemplo coherentes con Factura (0001, 0002…) y productos por nombre
  const [detalleEntregas, setDetalleEntregas] = useState([
    // Entrega 501 — Factura 0001 — Carlos García
    {
      id_detalle_entrega: 1,
      id_entrega: 501,
      id_factura: 1,
      numero_factura: "0001",
      cliente: "Carlos García",
      direccion_entrega:
        "Res. Roble Oeste, Calle Principal, Casa #25, Bloque 7, Distrito Central, F.M.",
      producto: "Jugo de Naranja 1L",
      cantidad_entregada: 2,
      unidad: "botellas",
      precio_unitario: 50,
    },
    {
      id_detalle_entrega: 2,
      id_entrega: 501,
      id_factura: 1,
      numero_factura: "0001",
      cliente: "Carlos García",
      direccion_entrega:
        "Res. Roble Oeste, Calle Principal, Casa #25, Bloque 7, Distrito Central, F.M.",
      producto: "Jugo de Piña 1L",
      cantidad_entregada: 1,
      unidad: "botellas",
      precio_unitario: 45,
    },

    // Entrega 502 — Factura 0002 — María López
    {
      id_detalle_entrega: 3,
      id_entrega: 502,
      id_factura: 2,
      numero_factura: "0002",
      cliente: "María López",
      direccion_entrega: "Col. Florencia, 2a etapa, Tegucigalpa",
      producto: "Jugo de Limón 500ml",
      cantidad_entregada: 6,
      unidad: "botellas",
      precio_unitario: 28,
    },
    {
      id_detalle_entrega: 4,
      id_entrega: 502,
      id_factura: 2,
      numero_factura: "0002",
      cliente: "María López",
      direccion_entrega: "Col. Florencia, 2a etapa, Tegucigalpa",
      producto: "Jugo de Uva 1L",
      cantidad_entregada: 2,
      unidad: "botellas",
      precio_unitario: 55,
    },

    // Entrega 503 — Factura 0003 — Comercial Rivera
    {
      id_detalle_entrega: 5,
      id_entrega: 503,
      id_factura: 3,
      numero_factura: "0003",
      cliente: "Comercial Rivera",
      direccion_entrega: "B° Guadalupe, SPS",
      producto: "Jugo de Manzana 1L",
      cantidad_entregada: 12,
      unidad: "botellas",
      precio_unitario: 49,
    },
  ]);

  // Filtros rápidos de tabla (opcionales)
  const [filters, setFilters] = useState({
    id_detalle_entrega: "",
    id_entrega: "",
    numero_factura: "",
    cliente: "",
    producto: "",
    unidad: "",
  });

  // Estados de UI
  const [selectedDetalle, setSelectedDetalle] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isColsOpen, onOpen: onColsOpen, onClose: onColsClose } = useDisclosure();

  const [exportFormat, setExportFormat] = useState(null); // "pdf" | "excel"
  const [colsToExport, setColsToExport] = useState([...allColumns]);

  // Alcance de exportación (Todo | Un cliente)
  const [exportScope, setExportScope] = useState("todo");
  const clientesUnicos = useMemo(
    () => Array.from(new Set(detalleEntregas.map((d) => d.cliente))).sort(),
    [detalleEntregas]
  );
  const [scopeClient, setScopeClient] = useState("");

  // Filtrado de tabla
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };
  const filtered = detalleEntregas.filter((e) =>
    Object.entries(filters).every(
      ([k, v]) => !v || (e[k] ?? "").toString().toLowerCase().includes(v.toLowerCase())
    )
  );

  // CRUD (simple)
  const resetForm = () => {
    setSelectedDetalle({
      id_detalle_entrega: null,
      id_entrega: "",
      id_factura: "",
      numero_factura: "",
      cliente: "",
      direccion_entrega: "",
      producto: "",
      cantidad_entregada: "",
      unidad: "",
      precio_unitario: "",
    });
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedDetalle((prev) => ({ ...prev, [name]: value }));
  };
  const handleSave = () => {
    if (!selectedDetalle?.cliente || !selectedDetalle?.producto) {
      toast({ title: "Cliente y producto son requeridos", status: "warning" });
      return;
    }
    if (selectedDetalle?.id_detalle_entrega) {
      setDetalleEntregas((prev) =>
        prev.map((x) =>
          x.id_detalle_entrega === selectedDetalle.id_detalle_entrega ? selectedDetalle : x
        )
      );
      toast({ title: "Detalle actualizado", status: "success" });
    } else {
      setDetalleEntregas((prev) => [
        ...prev,
        {
          ...selectedDetalle,
          id_detalle_entrega: Math.max(0, ...prev.map((x) => x.id_detalle_entrega || 0)) + 1,
        },
      ]);
      toast({ title: "Detalle agregado", status: "success" });
    }
    onClose();
  };
  const handleEdit = (row) => {
    setSelectedDetalle(row);
    onOpen();
  };

  // Selección múltiple
  const handleCheckboxChange = (e, id) => {
    setSelectedIds((sel) => (e.target.checked ? [...sel, id] : sel.filter((x) => x !== id)));
  };
  const handleDeleteSelected = () => {
    setDetalleEntregas((prev) => prev.filter((e) => !selectedIds.includes(e.id_detalle_entrega)));
    setSelectedIds([]);
    toast({ title: "Detalle(s) eliminado(s)", status: "info" });
  };

  // Filtrado adicional para exportación por cliente (desde modal)
  const rowsForExport = useMemo(() => {
    if (exportScope === "cliente" && scopeClient) {
      return detalleEntregas.filter((r) => r.cliente === scopeClient);
    }
    return filtered; // respeta los filtros visibles si no eliges cliente específico
  }, [exportScope, scopeClient, detalleEntregas, filtered]);

  return (
    <>
      {/* Encabezado */}
      <Box p={2}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent} mb={2}>
            Detalle de Entregas
          </Heading>
        </Flex>
        <Divider mb={12} />
      </Box>

      {/* Contenedor principal */}
      <Box
        p={4}
        bg={bgContainer}
        mt={4}
        mx={8}
        borderRadius="lg"
        boxShadow="lg"
        borderWidth="1px"
        borderColor={borderColor}
        minH="500px"
        position="relative"
      >
        {/* Flecha atrás */}
        <Button mb={4} size="sm" onClick={() => navigate(-1)}>
          ←
        </Button>

        {/* Filtros compactos */}
        <Flex mb={4} wrap="wrap" gap={2} mt={1}>
          {Object.entries(filters).map(([key, val]) => (
            <FormControl key={key} w="auto">
              <Input
                name={key}
                value={val}
                onChange={handleFilterChange}
                placeholder={
                  {
                    id_detalle_entrega: "ID Detalle",
                    id_entrega: "Entrega",
                    numero_factura: "Factura",
                    cliente: "Cliente",
                    producto: "Producto",
                    unidad: "Unidad",
                  }[key]
                }
                bg={bgFilter}
                size="xs"
                h="30px"
                fontSize="xs"
                borderRadius="md"
                textAlign="center"
              />
            </FormControl>
          ))}
        </Flex>

        {/* Acciones arriba-derecha */}
        <HStack spacing={3} position="absolute" top="-50px" right="16px" zIndex="1">
          {selectedIds.length > 0 ? (
            <Menu>
              <MenuButton as={Button} colorScheme="blue" size="sm">
                Acciones
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleDeleteSelected}>Eliminar</MenuItem>
                <MenuItem
                  onClick={() => {
                    const first = detalleEntregas.find((r) =>
                      selectedIds.includes(r.id_detalle_entrega)
                    );
                    if (first) handleEdit(first);
                  }}
                >
                  Editar
                </MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <>
              <Button
                colorScheme="green"
                size="sm"
                onClick={() => {
                  resetForm();
                  onOpen();
                }}
              >
                + Agregar Detalle
              </Button>

              <Menu>
                <MenuButton as={Button} colorScheme="green" size="sm">
                  Reporte
                </MenuButton>
                <MenuList>
                  <MenuItem
                    icon={<FaFilePdf />}
                    onClick={() => {
                      setExportFormat("pdf");
                      onColsOpen();
                    }}
                  >
                    Exportar a PDF
                  </MenuItem>
                  <MenuItem
                    icon={<FaFileExcel />}
                    onClick={() => {
                      setExportFormat("excel");
                      onColsOpen();
                    }}
                  >
                    Exportar a Excel
                  </MenuItem>
                </MenuList>
              </Menu>

              <IconButton
                colorScheme="gray"
                size="sm"
                aria-label="Recargar"
                icon={<FaSyncAlt />}
                onClick={() => window.location.reload()}
              />
            </>
          )}
        </HStack>

        {/* Tabla */}
        <Box overflowX="auto" mt="30px">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? filtered.map((x) => x.id_detalle_entrega) : [])
                    }
                  />
                </Th>
                {allColumns.map((col) => (
                  <Th key={col}>{col}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((e) => (
                <Tr key={e.id_detalle_entrega}>
                  <Td>
                    <Checkbox
                      isChecked={selectedIds.includes(e.id_detalle_entrega)}
                      onChange={(ev) => {
                        ev.stopPropagation();
                        handleCheckboxChange(ev, e.id_detalle_entrega);
                      }}
                    />
                  </Td>
                  <Td onClick={() => handleEdit(e)} style={{ cursor: "pointer" }}>
                    {e.id_detalle_entrega}
                  </Td>
                  <Td>{e.id_entrega}</Td>
                  <Td>{e.numero_factura ?? e.id_factura}</Td>
                  <Td>{e.cliente}</Td>
                  <Td>{e.producto}</Td>
                  <Td>{e.cantidad_entregada}</Td>
                  <Td>{e.unidad}</Td>
                  <Td>{e.precio_unitario != null ? fmtHNL.format(e.precio_unitario) : ""}</Td>
                  <Td>
                    {e.precio_unitario != null
                      ? fmtHNL.format((+e.cantidad_entregada || 0) * (+e.precio_unitario || 0))
                      : ""}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* Modal columnas/alcance a exportar */}
        <Modal isOpen={isColsOpen} onClose={onColsClose} size="md" isCentered>
          <ModalOverlay />
          <ModalContent bg={modalBg}>
            <ModalHeader>
              Exportar {exportFormat ? `(${exportFormat.toUpperCase()})` : ""}
            </ModalHeader>
            <ModalBody>
              <Stack spacing={3}>
                {/* Alcance */}
                <FormControl>
                  <FormLabel fontSize="sm">Alcance</FormLabel>
                  <Select
                    size="sm"
                    value={exportScope}
                    onChange={(e) => setExportScope(e.target.value)}
                  >
                    <option value="todo">Todo (respeta filtros actuales)</option>
                    <option value="cliente">Un cliente específico</option>
                  </Select>
                </FormControl>

                {exportScope === "cliente" && (
                  <FormControl>
                    <FormLabel fontSize="sm">Cliente</FormLabel>
                    <Select
                      size="sm"
                      placeholder="Selecciona cliente"
                      value={scopeClient}
                      onChange={(e) => setScopeClient(e.target.value)}
                    >
                      {clientesUnicos.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Divider />

                {/* Columnas */}
                <Stack spacing={2} maxH="220px" overflowY="auto" pr={1}>
                  {allColumns.map((col) => (
                    <Checkbox
                      key={col}
                      isChecked={colsToExport.includes(col)}
                      onChange={(e) =>
                        setColsToExport((prev) =>
                          e.target.checked ? [...prev, col] : prev.filter((x) => x !== col)
                        )
                      }
                    >
                      {col}
                    </Checkbox>
                  ))}
                </Stack>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <HStack>
                <Button
                  colorScheme="green"
                  onClick={() => {
                    if (!rowsForExport.length) {
                      toast({ title: "No hay datos para exportar", status: "warning" });
                      return;
                    }
                    if (colsToExport.length === 0) {
                      toast({ title: "Selecciona al menos una columna", status: "warning" });
                      return;
                    }
                    if (exportScope === "cliente" && !scopeClient) {
                      toast({ title: "Selecciona un cliente", status: "warning" });
                      return;
                    }
                    if (exportFormat === "pdf") exportToPDF(rowsForExport);
                    else exportToExcel(rowsForExport, colsToExport);
                    onColsClose();
                  }}
                >
                  Generar
                </Button>
                <Button variant="ghost" onClick={onColsClose}>
                  Cancelar
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal agregar/editar */}
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent bg={modalBg}>
            <ModalHeader>
              {selectedDetalle?.id_detalle_entrega ? "Editar Detalle" : "Agregar Detalle"}
            </ModalHeader>
            <ModalBody>
              <FormControl>
                <FormLabel>Entrega #</FormLabel>
                <Input
                  name="id_entrega"
                  type="number"
                  value={selectedDetalle?.id_entrega || ""}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl mt={3}>
                <FormLabel>No. Factura</FormLabel>
                <Input
                  name="numero_factura"
                  value={selectedDetalle?.numero_factura || ""}
                  onChange={handleChange}
                  placeholder="Ej. 0001"
                />
              </FormControl>

              <FormControl mt={3}>
                <FormLabel>Cliente</FormLabel>
                <Input
                  name="cliente"
                  value={selectedDetalle?.cliente || ""}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl mt={3}>
                <FormLabel>Dirección</FormLabel>
                <Input
                  name="direccion_entrega"
                  value={selectedDetalle?.direccion_entrega || ""}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl mt={3}>
                <FormLabel>Producto</FormLabel>
                <Input
                  name="producto"
                  value={selectedDetalle?.producto || ""}
                  onChange={handleChange}
                  placeholder="Ej. Jugo de Limón 500ml"
                />
              </FormControl>

              <HStack mt={3} spacing={3}>
                <FormControl>
                  <FormLabel>Cantidad</FormLabel>
                  <Input
                    name="cantidad_entregada"
                    type="number"
                    value={selectedDetalle?.cantidad_entregada || ""}
                    onChange={handleChange}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Unidad</FormLabel>
                  <Input
                    name="unidad"
                    value={selectedDetalle?.unidad || ""}
                    onChange={handleChange}
                    placeholder="botellas, cajas, etc."
                  />
                </FormControl>
              </HStack>

              <FormControl mt={3}>
                <FormLabel>Precio Unitario (HNL)</FormLabel>
                <Input
                  name="precio_unitario"
                  type="number"
                  step="0.01"
                  value={selectedDetalle?.precio_unitario || ""}
                  onChange={handleChange}
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" onClick={handleSave}>
                {selectedDetalle?.id_detalle_entrega ? "Guardar Cambios" : "Agregar Detalle"}
              </Button>
              <Button variant="ghost" onClick={onClose} ml={3}>
                Cancelar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </>
  );
}
