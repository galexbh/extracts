// ============================================================
// 📁 CONTROLLER: REPORTES CONTABILIDAD
// ============================================================
const { pool } = require("../../db");

// ------------------------------------------------------------
// 1) PRODUCTOS MÁS VENDIDOS (por rango de fechas)
//    GET /contabilidad/reportes/productos-mas-vendidos?desde=2025-11-01&hasta=2025-11-30&top=10
// ------------------------------------------------------------
exports.productosMasVendidos = async (req, res) => {
  const { desde, hasta, top } = req.query;

  const fDesde = desde ? desde : "2000-01-01";
  const fHasta = hasta ? hasta : "2999-12-31";
  const limit = Number(top) || 10;

  // 🛡️ Validaciones
  if (limit <= 0) {
    return res.status(400).json({ error: "El parámetro top debe ser mayor a 0." });
  }
  if (new Date(fDesde) > new Date(fHasta)) {
    return res.status(400).json({ error: "La fecha inicial no puede ser mayor a la fecha final." });
  }

  try {
    const q = `
      SELECT 
        p.id_producto,
        p.nombre_producto,
        SUM(d.cantidad) AS total_cantidad,
        SUM(d.total) AS total_vendido
      FROM ventasyreserva.tbl_detalle_facturas d
      JOIN ventasyreserva.tbl_facturas f
        ON f.id_factura = d.id_factura
      JOIN produccion.tbl_productos p
        ON p.id_producto = d.id_producto
      WHERE f.fecha_emision::date BETWEEN $1 AND $2
      GROUP BY p.id_producto, p.nombre_producto
      ORDER BY total_cantidad DESC, total_vendido DESC
      LIMIT $3
    `;

    const result = await pool.query(q, [fDesde, fHasta, limit]);
    res.json(result.rows);

  } catch (err) {
    console.error("❌ Error reporte productos más vendidos:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------------------------------------
// 2) VENTAS POR VENDEDOR (facturas) por rango de fechas
//    GET /contabilidad/reportes/ventas-vendedor?desde=2025-11-01&hasta=2025-11-30
// ------------------------------------------------------------
exports.ventasPorVendedor = async (req, res) => {
  const { desde, hasta } = req.query;

  const fDesde = desde ? desde : "2000-01-01";
  const fHasta = hasta ? hasta : "2999-12-31";

  // 🛡️ Validaciones
  if (new Date(fDesde) > new Date(fHasta)) {
    return res.status(400).json({ error: "La fecha inicial no puede ser mayor a la fecha final." });
  }

  try {
    const q = `
      SELECT 
        COALESCE(f.vendedor, 'SIN VENDEDOR') AS vendedor,
        DATE(f.fecha_emision)                AS fecha,
        COUNT(*)                             AS cantidad_facturas,
        SUM(f.total_a_pagar)                 AS total_vendido
      FROM ventasyreserva.tbl_facturas f
      WHERE f.fecha_emision::date BETWEEN $1 AND $2
      GROUP BY vendedor, DATE(f.fecha_emision)
      ORDER BY vendedor, fecha;
    `;

    const result = await pool.query(q, [fDesde, fHasta]);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error reporte ventas por vendedor:", err);
    res.status(500).json({ error: err.message });
  }
};

// ------------------------------------------------------------
// 3) PEDIDOS DIARIOS (cantidad y total)
//    GET /contabilidad/reportes/pedidos-diarios?desde=2025-11-01&hasta=2025-11-30
// ------------------------------------------------------------
exports.pedidosDiarios = async (req, res) => {
  const { desde, hasta } = req.query;

  const fDesde = desde ? desde : "2000-01-01";
  const fHasta = hasta ? hasta : "2999-12-31";

  // 🛡️ Validaciones
  if (new Date(fDesde) > new Date(fHasta)) {
    return res.status(400).json({ error: "La fecha inicial no puede ser mayor a la fecha final." });
  }

  try {
    const q = `
      SELECT 
        DATE(p.fecha_reserva) AS fecha,
        COUNT(*)             AS cantidad_pedidos,
        SUM(p.total)         AS total_pedidos
      FROM ventasyreserva.tbl_pedidos p
      WHERE p.fecha_reserva::date BETWEEN $1 AND $2
      GROUP BY DATE(p.fecha_reserva)
      ORDER BY fecha;
    `;

    const result = await pool.query(q, [fDesde, fHasta]);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error reporte pedidos diarios:", err);
    res.status(500).json({ error: err.message });
  }
};
