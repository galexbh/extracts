// ============================================================
// 📁 src/controllers/Seguridad/DireccionesController.js
// 🔒 Versión con validación de inputs y bitácora
// ============================================================

const { pool } = require("../../db");
const { registrarBitacora, extractUsername, findUserId } = require("../../utils/bitacora");

// ============================================================
// 🔹 LISTAR TODAS LAS DIRECCIONES
// ============================================================
exports.getDirecciones = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CALL seguridad.sp_direcciones_listar('cur_direcciones')`);
    const result = await client.query(`FETCH ALL FROM cur_direcciones`);
    await client.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Error al listar direcciones:", error);
    res.status(500).json({ error: "Error al listar direcciones." });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 OBTENER DIRECCIÓN POR ID
// ============================================================
exports.getDireccionById = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CALL seguridad.sp_direcciones_obtener_por_id('cur_direccion', $1)`, [id]);
    const result = await client.query(`FETCH ALL FROM cur_direccion`);
    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dirección no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Error al obtener dirección:", error);
    res.status(500).json({ error: "Error al obtener dirección." });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 INSERTAR DIRECCIÓN (con validación + bitácora)
// ============================================================
exports.insertDireccion = async (req, res) => {
  try {
    const { id_persona, direccion, ciudad, departamento, pais } = req.body;
    const username = extractUsername(req);
    const textoSeguro = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9 .,#-]{3,255}$/;
    const soloLetrasConExtras = /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s\-'.]{3,100}$/;

    // 🛡️ Validaciones backend
    if (!id_persona) {
      return res.status(400).json({ error: "Debe indicar la persona." });
    }
    if (!direccion || !direccion.trim()) {
      return res.status(400).json({ error: "La dirección es obligatoria." });
    }
    if (!textoSeguro.test(direccion.trim())) {
      return res.status(400).json({ error: "La dirección contiene caracteres no válidos." });
    }
    if (!ciudad || !ciudad.trim() || !soloLetrasConExtras.test(ciudad.trim())) {
      return res.status(400).json({ error: "La ciudad es obligatoria y solo debe contener letras." });
    }
    if (!departamento || !departamento.trim() || !soloLetrasConExtras.test(departamento.trim())) {
      return res.status(400).json({ error: "El departamento es obligatorio y solo debe contener letras." });
    }
    if (!pais || !pais.trim() || !soloLetrasConExtras.test(pais.trim())) {
      return res.status(400).json({ error: "El país es obligatorio y solo debe contener letras." });
    }

    await pool.query(
      `CALL seguridad.sp_direcciones_insertar($1, $2, $3, $4, $5, NULL)`,
      [id_persona, direccion.trim(), ciudad, departamento, pais]
    );

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_direcciones",
      accion: "INSERT",
      descripcion: `Dirección creada para persona ID ${id_persona} por ${username || "desconocido"}`,
      detalle: JSON.stringify({ id_persona, direccion, ciudad, departamento, pais }),
    });

    res.json({ message: "✅ Dirección insertada correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar dirección:", error);
    res.status(500).json({ error: "Error al insertar dirección." });
  }
};

// ============================================================
// 🔹 ACTUALIZAR DIRECCIÓN (con bitácora)
// ============================================================
exports.updateDireccion = async (req, res) => {
  const { id_direccion } = req.params;
  const { id_persona, direccion, ciudad, departamento, pais } = req.body;
  const username = extractUsername(req);
  const textoSeguro = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9 .,#-]{3,255}$/;
  const soloLetrasConExtras = /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s\-'.]{3,100}$/;

  try {
    // 🛡️ Validaciones backend
    if (!id_persona) {
      return res.status(400).json({ error: "Debe indicar la persona." });
    }
    if (!direccion || !direccion.trim()) {
      return res.status(400).json({ error: "La dirección es obligatoria." });
    }
    if (!textoSeguro.test(direccion.trim())) {
      return res.status(400).json({ error: "La dirección contiene caracteres no válidos." });
    }
    if (!ciudad || !ciudad.trim() || !soloLetrasConExtras.test(ciudad.trim())) {
      return res.status(400).json({ error: "La ciudad es obligatoria y solo debe contener letras." });
    }
    if (!departamento || !departamento.trim() || !soloLetrasConExtras.test(departamento.trim())) {
      return res.status(400).json({ error: "El departamento es obligatorio y solo debe contener letras." });
    }
    if (!pais || !pais.trim() || !soloLetrasConExtras.test(pais.trim())) {
      return res.status(400).json({ error: "El país es obligatorio y solo debe contener letras." });
    }

    // 🔎 Obtener estado anterior para bitácora
    const anterior = await pool.query(`SELECT * FROM seguridad.tbl_direcciones WHERE id_direccion = $1`, [id_direccion]);
    if (anterior.rows.length === 0) {
      return res.status(404).json({ error: "Dirección no encontrada." });
    }

    await pool.query(
      `CALL seguridad.sp_direcciones_actualizar($1, $2, $3, $4, $5, $6)`,
      [id_direccion, id_persona, direccion.trim(), ciudad, departamento, pais]
    );

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_direcciones",
      accion: "UPDATE",
      descripcion: `Dirección ID ${id_direccion} actualizada por ${username || "desconocido"}`,
      detalle: JSON.stringify({
        antes: anterior.rows[0],
        despues: { id_persona, direccion, ciudad, departamento, pais }
      }),
    });

    res.json({ message: "✅ Dirección actualizada correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar dirección:", error);
    res.status(500).json({ error: "Error al actualizar dirección." });
  }
};

// ============================================================
// 🔹 ELIMINAR DIRECCIÓN (con bitácora)
// ============================================================
exports.deleteDireccion = async (req, res) => {
  const { id } = req.params;
  const username = extractUsername(req);

  try {
    // 🔎 Obtener estado anterior para bitácora
    const anterior = await pool.query(`SELECT * FROM seguridad.tbl_direcciones WHERE id_direccion = $1`, [id]);
    if (anterior.rows.length === 0) {
      return res.status(404).json({ error: "Dirección no encontrada para eliminar." });
    }

    await pool.query(`CALL seguridad.sp_direcciones_eliminar($1)`, [id]);

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_direcciones",
      accion: "DELETE",
      descripcion: `Dirección ID ${id} eliminada por ${username || "desconocido"}`,
      detalle: JSON.stringify({ antes: anterior.rows[0], despues: null }),
    });

    res.json({ message: "🗑️ Dirección eliminada correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar dirección:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        error: "No se puede eliminar la dirección porque está referenciada por otras tablas.",
      });
    }

    res.status(500).json({ error: "Error al eliminar dirección." });
  }
};
