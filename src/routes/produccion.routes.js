// ============================================================
// 📁 src/routes/produccion.routes.js
// ============================================================

const express = require("express");
const router = express.Router();
const verifyPermission = require("../middleware/verifyObjectPermission");

// ============================================================
// 📦 Controllers
// ============================================================

// Productos
const productosCtrl = require("../controllers/produccion/productos.controller");

// Insumos (catálogo de insumos de producción)
const insumosCtrl = require("../controllers/produccion/InsumosController");

// Órdenes y pedidos
const produccionCtrl = require("../controllers/produccion/ordenes.controller");


// ============================================================
// 🔹 PRODUCTOS
// ============================================================
router.get("/productos", productosCtrl.getProductos);
router.get("/productos/:id", productosCtrl.getProductoById);
router.post("/productos", verifyPermission("Productos", "create"), productosCtrl.insertProducto);
router.put("/productos/:id", verifyPermission("Productos", "update"), productosCtrl.updateProducto);
router.delete("/productos/:id", verifyPermission("Productos", "delete"), productosCtrl.deleteProducto);


// ============================================================
// 🔹 INSUMOS — Catálogo de Producción
// ============================================================
router.get("/insumos", insumosCtrl.getInsumos);
router.post("/insumos", verifyPermission("Insumos", "create"), insumosCtrl.insertInsumo);
router.put("/insumos/:id_insumo", verifyPermission("Insumos", "update"), insumosCtrl.updateInsumo);
router.delete("/insumos/:id_insumo", verifyPermission("Insumos", "delete"), insumosCtrl.deleteInsumo);


// ============================================================
// 🔹 INSUMOS — Inventario REAL (existencias)
// ============================================================
router.get("/inventario-insumos", produccionCtrl.getInsumosInventario);


// ============================================================
// 🔹 PEDIDOS y ÓRDENES de Producción
// ============================================================
router.get("/pedidos-pendientes", produccionCtrl.getPedidosPendientes);
router.get("/pedidos/:id_pedido/detalle", produccionCtrl.getDetallePedido);

// Iniciar orden de producción
router.post("/ordenes/iniciar/:id_pedido", verifyPermission("Produccion", "create"), produccionCtrl.iniciarProduccion);

// Registrar insumos usados + descontar inventario
router.post("/ordenes/:id_orden/insumos", verifyPermission("Produccion", "create"), produccionCtrl.registrarInsumosUsados);


// ============================================================
// 🔹 ESTADOS DEL PRODUCTO (movido del inline al controller)
// ============================================================
router.get("/estados-producto", produccionCtrl.getEstadosProducto);


// ============================================================
// ❗ Exportar rutas
// ============================================================
module.exports = router;
