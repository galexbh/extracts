// ============================================================
// 📁 src/controllers/seguridad/RolesController.js
// ✅ Versión mejorada — Duplicados, dependencias, bitácora
// ============================================================
const { pool } = require("../../db");
const { registrarBitacora, extractUsername, findUserId } = require("../../utils/bitacora");

// ============================================================
// 🔹 GET: listar todos los roles
// ============================================================
exports.getRoles = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM seguridad.fn_roles_get_all();");

    const clean = result.rows.map((r) => {
      let accesos = [];
      if (Array.isArray(r.accesos)) {
        accesos = r.accesos;
      } else if (typeof r.accesos === "string") {
        accesos = r.accesos
          .replace(/[\{\}\[\]"]/g, "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean);
      }
      return { ...r, accesos };
    });

    res.json(clean);
  } catch (err) {
    console.error("[API] ❌ Error obteniendo roles:", err);
    res.status(500).json({ error: "Error al obtener roles" });
  }
};

// ============================================================
// 🔹 GET: obtener rol por ID
// ============================================================
exports.getRolById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM seguridad.fn_roles_get_by_id($1);", [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Rol no encontrado" });

    let r = result.rows[0];
    let accesos = [];
    if (Array.isArray(r.accesos)) {
      accesos = r.accesos;
    } else if (typeof r.accesos === "string") {
      accesos = r.accesos
        .replace(/[\{\}\[\]"]/g, "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
    }

    res.json({ ...r, accesos });
  } catch (err) {
    console.error("[API] ❌ Error obteniendo rol por ID:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ============================================================
// 🔹 POST: insertar nuevo rol
// ============================================================
exports.insertRol = async (req, res) => {
  try {
    let { nombre_rol, descripcion, accesos } = req.body;
    const username = extractUsername(req);

    // 🛡️ Validaciones
    nombre_rol = nombre_rol ? nombre_rol.trim() : null;
    if (!nombre_rol) {
      return res.status(400).json({ error: "El nombre del rol es obligatorio." });
    }

    // Parsear accesos
    if (typeof accesos === "string") {
      try { accesos = JSON.parse(accesos); } catch { accesos = []; }
    }
    if (!Array.isArray(accesos) || accesos.length === 0) {
      return res.status(400).json({ error: "Debe asignar al menos un acceso al rol." });
    }

    // 🛡️ Validación de duplicados (case-insensitive)
    const duplicado = await pool.query(
      "SELECT id_rol FROM seguridad.tbl_roles WHERE LOWER(nombre_rol) = LOWER($1);",
      [nombre_rol]
    );
    if (duplicado.rows.length > 0) {
      return res.status(409).json({
        error: `Ya existe un rol con el nombre "${nombre_rol}". Use un nombre diferente.`,
      });
    }

    accesos = JSON.stringify(accesos);

    await pool.query(
      "CALL seguridad.sp_roles_insert($1, $2, $3);",
      [nombre_rol, descripcion, accesos]
    );

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_roles",
      accion: "INSERT",
      descripcion: `Rol "${nombre_rol}" creado por ${username || "desconocido"}`,
      detalle: JSON.stringify({ nombre_rol, descripcion, accesos }),
    });

    res.status(201).json({ message: "✅ Rol creado correctamente" });
  } catch (err) {
    console.error("[API] ❌ Error insertando rol:", err);
    res.status(500).json({ error: err.message || "Error al insertar rol" });
  }
};

// ============================================================
// 🔹 PUT: actualizar rol
// ============================================================
exports.updateRol = async (req, res) => {
  try {
    const { id_rol } = req.params;
    let { nombre_rol, descripcion, accesos } = req.body;
    const username = extractUsername(req);

    // 🛡️ Validaciones
    nombre_rol = nombre_rol ? nombre_rol.trim() : null;
    if (!nombre_rol) {
      return res.status(400).json({ error: "El nombre del rol es obligatorio." });
    }

    // Parsear accesos
    if (typeof accesos === "string") {
      try { accesos = JSON.parse(accesos); } catch { accesos = []; }
    }
    if (!Array.isArray(accesos) || accesos.length === 0) {
      return res.status(400).json({ error: "Debe asignar al menos un acceso al rol." });
    }

    // 🛡️ Validación de duplicados (excluir el rol actual)
    const duplicado = await pool.query(
      "SELECT id_rol FROM seguridad.tbl_roles WHERE LOWER(nombre_rol) = LOWER($1) AND id_rol <> $2;",
      [nombre_rol, id_rol]
    );
    if (duplicado.rows.length > 0) {
      return res.status(409).json({
        error: `Ya existe otro rol con el nombre "${nombre_rol}".`,
      });
    }

    // Datos anteriores para bitácora
    const anterior = await pool.query(
      "SELECT nombre_rol, descripcion, accesos FROM seguridad.tbl_roles WHERE id_rol = $1;",
      [id_rol]
    );

    accesos = JSON.stringify(accesos);

    await pool.query(
      "CALL seguridad.sp_roles_update($1, $2, $3, $4);",
      [id_rol, nombre_rol, descripcion, accesos]
    );

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_roles",
      accion: "UPDATE",
      descripcion: `Rol ID ${id_rol} actualizado por ${username || "desconocido"}`,
      detalle: JSON.stringify({
        antes: anterior.rows[0] || {},
        despues: { nombre_rol, descripcion, accesos },
      }),
    });

    res.json({ message: "✅ Rol actualizado correctamente" });
  } catch (err) {
    console.error("[API] ❌ Error actualizando rol:", err);
    res.status(500).json({ error: err.message || "Error al actualizar rol" });
  }
};

// ============================================================
// 🔹 DELETE: eliminar rol
// ============================================================
exports.deleteRol = async (req, res) => {
  try {
    const { id } = req.params;
    const username = extractUsername(req);

    // 🛡️ Verificar dependencias — usuarios con este rol
    const dependencias = await pool.query(
      "SELECT COUNT(*) AS total FROM seguridad.tbl_usuarios WHERE id_rol = $1;",
      [id]
    );
    const totalUsuarios = parseInt(dependencias.rows[0].total, 10);
    if (totalUsuarios > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: hay ${totalUsuarios} usuario(s) asignado(s) a este rol. Reasígnelos primero.`,
      });
    }

    // 🛡️ Verificar dependencias — permisos con este rol
    const depPermisos = await pool.query(
      "SELECT COUNT(*) AS total FROM seguridad.tbl_permisos WHERE id_rol = $1;",
      [id]
    );
    const totalPermisos = parseInt(depPermisos.rows[0].total, 10);
    if (totalPermisos > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: hay ${totalPermisos} permiso(s) configurado(s) para este rol. Elimínelos primero.`,
      });
    }

    // Datos anteriores para bitácora
    const rolAntes = await pool.query(
      "SELECT nombre_rol, descripcion FROM seguridad.tbl_roles WHERE id_rol = $1;",
      [id]
    );

    await pool.query("CALL seguridad.sp_roles_delete($1);", [id]);

    // 📋 Bitácora
    const id_usuario = username ? await findUserId(username) : null;
    const datos = rolAntes.rows[0] || {};
    await registrarBitacora({
      id_usuario,
      tabla: "seguridad.tbl_roles",
      accion: "DELETE",
      descripcion: `Rol "${datos.nombre_rol || id}" eliminado por ${username || "desconocido"}`,
      detalle: JSON.stringify(datos),
    });

    res.json({ message: "🗑️ Rol eliminado correctamente" });
  } catch (err) {
    console.error("[API] ❌ Error eliminando rol:", err);
    res.status(500).json({ error: err.message || "Error al eliminar rol" });
  }
};
