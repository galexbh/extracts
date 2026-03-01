// ============================================================
// 📁 src/controllers/seguridad/ControllerGestionObjetos.js
// ============================================================
const { pool } = require("../../db");

/* ============================================================
   🔹 GET: listar todos los objetos (fecha ajustada a Honduras)
   ============================================================ */

exports.getObjetos = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id_objeto,
        o.nombre_objeto,
        o.descripcion,

        -- 👤 Usuario que creó
        COALESCE(u1.username, '—') AS usuario_creado,

        -- 📅 Fecha creada (ajustada a Honduras)
        TO_CHAR(
          o.fecha_creado AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa',
          'YYYY-MM-DD'
        ) AS fecha_creado,

        -- 👤 Usuario que modificó (solo si realmente fue modificado)
        CASE
          WHEN o.id_usuario_modificado IS NOT NULL
               AND o.fecha_modificado IS NOT NULL
               AND o.fecha_modificado::date <> o.fecha_creado::date
          THEN u2.username
          ELSE '—'
        END AS usuario_modificado,

        -- 📅 Fecha modificada (solo si realmente fue modificado)
        CASE
          WHEN o.fecha_modificado IS NOT NULL
               AND o.fecha_modificado::date <> o.fecha_creado::date
          THEN TO_CHAR(
                 o.fecha_modificado AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa',
                 'YYYY-MM-DD'
               )
          ELSE NULL
        END AS fecha_modificado

      FROM seguridad.tbl_objetos o
      LEFT JOIN seguridad.tbl_usuarios u1 ON o.id_usuario_creado = u1.id_usuario
      LEFT JOIN seguridad.tbl_usuarios u2 ON o.id_usuario_modificado = u2.id_usuario
      ORDER BY o.id_objeto;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("[API] ❌ Error obteniendo objetos:", err);
    res.status(500).json({ error: "Error al obtener objetos" });
  }
};
/* ============================================================
   🔹 POST: insertar nuevo objeto (usa el usuario logueado)
   ============================================================ */
/* ============================================================
   🔹 POST: insertar nuevo objeto (usa el usuario logueado)
   ============================================================ */
exports.insertObjeto = async (req, res) => {
  try {
    let { nombre_objeto, descripcion } = req.body;
    const username =
      req.headers["x-user-email"] ||
      req.headers["X-User-Email"] ||
      req.headers["x-User-Email"];

    // 🛡️ Validaciones
    nombre_objeto = nombre_objeto ? nombre_objeto.trim() : null;
    if (!nombre_objeto) {
      return res.status(400).json({ error: "El nombre del objeto es obligatorio." });
    }

    if (!username) {
      return res.status(400).json({ error: "Falta el usuario logueado (x-user-email)" });
    }

    // Buscar el usuario en BD
    const userResult = await pool.query(
      "SELECT id_usuario FROM seguridad.tbl_usuarios WHERE username ILIKE $1;",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: `Usuario ${username} no encontrado` });
    }

    const id_usuario_creado = userResult.rows[0].id_usuario;

    await pool.query(
      "CALL seguridad.sp_objetos_insert($1, $2, $3);",
      [nombre_objeto, descripcion, id_usuario_creado]
    );

    res.status(201).json({ message: `✅ Objeto creado correctamente por ${username}` });
  } catch (err) {
    console.error("[API] ❌ Error insertando objeto:", err);
    res.status(500).json({ error: "Error al insertar objeto" });
  }
};

/* ============================================================
   🔹 PUT: actualizar objeto (también con username)
   ============================================================ */
exports.updateObjeto = async (req, res) => {
  try {
    const { id_objeto } = req.params;
    let { nombre_objeto, descripcion } = req.body;
    const username = req.headers["x-user-email"];

    // 🛡️ Validaciones
    nombre_objeto = nombre_objeto ? nombre_objeto.trim() : null;
    if (!nombre_objeto) {
      return res.status(400).json({ error: "El nombre del objeto es obligatorio." });
    }

    const userResult = await pool.query(
      "SELECT id_usuario FROM seguridad.tbl_usuarios WHERE username ILIKE $1",
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado en la BD" });
    }

    const id_usuario_modificado = userResult.rows[0].id_usuario;

    await pool.query(
      "CALL seguridad.sp_objetos_update($1, $2, $3, $4);",
      [id_objeto, nombre_objeto, descripcion, id_usuario_modificado]
    );

    res.json({ message: `✅ Objeto actualizado por ${username}` });
  } catch (err) {
    console.error("[API] ❌ Error actualizando objeto:", err);
    res.status(500).json({ error: "Error al actualizar objeto" });
  }
};

/* ============================================================
   🔹 DELETE: eliminar objeto
   ============================================================ */
exports.deleteObjeto = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("CALL seguridad.sp_objetos_delete($1);", [id]);
    res.json({ message: "🗑 Objeto eliminado correctamente" });
  } catch (err) {
    console.error("[API] ❌ Error eliminando objeto:", err);
    res.status(500).json({ error: "Error al eliminar objeto" });
  }
};
