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
    const soloLetrasConExtras = /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s\-'.]+$/;
    const identificacionRegex = /^(\d{13}|\d{4}-\d{4}-\d{5})$/;

    // 🛡️ Validaciones backend
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }
    if (!apellido || !apellido.trim()) {
      return res.status(400).json({ error: "El apellido es obligatorio." });
    }
    if (nombre.trim().length < 3 || nombre.trim().length > 100) {
      return res.status(400).json({ error: "El nombre debe tener entre 3 y 100 caracteres." });
    }
    if (apellido.trim().length < 3 || apellido.trim().length > 100) {
      return res.status(400).json({ error: "El apellido debe tener entre 3 y 100 caracteres." });
    }
    if (!soloLetrasConExtras.test(nombre.trim())) {
      return res.status(400).json({ error: "El nombre solo debe contener letras y caracteres permitidos." });
    }
    if (!soloLetrasConExtras.test(apellido.trim())) {
      return res.status(400).json({ error: "El apellido solo debe contener letras y caracteres permitidos." });
    }
    if (!identificacion || !identificacion.trim()) {
      return res.status(400).json({ error: "La identificación es obligatoria." });
    }
    if (!identificacionRegex.test(identificacion.trim())) {
      return res.status(400).json({ error: "La identificación debe ser de 13 dígitos o formato 0000-0000-00000." });
    }
    if (!fecha_nacimiento) {
      return res.status(400).json({ error: "La fecha de nacimiento es obligatoria." });
    }
    const fecha = new Date(fecha_nacimiento);
    const hoy = new Date();
    if (Number.isNaN(fecha.getTime())) {
      return res.status(400).json({ error: "La fecha de nacimiento no es válida." });
    }
    if (fecha > hoy) {
      return res.status(400).json({ error: "La fecha de nacimiento no puede ser futura." });
    }
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const mesDif = hoy.getMonth() - fecha.getMonth();
    if (mesDif < 0 || (mesDif === 0 && hoy.getDate() < fecha.getDate())) {
      edad--;
    }
    if (edad < 18) {
      return res.status(400).json({ error: "La persona debe ser mayor de 18 años." });
    }
    if (!genero || !String(genero).trim()) {
      return res.status(400).json({ error: "El género es obligatorio." });
    }
    if (!tipo_persona) {
      return res.status(400).json({ error: "El tipo de persona es obligatorio." });
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
      tabla: "seguridad.personas",
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
  const soloLetrasConExtras = /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s\-'.]+$/;
  const identificacionRegex = /^(\d{13}|\d{4}-\d{4}-\d{5})$/;

  try {
    // 🛡️ Validaciones backend
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio." });
    }
    if (!apellido || !apellido.trim()) {
      return res.status(400).json({ error: "El apellido es obligatorio." });
    }
    if (nombre.trim().length < 3 || nombre.trim().length > 100) {
      return res.status(400).json({ error: "El nombre debe tener entre 3 y 100 caracteres." });
    }
    if (apellido.trim().length < 3 || apellido.trim().length > 100) {
      return res.status(400).json({ error: "El apellido debe tener entre 3 y 100 caracteres." });
    }
    if (!soloLetrasConExtras.test(nombre.trim())) {
      return res.status(400).json({ error: "El nombre solo debe contener letras y caracteres permitidos." });
    }
    if (!soloLetrasConExtras.test(apellido.trim())) {
      return res.status(400).json({ error: "El apellido solo debe contener letras y caracteres permitidos." });
    }
    if (!identificacion || !identificacion.trim()) {
      return res.status(400).json({ error: "La identificación es obligatoria." });
    }
    if (!identificacionRegex.test(identificacion.trim())) {
      return res.status(400).json({ error: "La identificación debe ser de 13 dígitos o formato 0000-0000-00000." });
    }
    if (!fecha_nacimiento) {
      return res.status(400).json({ error: "La fecha de nacimiento es obligatoria." });
    }
    const fecha = new Date(fecha_nacimiento);
    const hoy = new Date();
    if (Number.isNaN(fecha.getTime())) {
      return res.status(400).json({ error: "La fecha de nacimiento no es válida." });
    }
    if (fecha > hoy) {
      return res.status(400).json({ error: "La fecha de nacimiento no puede ser futura." });
    }
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const mesDif = hoy.getMonth() - fecha.getMonth();
    if (mesDif < 0 || (mesDif === 0 && hoy.getDate() < fecha.getDate())) {
      edad--;
    }
    if (edad < 18) {
      return res.status(400).json({ error: "La persona debe ser mayor de 18 años." });
    }
    if (!genero || !String(genero).trim()) {
      return res.status(400).json({ error: "El género es obligatorio." });
    }
    if (!tipo_persona) {
      return res.status(400).json({ error: "El tipo de persona es obligatorio." });
    }

    // 🔎 Obtener estado anterior para bitácora
    const anterior = await pool.query(`SELECT * FROM seguridad.personas WHERE id_persona = $1`, [id_persona]);
    if (anterior.rows.length === 0) {
      return res.status(404).json({ error: "Persona no encontrada." });
    }

    await pool.query(
      `CALL seguridad.sp_personas_actualizar($1, $2, $3, $4, $5, $6, $7)`,
      [id_persona, nombre.trim(), apellido.trim(), identificacion, fecha_nacimiento, genero, tipo_persona]
    );

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.personas",
      accion: "UPDATE",
      descripcion: `Persona ID ${id_persona} actualizada por ${username || "desconocido"}`,
      detalle: JSON.stringify({
        antes: anterior.rows[0],
        despues: { nombre, apellido, identificacion, fecha_nacimiento, genero, tipo_persona }
      }),
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
    // 🔎 Obtener estado anterior para bitácora
    const anterior = await pool.query(`SELECT * FROM seguridad.personas WHERE id_persona = $1`, [id]);
    if (anterior.rows.length === 0) {
      return res.status(404).json({ error: "Persona no encontrada para eliminar." });
    }

    await pool.query(`CALL seguridad.sp_personas_eliminar($1)`, [id]);

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.personas",
      accion: "DELETE",
      descripcion: `Persona ID ${id} eliminada por ${username || "desconocido"}`,
      detalle: JSON.stringify({ antes: anterior.rows[0], despues: null }),
    });

    res.json({ message: "🗑️ Persona eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar persona:", error);
    res.status(500).json({ error: "Error al eliminar persona." });
  }
};
