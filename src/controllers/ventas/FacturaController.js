// ============================================================
// 📁 CONTROLLER: FACTURAS (VERSIÓN FINAL CORRECTA)
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR FACTURAS
// ============================================================
exports.listarFacturas = async (_req, res) => {
  const cursor = "cur_facturas";
  try {
    await pool.query("BEGIN");

    await pool.query(
      `CALL ventasyreserva.sp_listar_facturas($1::refcursor)`,
      [cursor]
    );

    const result = await pool.query(`FETCH ALL FROM ${cursor}`);
    await pool.query("COMMIT");

    res.json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error listando facturas:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 OBTENER FACTURA POR ID
// ============================================================
exports.obtenerFactura = async (req, res) => {
  const { id } = req.params;

  try {
    const facturaQuery = await pool.query(
      `SELECT 
          f.id_factura,
          f.numero_factura,
          f.cai,
          f.fecha_emision,
          f.fecha_vencimiento,

          f.id_cliente,
          c.nombre_cliente AS cliente,
          c.rtn,
          c.direccion AS direccion_entrega,

          f.vendedor,

          ep.nombre_estado AS estado,

          f.subtotal,
          f.descuento_total,
          f.importe_gravado_15,
          f.importe_gravado_18,
          f.isv_15,
          f.isv_18,
          f.importe_exonerado,
          f.importe_exento,
          f.total_a_pagar,
          f.valor_en_letras

        FROM ventasyreserva.tbl_facturas f
        LEFT JOIN ventasyreserva.clientes c 
            ON c.id_cliente = f.id_cliente
        LEFT JOIN mantenimiento.tbl_estado_pago ep
            ON ep.id_estado_pago = f.id_estado_pago

        WHERE f.id_factura = $1`,
      [id]
    );

    if (facturaQuery.rows.length === 0) {
      return res.status(404).json({ error: "Factura no encontrada" });
    }

    const factura = facturaQuery.rows[0];

    // ===== DETALLE DE FACTURA =====
    const detalleQuery = await pool.query(
      `SELECT 
          d.id_detalle_factura,
          d.id_producto,
          p.nombre_producto,
          d.descripcion,
          d.cantidad,
          d.precio_unitario,
          d.descuento_unitario AS descuento,
          d.total
        FROM ventasyreserva.tbl_detalle_facturas d
        LEFT JOIN produccion.tbl_productos p
            ON p.id_producto = d.id_producto
        WHERE d.id_factura = $1`,
      [id]
    );

    res.json({
      factura,
      detalle: detalleQuery.rows,
    });

  } catch (error) {
    console.error("❌ Error obteniendo factura:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 HELPERS
// ============================================================
function calcSub(items) {
  return items.reduce((acc, it) => acc + Number(it.cantidad) * Number(it.precio), 0);
}

function calcDesc(items) {
  return items.reduce((acc, it) => acc + Number(it.descuento || 0), 0);
}

function calcGravado15(items) {
  return calcSub(items) - calcDesc(items);
}

function calcISV15(items, aplica) {
  return aplica ? calcGravado15(items) * 0.15 : 0;
}

function calcTotal(items, aplica) {
  return calcGravado15(items) + calcISV15(items, aplica);
}

// ============================================================
// 🔹 CREAR FACTURA
// ============================================================
exports.crearFactura = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const data = req.body;

    const subtotal = calcSub(data.items);
    const descuento_total = calcDesc(data.items);
    const importe_gravado_15 = calcGravado15(data.items);
    const importe_gravado_18 = 0;
    const isv_15 = calcISV15(data.items, data.aplica_isv_15);
    const isv_18 = 0;
    const importe_exonerado = 0;
    const importe_exento = 0;
    const total_a_pagar = calcTotal(data.items, data.aplica_isv_15);

    const valor_en_letras = "PENDIENTE";
    const id_metodo_pago = 1;

    let id_estado_pago = 1;
    if (data.estado === "Pendiente") id_estado_pago = 3;
    if (data.estado === "Pagada") id_estado_pago = 1;
    if (data.estado === "Anulada") id_estado_pago = 2;

    const id_cambio_cai = 1;

    await client.query(
      `CALL ventasyreserva.sp_insertar_factura(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      )`,
      [
        data.numero_factura,
        data.fecha_emision,
        data.direccion_entrega,
        subtotal,
        descuento_total,
        importe_gravado_15,
        importe_gravado_18,
        isv_15,
        isv_18,
        importe_exonerado,
        importe_exento,
        total_a_pagar,
        valor_en_letras,
        id_metodo_pago,
        id_estado_pago,
        id_cambio_cai,
        data.id_cliente
      ]
    );

    const facID = (await client.query(
      "SELECT MAX(id_factura) AS id FROM ventasyreserva.tbl_facturas"
    )).rows[0].id;

    // GUARDAR DETALLES
    for (const item of data.items) {
      const cant = Number(item.cantidad);
      const precio = Number(item.precio);
      const desc = Number(item.descuento || 0);
      const totalLinea = cant * precio - desc;

      await client.query(
        `INSERT INTO ventasyreserva.tbl_detalle_facturas
            (id_factura, id_producto, descripcion, cantidad, precio_unitario, descuento_unitario, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          facID,
          item.id_producto,
          item.descripcion,
          cant,
          precio,
          desc,
          totalLinea
        ]
      );

      await client.query(
        `CALL inventario.sp_registrar_movimiento_producto($1,$2,$3,$4)`,
        [
          item.id_producto,
          "Salida",
          cant,
          `Salida por factura #${data.numero_factura}`
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Factura creada y stock actualizado" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error creando factura:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 ACTUALIZAR FACTURA
// ============================================================
exports.actualizarFactura = async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const detalleOriginal = await client.query(
      `SELECT id_producto, cantidad
       FROM ventasyreserva.tbl_detalle_facturas
       WHERE id_factura = $1`,
      [id]
    );

    for (const d of detalleOriginal.rows) {
      await client.query(
        `CALL inventario.sp_registrar_movimiento_producto($1,$2,$3,$4)`,
        [
          d.id_producto,
          "Entrada",
          d.cantidad,
          `Reversión por actualización de factura`
        ]
      );
    }

    await client.query(
      `CALL ventasyreserva.sp_actualizar_factura(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
      )`,
      [
        id,
        data.numero_factura,
        data.fecha_emision,
        data.id_pedido,
        data.direccion_entrega,
        data.subtotal,
        data.descuento_total,
        data.importe_gravado_15,
        data.importe_gravado_18,
        data.isv_15,
        data.isv_18,
        data.importe_exonerado,
        data.importe_exento,
        data.total_a_pagar,
        data.valor_en_letras,
        data.id_metodo_pago,
        data.id_estado_pago,
        data.id_cambio_cai
      ]
    );

    // BORRAR DETALLE
    await client.query(
      `DELETE FROM ventasyreserva.tbl_detalle_facturas WHERE id_factura = $1`,
      [id]
    );

    // INSERTAR NUEVO DETALLE
    for (const item of data.items) {
      const cant = Number(item.cantidad);
      const precio = Number(item.precio);
      const desc = Number(item.descuento || 0);
      const totalLinea = cant * precio - desc;

      await client.query(
        `INSERT INTO ventasyreserva.tbl_detalle_facturas
            (id_factura, id_producto, descripcion, cantidad, precio_unitario, descuento_unitario, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          id,
          item.id_producto,
          item.descripcion,
          cant,
          precio,
          desc,
          totalLinea
        ]
      );

      await client.query(
        `CALL inventario.sp_registrar_movimiento_producto($1,$2,$3,$4)`,
        [
          item.id_producto,
          "Salida",
          cant,
          `Salida actualizada por factura`
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Factura actualizada correctamente" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error actualizando factura:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 ELIMINAR FACTURA
// ============================================================
exports.eliminarFactura = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const detalle = await client.query(
      `SELECT id_producto, cantidad
       FROM ventasyreserva.tbl_detalle_facturas
       WHERE id_factura = $1`,
      [id]
    );

    for (const d of detalle.rows) {
      await client.query(
        `CALL inventario.sp_registrar_movimiento_producto($1,$2,$3,$4)`,
        [
          d.id_producto,
          "Entrada",
          d.cantidad,
          `Devolución por anulación de factura`
        ]
      );
    }

    await client.query(
      `CALL ventasyreserva.sp_eliminar_factura($1)`,
      [id]
    );

    await client.query("COMMIT");
    res.json({ message: "Factura eliminada correctamente" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error eliminando factura:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};
