// ============================================================
// 📁 src/routes/ventas.routes.js
// ============================================================

const express = require("express");
const router = express.Router();

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
router.post("/clientes", clientesCtrl.insertCliente);
router.put("/clientes/:id_cliente", clientesCtrl.updateCliente);
router.delete("/clientes/:id_cliente", clientesCtrl.deleteCliente);

// ============================================================
// 🔹 PEDIDOS + PRODUCTOS
// ============================================================

router.use("/ventasyreserva", ventasyreservaRoutes);

// ============================================================
// 🔹 FACTURAS
// ============================================================
// Todas las rutas quedan bajo:  /ventas/facturas

router.use("/facturas", facturasRoutes);

// ============================================================
// EXPORTAR
// ============================================================

module.exports = router;
