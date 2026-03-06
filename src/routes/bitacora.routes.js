// ============================================================
// 📂 src/routes/seguridad/bitacora.routes.js
// ============================================================
const express = require("express");
const router = express.Router();
const { listarBitacora } = require("../controllers/seguridad/bitacora.controller");
const verifyPermission = require("../middleware/verifyObjectPermission");

// ============================================================
// 🔹 GET → listar toda la bitácora (protegido con permisos)
// ============================================================
router.get("/", verifyPermission("Bitácora", "read"), listarBitacora);

module.exports = router;
