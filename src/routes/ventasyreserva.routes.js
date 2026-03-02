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
router.get("/pedidos", pedidosCtrl.getPedidos);

// Obtener un pedido específico con su detalle
router.get("/pedidos/:id_pedido", pedidosCtrl.getPedidoById);

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
const { pool } = require("../db");

router.get("/estadisticas", async (_req, res) => {
  try {
    // Top productos más vendidos (por cantidad)
    const prodRes = await pool.query(`
      SELECT
        pr.nombre_producto,
        SUM(d.cantidad)       AS total_unidades,
        SUM(d.subtotal)       AS total_ventas,
        COUNT(DISTINCT d.id_pedido) AS num_pedidos
      FROM ventasyreserva.tbl_detalle_pedidos d
      JOIN produccion.tbl_productos pr ON pr.id_producto = d.id_producto
      GROUP BY pr.nombre_producto
      ORDER BY total_unidades DESC
      LIMIT 5;
    `);

    // Top clientes que más han comprado (por monto total)
    const clienteRes = await pool.query(`
      SELECT
        c.nombre_cliente,
        COUNT(p.id_pedido)  AS num_pedidos,
        SUM(p.total)        AS total_comprado
      FROM ventasyreserva.tbl_pedidos p
      JOIN ventasyreserva.clientes c ON c.id_cliente = p.id_cliente
      GROUP BY c.nombre_cliente
      ORDER BY total_comprado DESC
      LIMIT 5;
    `);

    // Resumen general
    const resumenRes = await pool.query(`
      SELECT
        COUNT(*)         AS total_pedidos,
        SUM(total)       AS ventas_totales,
        COUNT(DISTINCT id_cliente) AS total_clientes
      FROM ventasyreserva.tbl_pedidos;
    `);

    res.json({
      productos: prodRes.rows,
      clientes: clienteRes.rows,
      resumen: resumenRes.rows[0],
    });
  } catch (err) {
    console.error("❌ [GET estadisticas] error:", err);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// ============================================================
// ✅ EXPORTAR RUTAS
// ============================================================
module.exports = router;
