// ============================================================
// 📁 src/components/Compras/Compras.js
// ✅ Gestor unificado con totales idénticos a factura TAPLAX
//    (sin base imponible, sin impuesto_renglon por línea)
//    Mantiene proveedores y ordenes INTactos
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  Button,
  Icon,
  useToast,
  useColorModeValue,
  Select as CSelect,
  Input,
  Textarea,
  Divider,
  Flex,
  Badge,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  HStack,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Checkbox,
  useDisclosure,
  Spinner,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaSave,
  FaFileExport,
  FaTrash,
  FaEdit,
  FaSync,
  FaBox,
  FaUserTie,
  FaListUl,
  FaFolderOpen,
  FaReceipt,
} from "react-icons/fa";
import {
  soloLetras,
  validarEmail,
  validarTelefono,
  formatearTelefono,
  validarRTN,
} from "../../utils/validaciones";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "../../api/apiClient";
import logoSrc from "../login/log.png";





const safeNum = (v) => {
  if (v === null || v === undefined) return 0;

  // Si es cadena con moneda “L.”
  if (typeof v === "string") {
    const cleaned = v
      .replace(/L/gi, "")  // quita L.
      .replace(/\s+/g, "") // quita espacios
      .replace(/,/g, "");  // quita comas

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  const n = Number(v);
  return isNaN(n) ? 0 : n;
};


// =======================
// Utilidad: totales EXACTOS según factura (sin base imponible)
// =======================
const calcTotalesFactura = (detalles, flete = 0) => {
  const subtotal = detalles.reduce(
    (acc, d) => acc + safeNum(d.subtotal),
    0
  );

  const descuentos = detalles.reduce(
    (acc, d) => acc + safeNum(d.descuento),
    0
  );

  let importeExento = 0;
  let importeExonerado = 0;
  let importeGravado15 = 0;

  detalles.forEach((d) => {
    const base = safeNum(d.subtotal);
    const cat = (d.categoria_impuesto || "").toLowerCase();

    if (cat.includes("exento")) {
      importeExento += base;
    } else if (cat.includes("exonerado")) {
      importeExonerado += base;
    } else {
      importeGravado15 += base;
    }
  });

  const impuesto15 = importeGravado15 * 0.15;

  const total =
    importeExento +
    importeExonerado +
    importeGravado15 +
    impuesto15 +
    safeNum(flete);

  return {
    subtotal,
    descuentos,
    flete: safeNum(flete),
    importeExento,
    importeExonerado,
    importeGravado15,
    impuesto15,
    total,
  };
};

// Genera id temporal negativo para nuevas filas de detalle
let tempDetailId = -1;

// Helpers de Exportación
const imgToDataURL = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = src;
  });

const collapseRepeated = (rows, keys) => {
  if (!rows.length) return rows;
  const out = [];
  let prev = {};
  for (const r of rows) {
    const copy = { ...r };
    keys.forEach((k) => {
      if (prev[k] !== undefined && prev[k] === r[k]) {
        copy[k] = "";
      }
    });
    out.push(copy);
    prev = { ...prev, ...r };
  }
  return out;
};

