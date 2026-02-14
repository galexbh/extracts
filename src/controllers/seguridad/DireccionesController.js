// ============================================================
// 📁 src/controllers/Seguridad/DireccionesController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR TODAS LAS DIRECCIONES
// ============================================================
exports.getDirecciones = async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL seguridad.sp_direcciones_listar('cur_direcciones')`);
    const result = await pool.query(`FETCH ALL FROM cur_direcciones`);
    await pool.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar direcciones:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 OBTENER DIRECCIÓN POR ID
// ============================================================
exports.getDireccionById = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL seguridad.sp_direcciones_obtener_por_id('cur_direccion', $1)`, [id]);
    const result = await pool.query(`FETCH ALL FROM cur_direccion`);
    await pool.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dirección no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al obtener dirección:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 INSERTAR DIRECCIÓN
// ============================================================
exports.insertDireccion = async (req, res) => {
  try {
    const { id_persona, direccion, ciudad, departamento, pais } = req.body;

    await pool.query(
      `CALL seguridad.sp_direcciones_insertar($1, $2, $3, $4, $5, NULL)`,
      [id_persona, direccion, ciudad, departamento, pais]
    );

    res.json({ message: "✅ Dirección insertada correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar dirección:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR DIRECCIÓN
// ============================================================
exports.updateDireccion = async (req, res) => {
  const { id_direccion } = req.params;
  const { id_persona, direccion, ciudad, departamento, pais } = req.body;

  try {
    await pool.query(
      `CALL seguridad.sp_direcciones_actualizar($1, $2, $3, $4, $5, $6)`,
      [id_direccion, id_persona, direccion, ciudad, departamento, pais]
    );

    res.json({ message: "✅ Dirección actualizada correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar dirección:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ELIMINAR DIRECCIÓN
// ============================================================
exports.deleteDireccion = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`CALL seguridad.sp_direcciones_eliminar($1)`, [id]);
    res.json({ message: "🗑️ Dirección eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar dirección:", error);

    if (error.code === "23503") {
      // Mensaje personalizado si está referenciada
      return res.status(400).json({
        error: `⚠️ No se puede eliminar la dirección con ID ${req.params.id} porque está referenciada por otras tablas.`,
      });
    }

    res.status(500).json({ error: error.message });
  }
};
