// ============================================================
// 📁 src/controllers/compras/OrdenDeCompraController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR ÓRDENES DE COMPRA
// ============================================================
exports.getOrdenesCompra = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        oc.id_orden_compra,
        oc.id_proveedor,
        p.nombre AS nombre_proveedor,
        oc.fecha_orden,
        oc.id_estado_orden_compra,
        e.nombre_estado,
        oc.observacion,
        oc.num_factura_proveedor AS factura_proveedor,
        oc.flete,

        COALESCE((
          SELECT SUM(d.subtotal)
          FROM compras.tbl_detalle_ordencompra d
          WHERE d.id_orden_compra = oc.id_orden_compra
        ), 0) AS total_orden

      FROM compras.tbl_orden_compra oc
      LEFT JOIN compras.tbl_proveedores p 
        ON oc.id_proveedor = p.id_proveedor
      LEFT JOIN mantenimiento.tbl_estado_orden_compra e
        ON oc.id_estado_orden_compra = e.id_estado_orden_compra
      ORDER BY oc.id_orden_compra DESC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al listar órdenes:", error);
    res.status(500).json({ error: "Error al listar órdenes" });
  }
};

// ============================================================
// 🔹 OBTENER ORDEN POR ID
// ============================================================
exports.getOrdenCompraById = async (req, res) => {
  const { id_orden_compra } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        oc.id_orden_compra,
        oc.id_proveedor,
        p.nombre AS nombre_proveedor,
        oc.fecha_orden,
        oc.id_estado_orden_compra,
        e.nombre_estado,
        oc.observacion,
        oc.num_factura_proveedor AS factura_proveedor,
        oc.flete,

        COALESCE((
          SELECT SUM(d.subtotal)
          FROM compras.tbl_detalle_ordencompra d
          WHERE d.id_orden_compra = oc.id_orden_compra
        ), 0) AS total_orden

      FROM compras.tbl_orden_compra oc
      LEFT JOIN compras.tbl_proveedores p 
        ON oc.id_proveedor = p.id_proveedor
      LEFT JOIN mantenimiento.tbl_estado_orden_compra e
        ON oc.id_estado_orden_compra = e.id_estado_orden_compra
      WHERE oc.id_orden_compra = $1;
    `,
      [id_orden_compra]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Orden no encontrada" });

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener orden:", error);
    res.status(500).json({ error: "Error al obtener orden" });
  }
};

// ============================================================
// 🔹 INSERTAR ORDEN
// ============================================================
exports.insertOrdenCompra = async (req, res) => {
  try {
    const {
      id_proveedor,
      id_estado_orden_compra,
      observacion,
      factura_proveedor,
      flete
    } = req.body;

    if (!id_proveedor || !id_estado_orden_compra) {
      return res.status(400).json({
        error: "Los campos proveedor y estado son obligatorios.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO compras.tbl_orden_compra
      (id_proveedor, fecha_orden, id_estado_orden_compra, observacion, num_factura_proveedor, flete)
      VALUES ($1, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Tegucigalpa'), $2, $3, $4, $5)
      RETURNING id_orden_compra, num_factura_proveedor AS factura_proveedor, flete;
      `,
      [
        id_proveedor,
        id_estado_orden_compra,
        observacion,
        factura_proveedor,
        Number(flete) || 0
      ]
    );

    res.status(201).json({
      id_orden_compra: result.rows[0].id_orden_compra,
      factura_proveedor: result.rows[0].factura_proveedor,
      flete: result.rows[0].flete,
      message: "✅ Orden creada correctamente.",
    });
  } catch (error) {
    console.error("❌ Error al insertar orden:", error);
    res.status(500).json({ error: "Error al insertar orden" });
  }
};

