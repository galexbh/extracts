// ============================================================
// 📊 Inventario histórico (corrige duplicados de stock final)
// ============================================================
const { pool } = require("../../db");

exports.getInventarioDiario = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    // 🔹 Entradas y salidas reales por rango
    let queryMov = `
      SELECT 
        nombre_insumo,
        unidad_medida,
        COALESCE(SUM(total_entradas), 0) AS total_entradas,
        COALESCE(SUM(total_salidas), 0) AS total_salidas,
        MAX(fecha_movimiento) AS fecha_movimiento
      FROM inventario.vw_inventario_insumo_historico
      WHERE 1 = 1
    `;

    const params = [];
    if (fecha_inicio && fecha_fin) {
      queryMov += ` AND fecha_movimiento BETWEEN $1 AND $2`;
      params.push(fecha_inicio, fecha_fin);
    } else if (fecha_inicio) {
      queryMov += ` AND fecha_movimiento >= $1`;
      params.push(fecha_inicio);
    } else if (fecha_fin) {
      queryMov += ` AND fecha_movimiento <= $1`;
      params.push(fecha_fin);
    }

    queryMov += ` GROUP BY nombre_insumo, unidad_medida ORDER BY nombre_insumo;`;
    const { rows: historico } = await pool.query(queryMov, params);

    // 🔹 Catálogo base
    const { rows: insumos } = await pool.query(`
      SELECT 
        i.nombre_insumo,
        i.unidad_medida,
        i.stock_minimo,
        i.stock_maximo,
        COALESCE(ii.stock_actual, 0) AS stock_actual
      FROM produccion.tbl_insumos i
      LEFT JOIN inventario.tbl_inventario_insumo ii ON i.id_insumo = ii.id_insumo
      ORDER BY i.nombre_insumo;
    `);

    // 🔹 Combinar correctamente
    const merged = insumos.map((insumo) => {
      const h = historico.find(
        (x) =>
          x.nombre_insumo.trim().toLowerCase() ===
          insumo.nombre_insumo.trim().toLowerCase()
      );

      const entradas = Number(h?.total_entradas || 0);
      const salidas = Number(h?.total_salidas || 0);
      const base = Number(insumo.stock_actual || 0);

      return {
        nombre_insumo: insumo.nombre_insumo,
        unidad_medida: insumo.unidad_medida,
        stock_minimo: insumo.stock_minimo,
        stock_maximo: insumo.stock_maximo,
        total_entradas: entradas,
        total_salidas: salidas,
        inventario_final:
          entradas > 0 || salidas > 0 ? entradas - salidas : base, // ✅ corrección
        fecha_movimiento: h ? h.fecha_movimiento : null,
      };
    });

    const result =
      fecha_inicio || fecha_fin
        ? merged.filter((m) => m.total_entradas > 0 || m.total_salidas > 0)
        : merged;

    res.json(result);
  } catch (error) {
    console.error("❌ Error al obtener inventario histórico:", error);
    res.status(500).json({ error: error.message });
  }
};
