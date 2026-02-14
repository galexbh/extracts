// ============================================================
// 📂 src/routes/seguridad/bitacora.routes.js
// ============================================================
const express = require("express");
const router = express.Router();
const { listarBitacora } = require("../controllers/seguridad/bitacora.controller");

// ============================================================
// 🔹 GET → listar toda la bitácora
// ============================================================
router.get("/", listarBitacora);

module.exports = router;
