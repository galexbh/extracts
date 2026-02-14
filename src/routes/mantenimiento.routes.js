// ============================================================
// 📁 src/routes/mantenimiento.routes.js
// ============================================================

const express = require("express");
const router = express.Router();
const { pool } = require("../db");

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
router.post("/tipo-persona", tipoPersonaController.insertTipoPersona);
router.put("/tipo-persona/:id_tipo_persona", tipoPersonaController.updateTipoPersona);
router.delete("/tipo-persona/:id", tipoPersonaController.deleteTipoPersona);

// ============================================================
// 🔹 RUTAS CRUD TIPO TELÉFONO
// ============================================================
router.get("/tipo-telefono", tipoTelefonoController.getTipoTelefono);
router.get("/tipo-telefono/:id", tipoTelefonoController.getTipoTelefonoById);
router.post("/tipo-telefono", tipoTelefonoController.insertTipoTelefono);
router.put("/tipo-telefono/:id_tipo_telefono", tipoTelefonoController.updateTipoTelefono);
router.delete("/tipo-telefono/:id", tipoTelefonoController.deleteTipoTelefono);

// ============================================================
// 🔹 RUTAS CRUD ESTADO DE USUARIO
// ============================================================
router.get("/estado-usuario", estadoUsuarioController.getEstadoUsuario);
router.get("/estado-usuario/:id", estadoUsuarioController.getEstadoUsuarioById);
router.post("/estado-usuario", estadoUsuarioController.insertEstadoUsuario);
router.put("/estado-usuario/:id_estado_usuario", estadoUsuarioController.updateEstadoUsuario);
router.delete("/estado-usuario/:id", estadoUsuarioController.deleteEstadoUsuario);

// ============================================================
// 🔹 RUTAS CRUD ESTADO DE CLIENTE
// ============================================================
router.get("/estado-cliente", estadoClienteController.getEstadosCliente);
router.get("/estado-cliente/:id", estadoClienteController.getEstadoClienteById);
router.post("/estado-cliente", estadoClienteController.insertEstadoCliente);
router.put("/estado-cliente/:id_estado_cliente", estadoClienteController.updateEstadoCliente);
router.delete("/estado-cliente/:id", estadoClienteController.deleteEstadoCliente);


// ============================================================
// 🔹 RUTAS CRUD TIPO DE CLIENTE
// ============================================================


router.get("/tipo-cliente", tipoClienteController.getTipoCliente);
router.get("/tipo-cliente/:id", tipoClienteController.getTipoClienteById);
router.post("/tipo-cliente", tipoClienteController.insertTipoCliente);
router.put("/tipo-cliente/:id_tipo_cliente", tipoClienteController.updateTipoCliente);
router.delete("/tipo-cliente/:id", tipoClienteController.deleteTipoCliente);

// ============================================================
// Proveedor
// ============================================================
router.get("/estado-proveedor", estadoProveedorController.getEstadosProveedor);
router.get("/estado-proveedor/:id", estadoProveedorController.getEstadoProveedorById);
router.post("/estado-proveedor", estadoProveedorController.insertEstadoProveedor);
router.put("/estado-proveedor/:id_estado_proveedor", estadoProveedorController.updateEstadoProveedor);
router.delete("/estado-proveedor/:id", estadoProveedorController.deleteEstadoProveedor);

// ============================================================
// Orden de compra
// ============================================================

router.get("/estado-orden-compra", estadoOrdenCompraCtrl.getEstadosOrdenCompra);
router.post("/estado-orden-compra", estadoOrdenCompraCtrl.insertEstadoOrdenCompra);
router.put("/estado-orden-compra/:id_estado_orden_compra", estadoOrdenCompraCtrl.updateEstadoOrdenCompra);
router.delete("/estado-orden-compra/:id_estado_orden_compra", estadoOrdenCompraCtrl.deleteEstadoOrdenCompra);

// ============================================================
// 🔹 RUTAS CRUD ESTADO PRODUCTO
// ============================================================
router.get("/estado-producto", estadoCtrl.getEstados);
router.post("/estado-producto", estadoCtrl.insertEstado);
router.put("/estado-producto/:id_estado_producto", estadoCtrl.updateEstado);
router.delete("/estado-producto/:id_estado_producto", estadoCtrl.deleteEstado);

// ============================================================
// 🔹 ESTADOS DE INSUMO
// ============================================================
router.get("/estado-insumo", estadoInsumoCtrl.getEstadosInsumo);
router.post("/estado-insumo", estadoInsumoCtrl.insertEstadoInsumo);
router.put("/estado-insumo/:id_estado_insumo", estadoInsumoCtrl.updateEstadoInsumo);
router.delete("/estado-insumo/:id_estado_insumo", estadoInsumoCtrl.deleteEstadoInsumo);

// ============================================================
// 🔹 ESTADOS DE INVENTARIO INSUMO
// ============================================================

router.get("/estado-inventario-insumo", estadoInventarioInsumoCtrl.getEstadosInventarioInsumo);
router.get("/estado-inventario-insumo/:id", estadoInventarioInsumoCtrl.getEstadoInventarioInsumoById);
router.post("/estado-inventario-insumo", estadoInventarioInsumoCtrl.insertEstadoInventarioInsumo);
router.put("/estado-inventario-insumo/:id_estado_inventario_insumo", estadoInventarioInsumoCtrl.updateEstadoInventarioInsumo);
router.delete("/estado-inventario-insumo/:id", estadoInventarioInsumoCtrl.deleteEstadoInventarioInsumo);
// ============================================================
// 🚀 EXPORTAR RUTAS
// ============================================================
module.exports = router;
