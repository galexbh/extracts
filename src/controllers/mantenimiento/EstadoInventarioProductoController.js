// ============================================================
// 📁 src/controllers/mantenimiento/EstadoInventarioProductoController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR 
// ============================================================
exports.getEstadoInventarioProducto = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Llamamos el procedimiento con cursor INOUT
    await client.query(`CALL mantenimiento.sp_estado_inventario_producto_listar('cur_estado_inventario_producto')`);

    // Recuperamos los datos del mismo cursor
    const result = await client.query(`FETCH ALL FROM cur_estado_inventario_producto`);

    await client.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al listar estados de inventario de producto:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 OBTENER POR ID
// ============================================================
exports.getEstadoInventarioProductoById = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`CALL mantenimiento.sp_estado_inventario_producto_obtenerporid('cur_estado', $1)`, [id]);
    const result = await client.query(`FETCH ALL FROM cur_estado`);
    await client.query("COMMIT");

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Estados de inventario producto no encontrado" });

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al obtener estado de inventario producto:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 INSERTAR
// ============================================================
exports.insertEstadoInventarioProducto = async (req, res) => {
  try {
    const { nombre_estado } = req.body;
    await pool.query(`CALL mantenimiento.sp_estado_inventario_producto_insertar($1)`, [nombre_estado]);
    res.json({ message: "✅ Estado de inventario de producto insertado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar estado de inventario producto:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR 
// ============================================================
exports.updateEstadoInventarioProducto = async (req, res) => {
  const { id_estado_inventario_producto } = req.params; // ✅ nombre exacto del parámetro
  const { nombre_estado } = req.body;

  try {
    await pool.query(
      `CALL mantenimiento.sp_estado_inventario_producto_editar($1, $2)`,
      [id_estado_inventario_producto, nombre_estado]
    );

    res.json({ message: "✏️ Estado de inventario de producto actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error al actualizar estado de inventario de producto:", error);
    res.status(500).json({ error: error.message });
  }
};
// ============================================================
// 🔹 ELIMINAR
// ============================================================
exports.deleteEstadoInventarioProducto = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`CALL mantenimiento.sp_estado_inventario_producto_eliminar($1)`, [id]);
    res.json({ message: "🗑️ Estado de Inventario Producto eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar estado de inventario de producto:", error);
    res.status(500).json({ error: error.message });
  }
};
