// ============================================================
// 📁 CONTROLLER: PAGOS DE FACTURA (VERSIÓN FINAL)
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 Helper: recalcular estado de la factura
// ============================================================
async function recalcularEstadoFactura(id_factura, client) {
  const db = client || pool;

  // Obtener total
  const facRes = await db.query(
    `SELECT total_a_pagar, id_estado_pago
     FROM ventasyreserva.tbl_facturas
     WHERE id_factura = $1`,
    [id_factura]
  );

  if (facRes.rows.length === 0) return null;

  const total = Number(facRes.rows[0].total_a_pagar) || 0;

  // Pagos
  const pagosRes = await db.query(
    `SELECT COALESCE(SUM(monto_pagado), 0) AS total_pagado
     FROM ventasyreserva.tbl_pagos_factura
     WHERE id_factura = $1`,
    [id_factura]
  );

  const total_pagado = Number(pagosRes.rows[0].total_pagado) || 0;
  const saldo = total - total_pagado;

  let id_estado_pago = 3; // pendiente

  if (saldo <= 0.01) id_estado_pago = 1; // pagada

  // Actualizar estado
  await db.query(
    `UPDATE ventasyreserva.tbl_facturas
       SET id_estado_pago = $1
     WHERE id_factura = $2`,
    [id_estado_pago, id_factura]
  );

  return { total, total_pagado, saldo, id_estado_pago };
}

// ============================================================
// 🔹 LISTAR RESUMEN PARA TABLA PRINCIPAL
// ============================================================
exports.listarResumenFacturasConPagos = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.id_factura,
        f.numero_factura,
        f.fecha_emision,
        c.nombre_cliente AS cliente,
        f.total_a_pagar AS total_factura,
        COALESCE(SUM(p.monto_pagado), 0) AS total_pagado,
        f.total_a_pagar - COALESCE(SUM(p.monto_pagado), 0) AS saldo_pendiente,
        ep.nombre_estado AS estado,
        MAX(mp.nombre_metodo) AS metodo_ultimo_pago,
        MAX(p.almacen) AS almacen_ultimo_pago
      FROM ventasyreserva.tbl_facturas f
      LEFT JOIN ventasyreserva.clientes c
        ON c.id_cliente = f.id_cliente
      LEFT JOIN ventasyreserva.tbl_pagos_factura p
        ON p.id_factura = f.id_factura
      LEFT JOIN mantenimiento.tbl_metodo_pago mp
        ON mp.id_metodo_pago = p.id_metodo_pago
      LEFT JOIN mantenimiento.tbl_estado_pago ep
        ON ep.id_estado_pago = f.id_estado_pago
      GROUP BY 
        f.id_factura,
        f.numero_factura,
        f.fecha_emision,
        c.nombre_cliente,
        f.total_a_pagar,
        ep.nombre_estado
      ORDER BY f.fecha_emision DESC, f.numero_factura DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error listando resumen:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 LISTAR PAGOS POR FACTURA PARA MODAL DETALLE
// ============================================================
exports.listarPagosPorFactura = async (req, res) => {
  const { id_factura } = req.params;

  try {
    // Cabecera
    const cabeceraRes = await pool.query(
      `
      SELECT 
        f.id_factura,
        f.numero_factura,
        f.fecha_emision,
        c.nombre_cliente AS cliente,
        f.total_a_pagar AS total_factura,
        COALESCE(SUM(p.monto_pagado), 0) AS total_pagado,
        f.total_a_pagar - COALESCE(SUM(p.monto_pagado), 0) AS saldo_pendiente,
        ep.nombre_estado AS estado
      FROM ventasyreserva.tbl_facturas f
      LEFT JOIN ventasyreserva.clientes c
        ON c.id_cliente = f.id_cliente
      LEFT JOIN ventasyreserva.tbl_pagos_factura p
        ON p.id_factura = f.id_factura
      LEFT JOIN mantenimiento.tbl_estado_pago ep
        ON ep.id_estado_pago = f.id_estado_pago
      WHERE f.id_factura = $1
      GROUP BY 
        f.id_factura,
        f.numero_factura,
        f.fecha_emision,
        c.nombre_cliente,
        f.total_a_pagar,
        ep.nombre_estado
      `,
      [id_factura]
    );

    if (cabeceraRes.rows.length === 0) {
      return res.status(404).json({ error: "Factura no encontrada" });
    }

    // Pagos
    const pagosRes = await pool.query(
      `
      SELECT 
        p.id_pago,
        p.id_factura,
        p.fecha_pago,
        p.monto_pagado,
        mp.nombre_metodo,
        p.observacion,
        p.almacen,
        p.usuario_registro,
        p.fecha_registro
      FROM ventasyreserva.tbl_pagos_factura p
      LEFT JOIN mantenimiento.tbl_metodo_pago mp
        ON mp.id_metodo_pago = p.id_metodo_pago
      WHERE p.id_factura = $1
      ORDER BY p.fecha_pago ASC, p.id_pago ASC
      `,
      [id_factura]
    );

    res.json({
      factura: cabeceraRes.rows[0],
      pagos: pagosRes.rows,
    });
  } catch (error) {
    console.error("❌ Error listando detalle:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 CREAR PAGO (versión final con id_metodo_pago)
// ============================================================
exports.crearPago = async (req, res) => {
  const { id_factura, fecha_pago, monto_pagado, id_metodo_pago, observacion, almacen } =
    req.body;

  if (!id_factura || !monto_pagado || !almacen || !id_metodo_pago) {
    return res.status(400).json({
      error: "id_factura, monto_pagado, id_metodo_pago y almacen son obligatorios",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertRes = await client.query(
      `
      INSERT INTO ventasyreserva.tbl_pagos_factura
        (id_factura, fecha_pago, monto_pagado, id_metodo_pago, observacion, almacen)
      VALUES 
        ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6)
      RETURNING *
      `,
      [
        id_factura,
        fecha_pago || null,
        Number(monto_pagado),
        Number(id_metodo_pago),
        observacion || null,
        almacen,
      ]
    );

    const resumen = await recalcularEstadoFactura(id_factura, client);

    await client.query("COMMIT");

    res.json({
      message: "Pago registrado correctamente",
      pago: insertRes.rows[0],
      resumen,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error creando pago:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 ELIMINAR PAGO
// ============================================================
exports.eliminarPago = async (req, res) => {
  const { id_pago } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const pagoRes = await client.query(
      `SELECT id_factura FROM ventasyreserva.tbl_pagos_factura WHERE id_pago = $1`,
      [id_pago]
    );

    if (pagoRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    const id_factura = pagoRes.rows[0].id_factura;

    await client.query(
      `DELETE FROM ventasyreserva.tbl_pagos_factura WHERE id_pago = $1`,
      [id_pago]
    );

    const resumen = await recalcularEstadoFactura(id_factura, client);

    await client.query("COMMIT");

    res.json({
      message: "Pago eliminado correctamente",
      resumen,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error eliminando pago:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};
