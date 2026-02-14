// ============================================================
// 📁 src/controllers/Mantenimiento/EstadoProveedorController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR TODOS LOS ESTADOS DE PROVEEDOR
// ============================================================
exports.getEstadosProveedor = async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL mantenimiento.sp_estado_proveedor_listar('cur_estado_proveedor')`);
    const result = await pool.query(`FETCH ALL FROM cur_estado_proveedor`);
    await pool.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar estados de proveedor:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 OBTENER ESTADO DE PROVEEDOR POR ID
// ============================================================
exports.getEstadoProveedorById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM mantenimiento.tbl_estado_proveedor WHERE id_estado_proveedor = $1`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Estado de proveedor no encontrado" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener estado de proveedor:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 INSERTAR NUEVO ESTADO DE PROVEEDOR
// ============================================================
exports.insertEstadoProveedor = async (req, res) => {
  const { nombre_estado } = req.body;

  try {
    await pool.query(`CALL mantenimiento.sp_estado_proveedor_insertar($1)`, [nombre_estado]);
    res.json({ message: "✅ Estado de proveedor insertado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar estado de proveedor:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR ESTADO DE PROVEEDOR
// ============================================================
exports.updateEstadoProveedor = async (req, res) => {
  const { id_estado_proveedor } = req.params;
  const { nombre_estado } = req.body;

  try {
    await pool.query(
      `CALL mantenimiento.sp_estado_proveedor_editar($1, $2)`,
      [id_estado_proveedor, nombre_estado]
    );
    res.json({ message: "✏️ Estado de proveedor actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar estado de proveedor:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ELIMINAR ESTADO DE PROVEEDOR
// ============================================================
exports.deleteEstadoProveedor = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`CALL mantenimiento.sp_estado_proveedor_eliminar($1)`, [id]);
    res.json({ message: "🗑️ Estado de proveedor eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar estado de proveedor:", error);
    res.status(500).json({ error: error.message });
  }
};
