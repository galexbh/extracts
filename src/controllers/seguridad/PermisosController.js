// ============================================================
// 📁 src/controllers/seguridad/PermisosController.js
// ============================================================
const { pool } = require("../../db");

/* ============================================================
   🔹 GET: listar todos los permisos
   ============================================================ */
exports.getPermisos = async (_req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query("CALL seguridad.sp_permisos_listar('cur_permisos')");
    const result = await pool.query("FETCH ALL FROM cur_permisos");
    await pool.query("COMMIT");
    res.json(result.rows);
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("[API] ❌ Error obteniendo permisos:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   🔹 POST: insertar permiso
   ============================================================ */
exports.insertPermiso = async (req, res) => {
  try {
    const { id_rol, id_objeto, can_create, can_read, can_update, can_delete } = req.body;
    const username =
      req.headers["x-user-email"] ||
      req.headers["X-User-Email"] ||
      req.headers["x-User-Email"];

    if (!username) {
      return res.status(400).json({ error: "Falta el usuario logueado (x-user-email)" });
    }

    const user = await pool.query(
      "SELECT id_usuario FROM seguridad.tbl_usuarios WHERE username ILIKE $1",
      [username]
    );
    if (user.rows.length === 0)
      return res.status(404).json({ error: `Usuario ${username} no encontrado` });

    const id_usuario_creado = user.rows[0].id_usuario;

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

    res.status(201).json({ message: `✅ Permiso creado correctamente por ${username}` });
  } catch (err) {
    console.error("[API] ❌ Error insertando permiso:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   🔹 PUT: actualizar permiso
   ============================================================ */
exports.updatePermiso = async (req, res) => {
  try {
    const { id_permiso } = req.params;
    const { id_rol, id_objeto, can_create, can_read, can_update, can_delete } = req.body;
    const username = req.headers["x-user-email"];

    if (!username)
      return res.status(400).json({ error: "Falta el usuario logueado (x-user-email)" });

    const user = await pool.query(
      "SELECT id_usuario FROM seguridad.tbl_usuarios WHERE username ILIKE $1",
      [username]
    );
    if (user.rows.length === 0)
      return res.status(404).json({ error: `Usuario ${username} no encontrado` });

    const id_usuario_modificado = user.rows[0].id_usuario;

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

    res.json({ message: `✏️ Permiso actualizado por ${username}` });
  } catch (err) {
    console.error("[API] ❌ Error actualizando permiso:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   🔹 DELETE: eliminar permiso
   ============================================================ */
exports.deletePermiso = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("CALL seguridad.sp_permisos_delete($1)", [id]);
    res.json({ message: `🗑 Permiso ID ${id} eliminado correctamente.` });
  } catch (err) {
    console.error("[API] ❌ Error eliminando permiso:", err);
    res.status(500).json({ error: err.message });
  }
};
