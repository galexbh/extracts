// ============================================================
// 📦 Movimientos de Insumo Controller
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 OBTENER MOVIMIENTOS (con filtros opcionales)
// ============================================================
exports.getMovimientos = async (req, res) => {
  try {
    let { fecha_inicio, fecha_fin } = req.query;

    let query = `
      SELECT 
        m.id_movimiento,
        m.id_insumo,
        i.nombre_insumo,

        CASE 
          WHEN m.tipo_movimiento IN ('Ajuste', 'Corrección') THEN 'Ajuste'
          ELSE m.tipo_movimiento
        END AS tipo_movimiento,

        m.cantidad,
        m.fecha_movimiento,
        m.observacion,
        m.usuario_registro
      FROM inventario.tbl_movimientos_insumo m
      INNER JOIN produccion.tbl_insumos i 
              ON i.id_insumo = m.id_insumo
      WHERE m.tipo_movimiento NOT IN ('Ajuste', 'Corrección')
    `;

    const params = [];
    let whereClauses = [];

    if (fecha_inicio) {
      params.push(fecha_inicio);
      whereClauses.push(`m.fecha_movimiento::date >= $${params.length}`);
    }

    if (fecha_fin) {
      params.push(fecha_fin);
      whereClauses.push(`m.fecha_movimiento::date <= $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` AND ${whereClauses.join(" AND ")}`;
    }

    query += ` ORDER BY m.fecha_movimiento DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error("❌ Error al obtener movimientos:", error);
    res.status(500).json({ error: "Error al obtener movimientos" });
  }
};



// ============================================================
// 🔹 INSERTAR NUEVO MOVIMIENTO
// ============================================================
// ============================================================
// 🔹 INSERTAR NUEVO MOVIMIENTO (CON USUARIO LOGUEADO REAL)
// ============================================================
exports.insertMovimiento = async (req, res) => {
  const { id_insumo, tipo_movimiento, cantidad, observacion } = req.body;

  // 🔥 Capturar el usuario logueado desde los headers
  const userEmail = req.headers["x-user-email"] || "Sistema";

  try {
    const result = await pool.query(
      `INSERT INTO inventario.tbl_movimientos_insumo
        (id_insumo, tipo_movimiento, cantidad, observacion, usuario_registro)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [id_insumo, tipo_movimiento, cantidad, observacion, userEmail]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error("❌ Error al insertar movimiento:", error);
    res.status(500).json({ error: "Error al insertar movimiento" });
  }
};


// ============================================================
// 🔹 RESUMEN DE INVENTARIO
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
        -- 🔥 AQUÍ VA LA FÓRMULA CORREGIDA
        (COALESCE(total_entradas,0) - COALESCE(total_salidas,0)) AS inventario_final,
        stock_minimo,
        stock_maximo,
        ultima_fecha
      FROM inventario.vw_resumen_inventario
    `;

    if (fechaInicio && fechaFin) {
      query += ` WHERE ultima_fecha BETWEEN '${fechaInicio}' AND '${fechaFin}' `;
    }

    query += ` ORDER BY nombre_insumo ASC;`;

    const result = await pool.query(query);

    res.json(result.rows);

  } catch (error) {
    console.error("❌ Error al obtener resumen de inventario:", error);
    res.status(500).json({ error: "Error al obtener resumen de inventario" });
  }
};
