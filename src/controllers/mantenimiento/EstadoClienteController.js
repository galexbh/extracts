// ============================================================
// 📁 src/controllers/Mantenimiento/EstadoClienteController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR TODOS LOS ESTADOS DE CLIENTE
// ============================================================
exports.getEstadosCliente = async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL mantenimiento.sp_listar_estado_cliente('cur_estado_cliente')`);
    const result = await pool.query(`FETCH ALL FROM cur_estado_cliente`);
    await pool.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar estados de cliente:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 OBTENER ESTADO DE CLIENTE POR ID
// ============================================================
exports.getEstadoClienteById = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("BEGIN");
    await pool.query(
      `CALL mantenimiento.sp_buscar_estado_cliente_por_id($1, 'cur_estado_cliente')`,
      [id]
    );
    const result = await pool.query(`FETCH ALL FROM cur_estado_cliente`);
    await pool.query("COMMIT");

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Estado de cliente no encontrado" });

    res.json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al obtener estado de cliente:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 INSERTAR NUEVO ESTADO DE CLIENTE
// ============================================================
exports.insertEstadoCliente = async (req, res) => {
  const { nombre_estado } = req.body;

  try {
    await pool.query(`CALL mantenimiento.sp_insertar_estado_cliente($1)`, [nombre_estado]);
    res.json({ message: "✅ Estado de cliente insertado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar estado de cliente:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR ESTADO DE CLIENTE
// ============================================================
exports.updateEstadoCliente = async (req, res) => {
  const { id_estado_cliente } = req.params;
  const { nombre_estado } = req.body;

  try {
    await pool.query(
      `CALL mantenimiento.sp_actualizar_estado_cliente($1, $2)`,
      [id_estado_cliente, nombre_estado]
    );
    res.json({ message: "✏️ Estado de cliente actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar estado de cliente:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ELIMINAR ESTADO DE CLIENTE
// ============================================================
exports.deleteEstadoCliente = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`CALL mantenimiento.sp_eliminar_estado_cliente($1)`, [id]);
    res.json({ message: "🗑️ Estado de cliente eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar estado de cliente:", error);
    res.status(500).json({ error: error.message });
  }
};
