// ============================================================
// 📁 src/controllers/ventas/pedidos.controller.js
// ============================================================
const { pool } = require("../../db");

// 🛡️ Bitácora — registro de auditoría
const registrarBitacora = async ({ id_usuario, tabla, accion, descripcion, detalle }) => {
  try {
    await pool.query(
      `INSERT INTO seguridad.tbl_ms_bitacora
        (id_usuario, tabla, accion, descripcion, detalle, fecha_evento, id_usuario_creado, fecha_creado)
       VALUES ($1, $2, $3, $4, $5, NOW(), $1, NOW());`,
      [id_usuario, tabla, accion, descripcion, detalle || null]
    );
  } catch (err) {
    console.error("[Bitácora] ❌ Error:", err.message);
  }
};

const findUserId = async (email) => {
  const r = await pool.query(
    "SELECT id_usuario FROM seguridad.tbl_usuarios WHERE username ILIKE $1;",
    [email]
  );
  return r.rows.length > 0 ? r.rows[0].id_usuario : null;
};

// ____________________________________________________________
// 🔧 Helper: obtener rol del usuario por email
// Devuelve: { id_usuario, nombre_rol, accesos }
// ____________________________________________________________
async function getRolUsuario(client, email) {
  const r = await client.query(
    `SELECT u.id_usuario, r.nombre_rol, r.accesos
     FROM seguridad.tbl_usuarios u
     JOIN seguridad.tbl_roles r ON r.id_rol = u.id_rol
     WHERE LOWER(u.username) = LOWER($1) AND u.id_estado_usuario = 1
     LIMIT 1`,
    [email]
  );
  return r.rows[0] || null;
}

