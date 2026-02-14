// ============================================================
// 📁 src/routes/ventasyreserva.routes.js
// 🔹 Rutas del módulo Ventas y Reservas (Pedidos, Clientes, Productos)
// ============================================================
const express = require("express");
const router = express.Router();

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
router.get("/pedidos", pedidosCtrl.getPedidos);

// Obtener un pedido específico con su detalle
router.get("/pedidos/:id_pedido", pedidosCtrl.getPedidoById);

// Crear un nuevo pedido con sus detalles
router.post("/pedidos", pedidosCtrl.insertPedido);

// Actualizar pedido y sus detalles
router.put("/pedidos/:id_pedido", pedidosCtrl.updatePedido);

// Eliminar pedido (y su detalle)
router.delete("/pedidos/:id_pedido", pedidosCtrl.deletePedido);

// ============================================================
// ✅ EXPORTAR RUTAS
// ============================================================
module.exports = router;
