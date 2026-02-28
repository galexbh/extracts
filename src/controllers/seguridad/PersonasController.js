// ============================================================
// 📁 src/controllers/Seguridad/PersonasController.js
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR TODAS LAS PERSONAS
// ============================================================
exports.getPersonas = async (req, res) => {
  // Bug fix: usar client dedicado para que BEGIN/cursor/FETCH/COMMIT
  // ocurran SIEMPRE en la misma conexión del pool.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CALL seguridad.sp_personas_listar('cur_personas')`);
    const result = await client.query(`FETCH ALL FROM cur_personas`);
    await client.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => { });
    console.error("[API] \u274c Error al listar personas:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 OBTENER PERSONA POR ID
// ============================================================
exports.getPersonaById = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `CALL seguridad.sp_personas_obtener_por_id('cur_persona', $1)`,
      [id]
    );
    const result = await client.query(`FETCH ALL FROM cur_persona`);
    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Persona no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => { });
    console.error("[API] \u274c Error al obtener persona:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
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
