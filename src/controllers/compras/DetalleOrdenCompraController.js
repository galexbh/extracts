// ============================================================
// 📁 src/controllers/compras/DetalleOrdenCompraController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔧 Helpers internos
// ============================================================

// 🔹 Obtiene el nombre del estado de la orden (Pendiente, Recibido, etc.)
async function obtenerNombreEstadoOrden(idOrden) {
  const { rows } = await pool.query(
    `
    SELECT e.nombre_estado
    FROM compras.tbl_orden_compra oc
    JOIN mantenimiento.tbl_estado_orden_compra e
      ON e.id_estado_orden_compra = oc.id_estado_orden_compra
    WHERE oc.id_orden_compra = $1
    `,
    [idOrden]
  );
  return rows[0]?.nombre_estado || null;
}

// 🔹 Obtiene id_orden_compra a partir del detalle
async function obtenerOrdenPorDetalle(idDetalle) {
  const { rows } = await pool.query(
    `
    SELECT id_orden_compra
    FROM compras.tbl_detalle_ordencompra
    WHERE id_detalle_oc = $1
    `,
    [idDetalle]
  );
  return rows[0]?.id_orden_compra || null;
}

// 🔹 Sincroniza la tabla inventario.tbl_movimientos_insumo con un detalle
//    accion = 'upsert' -> inserta o actualiza Entrada
//    accion = 'delete' -> borra la Entrada
async function syncMovimientoEntradaDetalle(
  { id_detalle_oc, id_insumo, cantidad, usuario },
  accion = "upsert"
) {
  usuario = usuario || "Sistema";  // ⬅️ default SI NO VIENE

  if (!id_detalle_oc) return;

  if (accion === "delete") {
    await pool.query(
      `
      DELETE FROM inventario.tbl_movimientos_insumo
      WHERE id_detalle_oc = $1
        AND tipo_movimiento = 'Entrada'
      `,
      [id_detalle_oc]
    );
    return;
  }

  const { rows } = await pool.query(
    `
    SELECT id_movimiento
    FROM inventario.tbl_movimientos_insumo
    WHERE id_detalle_oc = $1
      AND tipo_movimiento = 'Entrada'
    `,
    [id_detalle_oc]
  );

  if (rows.length) {
    await pool.query(
      `
      UPDATE inventario.tbl_movimientos_insumo
      SET cantidad = $1,
          usuario_registro = $3
      WHERE id_detalle_oc = $2
        AND tipo_movimiento = 'Entrada'
      `,
      [cantidad, id_detalle_oc, usuario]
    );
  } else {
    await pool.query(
      `
      INSERT INTO inventario.tbl_movimientos_insumo
      (id_insumo, tipo_movimiento, cantidad, observacion, usuario_registro, id_detalle_oc)
      VALUES ($1,'Entrada',$2,'Entrada por orden de compra',$3,$4)
      `,
      [id_insumo, cantidad, usuario, id_detalle_oc]
    );
  }
}

// ============================================================
// 🔹 LISTAR TODOS LOS DETALLES
// ============================================================
exports.getDetallesOrdenCompra = async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query(
      "CALL compras.sp_detalleordencompra_listar('cur_detalles')"
    );
    const result = await pool.query("FETCH ALL FROM cur_detalles");
    await pool.query("COMMIT");
    res.status(200).json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar detalles:", error);
    res.status(500).json({ error: "Error al listar detalles" });
  }
};

// ============================================================
// 🔹 OBTENER DETALLE POR ID
// ============================================================
exports.getDetalleOrdenCompraById = async (req, res) => {
  const { id_detalle_oc } = req.params;
  try {
    await pool.query("BEGIN");
    await pool.query(
      "CALL compras.sp_detalleordencompra_por_id($1, 'cur_detalle')",
      [id_detalle_oc]
    );
    const result = await pool.query("FETCH ALL FROM cur_detalle");
    await pool.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Detalle no encontrado" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al obtener detalle:", error);
    res.status(500).json({ error: "Error al obtener detalle" });
  }
};

