// ============================================================
// 📁 src/controllers/ventas/pedidos.controller.js
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR CLIENTES
// ============================================================
exports.getClientes = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id_cliente, nombre_cliente, rtn, telefono, direccion
      FROM ventasyreserva.clientes
      ORDER BY nombre_cliente;
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ [GET clientes] error:", error);
    res.status(500).json({ error: "Error al obtener clientes" });
  }
};

// ============================================================
// 🔹 LISTAR PRODUCTOS (desde PRODUCCIÓN)
// ============================================================
exports.getProductos = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id_producto,
        nombre_producto,
        unidad_medida,
        precio_unitario
      FROM produccion.tbl_productos
      ORDER BY nombre_producto;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ [GET productos] error:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
};

// ============================================================
// 🔹 LISTAR TODOS LOS PEDIDOS
// ============================================================
exports.getPedidos = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id_pedido,
        c.nombre_cliente,
        p.fecha_reserva,
        p.fecha_entrega,
        p.observaciones,
        p.total,
        p.id_estado_pedido,
        COALESCE(e.nombre, 'Desconocido') AS estado_pedido
      FROM ventasyreserva.tbl_pedidos p
      LEFT JOIN ventasyreserva.clientes c 
        ON c.id_cliente = p.id_cliente
      LEFT JOIN mantenimiento.tbl_estado_pedido e 
        ON e.id_estado_pedido = p.id_estado_pedido
      ORDER BY p.id_pedido DESC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ [GET pedidos] error:", error);
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
};

// ============================================================
// 🔹 OBTENER UN PEDIDO POR ID (con su detalle)
// ============================================================
exports.getPedidoById = async (req, res) => {
  const { id_pedido } = req.params;

  try {
    const pedidoRes = await pool.query(
      `SELECT 
          p.*, 
          c.nombre_cliente, 
          COALESCE(e.nombre, 'Desconocido') AS estado_pedido
        FROM ventasyreserva.tbl_pedidos p
        LEFT JOIN ventasyreserva.clientes c 
          ON c.id_cliente = p.id_cliente
        LEFT JOIN mantenimiento.tbl_estado_pedido e 
          ON e.id_estado_pedido = p.id_estado_pedido
        WHERE p.id_pedido = $1;`,
      [id_pedido]
    );

    const detalleRes = await pool.query(
      `SELECT 
          d.*, 
          pr.nombre_producto,
          pr.unidad_medida
        FROM ventasyreserva.tbl_detalle_pedidos d
        LEFT JOIN produccion.tbl_productos pr 
          ON pr.id_producto = d.id_producto
        WHERE d.id_pedido = $1;`,
      [id_pedido]
    );

    res.json({ pedido: pedidoRes.rows[0], detalle: detalleRes.rows });

  } catch (error) {
    console.error("❌ [GET pedidoById] error:", error);
    res.status(500).json({ error: "Error al obtener pedido" });
  }
};

