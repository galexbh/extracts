// ============================================================
// 📁 src/controllers/Seguridad/TelefonosController.js
// 🔒 Versión con validación de inputs y bitácora
// ============================================================
const { pool } = require("../../db.js");
const { registrarBitacora, extractUsername, findUserId } = require("../../utils/bitacora");

// ============================================================
// 🔹 LISTAR TELÉFONOS
// ============================================================
exports.getTelefonos = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CALL seguridad.sp_telefonos_listar('cur_telefonos')");
    const result = await client.query("FETCH ALL FROM cur_telefonos");
    await client.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al listar teléfonos:", error);
    res.status(500).json({ error: "Error al listar teléfonos." });
  } finally {
    client.release();
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
    if (!result.rows.length) {
      return res.status(404).json({ error: "Teléfono no encontrado." });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener teléfono:", error);
    res.status(500).json({ error: "Error al obtener teléfono." });
  }
};

// ============================================================
// 🔹 INSERTAR TELÉFONO (con validación + bitácora)
// ============================================================
exports.insertTelefono = async (req, res) => {
  try {
    const { id_persona, numero, id_tipo_telefono } = req.body;
    const username = extractUsername(req);

    // 🛡️ Validaciones backend
    if (!id_persona) {
      return res.status(400).json({ error: "Debe indicar la persona." });
    }
    if (!numero || !numero.trim()) {
      return res.status(400).json({ error: "El número de teléfono es obligatorio." });
    }
    // Validar formato Honduras (8 dígitos)
    const limpio = numero.replace(/-/g, "").trim();
    if (!/^[0-9]{8}$/.test(limpio)) {
      return res.status(400).json({ error: "El teléfono debe tener 8 dígitos." });
    }

    await pool.query(
      `CALL seguridad.sp_telefonos_insertar($1, $2, $3)`,
      [id_persona, numero.trim(), id_tipo_telefono]
    );

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_telefonos",
      accion: "INSERT",
      descripcion: `Teléfono "${numero}" creado para persona ID ${id_persona} por ${username || "desconocido"}`,
      detalle: JSON.stringify({ id_persona, numero, id_tipo_telefono }),
    });

    res.json({ message: "✅ Teléfono insertado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar teléfono:", error);
    res.status(500).json({ error: "Error al insertar teléfono." });
  }
};

// ============================================================
// 🔹 ACTUALIZAR TELÉFONO (con bitácora)
// ============================================================
exports.updateTelefono = async (req, res) => {
  try {
    const { id_telefono } = req.params;
    const { id_persona, numero, id_tipo_telefono } = req.body;
    const username = extractUsername(req);

    await pool.query(
      `CALL seguridad.sp_telefonos_actualizar($1, $2, $3, $4)`,
      [id_telefono, id_persona, numero, id_tipo_telefono]
    );

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_telefonos",
      accion: "UPDATE",
      descripcion: `Teléfono ID ${id_telefono} actualizado por ${username || "desconocido"}`,
      detalle: JSON.stringify({ id_telefono, id_persona, numero, id_tipo_telefono }),
    });

    res.json({ message: "✅ Teléfono actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar teléfono:", error);
    res.status(500).json({ error: "Error al actualizar teléfono." });
  }
};

// ============================================================
// 🔹 ELIMINAR TELÉFONO (con bitácora)
// ============================================================
exports.deleteTelefono = async (req, res) => {
  try {
    const { id } = req.params;
    const username = extractUsername(req);

    await pool.query(`CALL seguridad.sp_telefonos_eliminar($1)`, [id]);

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_telefonos",
      accion: "DELETE",
      descripcion: `Teléfono ID ${id} eliminado por ${username || "desconocido"}`,
      detalle: JSON.stringify({ id_telefono: id }),
    });

    res.json({ message: "✅ Teléfono eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar teléfono:", error);
    res.status(500).json({ error: "Error al eliminar teléfono." });
  }
};