// ============================================================
// 🔹 INSERTAR DETALLE
//   SI la orden está RECIBIDA → crea movimiento de ENTRADA
//   SI la orden está PENDIENTE → NO crea movimiento aún
// ============================================================
exports.insertDetalleOrdenCompra = async (req, res) => {
  try {
     const usuario = req.headers["x-user-email"] || "Sistema";

    const {
      id_orden_compra,
      id_insumo,
      cantidad,
      precio_unitario,
      descuento,
      unidad_medida,
      categoria_impuesto,
      tasa_impuesto,
    } = req.body;

    await pool.query("BEGIN");

    // 1️⃣ Insertar detalle usando tu SP
    await pool.query(
      "CALL compras.sp_insertar_detalle_compra($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id_orden_compra,
        id_insumo,
        cantidad,
        precio_unitario,
        descuento || 0,
        unidad_medida || null,
        categoria_impuesto || "Gravado 15%",
        tasa_impuesto || 15,
      ]
    );

    // 2️⃣ Obtener el último id_detalle_oc insertado (misma secuencia)
    const { rows: seqRows } = await pool.query(
      "SELECT currval('compras.tbl_detalle_ordencompra_id_detalle_oc_seq') AS id_detalle_oc"
    );
    const id_detalle_oc = seqRows[0]?.id_detalle_oc;

    // 3️⃣ Verificar estado de la orden
    const nombreEstado = await obtenerNombreEstadoOrden(id_orden_compra);

    // 4️⃣ Si la orden está RECIBIDA, sincronizar inventario (Entrada)
    if (nombreEstado && nombreEstado.toUpperCase() === "RECIBIDO") {
 await syncMovimientoEntradaDetalle(
  { id_detalle_oc, id_insumo, cantidad, usuario },
  "upsert"
);
    }

    await pool.query("COMMIT");

    res.status(201).json({
      message: "✅ Detalle insertado correctamente",
      id_detalle_oc,
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al insertar detalle:", error);
    res.status(500).json({ error: "Error al insertar detalle" });
  }
};

// ============================================================
// 🔹 ACTUALIZAR DETALLE
//   - Si orden = RECIBIDO → actualiza Entrada
//   - Si orden = PENDIENTE → borra cualquier Entrada que hubiera
//   ❗ No se crean SALIDAS por diferencia (20 → 10), solo se ajusta la Entrada
// ============================================================
exports.updateDetalleOrdenCompra = async (req, res) => {
  const { id_detalle_oc } = req.params;
  const usuario = req.headers["x-user-email"] || "Sistema";

  const {
    id_insumo,
    cantidad,
    precio_unitario,
    descuento,
    unidad_medida,
    categoria_impuesto,
    tasa_impuesto,
  } = req.body;

  try {
    await pool.query("BEGIN");

    // 1️⃣ Actualizar detalle con SP
    await pool.query(
      "CALL compras.sp_detalle_compra_actualizar($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id_detalle_oc,
        id_insumo,
        cantidad,
        precio_unitario,
        descuento,
        unidad_medida,
        categoria_impuesto,
        tasa_impuesto,
      ]
    );

    // 2️⃣ Obtener orden dueña
    const id_orden_compra = await obtenerOrdenPorDetalle(id_detalle_oc);
    const nombreEstado = await obtenerNombreEstadoOrden(id_orden_compra);

    if (nombreEstado?.toUpperCase() === "RECIBIDO") {
      // 🔄 Actualizar Entrada
      await syncMovimientoEntradaDetalle(
        { id_detalle_oc, id_insumo, cantidad, usuario },
        "upsert"
      );

      // 🔥 Recalcular inventario del insumo afectado
      await pool.query(
        "CALL inventario.sp_actualizar_inventario_insumo($1)",
        [id_insumo]
      );
    } else {
      // Si no es recibido → eliminar movimientos
      await syncMovimientoEntradaDetalle({ id_detalle_oc }, "delete");
    }

    await pool.query("COMMIT");

    res.json({ message: "✅ Detalle actualizado correctamente" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al actualizar detalle:", error);
    res.status(500).json({ error: "Error al actualizar detalle" });
  }
};

// ============================================================
// 🔹 ELIMINAR DETALLE
//   Siempre borra la Entrada asociada (si existiera)
// ============================================================
exports.deleteDetalleOrdenCompra = async (req, res) => {
  const { id_detalle_oc } = req.params;

  try {
    await pool.query("BEGIN");

    // 1️⃣ Eliminar detalle con tu SP
    await pool.query("CALL compras.sp_eliminar_detalle_compra($1)", [
      id_detalle_oc,
    ]);

    // 2️⃣ Borrar movimiento de inventario asociado (Entrada)
    await syncMovimientoEntradaDetalle(
      { id_detalle_oc },
      "delete"
    );

    await pool.query("COMMIT");

    res.json({ message: "🗑️ Detalle eliminado correctamente" });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al eliminar detalle:", error);
    res.status(500).json({ error: "Error al eliminar detalle" });
  }
};

// ============================================================
// 🔹 LISTAR DETALLES POR ORDEN
// ============================================================
exports.getDetallesByOrden = async (req, res) => {
  const { id_orden_compra } = req.params;

  try {
    await pool.query("BEGIN");
    await pool.query(
      "CALL compras.sp_detalleordencompra_por_orden($1, 'cur_detalles')",
      [id_orden_compra]
    );
    const result = await pool.query("FETCH ALL FROM cur_detalles");
    await pool.query("COMMIT");

    res.status(200).json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar detalles por orden:", error);
    res.status(500).json({ error: "Error al listar detalles por orden" });
  }
};
