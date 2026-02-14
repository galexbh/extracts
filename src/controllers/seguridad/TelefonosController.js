// ============================================================
// 📁 src/controllers/Seguridad/TelefonosController.js
// ============================================================
const { pool } = require("../../db.js");

// ============================================================
// 🔹 LISTAR TELÉFONOS
// ============================================================
// ============================================================
// 🔹 LISTAR TELÉFONOS (versión corregida con transacción)
// ============================================================
exports.getTelefonos = async (req, res) => {
  const client = await pool.connect(); // usamos conexión manual
  try {
    await client.query("BEGIN"); // iniciamos transacción

    await client.query("CALL seguridad.sp_telefonos_listar('cur_telefonos')");
    const result = await client.query("FETCH ALL FROM cur_telefonos");

    await client.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al listar teléfonos:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release(); // liberamos el cliente al pool
  }
};

// ============================================================
// 🔹 OBTENER TELÉFONO POR ID
// ============================================================
exports.getTelefonoById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM seguridad.fn_telefonos_get_by_id($1)`,
      [id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener teléfono:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 INSERTAR TELÉFONO
// ============================================================
exports.insertTelefono = async (req, res) => {
  try {
    const { id_persona, numero, id_tipo_telefono } = req.body;
    await pool.query(
      `CALL seguridad.sp_telefonos_insertar($1, $2, $3)`,
      [id_persona, numero, id_tipo_telefono]
    );
    res.json({ message: "✅ Teléfono insertado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar teléfono:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR TELÉFONO
// ============================================================
exports.updateTelefono = async (req, res) => {
  try {
    const { id_telefono } = req.params;
    const { id_persona, numero, id_tipo_telefono } = req.body;
    await pool.query(
      `CALL seguridad.sp_telefonos_actualizar($1, $2, $3, $4)`,
      [id_telefono, id_persona, numero, id_tipo_telefono]
    );
    res.json({ message: "✅ Teléfono actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar teléfono:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ELIMINAR TELÉFONO
// ============================================================
exports.deleteTelefono = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`CALL seguridad.sp_telefonos_eliminar($1)`, [id]);
    res.json({ message: "✅ Teléfono eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar teléfono:", error);
    res.status(500).json({ error: error.message });
  }
};
