// ============================================================
// 📁 src/controllers/Seguridad/CorreosController.js
// ============================================================
import { pool } from "../../db.js";

/* ============================================================
   📋 LISTAR TODOS LOS CORREOS
   ============================================================ */
export const getCorreos = async (req, res) => {
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
export const getCorreoById = async (req, res) => {
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
   ➕ INSERTAR CORREO
   ============================================================ */
export const insertCorreo = async (req, res) => {
  try {
    const { id_persona, correo } = req.body;

    if (!id_persona || !correo)
      return res.status(400).json({ error: "Debe indicar la persona y el correo electrónico." });

    await pool.query(`CALL seguridad.sp_correos_insert($1, $2)`, [id_persona, correo]);

    res.json({ message: "✅ Correo insertado correctamente." });
  } catch (error) {
    console.error("❌ Error al insertar correo:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ============================================================
   ✏️ ACTUALIZAR CORREO
   ============================================================ */
export const updateCorreo = async (req, res) => {
  try {
    const { id_correo } = req.params;
    const { id_persona, correo } = req.body;

    await pool.query(`CALL seguridad.sp_correos_update($1, $2, $3)`, [
      id_correo,
      id_persona,
      correo,
    ]);

    res.json({ message: "✏️ Correo actualizado correctamente." });
  } catch (error) {
    console.error("❌ Error al actualizar correo:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ============================================================
   🗑️ ELIMINAR CORREO
   ============================================================ */
export const deleteCorreo = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`CALL seguridad.sp_correos_delete($1)`, [id]);
    res.json({ message: "🗑️ Correo eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error al eliminar correo:", error);

    if (error.code === "23503") {
      return res.status(409).json({
        error: "⚠️ No se puede eliminar el correo porque está referenciado por otras tablas.",
      });
    }

    res.status(500).json({ error: "Error al eliminar correo." });
  }
};
