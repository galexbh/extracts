// ============================================================
// 📁 src/routes/mantenimiento.routes.js
// ============================================================

const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const verifyPermission = require("../middleware/verifyObjectPermission");

// ============================================================
// 🧩 IMPORTAR CONTROLADORES
// ============================================================
const tipoPersonaController = require("../controllers/mantenimiento/TipoPersonaController");
const tipoTelefonoController = require("../controllers/mantenimiento/TipoTelefonoController");
const estadoUsuarioController = require("../controllers/mantenimiento/EstadoUsuarioController");
const estadoClienteController = require("../controllers/mantenimiento/EstadoClienteController");
const tipoClienteController = require("../controllers/mantenimiento/TipoClienteController");
const estadoProveedorController = require("../controllers/mantenimiento/EstadoProveedorController");
const estadoOrdenCompraCtrl = require("../controllers/mantenimiento/EstadoOrdenCompraController");
const estadoCtrl = require("../controllers/mantenimiento/EstadoProductoController");
const estadoInsumoCtrl = require("../controllers/mantenimiento/EstadoInsumoController");
const estadoInventarioInsumoCtrl = require("../controllers/mantenimiento/EstadoInventarioInsumo");



// ============================================================
// 🔹 RUTAS CRUD TIPO PERSONA
// ============================================================
router.get("/tipo-persona", tipoPersonaController.getTipoPersona);
router.get("/tipo-persona/:id", tipoPersonaController.getTipoPersonaById);
router.post("/tipo-persona", verifyPermission("Mantenimiento", "create"), tipoPersonaController.insertTipoPersona);
router.put("/tipo-persona/:id_tipo_persona", verifyPermission("Mantenimiento", "update"), tipoPersonaController.updateTipoPersona);
router.delete("/tipo-persona/:id", verifyPermission("Mantenimiento", "delete"), tipoPersonaController.deleteTipoPersona);

// ============================================================
// 🔹 RUTAS CRUD TIPO TELÉFONO
// ============================================================
router.get("/tipo-telefono", tipoTelefonoController.getTipoTelefono);
router.get("/tipo-telefono/:id", tipoTelefonoController.getTipoTelefonoById);
router.post("/tipo-telefono", verifyPermission("Mantenimiento", "create"), tipoTelefonoController.insertTipoTelefono);
router.put("/tipo-telefono/:id_tipo_telefono", verifyPermission("Mantenimiento", "update"), tipoTelefonoController.updateTipoTelefono);
router.delete("/tipo-telefono/:id", verifyPermission("Mantenimiento", "delete"), tipoTelefonoController.deleteTipoTelefono);

// ============================================================
// 🔹 RUTAS CRUD ESTADO DE USUARIO
// ============================================================
router.get("/estado-usuario", estadoUsuarioController.getEstadoUsuario);
router.get("/estado-usuario/:id", estadoUsuarioController.getEstadoUsuarioById);
router.post("/estado-usuario", verifyPermission("Mantenimiento", "create"), estadoUsuarioController.insertEstadoUsuario);
router.put("/estado-usuario/:id_estado_usuario", verifyPermission("Mantenimiento", "update"), estadoUsuarioController.updateEstadoUsuario);
router.delete("/estado-usuario/:id", verifyPermission("Mantenimiento", "delete"), estadoUsuarioController.deleteEstadoUsuario);

// ============================================================
// 🔹 RUTAS CRUD ESTADO DE CLIENTE
// ============================================================
router.get("/estado-cliente", estadoClienteController.getEstadosCliente);
router.get("/estado-cliente/:id", estadoClienteController.getEstadoClienteById);
router.post("/estado-cliente", verifyPermission("Mantenimiento", "create"), estadoClienteController.insertEstadoCliente);
router.put("/estado-cliente/:id_estado_cliente", verifyPermission("Mantenimiento", "update"), estadoClienteController.updateEstadoCliente);
router.delete("/estado-cliente/:id", verifyPermission("Mantenimiento", "delete"), estadoClienteController.deleteEstadoCliente);


// ============================================================
// 🔹 RUTAS CRUD TIPO DE CLIENTE
// ============================================================


