// ============================================================
// 📦 Controller: Inventario de Insumos (VERSIÓN FINAL 100% CORRECTA)
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 1. LISTAR INVENTARIO COMPLETO
// ============================================================
exports.getInventarioInsumos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ii.id_inventario_insumo,
        ii.id_insumo,

        -- DATOS DEL INSUMO
        ins.nombre_insumo,
        ins.unidad_medida,
        ins.stock_minimo,
        ins.stock_maximo,

        -- DATOS DEL INVENTARIO
        ii.stock_actual,
        ii.entradas,
        ii.salidas,
        ii.fecha_de_movimiento,
        ii.nivel,

        eii.nombre_estado AS estado_inventario
      FROM inventario.tbl_inventario_insumo AS ii
      JOIN produccion.tbl_insumos AS ins 
        ON ins.id_insumo = ii.id_insumo
      LEFT JOIN mantenimiento.tbl_estado_inventario_insumo AS eii 
        ON eii.id_estado_inventario_insumo = ii.id_estado_inventario_insumo
      ORDER BY ins.nombre_insumo ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al listar inventario:", error);
    res.status(500).json({ error: "Error al listar inventario" });
  }
};

// ============================================================
// 🔹 2. RESUMEN DE INVENTARIO (usa vista vw_resumen_inventario)
// ============================================================
exports.getResumenInventario = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    let query = `
      SELECT 
        nombre_insumo,
        unidad_medida,
        COALESCE(total_entradas, 0) AS total_entradas,
        COALESCE(total_salidas, 0) AS total_salidas,
        (COALESCE(total_entradas,0) - COALESCE(total_salidas,0)) AS inventario_final,
        stock_minimo,
        stock_maximo,
        ultima_fecha
      FROM inventario.vw_resumen_inventario
    `;

    if (fechaInicio && fechaFin) {
      query += ` WHERE ultima_fecha BETWEEN '${fechaInicio}' AND '${fechaFin}' `;
    }

    query += ` ORDER BY nombre_insumo ASC`;

    const result = await pool.query(query);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error en resumen de inventario:", error);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
};

// ============================================================
// 🔹 3. INSERTAR INVENTARIO MANUALMENTE
// ============================================================
exports.insertInventarioInsumo = async (req, res) => {
  try {
    const { id_insumo } = req.body;

    await pool.query(
      `CALL inventario.sp_insert_inventario_insumo($1);`,
      [id_insumo]
    );

    res.json({
      message: "Inventario creado automáticamente desde producción."
    });

  } catch (error) {
    console.error("❌ Error al insertar inventario:", error);
    res.status(500).json({ error: "Error al insertar inventario" });
  }
};

// ============================================================
// 🔹 4. ACTUALIZAR INVENTARIO
// ============================================================
exports.updateInventarioInsumo = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      stock_minimo,
      stock_maximo,
      unidad_medida,
      empleado_asignado
    } = req.body;

    await pool.query(
      `CALL inventario.sp_update_inventario_insumo($1, $2, $3, $4, $5);`,
      [
        id,
        stock_minimo,
        stock_maximo,
        unidad_medida,
        empleado_asignado
      ]
    );

    res.json({
      message: "Inventario actualizado correctamente usando procedimiento almacenado"
    });

  } catch (error) {
    console.error("❌ Error al actualizar inventario:", error);
    res.status(500).json({ error: "Error al actualizar inventario" });
  }
};

// ============================================================
// 🔹 5. ELIMINAR INVENTARIO
// ============================================================
exports.deleteInventarioInsumo = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `CALL inventario.sp_delete_inventario_insumo($1);`,
      [id]
    );

    res.json({ message: "Inventario eliminado correctamente mediante SP" });

  } catch (error) {
    console.error("❌ Error al eliminar inventario:", error);
    res.status(500).json({ error: "Error al eliminar inventario" });
  }
};

// ============================================================
// 🔹 6. REGISTRAR MOVIMIENTO (Entrada / Salida)
// ============================================================
exports.registrarMovimiento = async (req, res) => {
  try {
    const { id_insumo, tipo, cantidad } = req.body;

    const usuario = req.headers["x-user-email"] || "sistema";

    await pool.query(
      `CALL inventario.sp_registrar_movimiento($1, $2, $3, $4);`,
      [id_insumo, tipo, cantidad, usuario]
    );

    await pool.query(
      `CALL inventario.sp_actualizar_inventario($1);`,
      [id_insumo]
    );

    res.json({
      message: "Movimiento registrado y el inventario fue recalculado correctamente"
    });

  } catch (error) {
    console.error("❌ Error al registrar movimiento:", error);
    res.status(500).json({ error: "Error al registrar movimiento" });
  }
};
