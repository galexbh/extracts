// ============================================================
// 📁 src/controllers/Seguridad/CorreosController.js
// 🔒 Convertido a CommonJS + validación + bitácora
// ============================================================
const { pool } = require("../../db");
const { registrarBitacora, extractUsername, findUserId } = require("../../utils/bitacora");

/* ============================================================
   📋 LISTAR TODOS LOS CORREOS
   ============================================================ */
exports.getCorreos = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM seguridad.fn_correos_get_all()`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener correos:", error);
    res.status(500).json({ error: "Error al obtener correos." });
  }
};

/* ============================================================
   📋 OBTENER CORREO POR ID
   ============================================================ */
exports.getCorreoById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM seguridad.fn_correos_get_by_id($1)`, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Correo no encontrado." });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener correo:", error);
    res.status(500).json({ error: "Error al obtener correo." });
  }
};

/* ============================================================
   ➕ INSERTAR CORREO (con validación + bitácora)
   ============================================================ */
exports.insertCorreo = async (req, res) => {
  try {
    const { id_persona, correo } = req.body;
    const username = extractUsername(req);

    if (!id_persona || !correo)
      return res.status(400).json({ error: "Debe indicar la persona y el correo electrónico." });

    // 🛡️ Validar formato de email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(correo.trim())) {
      return res.status(400).json({ error: "El formato del correo electrónico no es válido." });
    }

    await pool.query(`CALL seguridad.sp_correos_insert($1, $2)`, [id_persona, correo.trim()]);

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_correos",
      accion: "INSERT",
      descripcion: `Correo "${correo}" creado para persona ID ${id_persona} por ${username || "desconocido"}`,
      detalle: JSON.stringify({ id_persona, correo }),
    });

    res.json({ message: "✅ Correo insertado correctamente." });
  } catch (error) {
    console.error("❌ Error al insertar correo:", error);
    res.status(500).json({ error: "Error al insertar correo." });
  }
};

/* ============================================================
   ✏️ ACTUALIZAR CORREO (con validación + bitácora)
   ============================================================ */
exports.updateCorreo = async (req, res) => {
  try {
    const { id_correo } = req.params;
    const { id_persona, correo } = req.body;
    const username = extractUsername(req);

    // 🛡️ Validar formato de email
    if (correo) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(correo.trim())) {
        return res.status(400).json({ error: "El formato del correo electrónico no es válido." });
      }
    }

    // 🔎 Obtener estado anterior para bitácora
    const anterior = await pool.query(`SELECT * FROM seguridad.tbl_correos WHERE id_correo = $1`, [id_correo]);
    if (anterior.rows.length === 0) {
      return res.status(404).json({ error: "Correo no encontrado." });
    }

    await pool.query(`CALL seguridad.sp_correos_update($1, $2, $3)`, [
      id_correo,
      id_persona,
      correo ? correo.trim() : correo,
    ]);

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_correos",
      accion: "UPDATE",
      descripcion: `Correo ID ${id_correo} actualizado por ${username || "desconocido"}`,
      detalle: JSON.stringify({
        antes: anterior.rows[0],
        despues: { id_persona, correo }
      }),
    });

    res.json({ message: "✏️ Correo actualizado correctamente." });
  } catch (error) {
    console.error("❌ Error al actualizar correo:", error);
    res.status(500).json({ error: "Error al actualizar correo." });
  }
};

/* ============================================================
   🗑️ ELIMINAR CORREO (con bitácora)
   ============================================================ */
exports.deleteCorreo = async (req, res) => {
  try {
    const { id } = req.params;
    const username = extractUsername(req);

    // 🔎 Obtener estado anterior para bitácora
    const anterior = await pool.query(`SELECT * FROM seguridad.tbl_correos WHERE id_correo = $1`, [id]);
    if (anterior.rows.length === 0) {
      return res.status(404).json({ error: "Correo no encontrado para eliminar." });
    }

    await pool.query(`CALL seguridad.sp_correos_delete($1)`, [id]);

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_correos",
      accion: "DELETE",
      descripcion: `Correo ID ${id} eliminado por ${username || "desconocido"}`,
      detalle: JSON.stringify({ antes: anterior.rows[0], despues: null }),
    });

    res.json({ message: "🗑️ Correo eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error al eliminar correo:", error);

    if (error.code === "23503") {
      return res.status(409).json({
        error: "No se puede eliminar el correo porque está referenciado por otras tablas.",
      });
    }

    res.status(500).json({ error: "Error al eliminar correo." });
  }
};
