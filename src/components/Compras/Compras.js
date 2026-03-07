// ============================================================
// 📁 src/components/Compras/Compras.js
// ✅ Gestor unificado con totales idénticos a factura TAPLAX
//    (sin base imponible, sin impuesto_renglon por línea)
//    Mantiene proveedores y ordenes INTactos
// ✅ FIX: Unidad de medida normalizada + validación estricta
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
    FormHelperText,
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
    validarRequerido,
    validarSoloLetras,
    validarRTN,
    validarTelefono,
    validarEmail,
    formatearTelefono
} from "../../utils/validaciones";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "../../api/apiClient";
import logoSrc from "../login/log.png";



// =======================
// 🔥 Normaliza unidad para que coincida con <Select> (unidad/caja/litro/galon/fardo)
// Ej: "Unidad" -> "unidad", "Galón" -> "galon", "  LITRO " -> "litro"
// =======================
const normalizarUnidad = (u = "") =>
    u
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");


const safeNum = (v) => {
    if (v === null || v === undefined) return 0;

    if (typeof v === "string") {
        const cleaned = v
            .replace(/L/gi, "")
            .replace(/\s+/g, "")
            .replace(/,/g, "");

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
    const subtotal = detalles.reduce((acc, d) => acc + safeNum(d.subtotal), 0);

    const descuentos = detalles.reduce((acc, d) => acc + safeNum(d.descuento), 0);

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

const formatearFecha = (fecha) => {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleDateString("es-HN");
};

const formatearHora = (fecha = new Date()) => {
    return new Date(fecha).toLocaleTimeString("es-HN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

const formatearFechaHora = (fecha = new Date()) => {
    return new Date(fecha).toLocaleString("es-HN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

const formatearMoneda = (valor) => {
    return Number(valor || 0).toLocaleString("es-HN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
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
    const [fechaInicioFiltroOrden, setFechaInicioFiltroOrden] = useState("");
const [fechaFinFiltroOrden, setFechaFinFiltroOrden] = useState("");
    const [ordenesSeleccionadas, setOrdenesSeleccionadas] = useState([]);

   

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
const proveedoresModal = useDisclosure();
const [proveedorExportFormat, setProveedorExportFormat] = useState("excel");
const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState([]);

const PROVEEDOR_COLUMNS = useMemo(
    () => [
        { key: "id_proveedor", label: "ID Proveedor" },
        { key: "nombre", label: "Nombre" },
        { key: "rtn", label: "RTN / ID" },
        { key: "telefono", label: "Teléfono" },
        { key: "correo", label: "Correo" },
        { key: "direccion", label: "Dirección" },
        { key: "estado", label: "Estado" },
    ],
    []
);

const [selectedProveedorColumns, setSelectedProveedorColumns] = useState(
    PROVEEDOR_COLUMNS.map((c) => c.key)
);

const allProveedorChecked =
    selectedProveedorColumns.length === PROVEEDOR_COLUMNS.length;

const isProveedorIndeterminate =
    selectedProveedorColumns.length > 0 &&
    selectedProveedorColumns.length < PROVEEDOR_COLUMNS.length;

    const [provForm, setProvForm] = useState({
        nombre: "",
        rtn: "",
        telefono: "",
        correo: "",
        direccion: "",
        id_estado_proveedor: 1,
    });
    const [provMsg, setProvMsg] = useState({
        nombre: "",
        rtn: "",
        telefono: "",
        correo: "",
        direccion: "",
    });

    // =======================
    // Detalle (frontend con NOMBRES de factura)
    // =======================
    const [detalleForm, setDetalleForm] = useState({
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

            // Detalle
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
                    const det = await api.get(
                        `/compras/detalle-orden-compra/orden/${oc.id_orden_compra}`
                    );
                    const detalles = det.data || [];

                    const detallesAdaptados = detalles.map((d) => ({
                        cantidad: Number(d.cantidad || 0),
                        precio_unitario: Number(d.precio_unitario || 0),
                        descuento: Number(d.descuento || 0),
                        subtotal:
                            Number(d.cantidad || 0) * Number(d.precio_unitario || 0) -
                            Number(d.descuento || 0),
                        categoria_impuesto: d.categoria_impuesto || "Gravado 15%",
                        tasa_impuesto: Number(d.tasa_impuesto || 15),
                    }));

                    const tot = calcTotalesFactura(
                        detallesAdaptados,
                        Number(oc.flete || 0)
                    );
                    totalAll += tot.total;
                } catch (e) {
                    console.error("Error al calcular total de OC:", oc.id_orden_compra, e);
                }
            }

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
    // Nueva Orden
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
    // Abrir Orden
    // =======================
    const abrirOrden = async (ocId, opts = { silent: false }) => {
        if (!opts?.silent) setLoading(true);
        try {
            const [oc, det] = await Promise.all([
                api.get(`/compras/orden-compra/${ocId}`),
                api.get(`/compras/detalle-orden-compra/orden/${ocId}`),
            ]);

            const O = oc.data;

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
                        subtotal: cant * precio - desc,
                        unidad_medida: normalizarUnidad(d.unidad_medida || ""),
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

        // 🔥 limpiar mensajes de error
        setProvMsg({
            nombre: "",
            rtn: "",
            telefono: "",
            correo: "",
            direccion: "",
        });

        setModalProv(true);
    };

    const guardarProveedor = async () => {
     // 1) Nombre

// 🔹 Validar máximo 100 caracteres
if (provForm.nombre && provForm.nombre.length > 100) {
    return toast({
        title: "Nombre demasiado largo",
        description: "El nombre del proveedor no puede exceder los 100 caracteres.",
        status: "warning",
    });
}

const errNombre = validarSoloLetras(provForm.nombre, "Nombre del proveedor", true);
if (errNombre) {
    return toast({
        title: "Nombre inválido",
        description: errNombre, // 👈 mensaje específico
        status: errNombre.includes("obligatorio") ? "warning" : "error",
    });
}

        // 2) RTN / ID (13 o 14 dígitos)
        const errRTN = validarRTN(provForm.rtn, true);
        if (errRTN) {
            return toast({
                title: "RTN / ID inválido",
                description: errRTN, // 👈 "no letras" / "no especiales" / "13 o 14"
                status: errRTN.includes("obligatorio") ? "warning" : "error",
            });
        }

        // 3) Teléfono
        const errTel = validarTelefono(provForm.telefono, true);
        if (errTel) {
            return toast({
                title: "Teléfono inválido",
                description: errTel, // 👈 específico
                status: errTel.includes("obligatorio") ? "warning" : "error",
            });
        }

        // 4) Correo
        const errCorreo = validarEmail(provForm.correo, true);
        if (errCorreo) {
            return toast({
                title: "Correo inválido",
                description: errCorreo,
                status: errCorreo.includes("obligatorio") ? "warning" : "error",
            });
        }

        // 5) Dirección (si la quiere obligatoria)
        const errDir = validarRequerido(provForm.direccion, "Dirección");
        if (errDir) {
            return toast({
                title: "Dirección requerida",
                description: errDir,
                status: "warning",
            });
        }

        // 6) Estado
        const errEstado = validarRequerido(provForm.id_estado_proveedor, "Estado del proveedor");
        if (errEstado) {
            return toast({
                title: "Estado requerido",
                description: errEstado,
                status: "warning",
            });
        }

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

        // 1) Nombre
        const errNombre = validarSoloLetras(proveedorEdit.nombre, "Nombre del proveedor", true);
        if (errNombre) {
            return toast({
                title: "Nombre inválido",
                description: errNombre,
                status: errNombre.includes("obligatorio") ? "warning" : "error",
            });
        }

        // 2) RTN / ID
        const errRTN = validarRTN(proveedorEdit.rtn, true);
        if (errRTN) {
            return toast({
                title: "RTN / ID inválido",
                description: errRTN,
                status: errRTN.includes("obligatorio") ? "warning" : "error",
            });
        }

        // 3) Teléfono
        const errTel = validarTelefono(proveedorEdit.telefono, true);
        if (errTel) {
            return toast({
                title: "Teléfono inválido",
                description: errTel,
                status: errTel.includes("obligatorio") ? "warning" : "error",
            });
        }

        // 4) Correo
        const errCorreo = validarEmail(proveedorEdit.correo, true);
        if (errCorreo) {
            return toast({
                title: "Correo inválido",
                description: errCorreo,
                status: errCorreo.includes("obligatorio") ? "warning" : "error",
            });
        }

        // 5) Estado (si en editar también aplica)
        const errEstado = validarRequerido(proveedorEdit.id_estado_proveedor, "Estado del proveedor");
        if (errEstado) {
            return toast({
                title: "Estado requerido",
                description: errEstado,
                status: "warning",
            });
        }

        try {
            setLoading(true);
            await api.put(`/compras/proveedores/${proveedorEdit.id_proveedor}`, proveedorEdit);

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
    // Orden - Guardar / Actualizar
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





        setLoading(true);
        try {
            let idOC = orden.id_orden_compra;

            if (!idOC) {
                const res = await api.post("/compras/orden-compra", {
                    id_proveedor: Number(idProveedorSel),
                    id_estado_orden_compra: Number(orden.id_estado_orden_compra),
                    observacion: orden.observacion || null,
                    factura_proveedor: orden.factura_proveedor || null,
                    flete: Number(flete),
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
                    flete: Number(flete),
                });
            }

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
                    unidad_medida: normalizarUnidad(d.unidad_medida || ""),
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
    // Detalles - agregar / editar / eliminar
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
        if (
            !detalleForm.id_insumo ||
            detalleForm.cantidad === "" ||
            detalleForm.precio_unitario === ""
        ) {
            toast({ title: "Completa insumo, cantidad y precio", status: "warning" });
            return;
        }

        const toNum = (val) => (isNaN(Number(val)) ? 0 : Number(val));
        const ins = insumos.find(
            (i) => Number(i.id_insumo) === Number(detalleForm.id_insumo)
        );

        const um = normalizarUnidad(ins?.unidad_medida || "");
        if (!um) {
            toast({
                title: "Unidad no definida",
                description: "Este insumo no tiene unidad de medida registrada en Insumos.",
                status: "warning",
            });
            return;
        }

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
            unidad_medida: um,
            categoria_impuesto: detalleForm.categoria_impuesto || "Gravado 15%",
            tasa_impuesto: toNum(detalleForm.tasa_impuesto ?? 15),
        };

        setDetalles((arr) => [...arr, nuevo]);
        limpiarDetalleForm();
    };

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
            unidad_medida: normalizarUnidad(row.unidad_medida || ""),
            categoria_impuesto: row.categoria_impuesto,
            tasa_impuesto: toNum(row.tasa_impuesto),
            subtotal: subtotalCalc,
        });
    };

    // ============================================================
    // 🔹 Confirmar edición del detalle
    // ============================================================
    const confirmarEdicionDetalle = () => {
        if (
            !detalleForm.id_insumo ||
            detalleForm.cantidad === "" ||
            detalleForm.precio_unitario === ""
        ) {
            toast({ title: "Completa insumo, cantidad y precio", status: "warning" });
            return;
        }


        const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
        const ins = insumos.find(
            (i) => Number(i.id_insumo) === Number(detalleForm.id_insumo)
        );

        // ✅ Unidad SIEMPRE viene del Insumo seleccionado (no del formulario)
        const um = normalizarUnidad(ins?.unidad_medida || "");
        if (!um) {
            toast({
                title: "Unidad no definida",
                description: "Este insumo no tiene unidad de medida registrada en Insumos.",
                status: "warning",
            });
            return;
        }

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
                        unidad_medida: um,
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
    const handleNavigate = (path) => {
        if (tieneCambios) {
            setRutaPendiente(path);
            salirModal.onOpen();
        } else {
            navigate(path);
        }
    };

    const detallesVisibles = detalles.filter((d) => !d._delete);
    const totales = calcTotalesFactura(detallesVisibles, flete);

    const ordenesRecientesFiltradas = useMemo(() => {
    return ordenesRecientes.filter((o) => {
        const fecha = o.fecha_orden ? o.fecha_orden.slice(0, 10) : "";

        if (!fecha) return false;

        if (fechaInicioFiltroOrden && fecha < fechaInicioFiltroOrden) return false;
        if (fechaFinFiltroOrden && fecha > fechaFinFiltroOrden) return false;

        return true;
    });
}, [ordenesRecientes, fechaInicioFiltroOrden, fechaFinFiltroOrden]);

const rangoFechasTexto = useMemo(() => {
    if (fechaInicioFiltroOrden && fechaFinFiltroOrden) {
        return `${fechaInicioFiltroOrden} a ${fechaFinFiltroOrden}`;
    }
    if (fechaInicioFiltroOrden) {
        return `Desde ${fechaInicioFiltroOrden}`;
    }
    if (fechaFinFiltroOrden) {
        return `Hasta ${fechaFinFiltroOrden}`;
    }
    return "Sin filtro de fechas";
}, [fechaInicioFiltroOrden, fechaFinFiltroOrden]);

const toggleSeleccionOrden = (idOrden) => {
    setOrdenesSeleccionadas((prev) =>
        prev.includes(idOrden)
            ? prev.filter((id) => id !== idOrden)
            : [...prev, idOrden]
    );
};

const toggleSeleccionTodas = () => {
    const idsFiltrados = ordenesRecientesFiltradas.map((o) => o.id_orden_compra);

    const todasSeleccionadas =
        idsFiltrados.length > 0 &&
        idsFiltrados.every((id) => ordenesSeleccionadas.includes(id));

    if (todasSeleccionadas) {
        setOrdenesSeleccionadas((prev) =>
            prev.filter((id) => !idsFiltrados.includes(id))
        );
    } else {
        setOrdenesSeleccionadas((prev) => [
            ...new Set([...prev, ...idsFiltrados]),
        ]);
    }
};

    // =======================
    // Dataset UNIFICADO export (mapear nombres)
    // =======================
    const buildUnifiedRows = async (idsOrdenesSeleccionadas = []) => {
        const [provRes, ocRes, detRes] = await Promise.all([
            api.get("/compras/proveedores"),
            api.get("/compras/orden-compra"),
            api.get("/compras/detalle-orden-compra"),
        ]);

        const provs = provRes.data || [];
let ocs = ocRes.data || [];
let dets = detRes.data || [];

if (idsOrdenesSeleccionadas.length > 0) {
    const idsSet = new Set(idsOrdenesSeleccionadas.map(Number));

    ocs = ocs.filter((o) => idsSet.has(Number(o.id_orden_compra)));
    dets = dets.filter((d) => idsSet.has(Number(d.id_orden_compra)));
}

        const provById = new Map(provs.map((p) => [Number(p.id_proveedor), p]));
        const ocById = new Map(ocs.map((o) => [Number(o.id_orden_compra), o]));

        const rows = [];

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
                id_proveedor: p.id_proveedor ?? oc.id_proveedor ?? "",
                proveedor: p.nombre ?? oc.nombre_proveedor ?? "",
                rtn: p.rtn ?? "",
                telefono: p.telefono ?? "",
                correo: p.correo ?? "",
                direccion: p.direccion ?? "",
                estado_proveedor: p.nombre_estado ?? p.estado ?? "",

                id_orden_compra: oc.id_orden_compra ?? "",
                estado_orden: oc.nombre_estado ?? "",
                fecha_orden: oc.fecha_orden ? oc.fecha_orden.substring(0, 10) : "",
                factura_proveedor: oc.factura_proveedor ?? "",
                observacion: oc.observacion ?? "",
                flete: Number(oc.flete || 0),

                id_detalle_oc: d.id_detalle_oc ?? "",
                id_insumo: d.id_insumo ?? "",
                insumo: d.nombre_insumo ?? "",

                cantidad,
                unidad_medida: normalizarUnidad(d.unidad_medida ?? ""),
                precio_unitario: precio,
                descuento,
                subtotal: subtotalCalc,
                categoria_impuesto: d.categoria_impuesto ?? "",
                tasa_impuesto: tasa,
                total: totalCalc,
            });
        }

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
                    fecha_orden: oc.fecha_orden ? oc.fecha_orden.substring(0, 10) : "",
                    factura_proveedor: oc.factura_proveedor ?? "",
                    observacion: oc.observacion ?? "",
                    flete: Number(oc.flete || 0),

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
    // Exportar
    // =======================

    const buildProveedoresRows = () => {
    if (!proveedores || proveedores.length === 0) return [];

    return [...proveedores]
        .map((p) => ({
            id_proveedor: p.id_proveedor ?? "",
            nombre: p.nombre ?? "",
            rtn: p.rtn ?? "",
            telefono: p.telefono ?? "",
            correo: p.correo ?? "",
            direccion: p.direccion ?? "",
            estado: p.nombre_estado ?? p.estado ?? "",
        }))
        .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
};
const toggleSeleccionProveedor = (idProveedor) => {
    setProveedoresSeleccionados((prev) =>
        prev.includes(idProveedor)
            ? prev.filter((id) => id !== idProveedor)
            : [...prev, idProveedor]
    );
};

const toggleSeleccionTodosProveedores = () => {
    const idsVisibles = proveedores.map((p) => p.id_proveedor);

    const todosSeleccionados =
        idsVisibles.length > 0 &&
        idsVisibles.every((id) => proveedoresSeleccionados.includes(id));

    if (todosSeleccionados) {
        setProveedoresSeleccionados((prev) =>
            prev.filter((id) => !idsVisibles.includes(id))
        );
    } else {
        setProveedoresSeleccionados((prev) => [
            ...new Set([...prev, ...idsVisibles]),
        ]);
    }
};

const buildProveedoresRowsFiltrados = (idsSeleccionados = []) => {
    let rows = buildProveedoresRows();

    if (idsSeleccionados.length > 0) {
        const idsSet = new Set(idsSeleccionados.map(Number));
        rows = rows.filter((r) => idsSet.has(Number(r.id_proveedor)));
    }

    return rows;
};


const exportarProveedores = async () => {
    try {
        if (proveedoresSeleccionados.length === 0) {
            toast({
                title: "Seleccione al menos un proveedor",
                description: "Debe seleccionar uno o varios proveedores para exportar.",
                status: "warning",
            });
            return;
        }

        const rows = buildProveedoresRowsFiltrados(proveedoresSeleccionados);

        if (!rows.length) {
            toast({
                title: "No hay proveedores para exportar",
                status: "warning",
            });
            return;
        }

        const fechaGeneracion = new Date();
        const cols = PROVEEDOR_COLUMNS.filter((c) =>
            selectedProveedorColumns.includes(c.key)
        );

        if (!cols.length) {
            toast({
                title: "Seleccione al menos una columna",
                status: "warning",
            });
            return;
        }

        if (proveedorExportFormat === "excel") {
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet("Proveedores");

            ws.mergeCells("A1:F1");
            ws.getCell("A1").value = "REPORTE DE PROVEEDORES";
            ws.getCell("A1").font = { bold: true, size: 18 };
            ws.getCell("A1").alignment = { horizontal: "center" };

            ws.getCell("A2").value = `Fecha de generación: ${formatearFecha(fechaGeneracion)}`;
            ws.getCell("A3").value = `Hora de generación: ${formatearHora(fechaGeneracion)}`;
            ws.getCell("A4").value = `Proveedores seleccionados: ${proveedoresSeleccionados.length}`;

            ws.addRow([]);
            ws.addRow(cols.map((c) => c.label));

            rows.forEach((r) => {
                ws.addRow(cols.map((c) => r[c.key]));
            });

            const filaEncabezado = 6;
            ws.getRow(filaEncabezado).font = {
                bold: true,
                color: { argb: "FFFFFFFF" },
            };
            ws.getRow(filaEncabezado).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF0F766E" },
            };
            ws.getRow(filaEncabezado).alignment = { horizontal: "center" };

            cols.forEach((c, i) => {
                let max = c.label.length;
                rows.forEach((r) => {
                    const v = r[c.key] == null ? "" : String(r[c.key]);
                    if (v.length > max) max = v.length;
                });
                ws.getColumn(i + 1).width = Math.min(Math.max(15, max + 2), 35);
            });

            const buf = await wb.xlsx.writeBuffer();
            saveAs(new Blob([buf]), "reporte_proveedores.xlsx");

            toast({
                title: "Excel de proveedores exportado",
                status: "success",
            });
        } else {
            const doc = new jsPDF({ unit: "pt", format: "a4" });
            const pageWidth = doc.internal.pageSize.width;

            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, pageWidth, 130, "F");

            try {
                const dataURL = await imgToDataURL(logoSrc);
                doc.addImage(dataURL, "PNG", 40, 28, 45, 45);
            } catch (e) {
                console.warn("⚠️ No se pudo cargar el logo", e);
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(30, 41, 59);
            doc.text("REPORTE DE PROVEEDORES", pageWidth / 2, 45, {
                align: "center",
            });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(90);

            doc.text(`Fecha: ${formatearFecha(fechaGeneracion)}`, 40, 90);
            doc.text(`Hora: ${formatearHora(fechaGeneracion)}`, 40, 105);
            doc.text(
                `Proveedores seleccionados: ${proveedoresSeleccionados.length}`,
                pageWidth - 220,
                90
            );

            doc.setDrawColor(15, 118, 110);
            doc.setLineWidth(1.2);
            doc.line(40, 118, pageWidth - 40, 118);

            autoTable(doc, {
                startY: 135,
                head: [cols.map((c) => c.label)],
                body: rows.map((r) => cols.map((c) => r[c.key] ?? "")),
                styles: {
                    fontSize: 8.5,
                    cellPadding: 5,
                    valign: "middle",
                    textColor: [40, 40, 40],
                    lineColor: [220, 220, 220],
                    lineWidth: 0.4,
                },
                headStyles: {
                    fillColor: [15, 118, 110],
                    textColor: 255,
                    fontStyle: "bold",
                    halign: "center",
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                margin: { left: 40, right: 40 },
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

            doc.save("reporte_proveedores.pdf");

            toast({
                title: "PDF de proveedores exportado",
                status: "success",
            });
        }
    } catch (error) {
        console.error(error);
        toast({
            title: "Error al exportar proveedores",
            description: error.message,
            status: "error",
        });
    }
};

    const exportarReporte = async () => {
        
        
         // 🔴 Validar rango de fechas
    if (
        fechaInicioFiltroOrden &&
        fechaFinFiltroOrden &&
        fechaFinFiltroOrden < fechaInicioFiltroOrden
    ) {
        toast({
            title: "Rango de fechas inválido",
            description: "La fecha final no puede ser menor que la fecha inicial.",
            status: "warning",
        });
        return;
    }

    try {

        if (ordenesSeleccionadas.length === 0) {
            toast({
                title: "Seleccione al menos una orden",
                description: "Debe seleccionar una o varias órdenes para exportar.",
                status: "warning",
            });
            return;
        }

        setLoading(true);

        const rows = await buildUnifiedRows(ordenesSeleccionadas);
            if (!rows.length) {
                toast({ title: "No hay datos para exportar", status: "info" });
                return;
            }

            const cols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key));

        if (exportFormat === "excel") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Reporte");

    // =========================
    // ENCABEZADO
    // =========================
    ws.mergeCells("A1:F1");
    ws.getCell("A1").value = "REPORTE DE COMPRAS DE INSUMOS";
    ws.getCell("A1").font = { bold: true, size: 18 };
    ws.getCell("A1").alignment = { horizontal: "center" };

    ws.getCell("A2").value = `Fecha de generación: ${formatearFecha(new Date())}`;
    ws.getCell("A3").value = `Hora de generación: ${formatearHora(new Date())}`;
    ws.getCell("A4").value =
        `Rango de fechas aplicado: ${
            fechaInicioFiltroOrden || fechaFinFiltroOrden
                ? `${fechaInicioFiltroOrden || "—"} a ${fechaFinFiltroOrden || "—"}`
                : "Sin filtro de fechas"
        }`;
    ws.getCell("A5").value = `Órdenes seleccionadas: ${ordenesSeleccionadas.length}`;

    // =========================
    // TABLA PRINCIPAL
    // =========================
    const filaInicioTabla = 7;

    ws.addRow([]);
    ws.addRow(cols.map((c) => c.label));

    rows.forEach((r) => {
        ws.addRow(cols.map((c) => r[c.key]));
    });

    const filaEncabezado = filaInicioTabla;
    ws.getRow(filaEncabezado).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(filaEncabezado).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0F766E" },
    };
    ws.getRow(filaEncabezado).alignment = { horizontal: "center" };

    // =========================
    // AJUSTAR ANCHOS
    // =========================
    cols.forEach((c, i) => {
        let max = c.label.length;
        rows.forEach((r) => {
            const v = r[c.key] == null ? "" : String(r[c.key]);
            if (v.length > max) max = v.length;
        });
        ws.getColumn(i + 1).width = Math.min(Math.max(15, max + 2), 35);
    });

    // =========================
    // CALCULAR TOTALES REALES
    // =========================
    let subtotalExcel = 0;
    let descuentosExcel = 0;
    let exentoExcel = 0;
    let exoneradoExcel = 0;
    let gravado15Excel = 0;
    let fleteExcel = 0;

    rows.forEach((r) => {
        const sub = Number(r.subtotal || 0);
        const desc = Number(r.descuento || 0);
        const cat = (r.categoria_impuesto || "").toLowerCase();

        subtotalExcel += sub + desc;
        descuentosExcel += desc;

        if (cat.includes("exento")) exentoExcel += sub;
        else if (cat.includes("exonerado")) exoneradoExcel += sub;
        else gravado15Excel += sub;
    });

    // sumar flete solo una vez por orden
    const ordenesYaSumadas = new Set();
    rows.forEach((r) => {
        const id = Number(r.id_orden_compra || 0);
        if (id && !ordenesYaSumadas.has(id)) {
            fleteExcel += Number(r.flete || 0);
            ordenesYaSumadas.add(id);
        }
    });

    const impuestoExcel = gravado15Excel * 0.15;
    const totalGeneralExcel =
        exentoExcel +
        exoneradoExcel +
        gravado15Excel +
        impuestoExcel +
        fleteExcel;

    // =========================
    // RESUMEN DE TOTALES
    // =========================
    const filaResumen = ws.rowCount + 3;

    ws.getCell(`A${filaResumen}`).value = "RESUMEN DE TOTALES";
    ws.getCell(`A${filaResumen}`).font = { bold: true, size: 14 };

    const resumen = [
        ["Subtotal", subtotalExcel],
        ["Descuentos", descuentosExcel],
        ["Flete", fleteExcel],
        ["Importe Exento", exentoExcel],
        ["Importe Exonerado", exoneradoExcel],
        ["Importe Gravado 15%", gravado15Excel],
        ["Impuesto 15%", impuestoExcel],
        ["TOTAL GENERAL", totalGeneralExcel],
    ];

    resumen.forEach(([label, value], index) => {
        const fila = filaResumen + 1 + index;
        ws.getCell(`A${fila}`).value = label;
        ws.getCell(`B${fila}`).value = Number(value || 0);
        ws.getCell(`B${fila}`).numFmt = '#,##0.00';

        if (label === "TOTAL GENERAL") {
            ws.getCell(`A${fila}`).font = { bold: true };
            ws.getCell(`B${fila}`).font = { bold: true };
        }
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), "reporte_compras_unificado.xlsx");
    toast({ title: "Excel exportado", status: "success" });


            } else {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.width;
    const fechaGeneracion = new Date();

    const formattedRows = rows.map((r) => ({
        ...r,
        precio_unitario: formatearMoneda(r.precio_unitario),
        subtotal: formatearMoneda(r.subtotal),
        descuento: formatearMoneda(r.descuento),
        total: formatearMoneda(r.total),
        flete: formatearMoneda(r.flete),
    }));

    // Fondo cabecera
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 140, "F");

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
    doc.setTextColor(30, 41, 59);
    doc.text("REPORTE DE COMPRAS DE INSUMOS", pageWidth / 2, 45, {
        align: "center",
    });

    // Subinfo
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);

    doc.text(`Fecha: ${formatearFecha(fechaGeneracion)}`, 40, 90);
    doc.text(`Hora: ${formatearHora(fechaGeneracion)}`, 40, 105);
    doc.text(`Rango aplicado: ${rangoFechasTexto}`, 40, 120);
    doc.text(`Órdenes seleccionadas: ${ordenesSeleccionadas.length}`, pageWidth - 220, 90);

    // Línea separadora
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(1.2);
    doc.line(40, 132, pageWidth - 40, 132);

    autoTable(doc, {
        startY: 150,
        head: [cols.map((c) => c.label)],
        body: formattedRows.map((r) => cols.map((c) => r[c.key] ?? "")),
        styles: {
            fontSize: 8.5,
            cellPadding: 5,
            valign: "middle",
            textColor: [40, 40, 40],
            lineColor: [220, 220, 220],
            lineWidth: 0.4,
        },
        headStyles: {
            fillColor: [15, 118, 110],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        margin: { left: 40, right: 40 },
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

    const finalY = doc.lastAutoTable.finalY + 25;

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

    let fletePDF = 0;
    rows.forEach((r) => {
        if (r.flete) fletePDF += Number(r.flete || 0);
    });

    const totalPDF =
        exentoPDF + exoneradoPDF + gravado15PDF + impuestoPDF + fletePDF;

    // Caja resumen
    doc.setDrawColor(210, 210, 210);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(40, finalY, 250, 180, 6, 6, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("RESUMEN DE TOTALES", 55, finalY + 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let y = finalY + 45;

    const addRow = (label, value, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(label, 55, y);
        doc.text(`L. ${formatearMoneda(value)}`, 275, y, { align: "right" });
        y += 18;
    };

    addRow("Subtotal:", subtotalPDF);
    addRow("Descuentos:", descuentosPDF);
    addRow("Importe Exento:", exentoPDF);
    addRow("Importe Exonerado:", exoneradoPDF);
    addRow("Importe Gravado 15%:", gravado15PDF);
    addRow("Impuesto 15%:", impuestoPDF);
    addRow("Flete:", fletePDF);

    doc.setDrawColor(180, 180, 180);
    doc.line(55, y - 8, 275, y - 8);

    addRow("TOTAL GENERAL:", totalPDF, true);

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

    const estadoNombre = estadosOC.find(
        (e) =>
            Number(e.id_estado_orden_compra) === Number(orden.id_estado_orden_compra)
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
            <Grid
                templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                gap={4}
                mb={5}
            >
                <GridItem>
                    <Box
                        p={4}
                        bg={cardBg}
                        border="1px solid"
                        borderColor={border}
                        borderRadius="md"
                    >
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
                    <Box
                        p={4}
                        bg={cardBg}
                        border="1px solid"
                        borderColor={border}
                        borderRadius="md"
                    >
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
                    <Box
                        p={4}
                        bg={cardBg}
                        border="1px solid"
                        borderColor={border}
                        borderRadius="md"
                    >
                        <Stat>
                            <StatLabel color={subtle}>
                                Total general (todas las órdenes)
                            </StatLabel>
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
                    <Box
                        p={4}
                        mb={4}
                        bg={cardBg}
                        border="1px solid"
                        borderColor={border}
                        borderRadius="md"
                    >
                     <Flex justify="space-between" align="center" mb={3} wrap="wrap" gap={2}>
    <Heading size="md" color={accent}>
        Proveedor
    </Heading>

    <HStack spacing={2}>

        <Button
            size="sm"
            variant="outline"
            colorScheme="teal"
            onClick={proveedoresModal.onOpen}
        >
            Ver / Exportar proveedores
        </Button>

        <Button
            size="sm"
            colorScheme="teal"
            leftIcon={<FaPlus />}
            onClick={() => abrirModalProveedor()}
        >
            Nuevo Proveedor
        </Button>

    </HStack>
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
                                <Badge
                                    colorScheme="teal"
                                    variant="subtle"
                                    p={2}
                                    borderRadius="md"
                                >
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
                    <Box
                        p={4}
                        bg={cardBg}
                        border="1px solid"
                        borderColor={border}
                        borderRadius="md"
                    >
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
                                        <option
                                            key={e.id_estado_orden_compra}
                                            value={e.id_estado_orden_compra}
                                        >
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
    <Box
        p={4}
        bg={cardBg}
        border="1px solid"
        borderColor={border}
        borderRadius="md"
    >
        <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={3}>
            <Heading size="md" color={accent}>
                Órdenes recientes
            </Heading>

            <Text fontSize="sm" color={subtle}>
                Selecciona una o varias para imprimir/exportar
            </Text>
        </Flex>

        <Divider mb={3} />

        <HStack mb={3} spacing={3} wrap="wrap" align="flex-end">
    <FormControl maxW="220px">
        <FormLabel fontSize="sm">Fecha inicial</FormLabel>
        <Input
            size="sm"
            type="date"
            value={fechaInicioFiltroOrden}
            onChange={(e) => setFechaInicioFiltroOrden(e.target.value)}
        />
    </FormControl>

    <FormControl maxW="220px">
        <FormLabel fontSize="sm">Fecha final</FormLabel>
        <Input
            size="sm"
            type="date"
            value={fechaFinFiltroOrden}
            onChange={(e) => setFechaFinFiltroOrden(e.target.value)}
        />
    </FormControl>

    <Button
        size="sm"
        variant="outline"
        onClick={() => {
            setFechaInicioFiltroOrden("");
            setFechaFinFiltroOrden("");
        }}
    >
        Limpiar fechas
    </Button>
</HStack>

        <Checkbox
            mb={3}
            isChecked={
                ordenesRecientesFiltradas.length > 0 &&
                ordenesRecientesFiltradas.every((o) =>
                    ordenesSeleccionadas.includes(o.id_orden_compra)
                )
            }
            onChange={toggleSeleccionTodas}
        >
            Seleccionar todas las órdenes filtradas
        </Checkbox>

        <VStack align="stretch" spacing={2}>
            {ordenesRecientesFiltradas.map((o) => (
                <Flex
                    key={o.id_orden_compra}
                    p={2}
                    bg="teal.50"
                    border="1px solid"
                    borderColor="teal.100"
                    borderRadius="md"
                    justify="space-between"
                    align="center"
                    wrap="wrap"
                    gap={2}
                >
                    <HStack spacing={4} flex="1" minW="0">
                        <Checkbox
                            isChecked={ordenesSeleccionadas.includes(o.id_orden_compra)}
                            onChange={() => toggleSeleccionOrden(o.id_orden_compra)}
                        />

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

            {!ordenesRecientesFiltradas.length && (
                <Text fontSize="sm" color={subtle}>
                    No hay órdenes para la fecha seleccionada.
                </Text>
            )}
        </VStack>
    </Box>
</GridItem>
            </Grid>

            {/* =============================
           DETALLES DE ORDEN
         ============================= */}
            <Box
                mt={5}
                p={4}
                bg={cardBg}
                border="1px solid"
                borderColor={border}
                borderRadius="md"
            >
                <Flex justify="space-between" align="center" mb={3}>
                    <Heading size="md" color={accent}>
                        Detalles de la Orden
                    </Heading>

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
                <Grid
                    templateColumns={{ base: "1fr", md: "repeat(8,1fr)" }}
                    gap={3}
                    mb={3}
                >
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
                                const ins = insumos.find(
                                    (i) => Number(i.id_insumo) === Number(id)
                                );

                                if (ins) {
                                    const cantidad = Number(detalleForm.cantidad || 0);
                                    const precio = Number(ins.precio_unitario || 0);
                                    const descuento = Number(detalleForm.descuento || 0);
                                    const subtotalCalc = cantidad * precio - descuento;

                                    setDetalleForm((prev) => ({
                                        ...prev,
                                        id_insumo: id,
                                        nombre_insumo: ins.nombre_insumo,
                                        // ✅ FIX: normalizar para que el <Select> lo muestre bien
                                        unidad_medida: normalizarUnidad(ins.unidad_medida),
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
                                    {`${i.nombre_insumo} — ${i.unidad_medida} — L. ${parseFloat(
                                        i.precio_unitario
                                    ).toFixed(2)}`}
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
                                setDetalleForm({
                                    ...detalleForm,
                                    precio_unitario: e.target.value,
                                });
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


                    {/* Unidad (auto desde Insumos) */}
                    <FormControl>
                        <FormLabel fontSize="sm">Unidad</FormLabel>
                        <Input
                            size="sm"
                            value={detalleForm.unidad_medida || ""}
                            isReadOnly
                            placeholder="Automática según el insumo"
                        />
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
                <Heading
                    size="md"
                    mb={4}
                    color={accent}
                    display="flex"
                    alignItems="center"
                    gap={2}
                >
                    <Icon as={FaReceipt} /> Resumen de Factura
                </Heading>

                <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                    gap={4}
                    fontSize="sm"
                >
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
                            <Text fontWeight="bold" fontSize="lg">
                                TOTAL:
                            </Text>
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

            {/* MODAL NUEVO PROVEEDOR */}
            <Modal isOpen={modalProv} onClose={() => setModalProv(false)} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Nuevo Proveedor</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={4}>
                        {/* =======================
          NOMBRE (solo letras)
      ======================= */}
                        <FormControl mb={3} isInvalid={!!provMsg.nombre}>
                            <FormLabel>Nombre</FormLabel>
                            <Input
                                placeholder="Ingrese nombre del proveedor (solo letras)"
                        
                                value={provForm.nombre}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    
      // 🔴 Validar máximo 100 caracteres
      if (raw.length > 100) {
        setProvMsg((m) => ({
          ...m,
          nombre: "El nombre del proveedor no puede exceder los 100 caracteres.",
        }));
        return;
      }

                                    // 🔒 BLOQUEO REAL: si trae algo inválido, NO actualiza el estado
                                    if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]*$/.test(raw)) {
                                        const tieneNumero = /[0-9]/.test(raw);
                                        const tieneEspecial = /[^A-Za-zÁÉÍÓÚÑáéíóúñ\s]/.test(raw);

                                        let msg = "Solo se permiten letras y espacios.";
                                        if (tieneNumero) msg = "No se permiten números, solo letras.";
                                        if (tieneEspecial)
                                            msg = "No se permiten caracteres especiales, solo letras.";

                                        setProvMsg((m) => ({ ...m, nombre: msg }));
                                        return; // ✅ no deja que entre
                                    }

                                    // ✅ permitido: actualiza y limpia error
                                    setProvForm((p) => ({ ...p, nombre: raw }));
                                    setProvMsg((m) => ({ ...m, nombre: "" }));
                                }}
                                onBlur={() => {
                                    // si quiere requerido en blur:
                                    const err = validarRequerido(provForm.nombre, "Nombre");
                                    setProvMsg((m) => ({ ...m, nombre: err || "" }));
                                }}
                            />

                            {!!provMsg.nombre && (
                                <FormHelperText color="orange.400" mt={1}>
                                    ⚠ {provMsg.nombre}
                                </FormHelperText>
                            )}
                        </FormControl>

                        {/* =======================
          RTN / ID (solo números)
      ======================= */}
                        <FormControl mb={3} isInvalid={!!provMsg.rtn}>
                            <FormLabel>RTN / ID</FormLabel>
                            <Input
                                placeholder="ID 13 dígitos / RTN 14 dígitos"
                                maxLength={14}
                                value={provForm.rtn}
                                onChange={(e) => {
                                    const raw = e.target.value;

                                    // 🔒 BLOQUEO REAL: si trae letras/símbolos, NO actualiza
                                    if (!/^[0-9]*$/.test(raw)) {
                                        setProvMsg((m) => ({
                                            ...m,
                                            rtn: "RTN o ID: no se permiten letras ni símbolos, solo números.",
                                        }));
                                        return; // ✅ no deja que entre
                                    }

                                    const v = raw.slice(0, 14);
                                    setProvForm((p) => ({ ...p, rtn: v }));

                                    // 🟡 Guía en vivo de longitud (muestra debajo)
                                    if (v.length === 0) {
                                        setProvMsg((m) => ({ ...m, rtn: "" }));
                                    } else if (v.length < 13) {
                                        setProvMsg((m) => ({
                                            ...m,
                                            rtn: "Debe tener 13 (ID) o 14 (RTN) dígitos.",
                                        }));
                                    } else if (v.length === 13) {
                                        setProvMsg((m) => ({
                                            ...m,
                                            rtn: "Detectado: Identidad (13 dígitos).",
                                        }));
                                    } else {
                                        setProvMsg((m) => ({
                                            ...m,
                                            rtn: "Detectado: RTN (14 dígitos).",
                                        }));
                                    }
                                }}
                                onBlur={() => {
                                    const err = validarRTN(provForm.rtn, true);
                                    setProvMsg((m) => ({ ...m, rtn: err || "" }));
                                }}
                            />

                            {!!provMsg.rtn && (
                                <FormHelperText color="orange.400" mt={1}>
                                    ⚠ {provMsg.rtn}
                                </FormHelperText>
                            )}
                        </FormControl>

                        {/* =======================
          TELÉFONO (solo números + formato)
      ======================= */}
                        <FormControl mb={3} isInvalid={!!provMsg.telefono}>
                            <FormLabel>Teléfono</FormLabel>
                            <Input
                                placeholder="9999-9999"
                                maxLength={9}
                                value={provForm.telefono}
                                onChange={(e) => {
                                    const raw = e.target.value;

                                    // 🔒 BLOQUEO REAL:
                                    // Permitimos SOLO dígitos y guion, y guion solo después de 4 dígitos (opcional)
                                    if (!/^[0-9-]*$/.test(raw)) {
                                        setProvMsg((m) => ({
                                            ...m,
                                            telefono: "Teléfono: no se permiten letras ni símbolos, solo números.",
                                        }));
                                        return;
                                    }

                                    // ✅ limpiar a dígitos y formatear
                                    const digits = raw.replace(/\D/g, "").slice(0, 8);
                                    const formatted = formatearTelefono(digits);

                                    setProvForm((p) => ({ ...p, telefono: formatted }));

                                    // 🟡 mensaje en vivo
                                    if (digits.length === 0) setProvMsg((m) => ({ ...m, telefono: "" }));
                                    else if (digits.length < 8)
                                        setProvMsg((m) => ({
                                            ...m,
                                            telefono: "Debe tener 8 dígitos (9999-9999).",
                                        }));
                                    else setProvMsg((m) => ({ ...m, telefono: "" }));
                                }}
                                onBlur={() => {
                                    const err = validarTelefono(provForm.telefono, true);
                                    setProvMsg((m) => ({ ...m, telefono: err || "" }));
                                }}
                            />

                            {!!provMsg.telefono && (
                                <FormHelperText color="orange.400" mt={1}>
                                    ⚠ {provMsg.telefono}
                                </FormHelperText>
                            )}
                        </FormControl>

                        {/* =======================
          CORREO (valida en vivo, no bloquea)
      ======================= */}
                        <FormControl mb={3} isInvalid={!!provMsg.correo}>
                            <FormLabel>Correo</FormLabel>
                            <Input
                                placeholder="correo@dominio.com"
                                value={provForm.correo}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setProvForm((p) => ({ ...p, correo: v }));

                                    // Validación en vivo (suave)
                                    if (v.trim() === "") {
                                        setProvMsg((m) => ({ ...m, correo: "" }));
                                    } else {
                                        const err = validarEmail(v, false);
                                        setProvMsg((m) => ({ ...m, correo: err || "" }));
                                    }
                                }}
                                onBlur={() => {
                                    const err = validarEmail(provForm.correo, true);
                                    setProvMsg((m) => ({ ...m, correo: err || "" }));
                                }}
                            />

                            {!!provMsg.correo && (
                                <FormHelperText color="orange.400" mt={1}>
                                    ⚠ {provMsg.correo}
                                </FormHelperText>
                            )}
                        </FormControl>

                        {/* =======================
          DIRECCIÓN (normal / opcional)
      ======================= */}
                        <FormControl mb={3} isInvalid={!!provMsg.direccion}>
  <FormLabel>Dirección</FormLabel>

  <Textarea
    placeholder="Ingrese dirección completa"
    maxLength={200}
    value={provForm.direccion}
    onChange={(e) => {
      const raw = e.target.value;

      // 🔒 Solo letras, números, espacios y , . # -
      if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s.,#-]*$/.test(raw)) {
        setProvMsg((m) => ({
          ...m,
          direccion: "No se permiten caracteres especiales no válidos.",
        }));
        return;
      }

      setProvForm((p) => ({ ...p, direccion: raw }));
      setProvMsg((m) => ({ ...m, direccion: "" }));
    }}

    onBlur={() => {
      const err = validarRequerido(provForm.direccion, "Dirección");
      setProvMsg((m) => ({ ...m, direccion: err || "" }));
    }}
  />

  {/* contador */}
  <Text fontSize="xs" color="gray.500" mt={1}>
    {provForm.direccion.length} / 200 caracteres
  </Text>

  {!!provMsg.direccion && (
    <FormHelperText color="orange.400" mt={1}>
      ⚠ {provMsg.direccion}
    </FormHelperText>
  )}
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

            {/* MODAL EDITAR PROVEEDOR */}
            <Modal
                isOpen={modalEditarProv}
                onClose={() => setModalEditarProv(false)}
                isCentered
            >
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Editar Proveedor</ModalHeader>
                    <ModalCloseButton />

                    <ModalBody pb={4}>
                        {/* ======================= NOMBRE ======================= */}
                        <FormControl mb={3}>
                            <FormLabel>Nombre</FormLabel>
                            <Input
                                value={proveedorEdit?.nombre || ""}
                                placeholder="Solo letras"
                                onChange={(e) => {
                                    const raw = e.target.value;

                                    // 🔒 BLOQUEO REAL (solo letras y espacios)
                                    if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]*$/.test(raw)) {
                                        return; // no deja escribir números ni símbolos
                                    }

                                    setProveedorEdit({
                                        ...proveedorEdit,
                                        nombre: raw,
                                    });
                                }}
                                onBlur={() => {
                                    const err = validarSoloLetras(
                                        proveedorEdit?.nombre,
                                        "Nombre del proveedor",
                                        true
                                    );

                                    if (err) {
                                        return toast({
                                            title: "Nombre inválido",
                                            description: err,
                                            status: "warning",
                                        });
                                    }
                                }}
                            />
                        </FormControl>

                        {/* ======================= RTN ======================= */}
                        <FormControl mb={3}>
                            <FormLabel>RTN / ID</FormLabel>
                            <Input
                                value={proveedorEdit?.rtn || ""}
                                maxLength={14}
                                placeholder="13 o 14 dígitos"
                                onChange={(e) => {
                                    const raw = e.target.value;

                                    // 🔒 SOLO números
                                    if (!/^[0-9]*$/.test(raw)) return;

                                    setProveedorEdit({
                                        ...proveedorEdit,
                                        rtn: raw.slice(0, 14),
                                    });
                                }}
                                onBlur={() => {
                                    const err = validarRTN(proveedorEdit?.rtn, true);

                                    if (err) {
                                        return toast({
                                            title: "RTN inválido",
                                            description: err,
                                            status: "warning",
                                        });
                                    }
                                }}
                            />
                        </FormControl>

                        {/* ======================= TELÉFONO ======================= */}
                        <FormControl mb={3}>
                            <FormLabel>Teléfono</FormLabel>
                            <Input
                                value={proveedorEdit?.telefono || ""}
                                maxLength={9}
                                placeholder="9999-9999"
                                onChange={(e) => {
                                    const raw = e.target.value;

                                    // 🔒 solo números y guion
                                    if (!/^[0-9-]*$/.test(raw)) return;

                                    const digits = raw.replace(/\D/g, "").slice(0, 8);
                                    const formatted = formatearTelefono(digits);

                                    setProveedorEdit({
                                        ...proveedorEdit,
                                        telefono: formatted,
                                    });
                                }}
                                onBlur={() => {
                                    const err = validarTelefono(proveedorEdit?.telefono, true);

                                    if (err) {
                                        return toast({
                                            title: "Teléfono inválido",
                                            description: err,
                                            status: "warning",
                                        });
                                    }
                                }}
                            />
                        </FormControl>

                        {/* ======================= CORREO ======================= */}
                        <FormControl mb={3}>
                            <FormLabel>Correo</FormLabel>
                            <Input
                                value={proveedorEdit?.correo || ""}
                                placeholder="correo@dominio.com"
                                onChange={(e) => {
                                    setProveedorEdit({
                                        ...proveedorEdit,
                                        correo: e.target.value,
                                    });
                                }}
                                onBlur={() => {
                                    const err = validarEmail(proveedorEdit?.correo, true);

                                    if (err) {
                                        return toast({
                                            title: "Correo inválido",
                                            description: err,
                                            status: "warning",
                                        });
                                    }
                                }}
                            />
                        </FormControl>

                        {/* ======================= DIRECCIÓN ======================= */}
                        <FormControl mb={3}>
                            <FormLabel>Dirección</FormLabel>
                            <Textarea
                                value={proveedorEdit?.direccion || ""}
                                placeholder="Ingrese dirección completa"
                                onChange={(e) => {
                                    setProveedorEdit({
                                        ...proveedorEdit,
                                        direccion: e.target.value,
                                    });
                                }}
                            />
                        </FormControl>
                    </ModalBody>

                    <ModalFooter>
                        <Button
                            colorScheme="teal"
                            mr={3}
                            onClick={guardarProveedorEditado}
                        >
                            Guardar cambios
                        </Button>

                        <Button onClick={() => setModalEditarProv(false)}>
                            Cancelar
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* MODAL ELIMINAR PROVEEDOR */}
            <Modal
                isOpen={modalEliminarProv}
                onClose={() => setModalEliminarProv(false)}
                isCentered
            >
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Eliminar proveedor</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>¿Está seguro que desea eliminar este proveedor?</ModalBody>
                    <ModalFooter>
                        <Button colorScheme="red" mr={3} onClick={eliminarProveedor}>
                            Eliminar
                        </Button>
                        <Button onClick={() => setModalEliminarProv(false)}>Cancelar</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* MODAL SALIR SIN GUARDAR */}
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

            {/* MODAL EXPORTAR */}
            <Modal
                isOpen={exportModal.isOpen}
                onClose={exportModal.onClose}
                isCentered
            >
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

                            <Box
                                maxH="200px"
                                overflowY="auto"
                                p={2}
                                border="1px solid #ddd"
                                borderRadius="md"
                            >
                                {ALL_COLUMNS.map((c) => (
                                    <Checkbox
                                        key={c.key}
                                        isChecked={selectedColumns.includes(c.key)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedColumns([...selectedColumns, c.key]);
                                            } else {
                                                setSelectedColumns(
                                                    selectedColumns.filter((x) => x !== c.key)
                                                );
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
                        <Button colorScheme="teal" onClick={exportarReporte} isLoading={loading}>
                            Exportar
                        </Button>
                        <Button ml={3} onClick={exportModal.onClose}>
                            Cancelar
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>


{/* MODAL PROVEEDORES REGISTRADOS */}
<Modal
    isOpen={proveedoresModal.isOpen}
    onClose={proveedoresModal.onClose}
    size="5xl"
    isCentered
>
    <ModalOverlay />
    <ModalContent>
        <ModalHeader>Proveedores registrados</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
            <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
                <Text fontSize="sm" color={subtle}>
                    Total de proveedores: {proveedores.length}
                </Text>

                <HStack spacing={3} wrap="wrap">
                    <CSelect
                        size="sm"
                        maxW="160px"
                        value={proveedorExportFormat}
                        onChange={(e) => setProveedorExportFormat(e.target.value)}
                    >
                        <option value="excel">Excel (.xlsx)</option>
                        <option value="pdf">PDF (.pdf)</option>
                    </CSelect>

                    <Button
                        size="sm"
                        colorScheme="teal"
                        leftIcon={<FaFileExport />}
                        onClick={exportarProveedores}
                    >
                        Exportar
                    </Button>
                </HStack>
            </Flex>

            <Checkbox
                mb={3}
                isChecked={
                    proveedores.length > 0 &&
                    proveedores.every((p) =>
                        proveedoresSeleccionados.includes(p.id_proveedor)
                    )
                }
                onChange={toggleSeleccionTodosProveedores}
            >
                Seleccionar todos los proveedores
            </Checkbox>

            <FormControl mb={4}>
                <FormLabel fontSize="sm">Columnas a exportar</FormLabel>

                <Checkbox
                    isChecked={allProveedorChecked}
                    isIndeterminate={isProveedorIndeterminate}
                    onChange={(e) =>
                        setSelectedProveedorColumns(
                            e.target.checked
                                ? PROVEEDOR_COLUMNS.map((c) => c.key)
                                : []
                        )
                    }
                    mb={2}
                >
                    Seleccionar todas
                </Checkbox>

                <Box
                    maxH="130px"
                    overflowY="auto"
                    p={2}
                    border="1px solid"
                    borderColor={border}
                    borderRadius="md"
                >
                    {PROVEEDOR_COLUMNS.map((c) => (
                        <Checkbox
                            key={c.key}
                            isChecked={selectedProveedorColumns.includes(c.key)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedProveedorColumns([
                                        ...selectedProveedorColumns,
                                        c.key,
                                    ]);
                                } else {
                                    setSelectedProveedorColumns(
                                        selectedProveedorColumns.filter((x) => x !== c.key)
                                    );
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

            <Box
                maxH="400px"
                overflowY="auto"
                border="1px solid"
                borderColor={border}
                borderRadius="md"
            >
                <Table size="sm" variant="simple">
                    <Thead bg="teal.100">
                        <Tr>
                            <Th>
                                <Checkbox
                                    isChecked={
                                        proveedores.length > 0 &&
                                        proveedores.every((p) =>
                                            proveedoresSeleccionados.includes(p.id_proveedor)
                                        )
                                    }
                                    onChange={toggleSeleccionTodosProveedores}
                                />
                            </Th>
                            <Th>ID</Th>
                            <Th>Nombre</Th>
                            <Th>RTN / ID</Th>
                            <Th>Teléfono</Th>
                            <Th>Correo</Th>
                            <Th>Dirección</Th>
                            <Th>Estado</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {proveedores.map((p) => (
                            <Tr key={p.id_proveedor}>
                                <Td>
                                    <Checkbox
                                        isChecked={proveedoresSeleccionados.includes(
                                            p.id_proveedor
                                        )}
                                        onChange={() =>
                                            toggleSeleccionProveedor(p.id_proveedor)
                                        }
                                    />
                                </Td>
                                <Td>{p.id_proveedor}</Td>
                                <Td>{p.nombre}</Td>
                                <Td>{p.rtn}</Td>
                                <Td>{p.telefono}</Td>
                                <Td>{p.correo}</Td>
                                <Td>{p.direccion}</Td>
                                <Td>{p.nombre_estado || p.estado}</Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </Box>
        </ModalBody>

        <ModalFooter>
            <Button onClick={proveedoresModal.onClose}>Cerrar</Button>
        </ModalFooter>
    </ModalContent>
</Modal>

{/* MODAL ELIMINAR ORDEN */}
<Modal isOpen={modalEliminar} onClose={() => setModalEliminar(false)} isCentered></Modal>

            {/* MODAL ELIMINAR ORDEN */}
            <Modal isOpen={modalEliminar} onClose={() => setModalEliminar(false)} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Eliminar orden</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>¿Está seguro de eliminar esta orden de compra?</ModalBody>
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