// ============================================================
// 🔹 CREAR NUEVO PEDIDO (con copia REAL del precio)
// ============================================================
exports.insertPedido = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      id_cliente,
      fecha_reserva,
      fecha_entrega,
      observaciones,
      id_estado_pedido = 1,
      id_metodo_pago = 1,
      productos = [],
    } = req.body;

    if (!Array.isArray(productos) || productos.length === 0)
      throw new Error("Debe incluir al menos un producto en el pedido");

    await client.query("BEGIN");

    // Insertar encabezado
    const insertPedido = await client.query(
      `INSERT INTO ventasyreserva.tbl_pedidos
       (id_cliente, fecha_reserva, fecha_entrega, observaciones, id_metodo_pago, id_estado_pedido, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id_pedido;`,
      [id_cliente, fecha_reserva, fecha_entrega, observaciones, id_metodo_pago, id_estado_pedido]
    );

    const id_pedido = insertPedido.rows[0].id_pedido;

    // Insertar detalle (SIEMPRE COPIANDO DESDE PRODUCCIÓN)
    for (const p of productos) {
      const prod = await client.query(
        `SELECT precio_unitario, unidad_medida 
         FROM produccion.tbl_productos
         WHERE id_producto = $1`,
        [p.id_producto]
      );

      if (prod.rowCount === 0)
        throw new Error(`Producto ID ${p.id_producto} no existe`);

      const precio = parseFloat(prod.rows[0].precio_unitario);
      const unidad = prod.rows[0].unidad_medida;

      await client.query(
        `INSERT INTO ventasyreserva.tbl_detalle_pedidos
         (id_pedido, id_producto, cantidad, precio_unitario, subtotal, unidad_medida)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          id_pedido,
          p.id_producto,
          p.cantidad,
          precio,
          p.cantidad * precio,
          unidad,
        ]
      );
    }

    // Total
    await client.query(
      `SELECT ventasyreserva.fn_actualiza_total_pedido($1);`,
      [id_pedido]
    );

    await client.query("COMMIT");

    res.status(201).json({ id_pedido });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ [POST pedido] error:", error);
    res.status(500).json({ error: error.message });

  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 ACTUALIZAR PEDIDO (RE-CALCULANDO PRECIOS REALES)
// ============================================================
exports.updatePedido = async (req, res) => {
  const { id_pedido } = req.params;
  const client = await pool.connect();

  try {
    const {
      id_cliente,
      fecha_reserva,
      fecha_entrega,
      observaciones,
      id_estado_pedido,
      id_metodo_pago = 1,
      productos = [],
    } = req.body;

    await client.query("BEGIN");

    // Actualizar encabezado
    await client.query(
      `UPDATE ventasyreserva.tbl_pedidos
       SET id_cliente=$1,
           fecha_reserva=$2,
           fecha_entrega=$3,
           observaciones=$4,
           id_metodo_pago=$5,
           id_estado_pedido=$6,
           updated_at=NOW()
       WHERE id_pedido=$7`,
      [
        id_cliente,
        fecha_reserva,
        fecha_entrega,
        observaciones,
        id_metodo_pago,
        id_estado_pedido,
        id_pedido
      ]
    );

    // Reemplazar detalles
    await client.query(
      `DELETE FROM ventasyreserva.tbl_detalle_pedidos WHERE id_pedido=$1`,
      [id_pedido]
    );

    // Insertar nuevamente copiando precios reales
    for (const p of productos) {
      const prod = await client.query(
        `SELECT precio_unitario, unidad_medida 
         FROM produccion.tbl_productos
         WHERE id_producto = $1`,
        [p.id_producto]
      );

      const precio = parseFloat(prod.rows[0].precio_unitario);
      const unidad = prod.rows[0].unidad_medida;

      await client.query(
        `INSERT INTO ventasyreserva.tbl_detalle_pedidos
         (id_pedido, id_producto, cantidad, precio_unitario, subtotal, unidad_medida)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id_pedido,
          p.id_producto,
          p.cantidad,
          precio,
          p.cantidad * precio,
          unidad
        ]
      );
    }

    // Total
    await client.query(
      `SELECT ventasyreserva.fn_actualiza_total_pedido($1);`,
      [id_pedido]
    );

    await client.query("COMMIT");

    res.json({ message: "Pedido actualizado correctamente" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ [PUT pedido] error:", error);
    res.status(500).json({ error: error.message });

  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 ELIMINAR PEDIDO
// ============================================================
exports.deletePedido = async (req, res) => {
  const { id_pedido } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM ventasyreserva.tbl_detalle_pedidos WHERE id_pedido=$1`,
      [id_pedido]
    );

    await client.query(
      `DELETE FROM ventasyreserva.tbl_pedidos WHERE id_pedido=$1`,
      [id_pedido]
    );

    await client.query("COMMIT");

    res.json({ message: "Pedido eliminado correctamente" });

  } catch (error) {
    await client.query("ROLLROLLBACK");
    console.error("❌ [DELETE pedido] error:", error);
    res.status(500).json({ error: error.message });

  } finally {
    client.release();
  }
};
