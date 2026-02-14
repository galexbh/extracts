// ============================================================
// 📁 src/routes/inventario.routes.js
// ============================================================
const express = require("express");
const router = express.Router();

/* ============================================================
   Controllers de INSUMOS
   ============================================================ */
const inventarioInsumosCtrl = require("../controllers/inventario/inventarioinsumoscontroller");
const movimientosInsumosCtrl = require("../controllers/inventario/MovimientosInsumoController");
const inventarioCtrl = require("../controllers/inventario/ReportesInventarioController");

/* ============================================================
   Controllers de PRODUCTOS
   ============================================================ */
const invProductoCtrl = require("../controllers/inventario/inventarioproductocontroller");
const movProdCtrl = require("../controllers/inventario/MovimientosProductoController");



/* ============================================================
   🔹 INVENTARIO DE INSUMOS
   ============================================================ */
router.get("/inventario-insumos", inventarioInsumosCtrl.getInventarioInsumos);
router.post("/inventario-insumos", inventarioInsumosCtrl.insertInventarioInsumo);
router.put("/inventario-insumos/:id", inventarioInsumosCtrl.updateInventarioInsumo);
router.delete("/inventario-insumos/:id", inventarioInsumosCtrl.deleteInventarioInsumo);


/* ============================================================
   🔹 MOVIMIENTOS DE INSUMOS
   ============================================================ */
router.get("/movimientos", movimientosInsumosCtrl.getMovimientos);
router.post("/movimientos", movimientosInsumosCtrl.insertMovimiento);


/* ============================================================
   🔹 RESUMEN (KARDEX INSUMOS)
   ============================================================ */
router.get("/resumen", movimientosInsumosCtrl.getResumenInventario);


/* ============================================================
   🔹 REPORTE HISTÓRICO (POR FECHAS)
   ============================================================ */
router.get("/inventario-diario", inventarioCtrl.getInventarioDiario);



/* ============================================================
   🔥 INVENTARIO DE PRODUCTOS (NUEVO)
   ============================================================ */
router.get("/inventario-productos", invProductoCtrl.getInventarioProductos);
router.post("/inventario-productos", invProductoCtrl.insertInventarioProducto);
router.put("/inventario-productos/:id", invProductoCtrl.updateInventarioProducto);
router.delete("/inventario-productos/:id", invProductoCtrl.deleteInventarioProducto);


/* ============================================================
   🔹 MOVIMIENTOS DE PRODUCTOS (NUEVO)
   ============================================================ */
router.get("/movimientos-productos", movProdCtrl.getMovimientosProductos);
router.post("/movimientos-productos", movProdCtrl.insertMovimientoProducto);


/* ============================================================
   🔹 MOVIMIENTOS DESDE PRODUCCIÓN HACIA INVENTARIO PRODUCTOS
   ============================================================ */
router.post("/inventario-productos/movimiento", invProductoCtrl.registrarMovimientoProducto);



module.exports = router;
