

// ============================================================
// 📁 src/controllers/mantenimiento/EstadoProductoController.js
// ============================================================

// ✅ Corrección: Importar correctamente el pool de conexión
const { pool } = require("../../db");

// 🟡 Listar todos los estados
exports.getEstados = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM mantenimiento.get_estado_producto();");
    res.json(result.rows);
  } catch (error) {
    console.error("[API] ❌ Error al listar estados:", error);
    res.status(500).json({ error: "Error al listar estados de producto" });
  }
};

// 🟢 Insertar nuevo estado
exports.insertEstado = async (req, res) => {
  try {
    const { nombre_estado } = req.body;
    if (!nombre_estado || nombre_estado.trim() === "") {
      return res.status(400).json({ error: "El nombre del estado es obligatorio." });
    }

    await pool.query("SELECT mantenimiento.insert_estado_producto($1);", [nombre_estado]);
    res.json({ message: "✅ Estado insertado correctamente" });
  } catch (error) {
    console.error("[API] ❌ Error al insertar estado:", error);
    res.status(500).json({ error: "Error al insertar estado de producto" });
  }
};

// 🔵 Actualizar estado
exports.updateEstado = async (req, res) => {
  try {
    const { id_estado_producto } = req.params;
    const { nombre_estado } = req.body;

    if (!nombre_estado || nombre_estado.trim() === "") {
      return res.status(400).json({ error: "El nombre del estado es obligatorio." });
    }

    await pool.query("SELECT mantenimiento.update_estado_producto($1, $2);", [
      id_estado_producto,
      nombre_estado,
    ]);

    res.json({ message: "✏️ Estado actualizado correctamente" });
  } catch (error) {
    console.error("[API] ❌ Error al actualizar estado:", error);
    res.status(500).json({ error: "Error al actualizar estado de producto" });
  }
};

// 🔴 Eliminar estado
exports.deleteEstado = async (req, res) => {
  try {
    const { id_estado_producto } = req.params;

    await pool.query("SELECT mantenimiento.delete_estado_producto($1);", [id_estado_producto]);
    res.json({ message: "🗑 Estado eliminado correctamente" });
  } catch (error) {
    console.error("[API] ❌ Error al eliminar estado:", error);
    res.status(500).json({ error: "Error al eliminar estado de producto" });
  }
};