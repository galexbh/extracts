// ============================================================
// 📁 src/components/Ventas/Factura.js
// PREMIUM UI — DISEÑO A (con lógica actual + mejoras PDF)
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Divider,
  Button,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  HStack,
  VStack,
  useColorModeValue,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Stack,
  useToast,
  Card,
  CardBody,
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { FaPrint, FaFilePdf, FaFileExcel } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";
import api from "../../api/apiClient";

// ============================================================
// Utilidades
// ============================================================
const fmtHNL = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const hoyISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const sumarDias = (iso, dias) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + dias);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const genCAI = () => {
  const r = () => Math.random().toString(16).slice(2, 6).toUpperCase();
  return `${r()}-${r()}-${r()}-${r()}-${r()}-${r()}`.slice(0, 36);
};

const vaciaFactura = () => ({
  id_factura: null,
  numero_factura: "",
  cai: genCAI(),
  fecha_emision: hoyISO(),
  fecha_vencimiento: sumarDias(hoyISO(), 30),
  id_cliente: null,
  cliente: "",
  rtn: "",
  direccion_entrega: "",
  vendedor: "",
  estado: "Pendiente",
  aplica_isv_15: true,
  items: [
    {
      id: Date.now(),
      id_producto: null,
      cantidad: 0,
      descripcion: "",
      precio: 0,
      descuento: 0,
    },
  ],
});

// ============================================================
// Números a letras (igual que lo tenías)
// ============================================================
const numeroALetrasHNL = (num) => {
  const UNIDADES = [
    "",
    "uno",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
  ];
  const DIECIS = [
    "diez",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciseis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
  ];
  const DECENAS = [
    "",
    "",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
  ];
  const CENTENAS = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ];

  const centenaToWords = (n) => {
    if (n === 0) return "";
    if (n === 100) return "cien";
    const c = Math.floor(n / 100),
      d = Math.floor((n % 100) / 10),
      u = n % 10,
      du = n % 100;
    let s = "";
    if (c) s += CENTENAS[c] + (du ? " " : "");
    if (du >= 10 && du < 20) return s + DIECIS[du - 10];
    if (d === 2) {
      if (u === 0) return s + "veinte";
      return s + "veinti" + UNIDADES[u];
    }
    if (d >= 3) s += DECENAS[d] + (u ? " y " : "");
    if (d < 2) s += UNIDADES[du];
    else if (u) s += UNIDADES[u];
    return s.trim();
  };

  const milesToWords = (n) => {
    const miles = Math.floor(n / 1000),
      rest = n % 1000;
    let s = "";
    if (miles) s += miles === 1 ? "mil" : centenaToWords(miles) + " mil";
    if (rest) s += (s ? " " : "") + centenaToWords(rest);
    return s.trim();
  };

  const millonesToWords = (n) => {
    const mill = Math.floor(n / 1_000_000),
      rest = n % 1_000_000;
    let s = "";
    if (mill) s += mill === 1 ? "un millon" : milesToWords(mill) + " millones";
    if (rest) s += (s ? " " : "") + milesToWords(rest);
    return s.trim() || "cero";
  };

  const entero = Math.floor(Math.abs(num));
  const centavos = Math.round((Math.abs(num) - entero) * 100);

  const ajustaUn = (txt) =>
    txt
      .replace(/^uno\b/, "un")
      .replace(/\buno\b/g, "un")
      .replace(/\bveintiuno\b/g, "veintiun")
      .replace(/\by uno\b/g, " y un");

  let letras = ajustaUn(millonesToWords(entero));
  const moneda = entero === 1 ? "LEMPIRA" : "LEMPIRAS";
  const cc = String(centavos).padStart(2, "0");
  return `${letras.toUpperCase()} ${moneda} CON ${cc}/100`;
};

