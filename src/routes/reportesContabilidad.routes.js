// ============================================================
// 📁 RUTAS: REPORTES CONTABILIDAD
//  Base real en server.js:
//      /contabilidad/reportes-contabilidad
// ============================================================
const express = require("express");
const router = express.Router();
const verifyPermission = require("../middleware/verifyObjectPermission");

const {
  productosMasVendidos,
  ventasPorVendedor,
  pedidosDiarios,
} = require("../controllers/contabilidad/ReportesContabilidadController");

// Productos más vendidos
router.get(
  "/productos-mas-vendidos",
  verifyPermission("Contabilidad", "read"),
  productosMasVendidos
);

// Ventas por vendedor
router.get(
  "/ventas-vendedor",
  verifyPermission("Contabilidad", "read"),
  ventasPorVendedor
);

// Pedidos diarios
router.get(
  "/pedidos-diarios",
  verifyPermission("Contabilidad", "read"),
  pedidosDiarios
);

module.exports = router;
