// ============================================================
// 📁 src/controllers/Seguridad/PersonasController.js
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR TODAS LAS PERSONAS
// ============================================================
exports.getPersonas = async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL seguridad.sp_personas_listar('cur_personas')`);
    const result = await pool.query(`FETCH ALL FROM cur_personas`);
    await pool.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar personas:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 OBTENER PERSONA POR ID
// ============================================================
exports.getPersonaById = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL seguridad.sp_personas_obtener_por_id('cur_persona', $1)`, [id]);
    const result = await pool.query(`FETCH ALL FROM cur_persona`);
    await pool.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Persona no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al obtener persona:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 INSERTAR PERSONA
// ============================================================
// ============================================================
// 🔹 INSERTAR PERSONA (versión final)
// ============================================================
exports.insertPersona = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      identificacion,
      fecha_nacimiento,
      genero,
      tipo_persona,
    } = req.body;

    const result = await pool.query(
      `SELECT seguridad.fn_personas_insertar(
        $1::text, $2::text, $3::text, $4::date, $5::text, $6::integer
      ) AS id_persona;`,
      [nombre, apellido, identificacion, fecha_nacimiento, genero, tipo_persona]
    );

    const id_persona = result.rows[0].id_persona;

    res.json({
      message: "✅ Persona insertada correctamente",
      id_persona,
    });
  } catch (error) {
    console.error("❌ Error al insertar persona:", error);
    res.status(500).json({ error: error.message });
  }
};


// ============================================================
// 🔹 ACTUALIZAR PERSONA
// ============================================================
exports.updatePersona = async (req, res) => {
  const { id_persona } = req.params;
  const { nombre, apellido, identificacion, fecha_nacimiento, genero, tipo_persona } = req.body;

  try {
    await pool.query(
      `CALL seguridad.sp_personas_actualizar($1, $2, $3, $4, $5, $6, $7)`,
      [id_persona, nombre, apellido, identificacion, fecha_nacimiento, genero, tipo_persona]
    );

    res.json({ message: "✅ Persona actualizada correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar persona:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ELIMINAR PERSONA
// ============================================================
exports.deletePersona = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`CALL seguridad.sp_personas_eliminar($1)`, [id]);

    res.json({ message: "🗑️ Persona eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar persona:", error);
    res.status(500).json({ error: error.message });
  }
};
