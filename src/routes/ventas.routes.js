// ============================================================
// 📁 src/routes/ventas.routes.js
// ============================================================

const express = require("express");
const router = express.Router();
const verifyPermission = require("../middleware/verifyObjectPermission");

// CONTROLADORES
const clientesCtrl = require("../controllers/ventas/ClientesController");

// Submódulos
const ventasyreservaRoutes = require("./ventasyreserva.routes");
const facturasRoutes = require("./facturas.routes");

// ============================================================
// 🔹 CLIENTES
// ============================================================

router.get("/clientes", clientesCtrl.getClientes);
router.get("/clientes/:id_cliente", clientesCtrl.getClienteById);
router.post("/clientes", verifyPermission("Clientes", "create"), clientesCtrl.insertCliente);
router.put("/clientes/:id_cliente", verifyPermission("Clientes", "update"), clientesCtrl.updateCliente);
router.delete("/clientes/:id_cliente", verifyPermission("Clientes", "delete"), clientesCtrl.deleteCliente);

// ============================================================
// 🔹 PEDIDOS + PRODUCTOS
// ============================================================

router.use("/ventasyreserva", ventasyreservaRoutes);

// ============================================================
// 🔹 FACTURAS
// ============================================================
router.use("/facturas", facturasRoutes);

// ============================================================
// EXPORTAR
// ============================================================

module.exports = router;
