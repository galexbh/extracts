// ============================================================
// 📁 src/controllers/Mantenimiento/TipoPersonaController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR TODOS LOS TIPOS DE PERSONA
// ============================================================
exports.getTipoPersona = async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL mantenimiento.sp_tipo_persona_listar('cur_tipo_persona')`);
    const result = await pool.query(`FETCH ALL FROM cur_tipo_persona`);
    await pool.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar tipos de persona:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 OBTENER TIPO DE PERSONA POR ID
// ============================================================
exports.getTipoPersonaById = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL mantenimiento.sp_tipo_persona_obtener_por_id('cur_tipo', $1)`, [id]);
    const result = await pool.query(`FETCH ALL FROM cur_tipo`);
    await pool.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tipo de persona no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al obtener tipo de persona:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 INSERTAR TIPO DE PERSONA
// ============================================================
exports.insertTipoPersona = async (req, res) => {
  try {
    const { nombre_tipo } = req.body;

    await pool.query(`CALL mantenimiento.sp_tipo_persona_insertar($1, NULL)`, [nombre_tipo]);

    res.json({ message: "✅ Tipo de persona insertado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar tipo de persona:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR TIPO DE PERSONA
// ============================================================
exports.updateTipoPersona = async (req, res) => {
  const { id_tipo_persona } = req.params;
  const { nombre_tipo } = req.body;

  try {
    await pool.query(`CALL mantenimiento.sp_tipo_persona_actualizar($1, $2)`, [
      id_tipo_persona,
      nombre_tipo,
    ]);

    res.json({ message: "✏️ Tipo de persona actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar tipo de persona:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ELIMINAR TIPO DE PERSONA
// ============================================================
exports.deleteTipoPersona = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`CALL mantenimiento.sp_tipo_persona_eliminar($1)`, [id]);
    res.json({ message: "🗑️ Tipo de persona eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar tipo de persona:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        error: `⚠️ No se puede eliminar el tipo de persona con ID ${id} porque está referenciado por otras tablas.`,
      });
    }

    res.status(500).json({ error: error.message });
  }
};
