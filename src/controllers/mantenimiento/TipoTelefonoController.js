// ============================================================
// 📁 src/controllers/mantenimiento/TipoTelefonoController.js
// ============================================================

import { pool } from "../../db.js";

// ============================================================
// 🔹 LISTAR todos los tipos de teléfono
// ============================================================
export const getTipoTelefono = async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query("CALL mantenimiento.sp_tipo_telefono_listar('cur_tipo_telefono')");
    const result = await pool.query("FETCH ALL FROM cur_tipo_telefono");
    await pool.query("COMMIT");

    res.json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar tipos de teléfono:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 OBTENER tipo de teléfono por ID
// ============================================================
export const getTipoTelefonoById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM mantenimiento.tbl_tipo_telefono WHERE id_tipo_telefono = $1",
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Tipo de teléfono no encontrado" });

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener tipo de teléfono:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 INSERTAR tipo de teléfono
// ============================================================
export const insertTipoTelefono = async (req, res) => {
  try {
    const { nombre_tipo } = req.body;
    if (!nombre_tipo) {
      return res.status(400).json({ error: "El nombre del tipo de teléfono es requerido" });
    }

    await pool.query("CALL mantenimiento.sp_tipo_telefono_insertar($1)", [nombre_tipo]);
    res.json({ message: "✅ Tipo de teléfono agregado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar tipo de teléfono:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR tipo de teléfono
// ============================================================
export const updateTipoTelefono = async (req, res) => {
  const { id_tipo_telefono } = req.params;
  const { nombre_tipo } = req.body;

  try {
    await pool.query("CALL mantenimiento.sp_tipo_telefono_actualizar($1, $2)", [
      id_tipo_telefono,
      nombre_tipo,
    ]);

    res.json({ message: "✅ Tipo de teléfono actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar tipo de teléfono:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ELIMINAR tipo de teléfono
// ============================================================
export const deleteTipoTelefono = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("CALL mantenimiento.sp_tipo_telefono_eliminar($1)", [id]);
    res.json({ message: "🗑️ Tipo de teléfono eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar tipo de teléfono:", error);
    res.status(500).json({ error: error.message });
  }
};
