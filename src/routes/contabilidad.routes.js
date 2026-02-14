// ============================================================
// 📁 src/routes/contabilidad.routes.js
// ============================================================

const express = require("express");
const router = express.Router();

// ============================================================
// 🧩 IMPORTAR CONTROLADORES
// ============================================================
const creditosController = require("../controllers/contabilidad/creditos.controller");
const moraController = require("../controllers/contabilidad/mora.controller");
const pagosController = require("../controllers/contabilidad/pagos.controller");

// ============================================================
// 💳 RUTAS CRUD CRÉDITOS
// ============================================================
router.get("/creditos", creditosController.listarCreditos);
router.post("/creditos", creditosController.insertarCredito);
router.put("/creditos/:id_credito", creditosController.actualizarCredito);
router.delete("/creditos/:id_credito", creditosController.eliminarCredito);

// ============================================================
// 🕒 RUTAS CRUD MORAS
// ============================================================
router.get("/moras", moraController.listarMoras);
router.post("/moras", moraController.insertarMora);
router.put("/moras/:id_mora", moraController.actualizarMora);
router.delete("/moras/:id_mora", moraController.eliminarMora);

// ============================================================
// 💰 RUTAS CRUD PAGOS
// ============================================================
router.get("/pagos", pagosController.listarPagos);
router.post("/pagos", pagosController.insertarPago);
router.put("/pagos/:id_pago", pagosController.actualizarPago);
router.delete("/pagos/:id_pago", pagosController.eliminarPago);

// ============================================================
// 🚀 EXPORTAR RUTAS
// ============================================================
module.exports = router;
