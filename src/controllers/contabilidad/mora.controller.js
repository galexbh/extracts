// ============================================================
// 📄 src/controllers/contabilidad/mora.controller.js
// ============================================================
const { pool } = require("../../db");

// ➕ Insertar mora
exports.insertarMora = async (req, res) => {
  try {
    const { id_credito, dias_mora, id_estado_mora, observaciones } = req.body;
    await pool.query(
      `CALL contabilidad.sp_mora_insertar($1, $2, $3, $4)`,
      [id_credito, dias_mora, id_estado_mora, observaciones]
    );
    res.json({ message: "✅ Mora insertada correctamente" });
  } catch (error) {
    console.error("❌ Error insertando mora:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📋 Listar moras
exports.listarMoras = async (_req, res) => {
  try {
    await pool.query(`BEGIN`);
    await pool.query(`CALL contabilidad.sp_mora_listar('cur_moras')`);
    const result = await pool.query(`FETCH ALL FROM cur_moras`);
    await pool.query(`COMMIT`);
    res.json(result.rows);
  } catch (error) {
    await pool.query(`ROLLBACK`);
    console.error("❌ Error listando moras:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✏️ Actualizar mora
exports.actualizarMora = async (req, res) => {
  try {
    const { id_mora } = req.params;
    const { id_credito, dias_mora, id_estado_mora, observaciones } = req.body;
    await pool.query(
      `CALL contabilidad.sp_mora_actualizar($1, $2, $3, $4, $5)`,
      [id_mora, id_credito, dias_mora, id_estado_mora, observaciones]
    );
    res.json({ message: "✅ Mora actualizada correctamente" });
  } catch (error) {
    console.error("❌ Error actualizando mora:", error);
    res.status(500).json({ error: error.message });
  }
};

// ❌ Eliminar mora
exports.eliminarMora = async (req, res) => {
  try {
    const { id_mora } = req.params;
    await pool.query(`CALL contabilidad.sp_mora_eliminar($1)`, [id_mora]);
    res.json({ message: "✅ Mora eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error eliminando mora:", error);
    res.status(500).json({ error: error.message });
  }
};
