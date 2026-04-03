// ============================================================
// 📂 src/controllers/seguridad/bitacora.controller.js
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 📋 LISTAR BITÁCORA COMPLETA (adaptado a tu tabla actual)
// ============================================================
const listarBitacora = async (req, res) => {
  try {
    const { usuario, tabla, accion, desde, hasta, page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    // 🔍 Filtros dinámicos
    if (usuario && usuario.trim() !== "") {
      params.push(`%${usuario.trim().toLowerCase()}%`);
      where.push(`LOWER(COALESCE(u.username, '')) LIKE $${params.length}`);
    }

    if (tabla && tabla.trim() !== "") {
      params.push(`%${tabla.trim().toLowerCase()}%`);
      where.push(`LOWER(b.tabla) LIKE $${params.length}`);
    }

    if (accion && accion.trim() !== "") {
      params.push(accion.trim().toLowerCase());
      where.push(`LOWER(b.accion) = $${params.length}`);
    }

    if (desde && hasta) {
      params.push(desde, hasta);
      where.push(`b.fecha_evento BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    // ============================================================
    // 🔢 Contar total de registros (para paginación)
    // ============================================================
    const countSql = `
      SELECT COUNT(*) AS total
      FROM seguridad.tbl_ms_bitacora b
      LEFT JOIN seguridad.tbl_usuarios u ON b.id_usuario::text = u.id_usuario::text
      ${whereClause}
    `;
    const countResult = await pool.query(countSql, params);
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    // ============================================================
    // 🧾 Consulta principal con paginación
    // ============================================================
    const sql = `
      SELECT
        b.id_bitacora,
        b.fecha_evento AS fecha,
        COALESCE(
          u.username,
          CASE
            WHEN b.descripcion ~ 'por [^ ]+@[^ ]+'
            THEN substring(b.descripcion FROM 'por ([^ ]+@[^ ]+)')
            WHEN b.descripcion ~ 'por [^ ]+'
            THEN substring(b.descripcion FROM 'por ([^ ]+)')
            ELSE 'Sistema'
          END
        ) AS usuario,
        COALESCE(u.nombre_usuario, '') AS nombre_usuario,
        b.id_objeto,
        o.nombre_objeto AS nombre_objeto,
        b.tabla,
        b.accion,
        b.descripcion,
        b.detalle
      FROM seguridad.tbl_ms_bitacora b
      LEFT JOIN seguridad.tbl_usuarios u
        ON b.id_usuario::text = u.id_usuario::text
      LEFT JOIN seguridad.tbl_objetos o
        ON b.id_objeto = o.id_objeto
      ${whereClause}
      ORDER BY b.fecha_evento DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    // Añadir limit y offset a los parámetros
    const queryParams = [...params, limit, offset];

    const result = await pool.query(sql, queryParams);

    res.json({
      rows: result.rows,
      total,
      page: parseInt(page, 10),
      totalPages,
      limit: parseInt(limit, 10)
    });

  } catch (error) {
    console.error("❌ Error al listar bitácora:", error);
    res.status(500).json({ error: "Error al listar bitácora." });
  }
};

// ============================================================
// 📤 Exportar módulo
// ============================================================
module.exports = { listarBitacora };