// Helper: saber si el rol es administrador
function esAdmin(nombre_rol) {
  if (!nombre_rol) return false;
  const rol = nombre_rol.trim().toLowerCase();
  return rol === "administrador" || rol === "admin" || rol === "todos";
}

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
// Regla: Admin → ve todos | Otro rol → solo sus propios pedidos
// ============================================================
exports.getPedidos = async (req, res) => {
  const email = req.headers["x-user-email"];

  try {
    // Determinar el rol del usuario actual
    const usuario = email ? await getRolUsuario(pool, email) : null;
    const admin = esAdmin(usuario?.nombre_rol);

    let query;
    let params;

    if (admin || !email) {
      // Administrador o sin email → todos los pedidos
      query = `
        SELECT 
          p.id_pedido,
          c.nombre_cliente,
          p.fecha_reserva,
          p.fecha_entrega,
          p.observaciones,
          p.total,
          p.id_estado_pedido,
          p.creado_por,
          COALESCE(e.nombre, 'Desconocido') AS estado_pedido
        FROM ventasyreserva.tbl_pedidos p
        LEFT JOIN ventasyreserva.clientes c 
          ON c.id_cliente = p.id_cliente
        LEFT JOIN mantenimiento.tbl_estado_pedido e 
          ON e.id_estado_pedido = p.id_estado_pedido
        ORDER BY p.id_pedido DESC;
      `;
      params = [];
    } else {
      // Vendedor u otro rol → solo sus pedidos
      query = `
        SELECT 
          p.id_pedido,
          c.nombre_cliente,
          p.fecha_reserva,
          p.fecha_entrega,
          p.observaciones,
          p.total,
          p.id_estado_pedido,
          p.creado_por,
          COALESCE(e.nombre, 'Desconocido') AS estado_pedido
        FROM ventasyreserva.tbl_pedidos p
        LEFT JOIN ventasyreserva.clientes c 
          ON c.id_cliente = p.id_cliente
        LEFT JOIN mantenimiento.tbl_estado_pedido e 
          ON e.id_estado_pedido = p.id_estado_pedido
        WHERE LOWER(p.creado_por) = LOWER($1)
        ORDER BY p.id_pedido DESC;
      `;
      params = [email];
    }

    const result = await pool.query(query, params);
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
// 🔹 CREAR NUEVO PEDIDO
// Ahora guarda `creado_por` con el email del usuario que lo crea
// ============================================================
exports.insertPedido = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      id_cliente,
      fecha_reserva,
      fecha_entrega,
      observaciones,
      id_metodo_pago = 1,
      productos = [],
    } = req.body;

    const id_estado_pedido = 1; // 🔒 Siempre nace como "Pendiente" y no depende del frontend

    // Email del vendedor que crea el pedido
    const creado_por = req.headers["x-user-email"] || null;

    if (!id_cliente || !fecha_reserva || !fecha_entrega) {
      throw new Error("Datos incompletos, faltan campos básicos (Cliente y Fechas).");
    }

    if (new Date(fecha_entrega) < new Date(fecha_reserva)) {
      throw new Error("La fecha de entrega no puede ser anterior a la de reserva.");
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      throw new Error("Debe incluir al menos un producto en el pedido.");
    }

    await client.query("BEGIN");

    // Insertar encabezado con creado_por
    const insertPedido = await client.query(
      `INSERT INTO ventasyreserva.tbl_pedidos
       (id_cliente, fecha_reserva, fecha_entrega, observaciones,
        id_metodo_pago, id_estado_pedido, creado_por, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id_pedido;`,
      [id_cliente, fecha_reserva, fecha_entrega, observaciones,
        id_metodo_pago, id_estado_pedido, creado_por]
    );

    const id_pedido = insertPedido.rows[0].id_pedido;

    // Insertar detalle copiando precios desde producción
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
        [id_pedido, p.id_producto, p.cantidad, precio, p.cantidad * precio, unidad]
      );
    }

    // Recalcular total del pedido
    await client.query(
      `SELECT ventasyreserva.fn_actualiza_total_pedido($1);`,
      [id_pedido]
    );

    await client.query("COMMIT");

    res.status(201).json({ id_pedido, creado_por });

    // 📋 Bitácora
    const id_usuario = creado_por ? await findUserId(creado_por) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "ventasyreserva.tbl_pedidos",
      accion: "INSERT",
      descripcion: `Pedido #${id_pedido} creado por ${creado_por || "desconocido"}`,
      detalle: JSON.stringify({ id_pedido, id_cliente, productos: productos.length }),
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ [POST pedido] error:", error);
    res.status(500).json({ error: error.message });

  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 ACTUALIZAR PEDIDO
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

    // Actualizar encabezado (no se cambia el creado_por)
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
      [id_cliente, fecha_reserva, fecha_entrega, observaciones,
        id_metodo_pago, id_estado_pedido, id_pedido]
    );

    // Reemplazar detalles
    await client.query(
      `DELETE FROM ventasyreserva.tbl_detalle_pedidos WHERE id_pedido=$1`,
      [id_pedido]
    );

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
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id_pedido, p.id_producto, p.cantidad, precio, p.cantidad * precio, unidad]
      );
    }

    // Recalcular total
    await client.query(
      `SELECT ventasyreserva.fn_actualiza_total_pedido($1);`,
      [id_pedido]
    );

    await client.query("COMMIT");

    res.json({ message: "Pedido actualizado correctamente" });

    // 📋 Bitácora
    const userEmail = req.headers["x-user-email"] || req.headers["X-User-Email"];
    const id_usuario = userEmail ? await findUserId(userEmail) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "ventasyreserva.tbl_pedidos",
      accion: "UPDATE",
      descripcion: `Pedido #${id_pedido} actualizado por ${userEmail || "desconocido"}`,
      detalle: JSON.stringify({ id_pedido, id_cliente, id_estado_pedido, productos: productos.length }),
    });

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

    // 📋 Bitácora
    const userEmail = req.headers["x-user-email"] || req.headers["X-User-Email"];
    const id_usuario = userEmail ? await findUserId(userEmail) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "ventasyreserva.tbl_pedidos",
      accion: "DELETE",
      descripcion: `Pedido #${id_pedido} eliminado por ${userEmail || "desconocido"}`,
      detalle: JSON.stringify({ id_pedido }),
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ [DELETE pedido] error:", error);
    res.status(500).json({ error: error.message });

  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 LISTAR ESTADOS DE PEDIDO
// ============================================================
exports.getEstadosPedido = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id_estado_pedido, nombre
      FROM mantenimiento.tbl_estado_pedido
      ORDER BY id_estado_pedido;
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ [GET estados-pedido] error:", error);
    res.status(500).json({ error: "Error al obtener estados de pedido" });
  }
};