// ============================================================
// 🔹 ACTUALIZAR ORDEN (CON MANEJO DE INVENTARIO)
// ============================================================
exports.updateOrdenCompra = async (req, res) => {
  const id_orden_compra = req.params.id_orden_compra || req.params.id;

  const {
    id_proveedor,
    id_estado_orden_compra,
    observacion,
    factura_proveedor,
    fecha_orden,
    flete,
  } = req.body;

  try {
    await pool.query("BEGIN");

    const usuario = req.headers["x-user-email"] || "Sistema";

    // 1️⃣ Obtener estado anterior
    const { rows: prevRows } = await pool.query(
      `SELECT id_estado_orden_compra FROM compras.tbl_orden_compra WHERE id_orden_compra = $1`,
      [id_orden_compra]
    );

    if (!prevRows.length) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    const prevEstadoId = prevRows[0].id_estado_orden_compra;

    // 2️⃣ Actualizar orden
    await pool.query(
      `
      UPDATE compras.tbl_orden_compra
      SET
        id_proveedor = $1,
        id_estado_orden_compra = $2,
        observacion = $3,
        num_factura_proveedor = $4,
        fecha_orden = COALESCE($5, fecha_orden, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Tegucigalpa')),
        flete = $6
      WHERE id_orden_compra = $7
      `,
      [
        id_proveedor,
        id_estado_orden_compra,
        observacion || null,
        factura_proveedor || null,
        fecha_orden || null,
        flete || 0,
        id_orden_compra,
      ]
    );

    // 3️⃣ Nombres de estados
    const { rows: estadosRows } = await pool.query(
      `
      SELECT id_estado_orden_compra, nombre_estado
      FROM mantenimiento.tbl_estado_orden_compra
      WHERE id_estado_orden_compra = ANY($1::int[])
      `,
      [[prevEstadoId, id_estado_orden_compra]]
    );

    const getName = (id) =>
      estadosRows.find((e) => e.id_estado_orden_compra === Number(id))
        ?.nombre_estado || "";

    const prevNombre = getName(prevEstadoId).toUpperCase();
    const nuevoNombre = getName(id_estado_orden_compra).toUpperCase();

    // ============================================================
    // 🔥 MANEJO DE INVENTARIO
    // ============================================================

    if (nuevoNombre === "RECIBIDO") {
      const { rows: detalles } = await pool.query(`
        SELECT id_detalle_oc, id_insumo, cantidad, unidad_medida
        FROM compras.tbl_detalle_ordencompra
        WHERE id_orden_compra = $1
      `, [id_orden_compra]);

      for (const d of detalles) {
        await pool.query(`
          INSERT INTO inventario.tbl_movimientos_insumo
          (id_insumo, tipo_movimiento, cantidad, observacion, usuario_registro, id_detalle_oc, unidad_medida)
          VALUES ($1,'Entrada',$2,'Entrada por orden de compra',$3,$4,$5)
          ON CONFLICT (id_detalle_oc)
          DO UPDATE SET cantidad = EXCLUDED.cantidad,
                        unidad_medida = EXCLUDED.unidad_medida,
                        usuario_registro = EXCLUDED.usuario_registro
        `, [d.id_insumo, d.cantidad, usuario, d.id_detalle_oc, d.unidad_medida]);

        await pool.query(
          `CALL inventario.sp_actualizar_inventario_insumo($1);`,
          [d.id_insumo]
        );
      }
    }

    if (prevNombre === "RECIBIDO" && nuevoNombre !== "RECIBIDO") {
      await pool.query(`
        DELETE FROM inventario.tbl_movimientos_insumo
        WHERE id_detalle_oc IN (
          SELECT id_detalle_oc
          FROM compras.tbl_detalle_ordencompra
          WHERE id_orden_compra = $1
        )
      `, [id_orden_compra]);
    }

    await pool.query("COMMIT");
    res.json({ message: "✅ Orden actualizada correctamente" });

  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al actualizar orden:", error);
    res.status(500).json({ error: "Error al actualizar orden" });
  }
};

// ============================================================
// 🔹 ELIMINAR ORDEN
// ============================================================
exports.deleteOrdenCompra = async (req, res) => {
  const id_orden_compra = req.params.id || req.params.id_orden_compra;

  try {
    await pool.query("BEGIN");

    await pool.query(`CALL compras.sp_eliminar_orden_compra($1)`, [
      id_orden_compra,
    ]);

    await pool.query("COMMIT");

    res.json({
      message: "🗑 Orden eliminada correctamente.",
    });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al eliminar orden:", error);
    res.status(500).json({ error: "Error al eliminar orden" });
  }
};
