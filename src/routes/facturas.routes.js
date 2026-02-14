// ============================================================
// 📁 src/routes/facturas.routes.js
// ============================================================
const express = require("express");
const router = express.Router();

const {
  listarFacturas,
  obtenerFactura,
  crearFactura,
  actualizarFactura,
  eliminarFactura,
} = require("../controllers/ventas/FacturaController");

// ============================================================
// 🔹 ENDPOINTS DE FACTURAS
// ============================================================

router.get("/", listarFacturas);
router.get("/:id", obtenerFactura);
router.post("/", crearFactura);
router.put("/:id", actualizarFactura);
router.delete("/:id", eliminarFactura);


module.exports = router;
