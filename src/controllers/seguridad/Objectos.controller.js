// ============================================================
// 📁 src/controllers/seguridad/Objectos.controller.js
// ✅ Versión FINAL — Paginación, Bitácora, Validaciones ERP
// ============================================================
const { pool } = require("../../db");
const { registrarBitacora, extractUsername, findUserId } = require("../../utils/bitacora");

// ============================================================
// 🛡️ Utilidades locales
// ============================================================

const sanitizeTexto = (valor) => {
  if (!valor) return "";
  return valor.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s._\-]/g, "").trim();
};

// ============================================================
// 🔹 SELECT base (reutilizable)
// ============================================================
const SELECT_OBJETOS = `
  SELECT 
    o.id_objeto,
    o.nombre_objeto,
    o.descripcion,
    COALESCE(o.tipo_objeto, 'pantalla') AS tipo_objeto,
    COALESCE(o.estado, 'activo') AS estado,
    COALESCE(u1.username, '—') AS usuario_creado,
    TO_CHAR(
      o.fecha_creado AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa',
      'YYYY-MM-DD'
    ) AS fecha_creado,
    CASE
      WHEN o.id_usuario_modificado IS NOT NULL
           AND o.fecha_modificado IS NOT NULL
           AND o.fecha_modificado::date <> o.fecha_creado::date
      THEN u2.username
      ELSE '—'
    END AS usuario_modificado,
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
`;

/* ============================================================
   🔹 GET: listar objetos con paginación opcional
   - Si se envían query params ?page=1&limit=10 → paginado
   - Si no se envían → retorna todos (backward compatible)
   ============================================================ */
exports.getObjetos = async (req, res) => {
  try {
    const { page, limit } = req.query;

    // Si no envían page/limit → retornar todos (compatibilidad con Permisos dropdown)
    if (!page && !limit) {
      const result = await pool.query(`${SELECT_OBJETOS} ORDER BY o.id_objeto;`);
      return res.json(result.rows);
    }

    // Paginación
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Contar total
    const countResult = await pool.query("SELECT COUNT(*) AS total FROM seguridad.tbl_objetos;");
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limitNum);

    // Consulta paginada
    const result = await pool.query(
      `${SELECT_OBJETOS} ORDER BY o.id_objeto LIMIT $1 OFFSET $2;`,
      [limitNum, offset]
    );

    res.json({
      rows: result.rows,
      total,
      page: pageNum,
      totalPages,
      limit: limitNum,
    });
  } catch (err) {
    console.error("[API] ❌ Error obteniendo objetos:", err);
    res.status(500).json({ error: "Error al obtener objetos" });
  }
};

/* ============================================================
   🔹 GET by ID: obtener un objeto por su ID
   ============================================================ */
exports.getObjetoById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `${SELECT_OBJETOS} WHERE o.id_objeto = $1;`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Objeto no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("[API] ❌ Error obteniendo objeto por ID:", err);
    res.status(500).json({ error: "Error al obtener objeto" });
  }
};

/* ============================================================
   🔹 POST: insertar nuevo objeto
   ============================================================ */
exports.insertObjeto = async (req, res) => {
  try {
    let { nombre_objeto, descripcion, tipo_objeto, estado } = req.body;
    const username = extractUsername(req);

    if (!username) {
      return res.status(400).json({ error: "Falta el usuario logueado (x-user-email)" });
    }

    nombre_objeto = sanitizeTexto(nombre_objeto);
    descripcion = descripcion ? sanitizeTexto(descripcion) : null;

    if (!nombre_objeto || nombre_objeto.trim() === "") {
      return res.status(400).json({ error: "El nombre del objeto es obligatorio." });
    }

    if (nombre_objeto.trim().length < 2) {
      return res.status(400).json({ error: "El nombre del objeto debe tener al menos 2 caracteres." });
    }

    if (descripcion && descripcion.length > 500) {
      return res.status(400).json({ error: "La descripción no puede exceder 500 caracteres." });
    }

    const duplicado = await pool.query(
      "SELECT id_objeto FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = LOWER($1);",
      [nombre_objeto.trim()]
    );

    if (duplicado.rows.length > 0) {
      return res.status(409).json({
        error: `Ya existe un objeto con el nombre "${nombre_objeto}". No se permiten duplicados.`,
      });
    }

    const id_usuario_creado = await findUserId(username);
    if (!id_usuario_creado) {
      return res.status(404).json({ error: `Usuario ${username} no encontrado` });
    }

    await pool.query(
      "CALL seguridad.sp_objetos_insert($1, $2, $3, $4, $5);",
      [nombre_objeto.trim(), descripcion, id_usuario_creado, tipo_objeto || 'pantalla', estado || 'activo']
    );

    // 📋 Registrar en bitácora
    const nuevoObj = await pool.query(
      "SELECT id_objeto FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = LOWER($1);",
      [nombre_objeto.trim()]
    );
    await registrarBitacora({
      id_usuario: id_usuario_creado,
      id_objeto: nuevoObj.rows[0]?.id_objeto || null,
      tabla: "seguridad.tbl_objetos",
      accion: "INSERT",
      descripcion: `Objeto "${nombre_objeto}" creado por ${username}`,
      detalle: JSON.stringify({ nombre_objeto, tipo_objeto, estado }),
    });

    res.status(201).json({ message: `✅ Objeto creado correctamente por ${username}` });
  } catch (err) {
    console.error("[API] ❌ Error insertando objeto:", err);
    res.status(500).json({ error: "Error al insertar objeto" });
  }
};

