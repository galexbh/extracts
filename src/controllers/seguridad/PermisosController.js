// ============================================================
// 📁 src/controllers/seguridad/PermisosController.js
// ✅ Versión mejorada — Validaciones ERP, duplicados,
//    bitácora, GET por ID, consistencia
// ============================================================
const { pool } = require("../../db");
const { registrarBitacora, extractUsername, findUserId } = require("../../utils/bitacora");

/* ============================================================
   🔹 GET: listar todos los permisos
   ============================================================ */
exports.getPermisos = async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CALL seguridad.sp_permisos_listar('cur_permisos')");
    const result = await client.query("FETCH ALL FROM cur_permisos");
    await client.query("COMMIT");
    res.json(result.rows);
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // ignorar rollback fallido
    }
    console.error("[API] ❌ Error obteniendo permisos:", err);
    res.status(500).json({ error: "Error al obtener permisos" });
  } finally {
    client.release();
  }
};

/* ============================================================
   🔹 GET by ID: obtener un permiso por su ID
   ============================================================ */
exports.getPermisoById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.id_permiso, p.id_rol, r.nombre_rol, p.id_objeto, o.nombre_objeto,
              p.can_create, p.can_read, p.can_update, p.can_delete,
              COALESCE(u1.username, '—') AS usuario_creado,
              TO_CHAR(p.fecha_creado AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa', 'YYYY-MM-DD') AS fecha_creado,
              COALESCE(u2.username, '—') AS usuario_modificado,
              CASE WHEN p.fecha_modificado IS NOT NULL
                THEN TO_CHAR(p.fecha_modificado AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa', 'YYYY-MM-DD')
                ELSE NULL END AS fecha_modificado
       FROM seguridad.tbl_permisos p
       LEFT JOIN seguridad.tbl_roles r ON p.id_rol = r.id_rol
       LEFT JOIN seguridad.tbl_objetos o ON p.id_objeto = o.id_objeto
       LEFT JOIN seguridad.tbl_usuarios u1 ON p.id_usuario_creado = u1.id_usuario
       LEFT JOIN seguridad.tbl_usuarios u2 ON p.id_usuario_modificado = u2.id_usuario
       WHERE p.id_permiso = $1;`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Permiso no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("[API] ❌ Error obteniendo permiso por ID:", err);
    res.status(500).json({ error: "Error al obtener permiso" });
  }
};

/* ============================================================
   🔹 POST: insertar permiso
   ============================================================ */
exports.insertPermiso = async (req, res) => {
  try {
    const { id_rol, id_objeto, can_create, can_read, can_update, can_delete } = req.body;
    const username = extractUsername(req);

    if (!username) {
      return res.status(400).json({ error: "Falta el usuario logueado (x-user-email)" });
    }

    // 🛡️ Validación: campos obligatorios
    if (!id_rol) {
      return res.status(400).json({ error: "Debe seleccionar un rol." });
    }
    if (!id_objeto) {
      return res.status(400).json({ error: "Debe seleccionar un objeto." });
    }

    // 🛡️ Validación: verificar que el rol existe
    const rolExiste = await pool.query(
      "SELECT id_rol, nombre_rol FROM seguridad.tbl_roles WHERE id_rol = $1;",
      [id_rol]
    );
    if (rolExiste.rows.length === 0) {
      return res.status(404).json({ error: "El rol seleccionado no existe." });
    }
    const nombre_rol = rolExiste.rows[0].nombre_rol;

    // 🛡️ Validación: verificar que el objeto existe
    const objetoExiste = await pool.query(
      "SELECT id_objeto, nombre_objeto FROM seguridad.tbl_objetos WHERE id_objeto = $1;",
      [id_objeto]
    );
    if (objetoExiste.rows.length === 0) {
      return res.status(404).json({ error: "El objeto seleccionado no existe." });
    }
    const nombre_objeto = objetoExiste.rows[0].nombre_objeto;

    // 🛡️ Validación: duplicados (mismo rol + mismo objeto)
    const duplicado = await pool.query(
      "SELECT id_permiso FROM seguridad.tbl_permisos WHERE id_rol = $1 AND id_objeto = $2;",
      [id_rol, id_objeto]
    );

    if (duplicado.rows.length > 0) {
      return res.status(409).json({
        error: "Ya existe un permiso para esta combinación de Rol y Objeto. Edite el existente en lugar de crear uno nuevo.",
      });
    }

    // 🔎 Buscar usuario
    const id_usuario_creado = await findUserId(username);
    if (!id_usuario_creado) {
      return res.status(404).json({ error: `Usuario ${username} no encontrado` });
    }

    // ✅ Insertar
    await pool.query(
      "CALL seguridad.sp_permisos_insert($1, $2, $3, $4, $5, $6, $7)",
      [
        id_rol,
        id_objeto,
        can_create ?? false,
        can_read ?? false,
        can_update ?? false,
        can_delete ?? false,
        id_usuario_creado,
      ]
    );

    // 📋 Bitácora
    await registrarBitacora({
      id_usuario: id_usuario_creado,
      id_objeto: parseInt(id_objeto),
      tabla: "seguridad.tbl_permisos",
      accion: "INSERT",
      descripcion: `Permiso creado: ${nombre_rol} → ${nombre_objeto} por ${username}`,
      detalle: JSON.stringify({ nombre_rol, nombre_objeto, can_create, can_read, can_update, can_delete }),
    });

    res.status(201).json({ message: `✅ Permiso creado correctamente por ${username}` });
  } catch (err) {
    console.error("[API] ❌ Error insertando permiso:", err);
    res.status(500).json({ error: "Error al insertar permiso" });
  }
};

/* ============================================================
   🔹 PUT: actualizar permiso
   ============================================================ */
exports.updatePermiso = async (req, res) => {
  try {
    const { id_permiso } = req.params;
    const { id_rol, id_objeto, can_create, can_read, can_update, can_delete } = req.body;
    const username = extractUsername(req);

    if (!username) {
      return res.status(400).json({ error: "Falta el usuario logueado (x-user-email)" });
    }

    // 🛡️ Validación: duplicados (excluir el permiso actual)
    const duplicado = await pool.query(
      "SELECT id_permiso FROM seguridad.tbl_permisos WHERE id_rol = $1 AND id_objeto = $2 AND id_permiso <> $3;",
      [id_rol, id_objeto, id_permiso]
    );

    if (duplicado.rows.length > 0) {
      return res.status(409).json({
        error: "Ya existe otro permiso con esta combinación de Rol y Objeto.",
      });
    }

    // Obtener datos anteriores para bitácora (con nombres)
    const anterior = await pool.query(
      `SELECT p.can_create, p.can_read, p.can_update, p.can_delete,
              r.nombre_rol, o.nombre_objeto
       FROM seguridad.tbl_permisos p
       LEFT JOIN seguridad.tbl_roles r ON p.id_rol = r.id_rol
       LEFT JOIN seguridad.tbl_objetos o ON p.id_objeto = o.id_objeto
       WHERE p.id_permiso = $1;`,
      [id_permiso]
    );

    // Resolver nombres nuevos
    const rolRes = await pool.query("SELECT nombre_rol FROM seguridad.tbl_roles WHERE id_rol = $1", [id_rol]);
    const objRes = await pool.query("SELECT nombre_objeto FROM seguridad.tbl_objetos WHERE id_objeto = $1", [id_objeto]);
    const nombre_rol = rolRes.rows[0]?.nombre_rol || id_rol;
    const nombre_objeto = objRes.rows[0]?.nombre_objeto || id_objeto;

    const id_usuario_modificado = await findUserId(username);
    if (!id_usuario_modificado) {
      return res.status(404).json({ error: `Usuario ${username} no encontrado` });
    }

    // ✅ Actualizar
    await pool.query(
      "CALL seguridad.sp_permisos_update($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id_permiso,
        id_rol,
        id_objeto,
        can_create ?? false,
        can_read ?? false,
        can_update ?? false,
        can_delete ?? false,
        id_usuario_modificado,
      ]
    );

    // 📋 Bitácora
    const antData = anterior.rows[0] || {};
    await registrarBitacora({
      id_usuario: id_usuario_modificado,
      id_objeto: parseInt(id_objeto),
      tabla: "seguridad.tbl_permisos",
      accion: "UPDATE",
      descripcion: `Permiso actualizado: ${nombre_rol} → ${nombre_objeto} por ${username}`,
      detalle: JSON.stringify({
        antes: { nombre_rol: antData.nombre_rol, nombre_objeto: antData.nombre_objeto, can_create: antData.can_create, can_read: antData.can_read, can_update: antData.can_update, can_delete: antData.can_delete },
        despues: { nombre_rol, nombre_objeto, can_create, can_read, can_update, can_delete },
      }),
    });

    res.json({ message: `✏️ Permiso actualizado por ${username}` });
  } catch (err) {
    console.error("[API] ❌ Error actualizando permiso:", err);
    res.status(500).json({ error: "Error al actualizar permiso" });
  }
};

/* ============================================================
   🔹 DELETE: eliminar permiso
   ============================================================ */
exports.deletePermiso = async (req, res) => {
  try {
    const { id } = req.params;
    const username = extractUsername(req);

    // Obtener datos antes de eliminar
    const permisoAntes = await pool.query(
      `SELECT p.id_permiso, p.id_rol, r.nombre_rol, p.id_objeto, o.nombre_objeto,
              p.can_create, p.can_read, p.can_update, p.can_delete
       FROM seguridad.tbl_permisos p
       LEFT JOIN seguridad.tbl_roles r ON p.id_rol = r.id_rol
       LEFT JOIN seguridad.tbl_objetos o ON p.id_objeto = o.id_objeto
       WHERE p.id_permiso = $1;`,
      [id]
    );

    if (permisoAntes.rows.length === 0) {
      return res.status(404).json({ error: "Permiso no encontrado" });
    }

    const datosPrevios = permisoAntes.rows[0];

    // ✅ Eliminar
    await pool.query("CALL seguridad.sp_permisos_delete($1)", [id]);

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario: id_usuario,
      id_objeto: datosPrevios.id_objeto,
      tabla: "seguridad.tbl_permisos",
      accion: "DELETE",
      descripcion: `Permiso "${datosPrevios.nombre_rol} → ${datosPrevios.nombre_objeto}" (ID ${id}) eliminado por ${username || "desconocido"}`,
      detalle: JSON.stringify(datosPrevios),
    });

    res.json({ message: `🗑 Permiso ID ${id} eliminado correctamente.` });
  } catch (err) {
    console.error("[API] ❌ Error eliminando permiso:", err);
    res.status(500).json({ error: "Error al eliminar permiso" });
  }
};