export default function Compras() {
  const toast = useToast();
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const accent = useColorModeValue("teal.700", "teal.300");
  const subtle = useColorModeValue("gray.600", "gray.300");
  const pillBg = useColorModeValue("teal.50", "teal.900");

   // =============================
  // 🔥 Protección contra salida del módulo (DENTRO DEL COMPONENTE)
  // =============================
  const [tieneCambios, setTieneCambios] = useState(false);
  const salirModal = useDisclosure();
  const navigate = useNavigate();
  const [rutaPendiente, setRutaPendiente] = useState(null);

  // 🔥 Sincronizar con el Sidebar
useEffect(() => {
  window.__CAMBIOS_COMPRAS__ = tieneCambios;
}, [tieneCambios]);

  // Bloquear refrescar/cerrar ventana
  useEffect(() => {
    const handler = (e) => {
      if (tieneCambios) {
        e.preventDefault();
        e.returnValue = ""; 
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [tieneCambios]);
  // =======================
  // Estado base
  // =======================
  const [loading, setLoading] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Datos catálogos
  const [proveedores, setProveedores] = useState([]);
  const [estadosOC, setEstadosOC] = useState([]);
  const [insumos, setInsumos] = useState([]);

  // Selecciones y orden activa (NO tocamos estructura de orden/proveedor)
  const [idProveedorSel, setIdProveedorSel] = useState("");
  const [orden, setOrden] = useState({
    id_orden_compra: null,
    id_proveedor: "",
    id_estado_orden_compra: "",
    fecha_orden: "",
    observacion: "",
    factura_proveedor: "",
    nombre_proveedor: "",
    nombre_estado: "",
  });
  const [detalles, setDetalles] = useState([]);
  const [flete, setFlete] = useState(0);


  // Órdenes recientes + total
  const [ordenesRecientes, setOrdenesRecientes] = useState([]);
  const [totalGeneral, setTotalGeneral] = useState(0);

  // Modales proveedor/orden (sin cambios funcionales)
  const [modalEliminar, setModalEliminar] = useState(false);
  const [ordenAEliminar, setOrdenAEliminar] = useState(null);
  const [modalEditarProv, setModalEditarProv] = useState(false);
  const [proveedorEdit, setProveedorEdit] = useState(null);
  const [modalEliminarProv, setModalEliminarProv] = useState(false);
  const [proveedorAEliminar, setProveedorAEliminar] = useState(null);
  const [modalProv, setModalProv] = useState(false);

  

  const [provForm, setProvForm] = useState({
    nombre: "",
    rtn: "",
    telefono: "",
    correo: "",
    direccion: "",
    id_estado_proveedor: 1,
  });


  // =======================
  // Detalle (frontend con NOMBRES de factura)
  // ⚠️ OJO: mapeamos a/desde la API que sigue usando:
  // cantidad_solicitada, descuento_renglon, tasa_impuesto_renglon, etc.
// =======================
  const [detalleForm, setDetalleForm] = useState({
    id_detalle_oc: null,
    id_insumo: "",
    // Nombres "de factura" en UI:
    cantidad: "",
    precio_unitario: "",
    subtotal: 0,
    unidad_medida: "",
    categoria_impuesto: "Gravado 15%",
    tasa_impuesto: 15, // guardamos en BD como tasa_impuesto_renglon
    descuento: 0, // BD: descuento_renglon
  });
  const [editandoDetalleId, setEditandoDetalleId] = useState(null);

  // Export
  const exportModal = useDisclosure();
  const [exportFormat, setExportFormat] = useState("excel");

  // Todas las columnas posibles del reporte UNIFICADO (con nombres de factura)
  const ALL_COLUMNS = useMemo(
    () => [
      // Proveedor
      { key: "id_proveedor", label: "ID Proveedor" },
      { key: "proveedor", label: "Proveedor" },
      { key: "rtn", label: "RTN" },
      { key: "telefono", label: "Teléfono" },
      { key: "correo", label: "Correo" },
      { key: "direccion", label: "Dirección" },
      { key: "estado_proveedor", label: "Estado Proveedor" },

      // Orden
      { key: "id_orden_compra", label: "ID Orden" },
      { key: "estado_orden", label: "Estado Orden" },
      { key: "fecha_orden", label: "Fecha Orden" },
      { key: "factura_proveedor", label: "Factura Proveedor" },
      { key: "observacion", label: "Observación" },
      { key: "flete", label: "Flete" },

      // Detalle (nombres factura)
      { key: "id_detalle_oc", label: "ID Detalle" },
      { key: "id_insumo", label: "ID Insumo" },
      { key: "insumo", label: "Insumo" },
      { key: "cantidad", label: "Cantidad" },
      { key: "unidad_medida", label: "Unidad de medida" },
      { key: "precio_unitario", label: "Precio Unitario" },
      { key: "subtotal", label: "Subtotal" },
       { key: "categoria_impuesto", label: "Categoría Impuesto" },
      { key: "tasa_impuesto", label: "Tasa Impuesto %" },
      { key: "descuento", label: "Descuento" },
      { key: "total", label: "Total" },
      
     
      
      
    ],
    []
  );

  const [selectedColumns, setSelectedColumns] = useState(
    ALL_COLUMNS.map((c) => c.key)
  );
  const allChecked = selectedColumns.length === ALL_COLUMNS.length;
  const isIndeterminate =
    selectedColumns.length > 0 && selectedColumns.length < ALL_COLUMNS.length;

// =======================
// 🔥 Cálculo automático del subtotal
// =======================
useEffect(() => {
  const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));

  const cant = toNum(detalleForm.cantidad);
  const precio = toNum(detalleForm.precio_unitario);
  const desc = toNum(detalleForm.descuento);

  const subtotalCalc = cant * precio - desc;

  setDetalleForm((prev) => ({
    ...prev,
    subtotal: subtotalCalc > 0 ? subtotalCalc : 0,
  }));
}, [detalleForm.cantidad, detalleForm.precio_unitario, detalleForm.descuento]);



  // =======================
  // Carga inicial
  // =======================
  const cargarTodo = async () => {
    try {
      const [provRes, estRes, insRes, ocRes] = await Promise.all([
        api.get("/compras/proveedores"),
        api.get("/mantenimiento/estado-orden-compra"),
        api.get("/produccion/insumos"),
        api.get("/compras/orden-compra"),
      ]);

      setProveedores(provRes.data || []);
      setEstadosOC(estRes.data || []);
      setInsumos(insRes.data || []);
      setOrdenesRecientes(ocRes.data || []);

      let totalAll = 0;

for (const oc of ocRes.data || []) {
  try {
    // cargar detalles reales de la orden
    const det = await api.get(`/compras/detalle-orden-compra/orden/${oc.id_orden_compra}`);
    const detalles = det.data || [];

    // Adaptar formato para usar calcTotalesFactura()
    const detallesAdaptados = detalles.map((d) => ({
      cantidad: Number(d.cantidad || 0),
      precio_unitario: Number(d.precio_unitario || 0),
      descuento: Number(d.descuento || 0),
      subtotal: Number(d.cantidad || 0) * Number(d.precio_unitario || 0) - Number(d.descuento || 0),
      categoria_impuesto: d.categoria_impuesto || "Gravado 15%",
      tasa_impuesto: Number(d.tasa_impuesto || 15),
    }));

    // usar tu MISMA función del resumen
    const tot = calcTotalesFactura(detallesAdaptados, Number(oc.flete || 0));

    totalAll += tot.total;
  } catch (e) {
    console.error("Error al calcular total de OC:", oc.id_orden_compra, e);
  }
}

setTotalGeneral(totalAll);
      setTotalGeneral(totalAll);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
      toast({
        title: "Error cargando datos",
        description: e.message,
        status: "error",
      });
    }
  };

  useEffect(() => {
    setLoading(true);
    cargarTodo().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================
  // Refrescar
  // =======================
  const refrescarCompras = async () => {
    try {
      setLoadingRefresh(true);
      await cargarTodo();
      if (orden?.id_orden_compra) {
        await abrirOrden(orden.id_orden_compra, { silent: true });
      }
      toast({
        title: "Datos actualizados",
        description: "La información se ha sincronizado con el servidor.",
        status: "success",
        duration: 2000,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Error al refrescar",
        description: e.message,
        status: "error",
      });
    } finally {
      setLoadingRefresh(false);
    }
  };

  // =======================
  // Nueva Orden (sin tocar estructura de orden)
  // =======================
  const nuevaOrden = (mostrarMensaje = true) => {
    setOrden({
      id_orden_compra: null,
      id_proveedor: idProveedorSel || "",
      id_estado_orden_compra: "",
      fecha_orden: "",
      observacion: "",
      factura_proveedor: "",
      nombre_proveedor: "",
      nombre_estado: "",
    });

    setDetalles([]);
    setEditandoDetalleId(null);
    setFlete(0); 
    setDetalleForm({
      id_detalle_oc: null,
      id_insumo: "",
      cantidad: "",
      precio_unitario: "",
      subtotal: 0,
      unidad_medida: "",
      categoria_impuesto: "Gravado 15%",
      tasa_impuesto: 15,
      descuento: 0,
    });

    if (mostrarMensaje) {
      toast({ title: "Formulario listo para nueva orden", status: "info" });
    }
  };

  // =======================
  // Abrir Orden (mapeo de nombres al frontend "de factura")
 const abrirOrden = async (ocId, opts = { silent: false }) => {
  if (!opts?.silent) setLoading(true);
  try {
    const [oc, det] = await Promise.all([
      api.get(`/compras/orden-compra/${ocId}`),
api.get(`/compras/detalle-orden-compra/orden/${ocId}`)    ]);

    const O = oc.data;

    // 🔥 Cargar Flete guardado en BD
    setFlete(Number(O.flete || 0));

    setOrden({
      id_orden_compra: O.id_orden_compra,
      id_proveedor: O.id_proveedor,
      id_estado_orden_compra: O.id_estado_orden_compra,
      fecha_orden: O.fecha_orden,
      observacion: O.observacion || "",
      factura_proveedor: O.factura_proveedor || "",
      nombre_proveedor: O.nombre_proveedor || "",
      nombre_estado: O.nombre_estado || "",
    });

    setIdProveedorSel(O.id_proveedor?.toString() || "");

    setDetalles(
      (det.data || []).map((d) => {
        const cant = Number(d.cantidad ?? 0);
        const precio = Number(d.precio_unitario ?? 0);
        const desc = Number(d.descuento || 0);

        return {
          id_detalle_oc: d.id_detalle_oc,
          id_insumo: d.id_insumo,
          nombre_insumo: d.nombre_insumo,
          cantidad: cant,
          precio_unitario: precio,
          descuento: desc,
          subtotal: (cant * precio) - Number(d.descuento || 0), // 🔥 FIX descuento aplicado
          unidad_medida: d.unidad_medida || "",
          categoria_impuesto: d.categoria_impuesto || "Gravado 15%",
          tasa_impuesto: Number(d.tasa_impuesto ?? 15),
        };
      })
    );


  } catch (e) {
    console.error(e);
    toast({
      title: "Error al abrir orden",
      description: e.message,
      status: "error",
    });
  } finally {
    if (!opts?.silent) setLoading(false);
  }
};

  // =======================
  // CRUD Proveedores (INTACTO)
  // =======================
  const abrirModalProveedor = () => {
    setProvForm({
      nombre: "",
      rtn: "",
      telefono: "",
      correo: "",
      direccion: "",
      id_estado_proveedor: 1,
    });
    setModalProv(true);
  };

  const guardarProveedor = async () => {

  // ================================
  // 🔍 VALIDACIONES GLOBALES
  // ================================

  // Nombre requerido
  if (!provForm.nombre.trim()) {
    return toast({
      title: "Nombre requerido",
      description: "Debe ingresar el nombre del proveedor.",
      status: "warning",
    });
  }

  // Nombre solo letras
  if (!soloLetras(provForm.nombre)) {
    return toast({
      title: "Nombre inválido",
      description: "El nombre solo puede contener letras.",
      status: "error",
    });
  }

  // RTN requerido
  if (!provForm.rtn.trim()) {
    return toast({
      title: "RTN requerido",
      description: "Debe ingresar el RTN del proveedor.",
      status: "warning",
    });
  }

  // RTN formato
  const errRTN = validarRTN(provForm.rtn);
  if (errRTN) {
    return toast({
      title: "RTN inválido",
      description: errRTN,
      status: "error",
    });
  }

  // Teléfono requerido
  if (!provForm.telefono.trim()) {
    return toast({
      title: "Teléfono requerido",
      description: "Debe ingresar el número de teléfono.",
      status: "warning",
    });
  }

  // Teléfono formato
  const errTel = validarTelefono(provForm.telefono);
  if (errTel) {
    return toast({
      title: "Teléfono inválido",
      description: errTel,
      status: "error",
    });
  }

  // Correo requerido
  if (!provForm.correo.trim()) {
    return toast({
      title: "Correo requerido",
      description: "Debe ingresar un correo electrónico.",
      status: "warning",
    });
  }

  // Correo formato
  const errCorreo = validarEmail(provForm.correo);
  if (errCorreo) {
    return toast({
      title: "Correo inválido",
      description: errCorreo,
      status: "error",
    });
  }

  // Estado proveedor
  if (!provForm.id_estado_proveedor) {
    return toast({
      title: "Estado requerido",
      description: "Debe seleccionar un estado para el proveedor.",
      status: "error",
    });
  }

  // ================================
  // 🔥 SI TODO ES VÁLIDO → GUARDAR
  // ================================
  try {
    setLoading(true);
    const res = await api.post("/compras/proveedores", {
      ...provForm,
      modo: "normal",
    });

    const idNew = res.data?.id_proveedor;

    toast({ title: "Proveedor guardado", status: "success" });
    await cargarTodo();

    if (idNew) setIdProveedorSel(String(idNew));
    setModalProv(false);
  } catch (e) {
    console.error(e);
    toast({
      title: "Error al insertar proveedor",
      description: e.response?.data?.error || e.message,
      status: "error",
    });
  } finally {
    setLoading(false);
  }
};


 const guardarProveedorEditado = async () => {
  if (!proveedorEdit) return;

  // ================================
  // 🔍 VALIDACIONES
  // ================================

  // Nombre requerido
  if (!proveedorEdit.nombre.trim()) {
    return toast({
      title: "Nombre requerido",
      description: "Debe ingresar el nombre del proveedor.",
      status: "warning",
    });
  }

  // Nombre solo letras
  if (!soloLetras(proveedorEdit.nombre)) {
    return toast({
      title: "Nombre inválido",
      description: "El nombre solo puede contener letras.",
      status: "error",
    });
  }

  // RTN requerido
  if (!proveedorEdit.rtn.trim()) {
    return toast({
      title: "RTN requerido",
      description: "Debe ingresar el RTN del proveedor.",
      status: "warning",
    });
  }

  // RTN formato
  const errRTN = validarRTN(proveedorEdit.rtn);
  if (errRTN) {
    return toast({
      title: "RTN inválido",
      description: errRTN,
      status: "error",
    });
  }

  // Teléfono requerido
  if (!proveedorEdit.telefono.trim()) {
    return toast({
      title: "Teléfono requerido",
      description: "Debe ingresar el número de teléfono.",
      status: "warning",
    });
  }

  // Teléfono formato
  const errTel = validarTelefono(proveedorEdit.telefono);
  if (errTel) {
    return toast({
      title: "Teléfono inválido",
      description: errTel,
      status: "error",
    });
  }

  // Correo requerido
  if (!proveedorEdit.correo.trim()) {
    return toast({
      title: "Correo requerido",
      description: "Debe ingresar un correo electrónico.",
      status: "warning",
    });
  }

  // Correo formato
  const errCorreo = validarEmail(proveedorEdit.correo);
  if (errCorreo) {
    return toast({
      title: "Correo inválido",
      description: errCorreo,
      status: "error",
    });
  }

  // ================================
  // 🔥 SI TODO ES VÁLIDO → GUARDAR
  // ================================
  try {
    setLoading(true);
    await api.put(
      `/compras/proveedores/${proveedorEdit.id_proveedor}`,
      proveedorEdit
    );

    toast({ title: "Proveedor actualizado", status: "success" });
    setModalEditarProv(false);
    await cargarTodo();
  } catch (e) {
    console.error(e);
    toast({
      title: "Error al editar proveedor",
      description: e.response?.data?.error || e.message,
      status: "error",
    });
  } finally {
    setLoading(false);
  }
};

  const eliminarProveedor = async () => {
    try {
      setLoading(true);
      await api.delete(`/compras/proveedores/${proveedorAEliminar}`);
      toast({ title: "Proveedor eliminado", status: "success" });
      setModalEliminarProv(false);
      setIdProveedorSel("");
      nuevaOrden(false);
      await cargarTodo();
    } catch (e) {
      console.error(e);
      toast({
        title: "No se pudo eliminar",
        description: e.response?.data?.error || e.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // Orden - Guardar / Actualizar (INTACTO en estructura)
  // =======================
  const guardarOrdenCompleta = async () => {
    if (!idProveedorSel) {
      toast({ title: "Selecciona un proveedor", status: "warning" });
      return;
    }
    if (!orden.id_estado_orden_compra) {
      toast({ title: "Selecciona un estado para la orden", status: "warning" });
      return;
    }
    if (!detalles.length) {
      toast({ title: "Agrega al menos un detalle", status: "warning" });
      return;
    }

    setLoading(true);
    try {
      let idOC = orden.id_orden_compra;

      if (!idOC) {
       const res = await api.post("/compras/orden-compra", {
  id_proveedor: Number(idProveedorSel),
  id_estado_orden_compra: Number(orden.id_estado_orden_compra),
  observacion: orden.observacion || null,
  factura_proveedor: orden.factura_proveedor || null,
  flete: Number(flete),  // 🔥 AGREGAR ESTO
});

        idOC = res.data?.id_orden_compra;
        setOrden((prev) => ({ ...prev, id_orden_compra: idOC }));
      } else {
        await api.put(`/compras/orden-compra/${idOC}`, {
  id_proveedor: Number(idProveedorSel),
  id_estado_orden_compra: Number(orden.id_estado_orden_compra),
  observacion: orden.observacion || null,
  factura_proveedor: orden.factura_proveedor || null,
  fecha_orden: orden.fecha_orden || null,
  flete: Number(flete),   // 🔥 AGREGAR ESTO
});

      }

      // Guardar detalles (mapeo a nombres de BD)
      for (const d of detalles) {
  if (d._delete && d.id_detalle_oc && d.id_detalle_oc > 0) {
    await api.delete(`/compras/detalle-orden-compra/${d.id_detalle_oc}`);
    continue;
  }
  if (!d.id_insumo || !d.cantidad || !d.precio_unitario) continue;

  const detalleData = {
    id_orden_compra: idOC,
    id_insumo: Number(d.id_insumo),
    cantidad: Number(d.cantidad),
    precio_unitario: Number(d.precio_unitario),
    descuento: Number(d.descuento || 0),
    unidad_medida: d.unidad_medida || "",
    categoria_impuesto: d.categoria_impuesto || "Gravado 15%",
    tasa_impuesto: Number(d.tasa_impuesto ?? 15),
  };

  if (!d.id_detalle_oc || d.id_detalle_oc < 0) {
    await api.post("/compras/detalle-orden-compra", detalleData);
  } else {
    await api.put(
      `/compras/detalle-orden-compra/${d.id_detalle_oc}`,
      detalleData
    );
  }
}

      toast({ title: "Orden guardada correctamente", status: "success" });
      nuevaOrden();
      if (!idOC) {
  setFlete(0);
}
      await cargarTodo();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error al guardar la orden",
        description: e.response?.data?.error || e.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // Eliminar Orden
  // =======================
  const eliminarOrden = async (idOC) => {
    const id = idOC || orden.id_orden_compra;
    if (!id) {
      toast({ title: "No hay orden para eliminar", status: "info" });
      return;
    }
    setLoading(true);
    try {
      await api.delete(`/compras/orden-compra/${id}`);
      toast({ title: "Orden eliminada correctamente", status: "success" });
      nuevaOrden(false);
      await cargarTodo();
    } catch (e) {
      console.error(e);
      toast({
        title: "No se pudo eliminar la orden",
        description: e.response?.data?.error || e.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // Detalles - agregar / editar / eliminar (UI con nombres de factura)
  // =======================
  const limpiarDetalleForm = () =>
    setDetalleForm({
      id_detalle_oc: null,
      id_insumo: "",
      cantidad: "",
      precio_unitario: "",
      subtotal: 0,
      unidad_medida: "",
      categoria_impuesto: "Gravado 15%",
      tasa_impuesto: 15,
      descuento: 0,
    });

const agregarDetalle = () => {
  if (!detalleForm.id_insumo || detalleForm.cantidad === "" || detalleForm.precio_unitario === "") {
    toast({ title: "Completa insumo, cantidad y precio", status: "warning" });
    return;
  }

  const toNum = (val) => (isNaN(Number(val)) ? 0 : Number(val));
  const ins = insumos.find(i => Number(i.id_insumo) === Number(detalleForm.id_insumo));

  const cantidad = toNum(detalleForm.cantidad);
  const precio = toNum(detalleForm.precio_unitario);
  const descuento = toNum(detalleForm.descuento);

  const subtotalCalc = cantidad * precio - descuento;

  const nuevo = {
    ...detalleForm,
    id_detalle_oc: tempDetailId--,
    nombre_insumo: ins?.nombre_insumo || "",
    cantidad,
    precio_unitario: precio,
    descuento,
    subtotal: subtotalCalc,
    unidad_medida: detalleForm.unidad_medida || "",
    categoria_impuesto: detalleForm.categoria_impuesto || "Gravado 15%",
    tasa_impuesto: toNum(detalleForm.tasa_impuesto ?? 15),
  };

  setDetalles((arr) => [...arr, nuevo]);
  limpiarDetalleForm();
};


 const toNum = (val) => (isNaN(Number(val)) ? 0 : Number(val));

// ============================================================
// 🔹 Cargar Detalle en formulario (modo edición)
// ============================================================
const cargarDetalleParaEditar = (row) => {
  setEditandoDetalleId(row.id_detalle_oc);

  const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));

  const subtotalCalc =
    toNum(row.cantidad) * toNum(row.precio_unitario) -
    toNum(row.descuento || 0);

  setDetalleForm({
    id_detalle_oc: row.id_detalle_oc,
    id_insumo: row.id_insumo,
    cantidad: toNum(row.cantidad),
    precio_unitario: toNum(row.precio_unitario),
    descuento: toNum(row.descuento),
    unidad_medida: row.unidad_medida || "",
    categoria_impuesto: row.categoria_impuesto,
    tasa_impuesto: toNum(row.tasa_impuesto),
    subtotal: subtotalCalc,
  });
};


 // ============================================================
// 🔹 Confirmar edición del detalle
// ============================================================
const confirmarEdicionDetalle = () => {
  if (!detalleForm.id_insumo || detalleForm.cantidad === "" || detalleForm.precio_unitario === "") {
    toast({ title: "Completa insumo, cantidad y precio", status: "warning" });
    return;
  }

  const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
  const ins = insumos.find(i => Number(i.id_insumo) === Number(detalleForm.id_insumo));

  const cantidad = toNum(detalleForm.cantidad);
  const precio = toNum(detalleForm.precio_unitario);
  const descuento = toNum(detalleForm.descuento);

  const subtotalCalc = cantidad * precio - descuento;

  setDetalles((arr) =>
    arr.map((d) =>
      d.id_detalle_oc === editandoDetalleId
        ? {
            ...d,
            id_insumo: Number(detalleForm.id_insumo),
            nombre_insumo: ins?.nombre_insumo || "",
            cantidad,
            precio_unitario: precio,
            descuento,
            subtotal: subtotalCalc,
            unidad_medida: detalleForm.unidad_medida || "",
            categoria_impuesto: detalleForm.categoria_impuesto,
            tasa_impuesto: toNum(detalleForm.tasa_impuesto ?? 15),
          }
        : d
    )
  );

  setEditandoDetalleId(null);
  limpiarDetalleForm();
};

  const eliminarDetalleLocal = (row) => {
    if (row.id_detalle_oc > 0) {
      setDetalles((arr) =>
        arr.map((d) =>
          d.id_detalle_oc === row.id_detalle_oc ? { ...d, _delete: true } : d
        )
      );
    } else {
      setDetalles((arr) =>
        arr.filter((d) => d.id_detalle_oc !== row.id_detalle_oc)
      );
    }
  };

  // 🔥📌 AQUI VA — UBICACIÓN PERFECTA
// ============================================
const handleNavigate = (path) => {
  if (tieneCambios) {
    setRutaPendiente(path);
    salirModal.onOpen();
  } else {
    navigate(path);
  }
};
// ============================================

  const detallesVisibles = detalles.filter((d) => !d._delete);
const totales = calcTotalesFactura(detallesVisibles, flete);

  // =======================
  // Dataset UNIFICADO export (mapear nombres)
  // =======================
const buildUnifiedRows = async () => {
  const [provRes, ocRes, detRes] = await Promise.all([
    api.get("/compras/proveedores"),
    api.get("/compras/orden-compra"),
    api.get("/compras/detalle-orden-compra"),
  ]);

  const provs = provRes.data || [];
  const ocs = ocRes.data || [];
  const dets = detRes.data || [];

  const provById = new Map(provs.map((p) => [Number(p.id_proveedor), p]));
  const ocById = new Map(ocs.map((o) => [Number(o.id_orden_compra), o]));

  const rows = [];

  // ============================================================
  // 1) ÓRDENES CON DETALLE (datos SIEMPRE en NÚMEROS)
  // ============================================================
  for (const d of dets) {
    const oc = ocById.get(Number(d.id_orden_compra)) || {};
    const p = provById.get(Number(oc.id_proveedor)) || {};

    const cantidad = Number(d.cantidad_solicitada ?? d.cantidad ?? 0);
    const precio = Number(d.precio_unitario ?? 0);
    const descuento = Number(d.descuento_renglon ?? d.descuento ?? 0);
    const tasa = Number(d.tasa_impuesto_renglon ?? d.tasa_impuesto ?? 0);

    const subtotalCalc = cantidad * precio - descuento;
    const totalCalc = subtotalCalc * (1 + tasa / 100);

    rows.push({
      // =======================
      // PROVEEDOR
      // =======================
      id_proveedor: p.id_proveedor ?? oc.id_proveedor ?? "",
      proveedor: p.nombre ?? oc.nombre_proveedor ?? "",
      rtn: p.rtn ?? "",
      telefono: p.telefono ?? "",
      correo: p.correo ?? "",
      direccion: p.direccion ?? "",
      estado_proveedor: p.nombre_estado ?? p.estado ?? "",

      // =======================
      // ORDEN COMPRA
      // =======================
      id_orden_compra: oc.id_orden_compra ?? "",
      estado_orden: oc.nombre_estado ?? "",
      fecha_orden: oc.fecha_orden
        ? oc.fecha_orden.substring(0, 10)
        : "",
      factura_proveedor: oc.factura_proveedor ?? "",
      observacion: oc.observacion ?? "",
      flete: Number(oc.flete || 0),

      // =======================
      // DETALLE (todo en números LIMPIOS)
      // =======================
      id_detalle_oc: d.id_detalle_oc ?? "",
      id_insumo: d.id_insumo ?? "",
      insumo: d.nombre_insumo ?? "",

      cantidad,
      unidad_medida: d.unidad_medida ?? "", 
      precio_unitario: precio,
      descuento,
      subtotal: subtotalCalc,
      categoria_impuesto: d.categoria_impuesto ?? "",
      tasa_impuesto: tasa,
      total: totalCalc,
    });
  }

  // ============================================================
  // 2) ÓRDENES SIN DETALLE
  // ============================================================
  const ocConDetalle = new Set(dets.map((d) => Number(d.id_orden_compra)));

  for (const oc of ocs) {
    if (!ocConDetalle.has(Number(oc.id_orden_compra))) {
      const p = provById.get(Number(oc.id_proveedor)) || {};

      rows.push({
        id_proveedor: p.id_proveedor ?? oc.id_proveedor ?? "",
        proveedor: p.nombre ?? oc.nombre_proveedor ?? "",
        rtn: p.rtn ?? "",
        telefono: p.telefono ?? "",
        correo: p.correo ?? "",
        direccion: p.direccion ?? "",
        estado_proveedor: p.nombre_estado ?? p.estado ?? "",

        id_orden_compra: oc.id_orden_compra ?? "",
        estado_orden: oc.nombre_estado ?? "",
        fecha_orden: oc.fecha_orden
          ? oc.fecha_orden.substring(0, 10)
          : "",
        factura_proveedor: oc.factura_proveedor ?? "",
        observacion: oc.observacion ?? "",
        flete: Number(oc.flete || 0),

        // Sin detalle
        id_detalle_oc: "",
        id_insumo: "",
        insumo: "",
        unidad_medida: "",
        cantidad: 0,
        precio_unitario: 0,
        subtotal: 0,
        descuento: 0,
        categoria_impuesto: "",
        tasa_impuesto: 0,
        total: 0,
      });
    }
  }

  // ============================================================
  // ORDENAR
  // ============================================================
  rows.sort((a, b) => {
    const pn = (a.proveedor || "").localeCompare(b.proveedor || "");
    if (pn !== 0) return pn;

    const ocA = Number(a.id_orden_compra) || 0;
    const ocB = Number(b.id_orden_compra) || 0;
    if (ocA !== ocB) return ocA - ocB;

    const dA = Number(a.id_detalle_oc) || 0;
    const dB = Number(b.id_detalle_oc) || 0;
    return dA - dB;
  });

  


  // ============================================================
  // COLAPSAR CAMPOS REPETIDOS
  // ============================================================
  return collapseRepeated(rows, [
    "id_proveedor",
    "proveedor",
    "rtn",
    "telefono",
    "correo",
    "direccion",
    "estado_proveedor",
  ]);
};

  // =======================
  // Exportar (Excel/PDF intacto, usando nombres de factura)
  // =======================
  const exportarReporte = async () => {
    try {
      setLoading(true);

      const rows = await buildUnifiedRows();
      if (!rows.length) {
        toast({ title: "No hay datos para exportar", status: "info" });
        return;
      }

      const cols = ALL_COLUMNS.filter((c) =>
        selectedColumns.includes(c.key)
      );

      if (exportFormat === "excel") {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Reporte");

        ws.addRow(cols.map((c) => c.label));
        rows.forEach((r) => {
          ws.addRow(cols.map((c) => r[c.key]));
        });

        // Estilo simple + autosize
        ws.getRow(1).font = { bold: true };
        cols.forEach((c, i) => {
          let max = c.label.length;
          rows.forEach((r) => {
            const v = r[c.key] == null ? "" : String(r[c.key]);
            if (v.length > max) max = v.length;
          });
          ws.getColumn(i + 1).width = Math.min(Math.max(12, max + 2), 60);
        });

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), "reporte_compras_unificado.xlsx");
        toast({ title: "Excel exportado", status: "success" });
      } else {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.width;

  // ================================
  // FORMATEO DE MONEDA
  // ================================
  const formatMoney = (v) => `L. ${Number(v || 0).toFixed(2)}`;

  // 🔥 Convertir las filas ANTES del PDF
  const formattedRows = rows.map((r) => ({
    ...r,
    precio_unitario: formatMoney(r.precio_unitario),
    subtotal: formatMoney(r.subtotal),
    descuento: formatMoney(r.descuento),
    total: formatMoney(r.total),
    flete: formatMoney(r.flete),
  }));

  // ================================
  // ENCABEZADO PDF
  // ================================
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 110, "F");

  // Logo
  try {
    const dataURL = await imgToDataURL(logoSrc);
    doc.addImage(dataURL, "PNG", 40, 28, 45, 45);
  } catch (e) {
    console.warn("⚠️ No se pudo cargar el logo", e);
  }

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(25, 55, 80);
  doc.text("REPORTE DE COMPRAS DE INSUMOS", pageWidth / 2, 50, {
    align: "center",
  });

  // Fecha
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Generado: ${new Date().toLocaleDateString()}`, pageWidth / 2, 70, {
    align: "center",
  });

  // Línea
  doc.setDrawColor(20, 120, 110);
  doc.setLineWidth(1);
  doc.line(40, 95, pageWidth - 40, 95);

  // ================================
  // 🔥 TABLA PRINCIPAL
  // ================================
  autoTable(doc, {
    startY: 120,
    head: [cols.map((c) => c.label)],
    body: formattedRows.map((r) => cols.map((c) => r[c.key] ?? "")),
    styles: { fontSize: 9, cellPadding: 4, valign: "middle" },
    headStyles: { fillColor: [20, 120, 110], textColor: 255, fontStyle: "bold" },

    didDrawPage: () => {
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.getHeight();
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        `Página ${doc.getNumberOfPages()}`,
        pageSize.getWidth() - 80,
        pageHeight - 20
      );
    },
  });

  // ================================
  // 🔥 CALCULAR TOTALES PARA EL PDF
  // ================================
  const finalY = doc.lastAutoTable.finalY + 30;

  let subtotalPDF = 0;
  let descuentosPDF = 0;
  let exentoPDF = 0;
  let exoneradoPDF = 0;
  let gravado15PDF = 0;

  rows.forEach((r) => {
    const sub = Number(r.subtotal || 0);
    const desc = Number(r.descuento || 0);
    const cat = (r.categoria_impuesto || "").toLowerCase();

    subtotalPDF += sub + desc;
    descuentosPDF += desc;

    if (cat.includes("exento")) exentoPDF += sub;
    else if (cat.includes("exonerado")) exoneradoPDF += sub;
    else gravado15PDF += sub;
  });

  const impuestoPDF = gravado15PDF * 0.15;

  // 🔥 Flete sumado
  let fletePDF = 0;
  rows.forEach((r) => {
    if (r.flete) fletePDF += Number(r.flete || 0);
  });

  const totalPDF =
    exentoPDF +
    exoneradoPDF +
    gravado15PDF +
    impuestoPDF +
    fletePDF;

  // ================================
  // 🔥 BLOQUE VISUAL DE TOTALES
  // ================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RESUMEN DE TOTALES", 40, finalY);

  let y = finalY + 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const addRow = (label, value) => {
    doc.text(label, 50, y);
    doc.text(formatMoney(value), 350, y, { align: "right" });
    y += 18;
  };

  addRow("Subtotal:", subtotalPDF);
  addRow("Descuentos:", descuentosPDF);
  addRow("Importe Exento:", exentoPDF);
  addRow("Importe Exonerado:", exoneradoPDF);
  addRow("Importe Gravado 15%:", gravado15PDF);
  addRow("Impuesto 15%:", impuestoPDF);
  addRow("Flete:", fletePDF);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  addRow("TOTAL GENERAL:", totalPDF);

  doc.save("reporte_compras_unificado.pdf");
  toast({ title: "PDF exportado", status: "success" });
}
    } catch (e) {
      console.error(e);
      toast({
        title: "No se pudo exportar",
        description: e.message,
        status: "error",
      });
    } finally {
      setLoading(false);
      exportModal.onClose();
    }
  };


  
  // =======================
  // Render
  // =======================
  const estadoNombre = estadosOC.find(
    (e) =>
      Number(e.id_estado_orden_compra) ===
      Number(orden.id_estado_orden_compra)
  )?.nombre_estado;

 return (
  <Box p={5}>
    {/* Encabezado + botón único de exportación */}
    <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
      <Heading size="lg" color={accent}>
        Gestión de Compras
      </Heading>
      

      <HStack spacing={2} align="center">
        {lastRefresh && (
          <Text fontSize="xs" color={subtle} mr={2}>
            Última sync: {lastRefresh.toLocaleTimeString()}
          </Text>
        )}

        <Button
          size="sm"
          leftIcon={<FaFileExport />}
          colorScheme="teal"
          onClick={exportModal.onOpen}
          isDisabled={loading || loadingRefresh}
        >
          Exportar
        </Button>

        <Button
          size="sm"
          leftIcon={<FaSync />}
          variant="ghost"
          onClick={refrescarCompras}
          isLoading={loadingRefresh}
        >
          Refrescar
        </Button>
      </HStack>
    </Flex>

    {/* Mini KPIs */}
    <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} mb={5}>
      <GridItem>
        <Box p={4} bg={cardBg} border="1px solid" borderColor={border} borderRadius="md">
          <Stat>
            <StatLabel color={subtle}>Proveedores</StatLabel>
            <StatNumber color={accent}>{proveedores.length}</StatNumber>
            <StatHelpText>
              <Icon as={FaUserTie} mr={2} color="teal.500" />
              Registrados
            </StatHelpText>
          </Stat>
        </Box>
      </GridItem>

      <GridItem>
        <Box p={4} bg={cardBg} border="1px solid" borderColor={border} borderRadius="md">
          <Stat>
            <StatLabel color={subtle}>Órdenes</StatLabel>
            <StatNumber color={accent}>{ordenesRecientes.length}</StatNumber>
            <StatHelpText>
              <Icon as={FaListUl} mr={2} color="teal.500" />
              En el sistema
            </StatHelpText>
          </Stat>
        </Box>
      </GridItem>

      <GridItem>
        <Box p={4} bg={cardBg} border="1px solid" borderColor={border} borderRadius="md">
          <Stat>
            <StatLabel color={subtle}>Total general (todas las órdenes)</StatLabel>
            <StatNumber color={accent}>L. {totalGeneral.toFixed(2)}</StatNumber>
            <StatHelpText>
              <Icon as={FaBox} mr={2} color="teal.500" />
              Sumatoria completa
            </StatHelpText>
          </Stat>
        </Box>
      </GridItem>
    </Grid>

    {/* =========================================================
              SECCIÓN 1: PROVEEDOR + ORDEN
        ========================================================= */}
    <Grid templateColumns={{ base: "1fr", lg: "1.1fr 1fr" }} gap={5}>

      {/* ---------------------------------
          PROVEEDOR
      ----------------------------------- */}
      <GridItem>
        <Box p={4} mb={4} bg={cardBg} border="1px solid" borderColor={border} borderRadius="md">
          <Flex justify="space-between" align="center" mb={3}>
            <Heading size="md" color={accent}>Proveedor</Heading>

            <Button
              size="sm"
              colorScheme="teal"
              variant="solid"
              leftIcon={<FaPlus />}
              onClick={() => {
                setTieneCambios(true);
                abrirModalProveedor();
              }}
              isDisabled={loading || loadingRefresh}
            >
              Nuevo Proveedor
            </Button>
          </Flex>

          <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={3}>
            <GridItem>
              <FormControl>
                <FormLabel fontSize="sm">Seleccionar proveedor</FormLabel>
                <CSelect
                  size="sm"
                  bg="white"
                  value={idProveedorSel}
                  onChange={(e) => {
                    setTieneCambios(true);
                    const id = e.target.value;
                    nuevaOrden();
                    setIdProveedorSel(id);
                    setOrden((o) => ({ ...o, id_proveedor: id }));
                    setDetalles([]);
                  }}
                >
                  <option value="">— Seleccione —</option>
                  {proveedores.map((p) => (
                    <option key={p.id_proveedor} value={p.id_proveedor}>
                      {p.nombre} {p.rtn ? ` | ${p.rtn}` : ""}
                    </option>
                  ))}
                </CSelect>

                <HStack mt={2} spacing={2}>
                  <Button
                    size="sm"
                    leftIcon={<FaEdit />}
                    colorScheme="teal"
                    variant="ghost"
                    isDisabled={!idProveedorSel || loading || loadingRefresh}
                    onClick={() => {
                      setTieneCambios(true);
                      const prov = proveedores.find(
                        (p) => Number(p.id_proveedor) === Number(idProveedorSel)
                      );
                      setProveedorEdit(prov);
                      setModalEditarProv(true);
                    }}
                  >
                    Editar proveedor
                  </Button>

                  <Button
                    size="sm"
                    leftIcon={<FaTrash />}
                    colorScheme="red"
                    variant="ghost"
                    isDisabled={!idProveedorSel || loading || loadingRefresh}
                    onClick={() => {
                      setTieneCambios(true);
                      setProveedorAEliminar(idProveedorSel);
                      setModalEliminarProv(true);
                    }}
                  >
                    Eliminar
                  </Button>
                </HStack>
              </FormControl>
            </GridItem>

            <GridItem display="flex" alignItems="flex-end">
              <Badge colorScheme="teal" variant="subtle" p={2} borderRadius="md">
                {idProveedorSel
                  ? proveedores.find(
                      (p) => Number(p.id_proveedor) === Number(idProveedorSel)
                    )?.nombre
                  : "Ninguno seleccionado"}
              </Badge>
            </GridItem>
          </Grid>
        </Box>

        {/* ---------------------------------
            ORDEN DE COMPRA
        ----------------------------------- */}
        <Box p={4} bg={cardBg} border="1px solid" borderColor={border} borderRadius="md">
          <Flex justify="space-between" align="center" mb={3}>
            <Heading size="md" color={accent}>
              {orden.id_orden_compra
                ? `Orden OC-${orden.id_orden_compra}`
                : "Crear Orden de Compra"}
            </Heading>

            <Button
              size="sm"
              leftIcon={<FaPlus />}
              variant="outline"
              onClick={() => {
                
                nuevaOrden(true);
              }}
              isDisabled={loading || loadingRefresh}
            >
              Nueva
            </Button>
          </Flex>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
            {/* Estado */}
            <FormControl>
              <FormLabel fontSize="sm">Estado</FormLabel>
              <CSelect
                size="sm"
                bg="white"
                value={orden.id_estado_orden_compra}
                onChange={(e) => {
                  setTieneCambios(true);
                  setOrden((o) => ({
                    ...o,
                    id_estado_orden_compra: e.target.value,
                  }));
                }}
              >
                <option value="">— Seleccione —</option>
                {estadosOC.map((e) => (
                  <option key={e.id_estado_orden_compra} value={e.id_estado_orden_compra}>
                    {e.nombre_estado}
                  </option>
                ))}
              </CSelect>
            </FormControl>

            {/* Factura proveedor */}
            <FormControl>
  <FormLabel fontSize="sm">Factura Proveedor (opcional)</FormLabel>
  <Input
  size="sm"
  placeholder="Ingrese número de factura"
  value={orden.factura_proveedor || ""}
  onChange={(e) => {
    setTieneCambios(true);
    setOrden((o) => ({
      ...o,
      factura_proveedor: e.target.value,
      }));
    }}
  />
</FormControl>

            {/* Observación */}
            <FormControl gridColumn={{ base: "auto", md: "1 / span 2" }}>
              <FormLabel fontSize="sm">Observación</FormLabel>
              <Textarea
  size="sm"
  placeholder="Ingrese observación de la orden de compra"
  value={orden.observacion || ""}
  onChange={(e) => {
    setTieneCambios(true);
    setOrden((o) => ({ ...o, observacion: e.target.value }));
                }}
              />
            </FormControl>
          </Grid>
        </Box>
      </GridItem>

      {/* ===========================================
            ÓRDENES RECIENTES
      ============================================ */}
      <GridItem>
        <Box p={4} bg={cardBg} border="1px solid" borderColor={border} borderRadius="md">
          <Flex justify="space-between" align="center" mb={2}>
            <Heading size="md" color={accent}>Órdenes recientes</Heading>
            <Text fontSize="sm" color={subtle}>Selecciona una para editar/ver detalles</Text>
          </Flex>

          <Divider mb={3} />

          <VStack align="stretch" spacing={2}>
            {ordenesRecientes.map((o) => (
              <Flex
                key={o.id_orden_compra}
                p={2}
                bg="teal.50"
                border="1px solid"
                borderColor="teal.100"
                borderRadius="md"
                justify="space-between"
                align="center"
              >
                <HStack spacing={4}>
                  <Badge colorScheme="teal">OC-{o.id_orden_compra}</Badge>
                  <Text fontSize="sm">{o.nombre_proveedor}</Text>
                  <Badge>{o.nombre_estado}</Badge>
                  <Text fontSize="sm">
                    {o.fecha_orden ? o.fecha_orden.slice(0, 10) : ""}
                  </Text>
                </HStack>

                <HStack>
                  <Button
                    size="xs"
                    leftIcon={<FaFolderOpen />}
                    colorScheme="teal"
                    variant="ghost"
                    onClick={() => {
                     
                      abrirOrden(o.id_orden_compra);
                    }}
                  >
                    Abrir
                  </Button>

                 <Button
  size="xs"
  leftIcon={<FaTrash />}
  colorScheme="red"
  variant="ghost"
  onClick={() => {
    setOrdenAEliminar(o.id_orden_compra);
    setModalEliminar(true);
  }}
>
  Borrar
</Button>

                </HStack>
              </Flex>
            ))}

            {!ordenesRecientes.length && (
              <Text fontSize="sm" color={subtle}>
                No hay órdenes aún.
              </Text>
            )}
          </VStack>
        </Box>
      </GridItem>
    </Grid>

    {/* =============================
         DETALLES DE ORDEN
       ============================= */}
    <Box mt={5} p={4} bg={cardBg} border="1px solid" borderColor={border} borderRadius="md">
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="md" color={accent}>Detalles de la Orden</Heading>

        <Button
          size="sm"
          leftIcon={<FaSave />}
          colorScheme="teal"
          onClick={guardarOrdenCompleta}
          isLoading={loading}
        >
          Guardar Orden
        </Button>
      </Flex>

      {/* ==================================
           FORMULARIO DE DETALLES
         ================================== */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(8,1fr)" }} gap={3} mb={3}>
        
        {/* Insumo */}
        <FormControl>
          <FormLabel fontSize="sm">Insumo</FormLabel>
          <CSelect
            size="sm"
            bg="white"
            value={detalleForm.id_insumo}
            onChange={(e) => {
              setTieneCambios(true);
              const id = e.target.value;
              const ins = insumos.find((i) => Number(i.id_insumo) === Number(id));

              if (ins) {
                const cantidad = Number(detalleForm.cantidad || 0);
                const precio = Number(ins.precio_unitario || 0);
                const descuento = Number(detalleForm.descuento || 0);
                const subtotalCalc = (cantidad * precio) - descuento;

                setDetalleForm((prev) => ({
                  ...prev,
                  id_insumo: id,
                  nombre_insumo: ins.nombre_insumo,
                  unidad_medida: ins.unidad_medida,
                  precio_unitario: precio,
                  subtotal: subtotalCalc > 0 ? subtotalCalc : 0,
                }));
              } else {
                setDetalleForm((prev) => ({
                  ...prev,
                  id_insumo: id,
                  nombre_insumo: "",
                  unidad_medida: "",
                  precio_unitario: "",
                  subtotal: 0,
                }));
              }
            }}
          >
            <option value="">— Seleccione —</option>
            {insumos.map((i) => (
              <option key={i.id_insumo} value={i.id_insumo}>
                {`${i.nombre_insumo} — ${i.unidad_medida} — L. ${parseFloat(i.precio_unitario).toFixed(2)}`}
              </option>
            ))}
          </CSelect>
        </FormControl>

        {/* Cantidad */}
        <FormControl>
          <FormLabel fontSize="sm">Cantidad</FormLabel>
          <Input
            size="sm"
            type="number"
            value={detalleForm.cantidad}
            onChange={(e) => {
              setTieneCambios(true);
              setDetalleForm({ ...detalleForm, cantidad: e.target.value });
            }}
          />
        </FormControl>

        {/* Precio */}
        <FormControl>
          <FormLabel fontSize="sm">Precio Unitario</FormLabel>
          <Input
            size="sm"
            type="number"
            value={detalleForm.precio_unitario}
            onChange={(e) => {
              setTieneCambios(true);
              setDetalleForm({ ...detalleForm, precio_unitario: e.target.value });
            }}
          />
        </FormControl>

        {/* Descuento */}
        <FormControl>
          <FormLabel fontSize="sm">Descuento</FormLabel>
          <Input
            size="sm"
            type="number"
            value={detalleForm.descuento}
            onChange={(e) => {
              setTieneCambios(true);
              setDetalleForm({ ...detalleForm, descuento: e.target.value });
            }}
          />
        </FormControl>

        {/* Unidad */}
        <FormControl>
          <FormLabel fontSize="sm">Unidad</FormLabel>
          <CSelect
            size="sm"
            bg="white"
            value={detalleForm.unidad_medida}
            onChange={(e) => {
              setTieneCambios(true);
              setDetalleForm({ ...detalleForm, unidad_medida: e.target.value });
            }}
          >
            <option value="">— Seleccione —</option>
            <option value="unidad">Unidad</option>
            <option value="caja">Caja</option>
            <option value="litro">Litro</option>
            <option value="galon">Galón</option>
            <option value="fardo">Fardo</option>
          </CSelect>
        </FormControl>

        {/* Impuesto */}
        <FormControl>
          <FormLabel fontSize="sm">Categoría Impuesto</FormLabel>
          <CSelect
            size="sm"
            bg="white"
            value={detalleForm.categoria_impuesto}
            onChange={(e) => {
              setTieneCambios(true);
              setDetalleForm({
                ...detalleForm,
                categoria_impuesto: e.target.value,
                tasa_impuesto: e.target.value === "Gravado 15%" ? 15 : 0,
              });
            }}
          >
            <option value="Gravado 15%">Gravado 15%</option>
            <option value="Exento">Exento</option>
            <option value="Exonerado">Exonerado</option>
          </CSelect>
        </FormControl>

        {/* Subtotal */}
        <FormControl>
          <FormLabel fontSize="sm">Subtotal</FormLabel>
          <Input size="sm" value={detalleForm.subtotal.toFixed(2)} isReadOnly />
        </FormControl>

        {/* Botón agregar */}
        <Flex align="flex-end">
          {editandoDetalleId ? (
            <Button
              size="sm"
              colorScheme="teal"
              leftIcon={<FaSave />}
              onClick={() => {
                setTieneCambios(true);
                confirmarEdicionDetalle();
              }}
            >
              Actualizar
            </Button>
          ) : (
            <Button
              size="sm"
              colorScheme="teal"
              leftIcon={<FaPlus />}
              onClick={() => {
                setTieneCambios(true);
                agregarDetalle();
              }}
            >
              Agregar
            </Button>
          )}
        </Flex>

      </Grid>

      {/* ======================
           TABLA DE DETALLES
        ====================== */}
      <Table size="sm" variant="simple">
        <Thead bg="teal.100">
          <Tr>
            <Th textAlign="center">Insumo</Th>
            <Th textAlign="center">Cantidad</Th>
            <Th textAlign="center">Unidad</Th>
            <Th textAlign="center">Precio Unitario</Th>
            <Th textAlign="center">Descuento</Th>
            <Th textAlign="center">Subtotal</Th>
            <Th textAlign="center">Total</Th>
            <Th textAlign="center">Acciones</Th>
          </Tr>
        </Thead>

        <Tbody>
          {detallesVisibles.map((d) => (
            <Tr key={d.id_detalle_oc}>
              <Td textAlign="center">{d.nombre_insumo}</Td>
              <Td textAlign="center">{Number(d.cantidad)}</Td>
              <Td textAlign="center">{d.unidad_medida}</Td>
              <Td textAlign="center">L. {Number(d.precio_unitario).toFixed(2)}</Td>
              <Td textAlign="center">L. {Number(d.descuento).toFixed(2)}</Td>
              <Td textAlign="center">L. {Number(d.subtotal).toFixed(2)}</Td>
              <Td textAlign="center">
                L. {(
                  Number(d.subtotal) *
                  (1 + Number(d.tasa_impuesto || 0) / 100)
                ).toFixed(2)}
              </Td>

              <Td textAlign="center">
                <HStack spacing={2} justify="center">
                  <Button
                    size="xs"
                    colorScheme="teal"
                    leftIcon={<FaEdit />}
                    onClick={() => {
                      setTieneCambios(true);
                      cargarDetalleParaEditar(d);
                    }}
                  >
                    Editar
                  </Button>

                  <Button
                    size="xs"
                    colorScheme="red"
                    leftIcon={<FaTrash />}
                    onClick={() => {
                      setTieneCambios(true);
                      eliminarDetalleLocal(d);
                    }}
                  >
                    Eliminar
                  </Button>
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>

    {/* =======================
        FLETE
    ======================== */}
    <Box mt={4} maxW="200px">
      <FormLabel fontSize="sm">Flete</FormLabel>
      <Input
        size="sm"
        type="number"
        value={flete}
        onChange={(e) => {
          setTieneCambios(true);
          setFlete(Number(e.target.value) || 0);
        }}
      />
    </Box>

    {/* =============================
          RESUMEN DE FACTURA
    ============================= */}
    <Box
      mt={6}
      p={4}
      bg="gray.50"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
    >
      <Heading size="md" mb={4} color={accent} display="flex" alignItems="center" gap={2}>
        <Icon as={FaReceipt} /> Resumen de Factura
      </Heading>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} fontSize="sm">
        <VStack align="stretch" spacing={2}>
          <Flex justify="space-between">
            <Text fontWeight="medium">Subtotal:</Text>
            <Text>L. {totales.subtotal.toFixed(2)}</Text>
          </Flex>

          <Flex justify="space-between">
            <Text fontWeight="medium">Descuentos y Rebajas:</Text>
            <Text>L. {totales.descuentos.toFixed(2)}</Text>
          </Flex>

          <Flex justify="space-between">
            <Text fontWeight="medium">Flete:</Text>
            <Text>L. {totales.flete.toFixed(2)}</Text>
          </Flex>

          <Flex justify="space-between">
            <Text fontWeight="medium">Importe Exento:</Text>
            <Text>L. {totales.importeExento.toFixed(2)}</Text>
          </Flex>
        </VStack>

        <VStack align="stretch" spacing={2}>
          <Flex justify="space-between">
            <Text fontWeight="medium">Importe Gravado 15%:</Text>
            <Text>L. {totales.importeGravado15.toFixed(2)}</Text>
          </Flex>

          <Flex justify="space-between">
            <Text fontWeight="medium">Importe Exonerado:</Text>
            <Text>L. {totales.importeExonerado.toFixed(2)}</Text>
          </Flex>

          <Flex justify="space-between">
            <Text fontWeight="medium">Impuesto 15%:</Text>
            <Text>L. {totales.impuesto15.toFixed(2)}</Text>
          </Flex>

          <Divider />

          <Flex justify="space-between">
            <Text fontWeight="bold" fontSize="lg">TOTAL:</Text>
            <Text fontWeight="bold" fontSize="lg" color={accent}>
              L. {totales.total.toFixed(2)}
            </Text>
          </Flex>
        </VStack>
      </Grid>
    </Box>

    {/* =============================
          MODALES
    ============================= */}

{/* ============================
   MODAL NUEVO PROVEEDOR
============================ */}
<Modal isOpen={modalProv} onClose={() => setModalProv(false)} isCentered>
  <ModalOverlay />
  <ModalContent>
    <ModalHeader>Nuevo Proveedor</ModalHeader>
    <ModalCloseButton />
    <ModalBody pb={4}>

      {/* Nombre */}
      <FormControl mb={3}>
        <FormLabel>Nombre</FormLabel>
        <Input
          placeholder="Ingrese nombre del proveedor solo letras"
          value={provForm.nombre}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== "" && !soloLetras(v)) return;
            setProvForm({ ...provForm, nombre: v });
          }}
        />
      </FormControl>

      {/* RTN */}
      <FormControl mb={3}>
        <FormLabel>RTN</FormLabel>
        <Input
          placeholder="ID 13 Digitos/ RTN 14 Digitos"
          maxLength={14}
          value={provForm.rtn}
          onChange={(e) => {
            setProvForm({
              ...provForm,
              rtn: e.target.value.replace(/\D/g, "")
            });
          }}
        />
      </FormControl>

      {/* Teléfono */}
      <FormControl mb={3}>
        <FormLabel>Teléfono</FormLabel>
        <Input
          placeholder="9999-9999"
          maxLength={9}
          value={provForm.telefono}
          onChange={(e) =>
            setProvForm({
              ...provForm,
              telefono: formatearTelefono(e.target.value)
            })
          }
        />
      </FormControl>

      {/* Correo */}
      <FormControl mb={3}>
        <FormLabel>Correo</FormLabel>
        <Input
          placeholder="correo@dominio.com"
          value={provForm.correo}
          onChange={(e) => {
            setProvForm({ ...provForm, correo: e.target.value });
          }}
        />
      </FormControl>

      {/* Dirección */}
      <FormControl mb={3}>
        <FormLabel>Dirección</FormLabel>
        <Textarea
          placeholder="Ingrese dirección completa"
          value={provForm.direccion}
          onChange={(e) => {
            setProvForm({ ...provForm, direccion: e.target.value });
          }}
        />
      </FormControl>

    </ModalBody>

    <ModalFooter>
      <Button colorScheme="teal" mr={3} onClick={guardarProveedor}>
        Guardar
      </Button>
      <Button onClick={() => setModalProv(false)}>Cancelar</Button>
    </ModalFooter>
  </ModalContent>
</Modal>
{/* ============================
   MODAL EDITAR PROVEEDOR
============================ */}
<Modal isOpen={modalEditarProv} onClose={() => setModalEditarProv(false)} isCentered>
  <ModalOverlay />
  <ModalContent>
    <ModalHeader>Editar Proveedor</ModalHeader>
    <ModalCloseButton />
    <ModalBody pb={4}>

      {/* Nombre */}
      <FormControl mb={3}>
        <FormLabel>Nombre</FormLabel>
        <Input
          value={proveedorEdit?.nombre || ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== "" && !soloLetras(v)) return;
            setProveedorEdit({ ...proveedorEdit, nombre: v });
          }}
        />
      </FormControl>

      {/* RTN */}
      <FormControl mb={3}>
        <FormLabel>RTN</FormLabel>
        <Input
          value={proveedorEdit?.rtn || ""}
          maxLength={14}
          onChange={(e) => {
            setProveedorEdit({
              ...proveedorEdit,
              rtn: e.target.value.replace(/\D/g, "")
            });
          }}
        />
      </FormControl>

      {/* Teléfono */}
      <FormControl mb={3}>
        <FormLabel>Teléfono</FormLabel>
        <Input
          value={proveedorEdit?.telefono || ""}
          maxLength={9}
          onChange={(e) => {
            setProveedorEdit({
              ...proveedorEdit,
              telefono: formatearTelefono(e.target.value)
            });
          }}
        />
      </FormControl>

      {/* Correo */}
      <FormControl mb={3}>
        <FormLabel>Correo</FormLabel>
        <Input
          value={proveedorEdit?.correo || ""}
          onChange={(e) => {
            setProveedorEdit({ ...proveedorEdit, correo: e.target.value });
          }}
        />
      </FormControl>

      {/* Dirección */}
      <FormControl mb={3}>
        <FormLabel>Dirección</FormLabel>
        <Textarea
          value={proveedorEdit?.direccion || ""}
          onChange={(e) => {
            setProveedorEdit({ ...proveedorEdit, direccion: e.target.value });
          }}
        />
      </FormControl>

    </ModalBody>

    <ModalFooter>
      <Button colorScheme="teal" mr={3} onClick={guardarProveedorEditado}>
        Guardar cambios
      </Button>
      <Button onClick={() => setModalEditarProv(false)}>Cancelar</Button>
    </ModalFooter>
  </ModalContent>
</Modal>

    <Modal isOpen={modalEliminarProv} onClose={() => setModalEliminarProv(false)} isCentered>
  <ModalOverlay />
  <ModalContent>
    <ModalHeader>Eliminar proveedor</ModalHeader>
    <ModalCloseButton />
    <ModalBody>
      ¿Está seguro que desea eliminar este proveedor?
    </ModalBody>
    <ModalFooter>
      <Button colorScheme="red" mr={3} onClick={eliminarProveedor}>
        Eliminar
      </Button>
      <Button onClick={() => setModalEliminarProv(false)}>Cancelar</Button>
    </ModalFooter>
  </ModalContent>
</Modal>
    {/* ... aquí siguen TUS MODALES completos tal como los tenías ...
        No los incluyo para no duplicar 2000 líneas.
    */}

    {/* =============================
      🛑 MODAL DE SALIDA SIN GUARDAR
    ============================= */}
    <Modal isOpen={salirModal.isOpen} onClose={salirModal.onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Salir sin guardar</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          Tienes cambios sin guardar. ¿Deseas salir del módulo de Compras?
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="red"
            mr={3}
            onClick={() => {
              salirModal.onClose();
              setTieneCambios(false);
              handleNavigate(rutaPendiente);
            }}
          >
            Salir sin guardar
          </Button>
          <Button onClick={salirModal.onClose}>Cancelar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

     {/* ============================
   MODAL EXPORTAR REPORTE
============================ */}
<Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered>
  <ModalOverlay />
  <ModalContent>
    <ModalHeader>Exportar Reporte</ModalHeader>
    <ModalCloseButton />
    <ModalBody>
      <FormControl mb={3}>
        <FormLabel>Formato</FormLabel>
        <CSelect
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
        >
          <option value="excel">Excel (.xlsx)</option>
          <option value="pdf">PDF (.pdf)</option>
        </CSelect>
      </FormControl>

      <FormControl>
        <FormLabel>Columnas a exportar</FormLabel>

        <Checkbox
          isChecked={allChecked}
          isIndeterminate={isIndeterminate}
          onChange={(e) =>
            setSelectedColumns(
              e.target.checked ? ALL_COLUMNS.map((c) => c.key) : []
            )
          }
          mb={2}
        >
          Seleccionar todas
        </Checkbox>

        <Box maxH="200px" overflowY="auto" p={2} border="1px solid #ddd" borderRadius="md">
          {ALL_COLUMNS.map((c) => (
            <Checkbox
              key={c.key}
              isChecked={selectedColumns.includes(c.key)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedColumns([...selectedColumns, c.key]);
                } else {
                  setSelectedColumns(selectedColumns.filter((x) => x !== c.key));
                }
              }}
              display="block"
              mb={1}
            >
              {c.label}
            </Checkbox>
          ))}
        </Box>
      </FormControl>
    </ModalBody>

    <ModalFooter>
      <Button
        colorScheme="teal"
        onClick={exportarReporte}
        isLoading={loading}
      >
        Exportar
      </Button>
      <Button ml={3} onClick={exportModal.onClose}>
        Cancelar
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>
<Modal isOpen={modalEliminar} onClose={() => setModalEliminar(false)} isCentered>
  <ModalOverlay />
  <ModalContent>
    <ModalHeader>Eliminar orden</ModalHeader>
    <ModalCloseButton />
    <ModalBody>
      ¿Está seguro de eliminar esta orden de compra?
    </ModalBody>
    <ModalFooter>
      <Button
        colorScheme="red"
        onClick={() => {
          eliminarOrden(ordenAEliminar);
          setModalEliminar(false);
        }}
      >
        Eliminar
      </Button>
      <Button onClick={() => setModalEliminar(false)}>Cancelar</Button>
    </ModalFooter>
  </ModalContent>
</Modal>

  </Box>
);
}