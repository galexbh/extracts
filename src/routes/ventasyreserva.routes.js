// ============================================================
// 📁 src/routes/ventasyreserva.routes.js
// 🔹 Rutas del módulo Ventas y Reservas (Pedidos, Clientes, Productos)
// ============================================================
const express = require("express");
const router = express.Router();
const verifyPermission = require("../middleware/verifyObjectPermission");

// Controlador principal de pedidos
const pedidosCtrl = require("../controllers/ventas/pedidos.controller");

// ============================================================
// 🔹 RUTAS DE CATÁLOGOS (Clientes, Productos)
// ============================================================

// Listar clientes
router.get("/clientes", pedidosCtrl.getClientes);

// Listar productos
router.get("/productos", pedidosCtrl.getProductos);

// ============================================================
// 🔹 RUTAS DE PEDIDOS (Encabezado + Detalle)
// ============================================================

// Listar todos los pedidos
router.get("/pedidos", verifyPermission("Pedidos", "read"), pedidosCtrl.getPedidos);

// Obtener un pedido específico con su detalle
router.get("/pedidos/:id_pedido", verifyPermission("Pedidos", "read"), pedidosCtrl.getPedidoById);

// Crear un nuevo pedido con sus detalles
router.post("/pedidos", verifyPermission("Pedidos", "create"), pedidosCtrl.insertPedido);

// Actualizar pedido y sus detalles
router.put("/pedidos/:id_pedido", verifyPermission("Pedidos", "update"), pedidosCtrl.updatePedido);

// Eliminar pedido (y su detalle)
router.delete("/pedidos/:id_pedido", verifyPermission("Pedidos", "delete"), pedidosCtrl.deletePedido);

// Listar estados de pedido
router.get("/estados-pedido", pedidosCtrl.getEstadosPedido);

// ============================================================
// 📊 ESTADÍSTICAS PARA EL DASHBOARD
// ============================================================
router.get("/estadisticas", pedidosCtrl.getEstadisticas);

// ============================================================
// ✅ EXPORTAR RUTAS
// ============================================================
module.exports = router;