/* ============================================================
   🔹 PUT: actualizar objeto
   ============================================================ */
exports.updateObjeto = async (req, res) => {
  try {
    const { id_objeto } = req.params;
    let { nombre_objeto, descripcion, tipo_objeto, estado } = req.body;
    const username = extractUsername(req);

    if (!username) {
      return res.status(400).json({ error: "Falta el usuario logueado (x-user-email)" });
    }

    nombre_objeto = sanitizeTexto(nombre_objeto);
    descripcion = descripcion ? sanitizeTexto(descripcion) : null;

    if (!nombre_objeto || nombre_objeto.trim() === "") {
      return res.status(400).json({ error: "El nombre del objeto es obligatorio." });
    }

    if (nombre_objeto.trim().length < 2) {
      return res.status(400).json({ error: "El nombre del objeto debe tener al menos 2 caracteres." });
    }

    if (descripcion && descripcion.length > 500) {
      return res.status(400).json({ error: "La descripción no puede exceder 500 caracteres." });
    }

    const duplicado = await pool.query(
      "SELECT id_objeto FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = LOWER($1) AND id_objeto <> $2;",
      [nombre_objeto.trim(), id_objeto]
    );

    if (duplicado.rows.length > 0) {
      return res.status(409).json({
        error: `Ya existe otro objeto con el nombre "${nombre_objeto}". No se permiten duplicados.`,
      });
    }

    const id_usuario_modificado = await findUserId(username);
    if (!id_usuario_modificado) {
      return res.status(404).json({ error: "Usuario no encontrado en la BD" });
    }

    // Obtener datos anteriores para el detalle de bitácora
    const anterior = await pool.query(
      "SELECT nombre_objeto, descripcion, tipo_objeto, estado FROM seguridad.tbl_objetos WHERE id_objeto = $1;",
      [id_objeto]
    );

    await pool.query(
      "CALL seguridad.sp_objetos_update($1, $2, $3, $4, $5, $6);",
      [id_objeto, nombre_objeto.trim(), descripcion, id_usuario_modificado, tipo_objeto || null, estado || null]
    );

    // 📋 Registrar en bitácora
    await registrarBitacora({
      id_usuario: id_usuario_modificado,
      id_objeto: parseInt(id_objeto),
      tabla: "seguridad.tbl_objetos",
      accion: "UPDATE",
      descripcion: `Objeto ID ${id_objeto} actualizado por ${username}`,
      detalle: JSON.stringify({
        antes: anterior.rows[0] || {},
        despues: { nombre_objeto, descripcion, tipo_objeto, estado },
      }),
    });

    res.json({ message: `✅ Objeto actualizado por ${username}` });
  } catch (err) {
    console.error("[API] ❌ Error actualizando objeto:", err);
    res.status(500).json({ error: "Error al actualizar objeto" });
  }
};

/* ============================================================
   🔹 DELETE: eliminar objeto (con verificación de dependencias)
   ============================================================ */
exports.deleteObjeto = async (req, res) => {
  const { id } = req.params;
  const username = extractUsername(req);

  try {
    // Obtener datos antes de eliminar (para bitácora)
    const objetoAntes = await pool.query(
      "SELECT nombre_objeto, tipo_objeto, estado FROM seguridad.tbl_objetos WHERE id_objeto = $1;",
      [id]
    );

    if (objetoAntes.rows.length === 0) {
      return res.status(404).json({ error: "Objeto no encontrado" });
    }

    const dependencias = await pool.query(
      `SELECT COUNT(*) AS total FROM seguridad.tbl_permisos WHERE id_objeto = $1;`,
      [id]
    );

    const totalPermisos = parseInt(dependencias.rows[0].total, 10);

    if (totalPermisos > 0) {
      return res.status(409).json({
        error: `No se puede eliminar el objeto porque tiene ${totalPermisos} permiso(s) asociado(s). Elimine los permisos primero.`,
      });
    }

    // Obtener id_usuario para bitácora
    const id_usuario = username ? await findUserId(username) : null;

    await pool.query("CALL seguridad.sp_objetos_delete($1);", [id]);

    // 📋 Registrar en bitácora
    await registrarBitacora({
      id_usuario: id_usuario,
      id_objeto: null, // ya fue eliminado
      tabla: "seguridad.tbl_objetos",
      accion: "DELETE",
      descripcion: `Objeto "${objetoAntes.rows[0].nombre_objeto}" (ID ${id}) eliminado por ${username || 'desconocido'}`,
      detalle: JSON.stringify(objetoAntes.rows[0]),
    });

    res.json({ message: "🗑 Objeto eliminado correctamente" });
  } catch (err) {
    console.error("[API] ❌ Error eliminando objeto:", err);
    res.status(500).json({ error: "Error al eliminar objeto" });
  }
};
