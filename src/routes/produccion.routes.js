// ============================================================
// 📁 src/routes/produccion.routes.js
// ============================================================

const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// ============================================================
// 📦 Controllers
// ============================================================

// Productos
const productosCtrl = require("../controllers/produccion/productos.controller");

// Insumos (solo catálogo de insumos de producción)
const insumosCtrl = require("../controllers/produccion/InsumosController");

// Órdenes y pedidos (produce / inventario)
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
// 🔥 Usa inventario.tbl_inventario_insumo
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
// 🔹 ESTADOS DEL PRODUCTO
// ============================================================
router.get("/estados-producto", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id_estado_producto, nombre_estado
      FROM mantenimiento.tbl_estado_producto
      ORDER BY id_estado_producto;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error al obtener estados de producto:", err);
    res.status(500).json({
      error: "Error al obtener estados de producto"
    });
  }
});


// ============================================================
// ❗ Exportar rutas
// ============================================================
module.exports = router;
