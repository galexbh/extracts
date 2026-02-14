// ============================================================
// 📁 src/controllers/Mantenimiento/TipoClienteController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR TODOS LOS TIPOS DE CLIENTE
// ============================================================
exports.getTipoCliente = async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL mantenimiento.sp_listar_tipo_cliente('cur_tipo_cliente')`);
    const result = await pool.query(`FETCH ALL FROM cur_tipo_cliente`);
    await pool.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar tipos de cliente:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 OBTENER TIPO DE CLIENTE POR ID
// ============================================================
exports.getTipoClienteById = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("BEGIN");
    await pool.query(
      `CALL mantenimiento.sp_buscar_tipo_cliente_por_id($1, 'cur_tipo_cliente')`,
      [id]
    );
    const result = await pool.query(`FETCH ALL FROM cur_tipo_cliente`);
    await pool.query("COMMIT");

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Tipo de cliente no encontrado" });

    res.json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al obtener tipo de cliente:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 INSERTAR TIPO DE CLIENTE
// ============================================================
exports.insertTipoCliente = async (req, res) => {
  const { nombre_tipo } = req.body;

  try {
    await pool.query(`CALL mantenimiento.sp_insertar_tipo_cliente($1)`, [nombre_tipo]);
    res.json({ message: "✅ Tipo de cliente insertado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar tipo de cliente:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR TIPO DE CLIENTE
// ============================================================
exports.updateTipoCliente = async (req, res) => {
  const { id_tipo_cliente } = req.params;
  const { nombre_tipo } = req.body;

  try {
    await pool.query(`CALL mantenimiento.sp_actualizar_tipo_cliente($1, $2)`, [
      id_tipo_cliente,
      nombre_tipo,
    ]);
    res.json({ message: "✏️ Tipo de cliente actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar tipo de cliente:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ELIMINAR TIPO DE CLIENTE
// ============================================================
exports.deleteTipoCliente = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`CALL mantenimiento.sp_eliminar_tipo_cliente($1)`, [id]);
    res.json({ message: "🗑️ Tipo de cliente eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar tipo de cliente:", error);
    res.status(500).json({ error: error.message });
  }
};
