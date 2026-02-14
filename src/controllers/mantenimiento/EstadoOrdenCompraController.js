// ============================================================
// 📁 src/controllers/mantenimiento/EstadoOrdenCompraController.js
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 Listar estados de orden de compra
// ============================================================
exports.getEstadosOrdenCompra = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1️⃣ Llamamos el procedimiento y abrimos el cursor
    await client.query(`CALL mantenimiento.sp_estado_orden_compra_listar('p_cursor');`);

    // 2️⃣ Leemos el cursor dentro de la misma sesión
    const result = await client.query(`FETCH ALL IN "p_cursor";`);

    await client.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al listar estados de orden de compra:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 Insertar estado
// ============================================================
exports.insertEstadoOrdenCompra = async (req, res) => {
  const { nombre_estado } = req.body;
  try {
    await pool.query(`CALL mantenimiento.sp_estado_orden_compra_insertar($1);`, [nombre_estado]);
    res.json({ message: "✅ Estado de orden de compra agregado correctamente." });
  } catch (error) {
    console.error("❌ Error al insertar estado de orden de compra:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 Actualizar estado
// ============================================================
exports.updateEstadoOrdenCompra = async (req, res) => {
  const { id_estado_orden_compra } = req.params;
  const { nombre_estado } = req.body;
  try {
    await pool.query(`CALL mantenimiento.sp_estado_orden_compra_editar($1, $2);`, [
      id_estado_orden_compra,
      nombre_estado,
    ]);
    res.json({ message: "✅ Estado de orden de compra actualizado correctamente." });
  } catch (error) {
    console.error("❌ Error al actualizar estado de orden de compra:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 Eliminar estado
// ============================================================
exports.deleteEstadoOrdenCompra = async (req, res) => {
  const { id_estado_orden_compra } = req.params;
  try {
    await pool.query(`CALL mantenimiento.sp_estado_orden_compra_eliminar($1);`, [id_estado_orden_compra]);
    res.json({ message: "🗑️ Estado de orden de compra eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error al eliminar estado de orden de compra:", error);
    res.status(500).json({ error: error.message });
  }
};
