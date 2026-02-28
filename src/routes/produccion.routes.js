// ============================================================
// 📁 src/routes/produccion.routes.js
// ============================================================

const express = require("express");
const router = express.Router();

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
router.post("/productos", productosCtrl.insertProducto);
router.put("/productos/:id", productosCtrl.updateProducto);
router.delete("/productos/:id", productosCtrl.deleteProducto);


// ============================================================
// 🔹 INSUMOS — Catálogo de Producción
// ============================================================
router.get("/insumos", insumosCtrl.getInsumos);
router.post("/insumos", insumosCtrl.insertInsumo);
router.put("/insumos/:id_insumo", insumosCtrl.updateInsumo);
router.delete("/insumos/:id_insumo", insumosCtrl.deleteInsumo);


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
router.post("/ordenes/iniciar/:id_pedido", produccionCtrl.iniciarProduccion);

// Registrar insumos usados + descontar inventario
router.post("/ordenes/:id_orden/insumos", produccionCtrl.registrarInsumosUsados);


// ============================================================
// 🔹 ESTADOS DEL PRODUCTO (movido del inline al controller)
// ============================================================
router.get("/estados-producto", produccionCtrl.getEstadosProducto);


// ============================================================
// ❗ Exportar rutas
// ============================================================
module.exports = router;
