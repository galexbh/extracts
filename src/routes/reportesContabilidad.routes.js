// ============================================================
// 📁 RUTAS: REPORTES CONTABILIDAD
//  Base real en server.js:
//      /contabilidad/reportes-contabilidad
// ============================================================
const express = require("express");
const router = express.Router();

const {
  productosMasVendidos,
  ventasPorVendedor,
  pedidosDiarios,
} = require("../controllers/contabilidad/ReportesContabilidadController");

// Productos más vendidos
router.get("/productos-mas-vendidos", productosMasVendidos);

// Ventas por vendedor
router.get("/ventas-vendedor", ventasPorVendedor);

// Pedidos diarios
router.get("/pedidos-diarios", pedidosDiarios);

module.exports = router;
