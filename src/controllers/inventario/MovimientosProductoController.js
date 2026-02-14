// ============================================================
// 📦 Movimientos de Productos Controller
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 OBTENER MOVIMIENTOS (con filtros opcionales)
// ============================================================
exports.getMovimientosProductos = async (req, res) => {
  try {
    let { fecha_inicio, fecha_fin } = req.query;

    let query = `
      SELECT 
        mp.id_movimiento,
        mp.id_producto,
        p.nombre_producto AS nombre_producto,  -- ✔ CORREGIDO
        mp.tipo_movimiento,
        mp.cantidad,
        mp.fecha_movimiento,
        mp.observacion,
        mp.usuario_registro
      FROM inventario.tbl_movimientos_producto mp
      INNER JOIN produccion.tbl_productos p 
              ON p.id_producto = mp.id_producto
      WHERE 1=1
    `;

    const params = [];
    let whereClauses = [];

    if (fecha_inicio) {
      params.push(fecha_inicio);
      whereClauses.push(`mp.fecha_movimiento::date >= $${params.length}`);
    }

    if (fecha_fin) {
      params.push(fecha_fin);
      whereClauses.push(`mp.fecha_movimiento::date <= $${params.length}`);
    }

    if (whereClauses.length > 0) {
      query += ` AND ${whereClauses.join(" AND ")}`;
    }

    query += ` ORDER BY mp.fecha_movimiento DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error("❌ Error al obtener movimientos de productos:", error);
    res.status(500).json({ error: "Error al obtener movimientos de productos" });
  }
};

// ============================================================
// 🔹 INSERTAR NUEVO MOVIMIENTO (Entrada/Salida)
// ============================================================
exports.insertMovimientoProducto = async (req, res) => {
  const { id_producto, tipo_movimiento, cantidad, observacion } = req.body;

  // 🔥 Usuario desde headers
  const userEmail = req.headers["x-user-email"] || "Sistema";

  try {
    if (!id_producto || !tipo_movimiento || !cantidad) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Insertar movimiento
    const result = await pool.query(
      `INSERT INTO inventario.tbl_movimientos_producto
        (id_producto, tipo_movimiento, cantidad, observacion, usuario_registro)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [id_producto, tipo_movimiento, cantidad, observacion, userEmail]
    );

    // =======================================================
    // 🏭 ACTUALIZAR INVENTARIO AUTOMÁTICAMENTE
    // =======================================================
    if (tipo_movimiento === "Entrada") {
      await pool.query(
        `UPDATE inventario.tbl_inventario_producto
         SET 
            stock_actual = stock_actual + $1,
            entradas = entradas + $1,
            fecha_actualizacion = NOW()
         WHERE id_producto = $2`,
        [cantidad, id_producto]
      );
    }

    if (tipo_movimiento === "Salida") {
      await pool.query(
        `UPDATE inventario.tbl_inventario_producto
         SET 
            stock_actual = stock_actual - $1,
            salidas = salidas + $1,
            fecha_actualizacion = NOW()
         WHERE id_producto = $2`,
        [cantidad, id_producto]
      );
    }

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error("❌ Error al insertar movimiento de producto:", error);
    res.status(500).json({ error: "Error al insertar movimiento de producto" });
  }
};

// ============================================================
// 🔹 RESUMEN DE INVENTARIO (KARDEX DE PRODUCTOS)
// ============================================================
exports.getResumenProductos = async (req, res) => {
  try {
    let { fecha_inicio, fecha_fin } = req.query;

    let query = `
      SELECT 
        p.nombre_producto AS nombre_producto,  -- ✔ CORREGIDO
        ip.unidad_medida,
        COALESCE(SUM(CASE WHEN mp.tipo_movimiento = 'Entrada' THEN mp.cantidad END), 0) AS total_entradas,
        COALESCE(SUM(CASE WHEN mp.tipo_movimiento = 'Salida' THEN mp.cantidad END), 0) AS total_salidas,
        (
          COALESCE(SUM(CASE WHEN mp.tipo_movimiento = 'Entrada' THEN mp.cantidad END), 0)
          -
          COALESCE(SUM(CASE WHEN mp.tipo_movimiento = 'Salida' THEN mp.cantidad END), 0)
        ) AS inventario_final,
        ip.stock_minimo,
        ip.stock_maximo,
        MAX(mp.fecha_movimiento) AS ultima_fecha
      FROM inventario.tbl_inventario_producto ip
      INNER JOIN produccion.tbl_productos p 
              ON p.id_producto = ip.id_producto
      LEFT JOIN inventario.tbl_movimientos_producto mp
              ON mp.id_producto = ip.id_producto
      WHERE 1=1
    `;

    const params = [];
    let where = [];

    if (fecha_inicio) {
      params.push(fecha_inicio);
      where.push(`mp.fecha_movimiento::date >= $${params.length}`);
    }

    if (fecha_fin) {
      params.push(fecha_fin);
      where.push(`mp.fecha_movimiento::date <= $${params.length}`);
    }

    if (where.length > 0) {
      query += ` AND ${where.join(" AND ")}`;
    }

    query += `
      GROUP BY p.nombre_producto, ip.unidad_medida, ip.stock_minimo, ip.stock_maximo
      ORDER BY p.nombre_producto ASC;
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error("❌ Error obteniendo resumen de productos:", error);
    res.status(500).json({ error: "Error obteniendo resumen de productos" });
  }
};
