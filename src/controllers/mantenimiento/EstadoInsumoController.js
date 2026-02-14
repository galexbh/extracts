const { pool } = require("../../db");
// ============================================================
// 🔹 LISTAR ESTADOS DE INSUMO
// ============================================================
exports.getEstadosInsumo = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CALL mantenimiento.sp_estado_insumo_listar('p_cursor');`);
    const result = await client.query(`FETCH ALL IN "p_cursor";`);
    await client.query("COMMIT");
    res.json(result.rows);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error al obtener estados de insumo:", err);
    res.status(500).json({ error: "Error al obtener estados de insumo" });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 INSERTAR ESTADO DE INSUMO
// ============================================================
exports.insertEstadoInsumo = async (req, res) => {
  try {
    const { nombre_estado } = req.body;
    await pool.query(`CALL mantenimiento.sp_estado_insumo_insertar($1);`, [nombre_estado]);
    res.status(201).json({ message: "✅ Estado de insumo agregado correctamente" });
  } catch (err) {
    console.error("❌ Error al insertar estado de insumo:", err.message);
    res.status(500).json({ error: "Error al insertar estado de insumo" });
  }
};

// ============================================================
// 🔹 EDITAR ESTADO DE INSUMO
// ============================================================
exports.updateEstadoInsumo = async (req, res) => {
  try {
    const { id_estado_insumo } = req.params;
    const { nombre_estado } = req.body;
    await pool.query(`CALL mantenimiento.sp_estado_insumo_editar($1,$2);`, [
      id_estado_insumo,
      nombre_estado,
    ]);
    res.json({ message: "✏️ Estado de insumo actualizado correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar estado de insumo:", err.message);
    res.status(500).json({ error: "Error al actualizar estado de insumo" });
  }
};

// ============================================================
// 🔹 ELIMINAR ESTADO DE INSUMO
// ============================================================
exports.deleteEstadoInsumo = async (req, res) => {
  try {
    const { id_estado_insumo } = req.params;
    await pool.query(`CALL mantenimiento.sp_estado_insumo_eliminar($1);`, [id_estado_insumo]);
    res.json({ message: "🗑️ Estado de insumo eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar estado de insumo:", err.message);
    res.status(500).json({ error: "Error al eliminar estado de insumo" });
  }
};
