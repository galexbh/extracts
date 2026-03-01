// ============================================================
// 📁 src/controllers/produccion/InsumosController.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR INSUMOS
// Bug fix: el cursor tenía nombre fijo 'p_cursor' — con peticiones
// concurrentes colisionaba. Ahora usa un nombre único por llamada.
// ============================================================
exports.getInsumos = async (req, res) => {
  const client = await pool.connect();
  // Nombre de cursor único por request para evitar colisiones en concurrencia
  const cursorName = `cur_insumos_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  try {
    await client.query("BEGIN");
    await client.query(`CALL produccion.sp_insumo_listar('${cursorName}');`);
    const result = await client.query(`FETCH ALL IN "${cursorName}";`);
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
// 🔹 INSERTAR INSUMO
// ============================================================
exports.insertInsumo = async (req, res) => {
  try {
    let {
      nombre_insumo,
      unidad_medida,
      id_estado_insumo,
      precio_unitario,
      stock_minimo,
      stock_maximo,
    } = req.body;

    // 🔒 Validaciones y Sanitización Backend
    nombre_insumo = nombre_insumo ? nombre_insumo.trim() : null;
    unidad_medida = unidad_medida ? unidad_medida.trim() : null;

    if (!nombre_insumo || !unidad_medida) {
      return res.status(400).json({ error: "El nombre y la unidad son obligatorios." });
    }

    // Normalizar capitalización (Primera letra mayúscula)
    unidad_medida = unidad_medida.charAt(0).toUpperCase() + unidad_medida.slice(1).toLowerCase();

    if (Number(precio_unitario) <= 0) {
      return res.status(400).json({ error: "El precio unitario debe ser mayor a 0." });
    }

    if (Number(stock_minimo) < 0 || Number(stock_maximo) < 0) {
      return res.status(400).json({ error: "El stock no puede ser negativo." });
    }

    if (Number(stock_maximo) < Number(stock_minimo)) {
      return res.status(400).json({ error: "El stock máximo no puede ser menor al mínimo." });
    }

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
// 🔹 EDITAR INSUMO
// ============================================================
exports.updateInsumo = async (req, res) => {
  try {
    const { id_insumo } = req.params;
    let {
      nombre_insumo,
      unidad_medida,
      id_estado_insumo,
      precio_unitario,
      stock_minimo,
      stock_maximo,
    } = req.body;

    // 🔒 Validaciones y Sanitización Backend
    nombre_insumo = nombre_insumo ? nombre_insumo.trim() : null;
    unidad_medida = unidad_medida ? unidad_medida.trim() : null;

    if (!nombre_insumo || !unidad_medida) {
      return res.status(400).json({ error: "El nombre y la unidad son obligatorios." });
    }

    // Normalizar capitalización (Primera letra mayúscula)
    unidad_medida = unidad_medida.charAt(0).toUpperCase() + unidad_medida.slice(1).toLowerCase();

    if (Number(precio_unitario) <= 0) {
      return res.status(400).json({ error: "El precio unitario debe ser mayor a 0." });
    }

    if (Number(stock_minimo) < 0 || Number(stock_maximo) < 0) {
      return res.status(400).json({ error: "El stock no puede ser negativo." });
    }

    if (Number(stock_maximo) < Number(stock_minimo)) {
      return res.status(400).json({ error: "El stock máximo no puede ser menor al mínimo." });
    }

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
// 🔹 ELIMINAR INSUMO
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
