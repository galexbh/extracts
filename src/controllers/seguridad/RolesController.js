// ============================================================
// 📁 src/controllers/seguridad/RolesController.js
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 GET: listar todos los roles
// ============================================================
exports.getRoles = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM seguridad.fn_roles_get_all();");

    // 🧹 Normalizar el campo accesos (PostgreSQL arrays → JS array limpio)
    const clean = result.rows.map((r) => {
      let accesos = [];

      if (Array.isArray(r.accesos)) {
        accesos = r.accesos;
      } else if (typeof r.accesos === "string") {
        // Elimina { } [ ] y comillas
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

    // 🧹 Limpieza de accesos
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

    // 🛡️ Validaciones
    nombre_rol = nombre_rol ? nombre_rol.trim() : null;
    if (!nombre_rol) {
      return res.status(400).json({ error: "El nombre del rol es obligatorio." });
    }

    // Parsear accesos si llega como string
    if (typeof accesos === "string") {
      try { accesos = JSON.parse(accesos); } catch { accesos = []; }
    }
    if (!Array.isArray(accesos) || accesos.length === 0) {
      return res.status(400).json({ error: "Debe asignar al menos un acceso al rol." });
    }

    // 🧠 Asegurar formato JSON antes de enviar a PostgreSQL
    accesos = JSON.stringify(accesos);

    await pool.query(
      "CALL seguridad.sp_roles_insert($1, $2, $3);",
      [nombre_rol, descripcion, accesos]
    );

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

    // 🛡️ Validaciones
    nombre_rol = nombre_rol ? nombre_rol.trim() : null;
    if (!nombre_rol) {
      return res.status(400).json({ error: "El nombre del rol es obligatorio." });
    }

    // Parsear accesos si llega como string
    if (typeof accesos === "string") {
      try { accesos = JSON.parse(accesos); } catch { accesos = []; }
    }
    if (!Array.isArray(accesos) || accesos.length === 0) {
      return res.status(400).json({ error: "Debe asignar al menos un acceso al rol." });
    }

    // 🧠 Asegurar formato JSON
    accesos = JSON.stringify(accesos);

    await pool.query(
      "CALL seguridad.sp_roles_update($1, $2, $3, $4);",
      [id_rol, nombre_rol, descripcion, accesos]
    );

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
    await pool.query("CALL seguridad.sp_roles_delete($1);", [id]);
    res.json({ message: "🗑️ Rol eliminado correctamente" });
  } catch (err) {
    console.error("[API] ❌ Error eliminando rol:", err);
    res.status(500).json({ error: err.message || "Error al eliminar rol" });
  }
};