// ============================================================
// Componente principal
// ============================================================
export default function Facturas() {
  const navigate = useNavigate();
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.900");
  const border = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("teal.50", "gray.800");
  const titleColor = useColorModeValue("teal.700", "teal.200");
  const subtleText = useColorModeValue("gray.600", "gray.400");
  const rowHover = useColorModeValue("gray.50", "gray.800");

  // Estado
  const [facturas, setFacturas] = useState([]);
  const [sel, setSel] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [clientes, setClientes] = useState([]);
  const [productosInv, setProductosInv] = useState([]);

  const [filter, setFilter] = useState({ cliente: "", numero: "", estado: "" });

  const [metodosPago, setMetodosPago] = useState([]);

  const [estadosPago, setEstadosPago] = useState([]);


  // 🔹 Estado para confirmación de impresión
  const {
    isOpen: isConfirmOpen,
    onOpen: onConfirmOpen,
    onClose: onConfirmClose,
  } = useDisclosure();
  const [facturaParaImprimir, setFacturaParaImprimir] = useState(null);
  const [imprimirTrasGuardar, setImprimirTrasGuardar] = useState(false);

  // Totales helpers
  const calcSub = (f) =>
    (f.items || []).reduce(
      (a, it) => a + (Number(it.cantidad) || 0) * (Number(it.precio) || 0),
      0
    );
  const calcDesc = (f) =>
    (f.items || []).reduce((a, it) => a + (Number(it.descuento) || 0), 0);
  const calcExento = (_f) => 0;
  const calcGravado15 = (f) => {
    const sub = calcSub(f);
    const desc = calcDesc(f);
    return Math.max(sub - desc - calcExento(f), 0);
  };
  const calcISV15 = (f) => (f.aplica_isv_15 ? calcGravado15(f) * 0.15 : 0);
  const calcTotal = (f) => calcGravado15(f) + calcISV15(f);

  const imprimirDesdeFila = async (id_factura) => {
  try {
    const res = await api.get(`/ventas/facturas/${id_factura}`);

    // Asegurar estructura segura
    const factura = res.data?.factura;
    const detalle = Array.isArray(res.data?.detalle) ? res.data.detalle : [];

    if (!factura) {
      toast({
        title: "Error",
        description: "No se encontró la factura",
        status: "error",
      });
      return;
    }

    // Armar la factura completa con validación
    const facturaCompleta = {
      ...factura,
      aplica_isv_15: factura.aplica_isv_15 ?? true,
      items: detalle.map((d) => ({
        id_producto: d.id_producto,
        cantidad: Number(d.cantidad),
        descripcion: d.descripcion,
        precio: Number(d.precio_unitario),
        descuento: Number(d.descuento || 0),
      })),
    };

    imprimirPDF(facturaCompleta);

  } catch (err) {
    console.error("❌ Error al imprimir factura:", err);
    toast({
      title: "Error al imprimir factura",
      description: err.message,
      status: "error",
    });
  }
};
  // =========================
  // PDF de UNA factura (elegante con logo)
  // =========================
  const imprimirPDF = (factura) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });
    

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const m = 12;
    const C_ACCENT = [10, 120, 95];
    const C_SOFT = [110, 110, 110];
    const contentW = W - m * 2;

    // ========= ENCABEZADO =========
    const headerH = 28;
    doc.setFillColor(236, 249, 245);
    doc.roundedRect(m + 30, m, contentW - 30, headerH, 3, 3, "F");

    try {
      doc.addImage(logo, "PNG", m, m - 1, 28, 28);
    } catch {}

    doc.setTextColor(...C_ACCENT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("INVERSIONES JUAREZ ANTUNEZ", m + 40, m + 8);

    doc.setFontSize(14);
    doc.text("E X T R A C T U S", m + 40, m + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C_SOFT);
    doc.text(
      "Res. Roble Oeste, Casa #25, Bloque 7, 2 Cuadras Atrás De La Caseta De Vigilancia, Distrito Central, F.M.",
      m + 40,
      m + 23
    );

    // N° + Fecha + Vence (arriba derecha)
    const fechaEmision = factura.fecha_emision || "";
    const fechaVenc = factura.fecha_vencimiento || "";

    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(10);
    doc.text(`FACTURA N° ${factura.numero_factura || "-"}`, W - m, m + 6, {
      align: "right",
    });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const fechasLinea = `Fecha: ${fechaEmision}   Vence: ${fechaVenc || "-"}`;
    doc.text(fechasLinea, W - m, m + 12, { align: "right" });

    // ====== CAI + RANGO (centrados, arriba del bloque cliente) ======
    let yCursor = m + headerH + 6;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_ACCENT);
    doc.setFontSize(9);
    doc.text(`CAI: ${factura.cai || "-"}`, W / 2, yCursor, { align: "center" });

    yCursor += 6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_ACCENT);
    doc.setFontSize(9);
    doc.text("RANGO AUTORIZADO / RESOLUCIONES", W / 2, yCursor, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(70);
    doc.setFontSize(8.5);
    yCursor += 6;
    doc.text(
      "Fecha Límite de Emisión 16/06/2026 · Fecha Solicitud 16/06/2025",
      W / 2,
      yCursor,
      { align: "center" }
    );
    yCursor += 5;
    doc.text(
      "Rango Autorizado 000-001-01-00005451 al 000-001-01-00006450",
      W / 2,
      yCursor,
      { align: "center" }
    );

    // ========= BLOQUE CLIENTE =========
    yCursor += 7;
    const boxTop = yCursor;
    const boxH = 24;
    doc.setDrawColor(...C_ACCENT);
    doc.roundedRect(m, boxTop, contentW, boxH, 2, 2);

    const lx = m + 4;
    const ly = boxTop + 6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_ACCENT);
    doc.setFontSize(9);
    doc.text("CLIENTE:", lx, ly);
    doc.text("RTN:", lx, ly + 7);
    doc.text("DIRECCIÓN:", lx, ly + 14);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(factura.cliente || "", lx + 20, ly);
    doc.text(factura.rtn || "", lx + 20, ly + 7);
    doc.text(factura.direccion_entrega || "", lx + 20, ly + 14);

    // Vendedor
    const vRowY = boxTop + boxH + 5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_ACCENT);
    doc.text("VENDEDOR:", m, vRowY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(factura.vendedor || "-", m + 22, vRowY);

    // ========= TABLA DETALLE =========
    const tableTop = vRowY + 5;

    const BOXES_H_RIGHT = 56; // altura caja DERECHA (totales)
    const SIGN_H = 18; // zona de firma
    const reservedBottom = m + BOXES_H_RIGHT + SIGN_H;

    const cols = [
      { header: "CANT.", dataKey: "cantidad" },
      { header: "DESCRIPCIÓN", dataKey: "descripcion" },
      { header: "PRECIO UNITARIO", dataKey: "precio" },
      { header: "DESC. OTORGADO", dataKey: "descuento" },
      { header: "TOTAL", dataKey: "total" },
    ];

    const body = (factura.items || []).map((it) => {
      const cant = Number(it.cantidad) || 0;
      const precio = Number(it.precio) || 0;
      const desc = Number(it.descuento) || 0;
      const totalLinea = cant * precio - desc;
      return {
        cantidad: cant,
        descripcion: it.descripcion || "",
        precio: fmtHNL.format(precio),
        descuento: fmtHNL.format(desc),
        total: fmtHNL.format(totalLinea),
      };
    });

    autoTable(doc, {
      startY: tableTop,
      head: [cols.map((c) => c.header)],
      body: body.map((r) => cols.map((c) => r[c.dataKey])),
      theme: "grid",
      margin: { left: m, right: m, top: tableTop, bottom: reservedBottom },
      headStyles: {
        fillColor: C_ACCENT,
        textColor: 255,
        fontSize: 8,
        halign: "center",
      },
      styles: { fontSize: 9, cellPadding: 2, lineColor: C_ACCENT, lineWidth: 0.2 },
      columnStyles: {
        0: { cellWidth: 16, halign: "center" },
        1: { cellWidth: contentW - (16 + 28 + 32 + 26), halign: "left" },
        2: { cellWidth: 28, halign: "right" },
        3: { cellWidth: 32, halign: "right" },
        4: { cellWidth: 26, halign: "right" },
      },
    });

    const endTableY = doc.lastAutoTable?.finalY || tableTop;

    // Si no cabe el pie + firma, nueva página
    const minFooterTop = H - (BOXES_H_RIGHT + SIGN_H) - m;
    let footerTop = minFooterTop;
    if (endTableY > minFooterTop - 6) {
      doc.addPage();
      footerTop = H - (BOXES_H_RIGHT + SIGN_H) - m;
    }

    // ====== Totales numéricos ======
    const sub = calcSub(factura);
    const descuentos = calcDesc(factura);
    const exento = factura.importe_exento ?? 0;
    const exonerado = factura.importe_exonerado ?? 0;
    const grav15 = Math.max(sub - descuentos - exento - exonerado, 0);
    const isv15 = factura.aplica_isv_15 ? grav15 * 0.15 : 0;
    const total = grav15 + isv15 + exento + exonerado;

    // ====== PIE – Caja izquierda (Valor en letras) ======
    const leftW = contentW * 0.62;
    const rightW = contentW * 0.36;

    const totalLetras = numeroALetrasHNL(total);
    const letrasWrapped = doc.splitTextToSize(totalLetras, leftW - 8);
    const leftH = Math.max(18, 10 + letrasWrapped.length * 5);

    doc.setDrawColor(...C_ACCENT);
    doc.roundedRect(m, footerTop, leftW, leftH, 2, 2);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_ACCENT);
    doc.setFontSize(9);
    doc.text("VALOR EN LEMPIRAS:", m + 4, footerTop + 7);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(letrasWrapped, m + 4, footerTop + 13);

    // ====== PIE – Caja derecha (totales numéricos) ======
    const rX = m + leftW + 6;
    doc.roundedRect(rX, footerTop, rightW - 6, BOXES_H_RIGHT, 2, 2);

    const pairs = [
      ["Subtotal:", fmtHNL.format(sub)],
      ["Descuentos/Rebajas:", fmtHNL.format(descuentos)],
      ["Importe Exento:", fmtHNL.format(exento)],
      ["Importe Exonerado:", fmtHNL.format(exonerado)],
      ["Importe Gravado 15%:", fmtHNL.format(grav15)],
      ["Impuestos S/Venta 15%:", fmtHNL.format(isv15)],
      ["Total:", fmtHNL.format(total)],
    ];

    let y = footerTop + 10;
    pairs.forEach(([label, val], i) => {
      const last = i === pairs.length - 1;
      doc.setFont("helvetica", last ? "bold" : "normal");
      doc.setTextColor(
        last ? C_ACCENT[0] : 0,
        last ? C_ACCENT[1] : 0,
        last ? C_ACCENT[2] : 0
      );
      doc.setFontSize(last ? 11 : 9);
      doc.text(label, rX + 6, y);
      doc.text(val, rX + rightW - 12, y, { align: "right" });
      y += last ? 9 : 7;
    });

    // ========= FIRMA =========
    const signY = H - m - 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("Firma del cliente:", m + 4, signY - 2);
    doc.setDrawColor(160);
    doc.line(m + 32, signY - 4, m + contentW * 0.55, signY - 4);

    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(
      "ORIGINAL: CLIENTE   ·   COPIA: OBLIGADO TRIBUTARIO EMISOR",
      W / 2,
      signY + 4,
      { align: "center" }
    );

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text("“LA FACTURA ES BENEFICIO DE TODOS, EXÍJALA”", W / 2, H - 4, {
      align: "center",
    });

    doc.save(`Factura_${factura.numero_factura || "NA"}.pdf`);
  };

  // =========================
  // PDF Listado de facturas (botón arriba de tabla)
  // =========================
  const exportarListadoPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "letter",
    });
    const W = doc.internal.pageSize.getWidth();
    const m = 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Listado de Facturas", W / 2, 14, { align: "center" });

    const columns = ["N°", "Cliente", "Fecha", "Vence", "Estado", "Total (HNL)"];

    const body = filtradas.map((f) => [
      f.numero_factura || "",
      f.cliente || "",
      (f.fecha_emision || "").substring(0, 10),
      (f.fecha_vencimiento || "").substring(0, 10),
      f.estado || "",
      fmtHNL.format(f.total_a_pagar || 0),
    ]);

    autoTable(doc, {
      startY: 20,
      head: [columns],
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [10, 120, 95], textColor: 255 },
      margin: { left: m, right: m },
    });

    doc.save("Listado_Facturas.pdf");
  };

  // =========================
  // Excel Listado de facturas
  // =========================
  const exportarExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Facturas");

      ws.columns = [
        { header: "N° Factura", key: "numero", width: 16 },
        { header: "Cliente", key: "cliente", width: 32 },
        { header: "Fecha Emisión", key: "fecha", width: 16 },
        { header: "Fecha Vencimiento", key: "vence", width: 18 },
        { header: "Estado", key: "estado", width: 14 },
        { header: "Total (HNL)", key: "total", width: 18 },
      ];

      filtradas.forEach((f) => {
        ws.addRow({
          numero: f.numero_factura,
          cliente: f.cliente,
          fecha: (f.fecha_emision || "").substring(0, 10),
          vence: (f.fecha_vencimiento || "").substring(0, 10),
          estado: f.estado,
          total: Number(f.total_a_pagar || 0),
        });
      });

      ws.getRow(1).font = { bold: true };

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "Facturas.xlsx");
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      toast({
        title: "Error exportando Excel",
        description: err.message,
        status: "error",
      });
    }
  };

  // =========================
  // Cargar información inicial (clientes, productos, facturas)
  // =========================
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [cliRes, prodRes, facRes] = await Promise.all([
          api.get("/ventas/ventasyreserva/clientes"),
          api.get("/inventario/inventario-productos"),
          api.get("/ventas/facturas"),
        ]);

        setClientes(cliRes.data || []);
        setProductosInv(
          (prodRes.data || []).filter((p) => (p.stock_actual || 0) > 0)
        );
        setFacturas(facRes.data || []);
      } catch (err) {
        console.error("❌ Error cargando datos de factura:", err);
        toast({
          title: "Error cargando datos",
          description: err.message,
          status: "error",
        });
      }
    };

    cargarDatos();
    const cargarMetodosPago = async () => {
  try {
    const res = await api.get("/ventas/pagos-factura/metodos-pago");
    setMetodosPago(res.data || []);
  } catch (err) {
    console.error("❌ Error cargando métodos de pago:", err);
  }
};

