// ============================================================
// 📁 src/controllers/mantenimiento/EstadoInventarioInsumo.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR TODOS LOS ESTADOS DE INVENTARIO DE INSUMO
// ============================================================
exports.getEstadosInventarioInsumo = async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL mantenimiento.sp_estado_inventario_insumo_listar('cur_estado_inventario_insumo')`);
    const result = await pool.query(`FETCH ALL FROM cur_estado_inventario_insumo`);
    await pool.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar estados de inventario de insumo:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 OBTENER POR ID
// ============================================================
exports.getEstadoInventarioInsumoById = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("BEGIN");
    await pool.query(
      `CALL mantenimiento.sp_estado_inventario_insumo_obtenerporid($1, 'cur_estado_inventario_insumo')`,
      [id]
    );
    const result = await pool.query(`FETCH ALL FROM cur_estado_inventario_insumo`);
    await pool.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Estado de inventario de insumo no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al obtener estado de inventario de insumo por ID:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 INSERTAR NUEVO ESTADO
// ============================================================
exports.insertEstadoInventarioInsumo = async (req, res) => {
  const { nombre_estado } = req.body;

  try {
    await pool.query(`CALL mantenimiento.sp_estado_inventario_insumo_insertar($1)`, [nombre_estado]);
    res.json({ message: "✅ Estado de inventario de insumo insertado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar estado de inventario de insumo:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR ESTADO
// ============================================================
exports.updateEstadoInventarioInsumo = async (req, res) => {
  const { id_estado_inventario_insumo } = req.params;
  const { nombre_estado } = req.body;

  try {
    await pool.query(
      `CALL mantenimiento.sp_estado_inventario_insumo_editar($1, $2)`,
      [id_estado_inventario_insumo, nombre_estado]
    );
    res.json({ message: "✏️ Estado de inventario de insumo actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar estado de inventario de insumo:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ELIMINAR ESTADO
// ============================================================
exports.deleteEstadoInventarioInsumo = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`CALL mantenimiento.sp_estado_inventario_insumo_eliminar($1)`, [id]);
    res.json({ message: "🗑️ Estado de inventario de insumo eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar estado de inventario de insumo:", error);
    res.status(500).json({ error: error.message });
  }
};
