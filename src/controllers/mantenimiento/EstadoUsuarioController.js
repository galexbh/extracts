// ============================================================
// 📁 src/controllers/mantenimiento/EstadoUsuarioController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR ESTADOS DE USUARIO
// ============================================================
exports.getEstadoUsuario = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Llamamos el procedimiento con cursor INOUT
    await client.query(`CALL mantenimiento.sp_estado_usuario_listar('cur_estado_usuario')`);

    // Recuperamos los datos del mismo cursor
    const result = await client.query(`FETCH ALL FROM cur_estado_usuario`);

    await client.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al listar estados de usuario:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 OBTENER POR ID
// ============================================================
exports.getEstadoUsuarioById = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`CALL mantenimiento.sp_estado_usuario_obtener_por_id('cur_estado', $1)`, [id]);
    const result = await client.query(`FETCH ALL FROM cur_estado`);
    await client.query("COMMIT");

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Estado de usuario no encontrado" });

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al obtener estado de usuario:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 INSERTAR
// ============================================================
exports.insertEstadoUsuario = async (req, res) => {
  try {
    const { nombre_estado } = req.body;
    await pool.query(`CALL mantenimiento.sp_estado_usuario_insertar($1)`, [nombre_estado]);
    res.json({ message: "✅ Estado de usuario insertado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar estado de usuario:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR ESTADO DE USUARIO
// ============================================================
exports.updateEstadoUsuario = async (req, res) => {
  const { id_estado_usuario } = req.params; // ✅ nombre exacto del parámetro
  const { nombre_estado } = req.body;

  try {
    await pool.query(
      `CALL mantenimiento.sp_estado_usuario_actualizar($1, $2)`,
      [id_estado_usuario, nombre_estado]
    );

    res.json({ message: "✏️ Estado de usuario actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar estado de usuario:", error);
    res.status(500).json({ error: error.message });
  }
};
// ============================================================
// 🔹 ELIMINAR
// ============================================================
exports.deleteEstadoUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`CALL mantenimiento.sp_estado_usuario_eliminar($1)`, [id]);
    res.json({ message: "🗑️ Estado de usuario eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar estado de usuario:", error);
    res.status(500).json({ error: error.message });
  }
};
