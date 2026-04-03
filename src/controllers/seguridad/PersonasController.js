// ============================================================
// 📁 src/controllers/Seguridad/PersonasController.js
// 🔒 Versión con validación de inputs y bitácora
// ============================================================
const { pool } = require("../../db");
const { registrarBitacora, extractUsername, findUserId } = require("../../utils/bitacora");

// ============================================================
// 🔹 LISTAR TODAS LAS PERSONAS
// ============================================================
exports.getPersonas = async (req, res) => {
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
    res.status(500).json({ error: "Error al listar personas." });
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
    res.status(500).json({ error: "Error al obtener persona." });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 INSERTAR PERSONA (con validación + bitácora)
// ============================================================
exports.insertPersona = async (req, res) => {
  try {
    const { nombre, apellido, identificacion, fecha_nacimiento, genero, tipo_persona } = req.body;
    const username = extractUsername(req);

    // 🛡️ Validaciones backend
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }
    if (!apellido || !apellido.trim()) {
      return res.status(400).json({ error: "El apellido es obligatorio." });
    }
    if (nombre && !/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(nombre.trim())) {
      return res.status(400).json({ error: "El nombre solo debe contener letras." });
    }
    if (apellido && !/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(apellido.trim())) {
      return res.status(400).json({ error: "El apellido solo debe contener letras." });
    }
    if (identificacion && !/^[0-9]{13,14}$/.test(identificacion.trim())) {
      return res.status(400).json({ error: "Identificación debe ser de 13 o 14 dígitos." });
    }

    const result = await pool.query(
      `SELECT seguridad.fn_personas_insertar(
        $1::text, $2::text, $3::text, $4::date, $5::text, $6::integer
      ) AS id_persona;`,
      [nombre.trim(), apellido.trim(), identificacion, fecha_nacimiento, genero, tipo_persona]
    );

    const id_persona = result.rows[0].id_persona;

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_personas",
      accion: "INSERT",
      descripcion: `Persona "${nombre} ${apellido}" creada por ${username || "desconocido"}`,
      detalle: JSON.stringify({ id_persona, nombre, apellido, identificacion, genero }),
    });

    res.json({
      message: "✅ Persona insertada correctamente",
      id_persona,
    });
  } catch (error) {
    console.error("❌ Error al insertar persona:", error);
    res.status(500).json({ error: "Error al insertar persona." });
  }
};

// ============================================================
// 🔹 ACTUALIZAR PERSONA (con validación + bitácora)
// ============================================================
exports.updatePersona = async (req, res) => {
  const { id_persona } = req.params;
  const { nombre, apellido, identificacion, fecha_nacimiento, genero, tipo_persona } = req.body;
  const username = extractUsername(req);

  try {
    // 🛡️ Validaciones backend
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }
    if (!apellido || !apellido.trim()) {
      return res.status(400).json({ error: "El apellido es obligatorio." });
    }

    await pool.query(
      `CALL seguridad.sp_personas_actualizar($1, $2, $3, $4, $5, $6, $7)`,
      [id_persona, nombre.trim(), apellido.trim(), identificacion, fecha_nacimiento, genero, tipo_persona]
    );

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_personas",
      accion: "UPDATE",
      descripcion: `Persona ID ${id_persona} actualizada por ${username || "desconocido"}`,
      detalle: JSON.stringify({ id_persona, nombre, apellido, identificacion, genero }),
    });

    res.json({ message: "✅ Persona actualizada correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar persona:", error);
    res.status(500).json({ error: "Error al actualizar persona." });
  }
};

// ============================================================
// 🔹 ELIMINAR PERSONA (con bitácora)
// ============================================================
exports.deletePersona = async (req, res) => {
  const { id } = req.params;
  const username = extractUsername(req);

  try {
    await pool.query(`CALL seguridad.sp_personas_eliminar($1)`, [id]);

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_personas",
      accion: "DELETE",
      descripcion: `Persona ID ${id} eliminada por ${username || "desconocido"}`,
      detalle: JSON.stringify({ id_persona: id }),
    });

    res.json({ message: "🗑️ Persona eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar persona:", error);
    res.status(500).json({ error: "Error al eliminar persona." });
  }
};