router.get("/tipo-cliente", tipoClienteController.getTipoCliente);
router.get("/tipo-cliente/:id", tipoClienteController.getTipoClienteById);
router.post("/tipo-cliente", verifyPermission("Mantenimiento", "create"), tipoClienteController.insertTipoCliente);
router.put("/tipo-cliente/:id_tipo_cliente", verifyPermission("Mantenimiento", "update"), tipoClienteController.updateTipoCliente);
router.delete("/tipo-cliente/:id", verifyPermission("Mantenimiento", "delete"), tipoClienteController.deleteTipoCliente);

// ============================================================
// Proveedor
// ============================================================
router.get("/estado-proveedor", estadoProveedorController.getEstadosProveedor);
router.get("/estado-proveedor/:id", estadoProveedorController.getEstadoProveedorById);
router.post("/estado-proveedor", verifyPermission("Mantenimiento", "create"), estadoProveedorController.insertEstadoProveedor);
router.put("/estado-proveedor/:id_estado_proveedor", verifyPermission("Mantenimiento", "update"), estadoProveedorController.updateEstadoProveedor);
router.delete("/estado-proveedor/:id", verifyPermission("Mantenimiento", "delete"), estadoProveedorController.deleteEstadoProveedor);

// ============================================================
// Orden de compra
// ============================================================

router.get("/estado-orden-compra", estadoOrdenCompraCtrl.getEstadosOrdenCompra);
router.post("/estado-orden-compra", verifyPermission("Mantenimiento", "create"), estadoOrdenCompraCtrl.insertEstadoOrdenCompra);
router.put("/estado-orden-compra/:id_estado_orden_compra", verifyPermission("Mantenimiento", "update"), estadoOrdenCompraCtrl.updateEstadoOrdenCompra);
router.delete("/estado-orden-compra/:id_estado_orden_compra", verifyPermission("Mantenimiento", "delete"), estadoOrdenCompraCtrl.deleteEstadoOrdenCompra);

// ============================================================
// 🔹 RUTAS CRUD ESTADO PRODUCTO
// ============================================================
router.get("/estado-producto", estadoCtrl.getEstados);
router.post("/estado-producto", verifyPermission("Mantenimiento", "create"), estadoCtrl.insertEstado);
router.put("/estado-producto/:id_estado_producto", verifyPermission("Mantenimiento", "update"), estadoCtrl.updateEstado);
router.delete("/estado-producto/:id_estado_producto", verifyPermission("Mantenimiento", "delete"), estadoCtrl.deleteEstado);

// ============================================================
// 🔹 ESTADOS DE INSUMO
// ============================================================
router.get("/estado-insumo", estadoInsumoCtrl.getEstadosInsumo);
router.post("/estado-insumo", verifyPermission("Mantenimiento", "create"), estadoInsumoCtrl.insertEstadoInsumo);
router.put("/estado-insumo/:id_estado_insumo", verifyPermission("Mantenimiento", "update"), estadoInsumoCtrl.updateEstadoInsumo);
router.delete("/estado-insumo/:id_estado_insumo", verifyPermission("Mantenimiento", "delete"), estadoInsumoCtrl.deleteEstadoInsumo);

// ============================================================
// 🔹 ESTADOS DE INVENTARIO INSUMO
// ============================================================

router.get("/estado-inventario-insumo", estadoInventarioInsumoCtrl.getEstadosInventarioInsumo);
router.get("/estado-inventario-insumo/:id", estadoInventarioInsumoCtrl.getEstadoInventarioInsumoById);
router.post("/estado-inventario-insumo", verifyPermission("Mantenimiento", "create"), estadoInventarioInsumoCtrl.insertEstadoInventarioInsumo);
router.put("/estado-inventario-insumo/:id_estado_inventario_insumo", verifyPermission("Mantenimiento", "update"), estadoInventarioInsumoCtrl.updateEstadoInventarioInsumo);
router.delete("/estado-inventario-insumo/:id", verifyPermission("Mantenimiento", "delete"), estadoInventarioInsumoCtrl.deleteEstadoInventarioInsumo);
// ============================================================
// 🚀 EXPORTAR RUTAS
// ============================================================
module.exports = router;
