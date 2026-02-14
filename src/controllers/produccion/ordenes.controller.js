// ============================================================
// 📁 CONTROLLER: PRODUCCIÓN — ORDENES DE PRODUCCIÓN
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 1️⃣ LISTAR PEDIDOS PENDIENTES PARA PRODUCCIÓN
// ============================================================
exports.getPedidosPendientes = async (req, res) => {
  try {
    const q = `
      SELECT DISTINCT ON (p.id_pedido)
        p.id_pedido,
        c.nombre_cliente,
        p.fecha_reserva,
        p.fecha_entrega,
        p.observaciones,
        ep.nombre AS estado_pedido,
        op.id_orden,
        COALESCE(ep2.nombre_estado, 'SIN INICIAR') AS estado_produccion
      FROM ventasyreserva.tbl_pedidos p
      JOIN ventasyreserva.clientes c ON c.id_cliente = p.id_cliente
      JOIN mantenimiento.tbl_estado_pedido ep ON ep.id_estado_pedido = p.id_estado_pedido
      LEFT JOIN produccion.tbl_orden_produccion op ON op.id_pedido = p.id_pedido
      LEFT JOIN mantenimiento.tbl_estado_produccion ep2 ON ep2.id_estado_produccion = op.id_estado_produccion
      WHERE p.id_estado_pedido IN (1,2)
      ORDER BY p.id_pedido, op.id_orden DESC;
    `;

    const { rows } = await pool.query(q);
    res.json(rows);

  } catch (err) {
    console.error("🔥 ERROR getPedidosPendientes:", err);
    res.status(500).json({ error: "Error al obtener pedidos pendientes" });
  }
};

// ============================================================
// 2️⃣ TRAER DETALLE DE PEDIDO
// ============================================================
exports.getDetallePedido = async (req, res) => {
  try {
    const { id_pedido } = req.params;

    const q = `
      SELECT 
        d.id_detalle_pedidos,
        d.id_producto,
        pr.nombre_producto AS nombre,
        pr.unidad_medida,
        d.cantidad,
        d.precio_unitario,
        d.subtotal
      FROM ventasyreserva.tbl_detalle_pedidos d
      JOIN produccion.tbl_productos pr ON pr.id_producto = d.id_producto
      WHERE d.id_pedido = $1;
    `;

    const { rows } = await pool.query(q, [id_pedido]);
    res.json(rows);

  } catch (err) {
    console.error("🔥 ERROR getDetallePedido:", err);
    res.status(500).json({ error: "Error al obtener detalle del pedido" });
  }
};

// ============================================================
// 3️⃣ INICIAR ORDEN DE PRODUCCIÓN
// ============================================================
exports.iniciarProduccion = async (req, res) => {
  try {
    const { id_pedido } = req.params;

    const email = req.headers["x-user-email"];
    const u = await pool.query(
      `SELECT id_usuario FROM seguridad.tbl_usuarios WHERE LOWER(username)=LOWER($1)`,
      [email]
    );

    if (u.rowCount === 0)
      return res.status(400).json({ error: "Usuario no encontrado" });

    const id_usuario = u.rows[0].id_usuario;

    const det = await pool.query(
      `SELECT id_producto, cantidad 
       FROM ventasyreserva.tbl_detalle_pedidos 
       WHERE id_pedido=$1`,
      [id_pedido]
    );

    const primer = det.rows[0];

    const insert = await pool.query(
      `
      INSERT INTO produccion.tbl_orden_produccion
      (id_producto, cantidad_producir, id_origen_produccion,
       id_pedido, fecha_inicio, id_estado_produccion, id_usuario, fecha_creacion)
      VALUES ($1,$2,1,$3,NOW(),1,$4,NOW())
      RETURNING id_orden;
      `,
      [primer.id_producto, primer.cantidad, id_pedido, id_usuario]
    );

    res.json({
      message: "Producción iniciada correctamente",
      id_orden: insert.rows[0].id_orden,
    });

  } catch (err) {
    console.error("🔥 ERROR iniciarProduccion:", err);
    res.status(500).json({ error: "Error al iniciar producción" });
  }
};

