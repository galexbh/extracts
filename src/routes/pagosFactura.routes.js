// ============================================================
// 📁 src/routes/pagosFactura.routes.js (VERSIÓN CORRECTA)
// ============================================================

const express = require("express");
const router = express.Router();
const { pool } = require("../db"); 

const {
  listarResumenFacturasConPagos,
  listarPagosPorFactura,
  crearPago,
  eliminarPago,
} = require("../controllers/ventas/PagosFacturaController");

// ============================================================
// 🔹 ENDPOINT FIJO — Debe ir ANTES de rutas dinámicas
// ============================================================
router.get("/metodos-pago", async (req, res) => {
  try {
    const q =
      "SELECT id_metodo_pago, nombre_metodo FROM mantenimiento.tbl_metodo_pago ORDER BY id_metodo_pago";
    const result = await pool.query(q);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error obteniendo métodos de pago:", err);
    res.status(500).json({ error: "Error obteniendo métodos de pago" });
  }
});


// ============================================================
// 🔹 ENDPOINTS PAGOS DE FACTURA
// ============================================================

// Resumen tipo "reporte"
router.get("/resumen", listarResumenFacturasConPagos);

// Detalle de pagos por factura
router.get("/:id_factura", listarPagosPorFactura);

// Crear pago
router.post("/", crearPago);

// Eliminar pago
router.delete("/:id_pago", eliminarPago);

module.exports = router;
