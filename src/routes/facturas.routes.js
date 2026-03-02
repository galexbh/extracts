// ============================================================
// 📁 src/routes/facturas.routes.js
// ============================================================
const express = require("express");
const router = express.Router();
const verifyPermission = require("../middleware/verifyObjectPermission");

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
router.post("/", verifyPermission("Facturas", "create"), crearFactura);
router.put("/:id", verifyPermission("Facturas", "update"), actualizarFactura);
router.delete("/:id", verifyPermission("Facturas", "delete"), eliminarFactura);


module.exports = router;