// ============================================================
// 4️⃣ LISTAR INSUMOS DEL INVENTARIO
// ============================================================
exports.getInsumosInventario = async (_req, res) => {
  try {
    const q = `
      SELECT 
        ii.id_insumo,
        ii.stock_actual,
        ii.stock_minimo,
        ii.stock_maximo,
        ins.nombre_insumo,
        ins.unidad_medida
      FROM inventario.tbl_inventario_insumo ii
      JOIN produccion.tbl_insumos ins ON ins.id_insumo = ii.id_insumo
      ORDER BY ins.nombre_insumo ASC;
    `;

    const { rows } = await pool.query(q);
    res.json(rows);

  } catch (err) {
    console.error("🔥 ERROR getInsumosInventario:", err);
    res.status(500).json({ error: "Error al cargar inventario de insumos" });
  }
};

// ============================================================
// 5️⃣ FINALIZAR PRODUCCIÓN + DESCONTAR INSUMOS + SUMAR PRODUCTO
// ============================================================
exports.registrarInsumosUsados = async (req, res) => {
  const { id_orden } = req.params;
  const { insumos, comentarios } = req.body;

  console.log("📥 RECIBIDO:", { id_orden, insumos, comentarios });

  const usuario = req.headers["x-user-email"] || "Sistema";

  if (!Array.isArray(insumos) || insumos.length === 0) {
    return res.status(400).json({ error: "Insumos vacíos" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ============================================================
    // 🔹 DESCONTAR INSUMOS USADOS + REGISTRAR MOVIMIENTO INSUMO
    // ============================================================
    for (const item of insumos) {
      const { id_insumo, cantidad_utilizada } = item;
      const cant = Number(cantidad_utilizada);

      if (!id_insumo || isNaN(cant) || cant <= 0) {
        throw new Error("Cantidad inválida de insumo");
      }

      const inv = await client.query(
        `SELECT stock_actual 
         FROM inventario.tbl_inventario_insumo 
         WHERE id_insumo = $1`,
        [id_insumo]
      );

      if (inv.rowCount === 0) {
        throw new Error("Insumo no existe en inventario");
      }

      if (Number(inv.rows[0].stock_actual) < cant) {
        throw new Error(`Stock insuficiente para insumo ${id_insumo}`);
      }

      await client.query(
        `INSERT INTO produccion.tbl_consumo_insumo
         (id_orden, id_insumo, cantidad_utilizada, comentario) 
         VALUES ($1,$2,$3,$4)`,
        [id_orden, id_insumo, cant, comentarios]
      );

      await client.query(
        `CALL inventario.sp_registrar_movimiento(
           $1::integer,
           $2::varchar,
           $3::numeric,
           $4::varchar
         );`,
        [id_insumo, "Salida", cant, usuario]
      );
    }

    // ============================================================
    // 🔹 MARCAR ORDEN COMO FINALIZADA
    // ============================================================
    await client.query(
      `UPDATE produccion.tbl_orden_produccion
       SET id_estado_produccion = 3,
           fecha_finalizada      = NOW(),
           comentarios           = COALESCE($2, comentarios)
       WHERE id_orden = $1`,
      [id_orden, comentarios]
    );

    // ============================================================
    // 🔹 SUMAR PRODUCTO TERMINADO (SOLO SP)
    // ============================================================
    const ord = await client.query(
      `SELECT id_producto, cantidad_producir
       FROM produccion.tbl_orden_produccion 
       WHERE id_orden = $1`,
      [id_orden]
    );

    if (ord.rowCount === 0) throw new Error("Orden de producción no encontrada");

    const id_producto = ord.rows[0].id_producto;
    const cantidad_producida = Number(ord.rows[0].cantidad_producir);

    // 👇 SOLO SE LLAMA EL SP — YA SUMA INVENTARIO AUTOMÁTICO
    await client.query(
      `CALL inventario.sp_registrar_movimiento_producto(
         $1::integer,
         'Entrada'::varchar,
         $2::numeric,
         $3::varchar,
         'PRODUCCION'::varchar,
         $4::integer,
         $4::integer
      )`,
      [id_producto, cantidad_producida, usuario, id_orden]
    );

    await client.query("COMMIT");

    res.json({
      message:
        "Producción finalizada, insumos descontados y producto sumado al inventario.",
    });

  } catch (err) {
    console.error("🔥 ERROR registrarInsumosUsados:", err);
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
