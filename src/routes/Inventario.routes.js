// ============================================================
// 📁 src/routes/inventario.routes.js
// ============================================================
const express = require("express");
const router = express.Router();
const verifyPermission = require("../middleware/verifyObjectPermission");

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
router.post("/inventario-insumos", verifyPermission("Inventario insumos", "create"), inventarioInsumosCtrl.insertInventarioInsumo);
router.put("/inventario-insumos/:id", verifyPermission("Inventario insumos", "update"), inventarioInsumosCtrl.updateInventarioInsumo);
router.delete("/inventario-insumos/:id", verifyPermission("Inventario insumos", "delete"), inventarioInsumosCtrl.deleteInventarioInsumo);


/* ============================================================
   🔹 MOVIMIENTOS DE INSUMOS
   ============================================================ */
router.get("/movimientos", movimientosInsumosCtrl.getMovimientos);
router.post("/movimientos", verifyPermission("Inventario insumos", "create"), movimientosInsumosCtrl.insertMovimiento);


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
router.post("/inventario-productos", verifyPermission("Inventario productos", "create"), invProductoCtrl.insertInventarioProducto);
router.put("/inventario-productos/:id", verifyPermission("Inventario productos", "update"), invProductoCtrl.updateInventarioProducto);
router.delete("/inventario-productos/:id", verifyPermission("Inventario productos", "delete"), invProductoCtrl.deleteInventarioProducto);


/* ============================================================
   🔹 MOVIMIENTOS DE PRODUCTOS (NUEVO)
   ============================================================ */
router.get("/movimientos-productos", movProdCtrl.getMovimientosProductos);
router.post("/movimientos-productos", verifyPermission("Inventario productos", "create"), movProdCtrl.insertMovimientoProducto);


/* ============================================================
   🔹 MOVIMIENTOS DESDE PRODUCCIÓN HACIA INVENTARIO PRODUCTOS
   ============================================================ */
router.post("/inventario-productos/movimiento", verifyPermission("Inventario productos", "create"), invProductoCtrl.registrarMovimientoProducto);



module.exports = router;
