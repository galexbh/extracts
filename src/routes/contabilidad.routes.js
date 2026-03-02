// ============================================================
// 📁 src/routes/contabilidad.routes.js
// ============================================================

const express = require("express");
const router = express.Router();
const verifyPermission = require("../middleware/verifyObjectPermission");

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
router.post("/creditos", verifyPermission("Creditos", "create"), creditosController.insertarCredito);
router.put("/creditos/:id_credito", verifyPermission("Creditos", "update"), creditosController.actualizarCredito);
router.delete("/creditos/:id_credito", verifyPermission("Creditos", "delete"), creditosController.eliminarCredito);

// ============================================================
// 🕒 RUTAS CRUD MORAS
// ============================================================
router.get("/moras", moraController.listarMoras);
router.post("/moras", verifyPermission("Moras", "create"), moraController.insertarMora);
router.put("/moras/:id_mora", verifyPermission("Moras", "update"), moraController.actualizarMora);
router.delete("/moras/:id_mora", verifyPermission("Moras", "delete"), moraController.eliminarMora);

// ============================================================
// 💰 RUTAS CRUD PAGOS
// ============================================================
router.get("/pagos", pagosController.listarPagos);
router.post("/pagos", verifyPermission("Pagos", "create"), pagosController.insertarPago);
router.put("/pagos/:id_pago", verifyPermission("Pagos", "update"), pagosController.actualizarPago);
router.delete("/pagos/:id_pago", verifyPermission("Pagos", "delete"), pagosController.eliminarPago);

// ============================================================
// 🚀 EXPORTAR RUTAS
// ============================================================
module.exports = router;
