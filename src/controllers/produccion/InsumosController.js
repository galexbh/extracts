// ============================================================
// 📁 src/controllers/produccion/InsumosController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR INSUMOS
// ============================================================
exports.getInsumos = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CALL produccion.sp_insumo_listar('p_cursor');`);
    const result = await client.query(`FETCH ALL IN "p_cursor";`);
    await client.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al obtener insumos:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 INSERTAR INSUMO (actualizado con stock mínimo y máximo)
// ============================================================
exports.insertInsumo = async (req, res) => {
  try {
    const {
      nombre_insumo,
      unidad_medida,
      id_estado_insumo,
      precio_unitario,
      stock_minimo,
      stock_maximo,
    } = req.body;

    await pool.query(
      `CALL produccion.sp_insumo_insertar($1, $2, $3, $4, $5, $6);`,
      [
        nombre_insumo,
        unidad_medida,
        id_estado_insumo,
        precio_unitario,
        stock_minimo,
        stock_maximo,
      ]
    );

    res.status(201).json({ message: "✅ Insumo agregado correctamente." });
  } catch (error) {
    console.error("❌ Error al insertar insumo:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 EDITAR INSUMO (actualizado con stock mínimo y máximo)
// ============================================================
exports.updateInsumo = async (req, res) => {
  try {
    const { id_insumo } = req.params;
    const {
      nombre_insumo,
      unidad_medida,
      id_estado_insumo,
      precio_unitario,
      stock_minimo,
      stock_maximo,
    } = req.body;

    await pool.query(
      `CALL produccion.sp_insumo_editar($1, $2, $3, $4, $5, $6, $7);`,
      [
        id_insumo,
        nombre_insumo,
        unidad_medida,
        id_estado_insumo,
        precio_unitario,
        stock_minimo,
        stock_maximo,
      ]
    );

    res.json({ message: "✏️ Insumo actualizado correctamente." });
  } catch (error) {
    console.error("❌ Error al actualizar insumo:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ELIMINAR INSUMO (sin cambios)
// ============================================================
exports.deleteInsumo = async (req, res) => {
  try {
    const { id_insumo } = req.params;
    await pool.query(`CALL produccion.sp_insumo_eliminar($1);`, [id_insumo]);
    res.json({ message: "🗑️ Insumo eliminado correctamente." });
  } catch (error) {
    console.error("❌ Error al eliminar insumo:", error);
    res.status(500).json({ error: error.message });
  }
};