cargarMetodosPago();



  }, [toast]);

  // =========================
  // Filtro de facturas
  // =========================
  const filtradas = useMemo(() => {
    const cl = filter.cliente.trim().toLowerCase();
    const num = filter.numero.trim().toLowerCase();
    const est = filter.estado;
    return facturas.filter(
      (f) =>
        (!cl || (f.cliente || "").toLowerCase().includes(cl)) &&
        (!num || (f.numero_factura || "").toLowerCase().includes(num)) &&
        (!est || f.estado === est)
    );
  }, [facturas, filter]);

  // =========================
  // CRUD modal
  // =========================
  const abrirNueva = () => {
    setSel(vaciaFactura());
    onOpen();
  };

 const abrirEditar = async (f) => {
  try {
    const res = await api.get(`/ventas/facturas/${f.id_factura}`);
    const { factura, detalle } = res.data;

    setSel({
      id_factura: factura.id_factura,
      numero_factura: factura.numero_factura,
      cai: factura.cai,
      fecha_emision: factura.fecha_emision?.substring(0, 10),
      fecha_vencimiento: factura.fecha_vencimiento?.substring(0, 10),
      id_cliente: factura.id_cliente,
      cliente: factura.cliente,
      rtn: factura.rtn,
      direccion_entrega: factura.direccion_entrega,
      vendedor: factura.vendedor,
      estado: factura.estado,
      aplica_isv_15: factura.aplica_isv_15 ?? true,

      // 🔥🔥🔥 ESTE CAMPO FALTABA — causaba el error
      id_metodo_pago: factura.id_metodo_pago ?? 1,

      items: detalle.map((d) => ({
        id: d.id_detalle_factura,
        id_producto: d.id_producto,
        cantidad: Number(d.cantidad),
        descripcion: d.descripcion,
        precio: Number(d.precio_unitario),
        descuento: Number(d.descuento_unitario || 0),
      })),
    });

    onOpen();
  } catch (err) {
    console.error("❌ Error cargando factura:", err);
    toast({
      title: "Error cargando factura",
      description: err.message,
      status: "error",
    });
  }
};


  const cerrar = () => {
    setSel(null);
    onClose();
  };

  const actualizarCampo = (e) => {
    const { name, value } = e.target;
    setSel((s) => ({ ...s, [name]: value }));
  };

  const handleSelectCliente = (e) => {
    const idCli = Number(e.target.value) || null;
    const cli = clientes.find((c) => c.id_cliente === idCli);

    setSel((s) => ({
      ...s,
      id_cliente: idCli,
      cliente: cli ? cli.nombre_cliente : "",
      rtn: cli ? cli.rtn : "",
      direccion_entrega: cli ? cli.direccion : "",
    }));
  };

  const handleSelectIsv = (e) => {
    const v = e.target.value;
    setSel((s) => ({ ...s, aplica_isv_15: v === "15" }));
  };

  const addLinea = () =>
    setSel((s) => ({
      ...s,
      items: [
        ...s.items,
        {
          id: Date.now(),
          id_producto: null,
          cantidad: 0,
          descripcion: "",
          precio: 0,
          descuento: 0,
        },
      ],
    }));

  const delLinea = (id) =>
    setSel((s) => ({ ...s, items: s.items.filter((x) => x.id !== id) }));

  const updLinea = (id, campo, valor) =>
    setSel((s) => ({
      ...s,
      items: s.items.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)),
    }));

  const handleProductoChange = (lineId, idProducto) => {
    const prod = productosInv.find((p) => p.id_producto === Number(idProducto));

    setSel((s) => ({
      ...s,
      items: s.items.map((it) =>
        it.id === lineId
          ? {
              ...it,
              id_producto: prod?.id_producto || null,
              descripcion: prod
                ? `${prod.nombre_producto} (${prod.unidad_medida})`
                : "",
              precio: prod ? Number(prod.precio_unitario) || 0 : 0,
            }
          : it
      ),
    }));
  };

  const handleCantidadChange = (lineId, valueNumber) => {
    setSel((s) => {
      const items = s.items.map((it) => {
        if (it.id !== lineId) return it;

        const prod = productosInv.find(
          (p) => p.id_producto === Number(it.id_producto)
        );
        if (!prod) {
          return { ...it, cantidad: valueNumber || 0 };
        }

        const disponible = Number(prod.stock_actual) || 0;
        const val = Number(valueNumber) || 0;

        if (val > disponible) {
          toast({
            title: "Cantidad no disponible",
            description: `Error: solo cuenta con ${disponible} en inventario para este producto.`,
            status: "error",
          });
          return { ...it, cantidad: disponible };
        }

        return { ...it, cantidad: val };
      });

      return { ...s, items };
    });
  };

  // =========================
  // Guardar usando el backend
  // =========================
  const guardar = async () => {
    if (!sel.numero_factura || !sel.id_cliente) {
      toast({
        title: "Datos incompletos",
        description: "Debe ingresar número de factura y seleccionar un cliente",
        status: "warning",
      });
      return;
    }

    if (!sel.items.length) {
      toast({
        title: "Detalle vacío",
        description: "Debe agregar al menos una línea de detalle",
        status: "warning",
      });
      return;
    }

    for (const it of sel.items) {
      if (!it.id_producto) {
        toast({
          title: "Producto requerido",
          description: "Cada línea debe tener un producto seleccionado",
          status: "warning",
        });
        return;
      }
      if (!it.cantidad || Number(it.cantidad) <= 0) {
        toast({
          title: "Cantidad inválida",
          description: "La cantidad debe ser mayor a 0",
          status: "warning",
        });
        return;
      }
    }

const estadoToID = (est) => {
  if (est === "Pagada") return 1;
  if (est === "Anulada") return 2;
  if (est === "Pendiente") return 3;
  return 3;
};

// === CÁLCULOS OBLIGATORIOS ===
const subtotal = calcSub(sel);
const descuento_total = calcDesc(sel);
const importe_gravado_15 = calcGravado15(sel);
const importe_gravado_18 = 0;
const isv_15 = calcISV15(sel);
const isv_18 = 0;
const importe_exonerado = 0;
const importe_exento = 0;
const total_a_pagar = calcTotal(sel);
const valor_en_letras = numeroALetrasHNL(total_a_pagar);

const payload = {
  numero_factura: sel.numero_factura,
  cai: sel.cai,
  fecha_emision: sel.fecha_emision,
  fecha_vencimiento: sel.fecha_vencimiento,
  id_cliente: sel.id_cliente,
  direccion_entrega: sel.direccion_entrega,
  vendedor: sel.vendedor,
  aplica_isv_15: sel.aplica_isv_15,

  subtotal,
  descuento_total,
  importe_gravado_15,
  importe_gravado_18,
  isv_15,
  isv_18,
  importe_exonerado,
  importe_exento,
  total_a_pagar,
  valor_en_letras,

  // 🔥 AHORA CORRECTO
  id_metodo_pago: Number(sel.id_metodo_pago),

  id_estado_pago: estadoToID(sel.estado),
  id_cambio_cai: 1,

  items: sel.items.map((it) => ({
    id_producto: it.id_producto,
    cantidad: Number(it.cantidad) || 0,
    descripcion: it.descripcion,
    precio: Number(it.precio) || 0,
    descuento: Number(it.descuento) || 0,
  })),
};




    try {
      if (sel.id_factura) {
        await api.put(`/ventas/facturas/${sel.id_factura}`, payload);
        toast({ title: "Factura actualizada", status: "success" });
      } else {
        await api.post("/ventas/facturas", payload);
        toast({ title: "Factura creada", status: "success" });
      }

      // recargar listado
      const facRes = await api.get("/ventas/facturas");
      setFacturas(facRes.data || []);

      // 🔹 Preparar factura para impresión (desde modal) con confirmación
      setFacturaParaImprimir({
        ...sel,
        items: [...sel.items],
      });
      setImprimirTrasGuardar(true);
      onConfirmOpen();
    } catch (err) {
      console.error("❌ Error al guardar factura:", err);
      toast({
        title: "Error al guardar",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };

  // =========================
  // Eliminar factura
  // =========================
  const eliminarFactura = async (id) => {
    try {
      await api.delete(`/ventas/facturas/${id}`);
      toast({ title: "Factura eliminada", status: "success" });

      const facRes = await api.get("/ventas/facturas");
      setFacturas(facRes.data || []);
    } catch (err) {
      toast({
        title: "Error eliminando factura",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };
// ============================================================
// 🔹 Imprimir factura directamente desde el botón de la tabla
// ============================================================

  // =========================
  // 🔹 Preparar impresión desde la tabla (botón PDF por fila)
  // =========================
  const solicitarImpresionDesdeLista = async (f) => {
    try {
      const res = await api.get(`/ventas/facturas/${f.id_factura}`);
      const { factura, detalle } = res.data || {};

      const facturaCompleta = factura
        ? {
            ...factura,
            aplica_isv_15: factura.aplica_isv_15 ?? true,
            items: (detalle || []).map((d) => ({
              id: d.id_detalle_factura || Date.now() + Math.random(),
              id_producto: d.id_producto,
              cantidad: Number(d.cantidad),
              descripcion: d.descripcion,
              precio: Number(d.precio_unitario),
              descuento: Number(d.descuento || 0),
            })),
          }
        : {
            ...f,
            items: [],
          };

      setFacturaParaImprimir(facturaCompleta);
      setImprimirTrasGuardar(false);
      onConfirmOpen();
    } catch (err) {
      console.error("❌ Error preparando factura para impresión:", err);
      toast({
        title: "No se pudo preparar la factura para imprimir",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    }
  };

  // =========================
  // 🔹 Acciones del modal de confirmación
  // =========================
  const handleConfirmImprimir = () => {
    if (facturaParaImprimir) {
      imprimirPDF(facturaParaImprimir);
    }
    onConfirmClose();
    setFacturaParaImprimir(null);

    if (imprimirTrasGuardar) {
      cerrar();
      setImprimirTrasGuardar(false);
    }
  };

  const handleCancelarImpresion = () => {
    onConfirmClose();
    setFacturaParaImprimir(null);

    if (imprimirTrasGuardar) {
      cerrar();
      setImprimirTrasGuardar(false);
    }
  };

  // ============================================================
  // Render — Diseño Premium
  // ============================================================
  return (
    <Box p={4}>
      {/* Header principal */}
      <Flex align="center" justify="space-between" mb={4}>
        <Heading size="lg" color={titleColor}>
          Facturas
        </Heading>
        <HStack>
          <Button size="sm" onClick={() => navigate(-1)}>
            ←
          </Button>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="teal"
            size="sm"
            onClick={abrirNueva}
          >
            Nueva factura
          </Button>
        </HStack>
      </Flex>

      <Divider mb={6} />

      {/* Card premium con filtros + botones export + tabla */}
      <Card
        bg={cardBg}
        borderWidth="1px"
        borderColor={border}
        boxShadow="xl"
        borderRadius="lg"
      >
        <CardBody>
          {/* Filtros + Botones PDF/Excel */}
          <Flex
            justify="space-between"
            align="flex-end"
            mb={4}
            gap={4}
            flexWrap="wrap"
          >
            <HStack spacing={3} flexWrap="wrap">
              <FormControl maxW="260px">
                <FormLabel mb={1} fontSize="xs" color={subtleText}>
                  Cliente
                </FormLabel>
                <Input
                  size="sm"
                  value={filter.cliente}
                  onChange={(e) =>
                    setFilter((f) => ({ ...f, cliente: e.target.value }))
                  }
                  placeholder="Buscar por cliente"
                />
              </FormControl>
              <FormControl maxW="160px">
                <FormLabel mb={1} fontSize="xs" color={subtleText}>
                  N°. factura
                </FormLabel>
                <Input
                  size="sm"
                  value={filter.numero}
                  onChange={(e) =>
                    setFilter((f) => ({ ...f, numero: e.target.value }))
                  }
                  placeholder="Ej. 0001"
                />
              </FormControl>
              <FormControl maxW="180px">
                <FormLabel mb={1} fontSize="xs" color={subtleText}>
                  Estado
                </FormLabel>
                <Select
                  size="sm"
                  value={filter.estado}
                  onChange={(e) =>
                    setFilter((f) => ({ ...f, estado: e.target.value }))
                  }
                >
                  <option value="">Todos</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagada">Pagada</option>
                  <option value="Anulada">Anulada</option>
                </Select>
              </FormControl>
            </HStack>

            <HStack spacing={2}>
              <Button
                size="sm"
                leftIcon={<FaFilePdf />}
                variant="outline"
                colorScheme="red"
                onClick={exportarListadoPDF}
              >
                PDF
              </Button>
              <Button
                size="sm"
                leftIcon={<FaFileExcel />}
                variant="outline"
                colorScheme="green"
                onClick={exportarExcel}
              >
                Excel
              </Button>
            </HStack>
          </Flex>

          {/* Tabla de facturas */}
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg={headerBg}>
                <Tr>
                  <Th>N° Factura</Th>
                  <Th>Cliente</Th>
                  <Th>Fecha</Th>
                  <Th>Vence</Th>
                  <Th>Estado</Th>
                  <Th isNumeric>Total</Th>
                  <Th textAlign="center">Acciones</Th>
                </Tr>
              </Thead>

              <Tbody>
                {filtradas.map((f) => (
                  <Tr key={f.id_factura} _hover={{ bg: rowHover }}>
                    <Td>{f.numero_factura}</Td>
                    <Td>{f.cliente}</Td>
                    <Td>{f.fecha_emision?.substring(0, 10)}</Td>
                    <Td>{f.fecha_vencimiento?.substring(0, 10)}</Td>
                    <Td>{f.estado}</Td>
                    <Td isNumeric>{fmtHNL.format(f.total_a_pagar || 0)}</Td>
                    <Td>
                      <HStack justify="center" spacing={2}>
                        {/* 🔹 Botón PDF por factura */}
<IconButton
    aria-label="Imprimir PDF"
    size="xs"
    icon={<FaFilePdf />}
    colorScheme="green"
    variant="outline"
    onClick={() => imprimirDesdeFila(f.id_factura)}
/>

                        <IconButton
                          aria-label="Editar"
                          size="xs"
                          icon={<EditIcon />}
                          colorScheme="yellow"
                          onClick={() => abrirEditar(f)}
                        />
                        <IconButton
                          aria-label="Eliminar"
                          size="xs"
                          icon={<DeleteIcon />}
                          colorScheme="red"
                          onClick={() => eliminarFactura(f.id_factura)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
                {filtradas.length === 0 && (
                  <Tr>
                    <Td colSpan={7}>
                      <Text textAlign="center" color={subtleText} py={3}>
                        No hay facturas con esos filtros.
                      </Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* Modal de edición/creación PREMIUM */}
      <Modal
        isOpen={isOpen}
        onClose={cerrar}
        size="5xl"
        scrollBehavior="inside"
        isCentered
      >
        <ModalOverlay bg="blackAlpha.500" backdropFilter="blur(5px)" />
        <ModalContent
          bg={cardBg}
          border="1px solid"
          borderColor={border}
          boxShadow="2xl"
        >
          <ModalHeader
            color={titleColor}
            fontSize="2xl"
            borderBottom="1px solid"
            borderColor={border}
          >
            {sel?.id_factura ? "Editar factura" : "Nueva factura"}
          </ModalHeader>
          <ModalBody>
            {sel && (
              <Stack spacing={5}>
                {/* ENCABEZADO FACTURA */}
                <Card borderWidth="1px" borderColor={border}>
                  <CardBody>
                    <HStack align="start" spacing={4} flexWrap="wrap">
                      <FormControl maxW="160px">
                        <FormLabel fontSize="sm">N° Factura</FormLabel>
                        <Input
                          name="numero_factura"
                          value={sel.numero_factura}
                          onChange={actualizarCampo}
                        />
                      </FormControl>
                      <FormControl flex="1">
                        <FormLabel fontSize="sm">CAI</FormLabel>
                        <Input
                          name="cai"
                          value={sel.cai}
                          onChange={actualizarCampo}
                        />
                      </FormControl>
                      <FormControl maxW="190px">
                        <FormLabel fontSize="sm">Fecha</FormLabel>
                        <Input
                          type="date"
                          name="fecha_emision"
                          value={sel.fecha_emision}
                          onChange={actualizarCampo}
                        />
                      </FormControl>
                      <FormControl maxW="190px">
                        <FormLabel fontSize="sm">Vence</FormLabel>
                        <Input
                          type="date"
                          name="fecha_vencimiento"
                          value={sel.fecha_vencimiento}
                          onChange={actualizarCampo}
                        />
                      </FormControl>
                      <FormControl maxW="160px">
                        <FormLabel fontSize="sm">Estado</FormLabel>
                        <Select
                          name="estado"
                          value={sel.estado}
                          onChange={actualizarCampo}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Pagada">Pagada</option>
                          <option value="Anulada">Anulada</option>
                        </Select>
                      </FormControl>
                      <FormControl maxW="160px">
                        <FormLabel fontSize="sm">ISV</FormLabel>
                        <Select
                          value={sel.aplica_isv_15 ? "15" : "0"}
                          onChange={handleSelectIsv}
                        >
                          <option value="15">Con ISV 15%</option>
                          <option value="0">Sin ISV</option>
                        </Select>
                      </FormControl>

                        {/* 🔥 MÉTODO DE PAGO AQUÍ */}
  <FormControl maxW="200px">
    <FormLabel fontSize="sm">Método de pago</FormLabel>
    <Select
      name="id_metodo_pago"
      value={sel.id_metodo_pago}
      onChange={actualizarCampo}
    >
      {metodosPago.map((m) => (
        <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
          {m.nombre_metodo}
        </option>
      ))}
    </Select>
  </FormControl>

                    </HStack>
                  </CardBody>
                </Card>

                {/* CLIENTE */}
                <Card borderWidth="1px" borderColor={border}>
                  <CardBody>
                    <HStack align="start" spacing={4} flexWrap="wrap">
                      <FormControl flex="1">
                        <FormLabel fontSize="sm">Cliente</FormLabel>
                        <Select
                          placeholder="Seleccione cliente"
                          value={sel.id_cliente || ""}
                          onChange={handleSelectCliente}
                        >
                          {clientes.map((c) => (
                            <option key={c.id_cliente} value={c.id_cliente}>
                              {c.nombre_cliente}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl maxW="260px">
                        <FormLabel fontSize="sm">RTN</FormLabel>
                        <Input value={sel.rtn} isReadOnly />
                      </FormControl>
                      <FormControl maxW="260px">
                        <FormLabel fontSize="sm">Vendedor</FormLabel>
                        <Input
                          name="vendedor"
                          value={sel.vendedor}
                          onChange={actualizarCampo}
                        />
                      </FormControl>
                    </HStack>

                    <FormControl mt={3}>
                      <FormLabel fontSize="sm">Dirección</FormLabel>
                      <Input
                        name="direccion_entrega"
                        value={sel.direccion_entrega}
                        onChange={actualizarCampo}
                      />
                    </FormControl>
                  </CardBody>
                </Card>

                {/* DETALLE */}
                <Card borderWidth="1px" borderColor={border}>
                  <CardBody>
                    <Flex justify="space-between" align="center" mb={3}>
                      <Heading size="sm" color={titleColor}>
                        Detalle
                      </Heading>
                      <Button
                        size="sm"
                        leftIcon={<AddIcon />}
                        onClick={addLinea}
                        colorScheme="teal"
                        variant="solid"
                      >
                        Añadir línea
                      </Button>
                    </Flex>

                    <Box
                      borderWidth="1px"
                      borderColor={border}
                      borderRadius="md"
                      overflowX="auto"
                    >
                      <Table size="sm">
                        <Thead bg={headerBg}>
                          <Tr>
                            <Th w="90px" textAlign="center">
                              CANT.
                            </Th>
                            <Th w="220px">Producto</Th>
                            <Th>Descripción</Th>
                            <Th w="130px" isNumeric>
                              Precio
                            </Th>
                            <Th w="130px" isNumeric>
                              Descuento
                            </Th>
                            <Th w="50px"></Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {sel.items.map((it) => (
                            <Tr key={it.id} _hover={{ bg: rowHover }}>
                              <Td w="90px">
                                <NumberInput
                                  min={0}
                                  value={it.cantidad}
                                  onChange={(_, v) =>
                                    handleCantidadChange(it.id, v)
                                  }
                                  size="sm"
                                  w="90px"
                                  clampValueOnBlur
                                  keepWithinRange
                                >
                                  <NumberInputField textAlign="center" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              </Td>
                              <Td w="220px">
                                <Select
                                  placeholder="Seleccione producto"
                                  value={it.id_producto || ""}
                                  onChange={(e) =>
                                    handleProductoChange(
                                      it.id,
                                      e.target.value
                                    )
                                  }
                                  size="sm"
                                >
                                  {productosInv.map((p) => (
                                    <option
                                      key={p.id_producto}
                                      value={p.id_producto}
                                    >
                                      {p.nombre_producto} — Stock:{" "}
                                      {p.stock_actual}
                                    </option>
                                  ))}
                                </Select>
                              </Td>
                              <Td>
                                <Input
                                  size="sm"
                                  value={it.descripcion}
                                  onChange={(e) =>
                                    updLinea(
                                      it.id,
                                      "descripcion",
                                      e.target.value
                                    )
                                  }
                                />
                              </Td>
                              <Td isNumeric>
                                <NumberInput
                                  min={0}
                                  precision={2}
                                  value={it.precio}
                                  onChange={(_, v) =>
                                    updLinea(
                                      it.id,
                                      "precio",
                                      Number.isFinite(v) ? v : 0
                                    )
                                  }
                                  size="sm"
                                >
                                  <NumberInputField />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              </Td>
                              <Td isNumeric>
                                <NumberInput
                                  min={0}
                                  precision={2}
                                  value={it.descuento}
                                  onChange={(_, v) =>
                                    updLinea(
                                      it.id,
                                      "descuento",
                                      Number.isFinite(v) ? v : 0
                                    )
                                  }
                                  size="sm"
                                >
                                  <NumberInputField />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              </Td>
                              <Td>
                                <IconButton
                                  aria-label="Eliminar"
                                  size="xs"
                                  icon={<DeleteIcon />}
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => delLinea(it.id)}
                                />
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </CardBody>
                </Card>

                {/* Totales preview */}
                <Box alignSelf="flex-end" minW="280px">
                  <VStack spacing={1} align="stretch">
                    <HStack justify="space-between">
                      <Text color={subtleText} fontSize="sm">
                        Subtotal
                      </Text>
                      <Text fontWeight="semibold">
                        {fmtHNL.format(calcSub(sel))}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color={subtleText} fontSize="sm">
                        Descuentos
                      </Text>
                      <Text fontWeight="semibold">
                        {fmtHNL.format(calcDesc(sel))}
                      </Text>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between">
                      <Text color={subtleText} fontSize="sm">
                        Gravado 15%
                      </Text>
                      <Text fontWeight="semibold">
                        {fmtHNL.format(calcGravado15(sel))}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text color={subtleText} fontSize="sm">
                        I.S.V. 15%
                      </Text>
                      <Text fontWeight="semibold">
                        {fmtHNL.format(calcISV15(sel))}
                      </Text>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between">
                      <Text fontWeight="bold" color={titleColor}>
                        TOTAL
                      </Text>
                      <Text fontWeight="bold" color={titleColor}>
                        {fmtHNL.format(calcTotal(sel))}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              </Stack>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor={border}>
            <HStack spacing={3}>
              <Button onClick={cerrar} variant="ghost">
                Cancelar
              </Button>
              <Button colorScheme="teal" onClick={guardar}>
                {sel?.id_factura ? "Guardar cambios" : "Crear factura"}
              </Button>
              {sel && (
                <Button
                  leftIcon={<FaPrint />}
                  colorScheme="green"
                  onClick={() => imprimirPDF(sel)}
                >
                  Imprimir
                </Button>
              )}
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 🔹 Modal de confirmación de impresión */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={handleCancelarImpresion}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Imprimir factura</ModalHeader>
          <ModalBody>
            <Text>¿Desea imprimir la factura?</Text>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={handleCancelarImpresion}>
                No
              </Button>
              <Button
                colorScheme="teal"
                leftIcon={<FaFilePdf />}
                onClick={handleConfirmImprimir}
              >
                Sí, imprimir
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
