// ============================================================
// 📁 src/middleware/verifyRoleAccess.js
// 🔐 Middleware que valida acceso por rol y módulo solicitado
// ============================================================

const { pool } = require("../db");

module.exports = async function verifyRoleAccess(req, res, next) {
  try {
    const email = req.headers["x-user-email"];
    const requestedModule = req.headers["requested-module"];

    console.log("🔍 Verificando acceso:", { email, requestedModule });

    // ------------------------------------------------------------
    // ❗ Validar headers requeridos
    // ------------------------------------------------------------
    if (!email)
      return res.status(401).json({ error: "MISSING_USER_EMAIL" });

    if (!requestedModule)
      return res.status(400).json({ error: "MISSING_REQUESTED_MODULE" });

    // ------------------------------------------------------------
    // 🔎 Buscar usuario y rol asociado
    // ------------------------------------------------------------
    const query = `
      SELECT 
        u.id_usuario, 
        u.username, 
        u.id_estado_usuario,
        r.id_rol, 
        r.nombre_rol, 
        r.accesos
      FROM seguridad.tbl_usuarios u
      JOIN seguridad.tbl_roles r ON r.id_rol = u.id_rol
      WHERE LOWER(u.username) = LOWER($1)
      LIMIT 1;
    `;

    const { rows } = await pool.query(query, [email]);

    if (!rows.length)
      return res.status(403).json({ error: "USER_NOT_FOUND" });

    const user = rows[0];

    // ------------------------------------------------------------
    // 🔐 Validar que el usuario esté activo
    // ------------------------------------------------------------
    if (user.id_estado_usuario !== 1)
      return res.status(403).json({ error: "USER_INACTIVE" });

    // ------------------------------------------------------------
    // 📌 Procesar lista de accesos del rol
    // ------------------------------------------------------------
    let accesos = [];

    if (Array.isArray(user.accesos)) {
      // Ya vino como array JS
      accesos = user.accesos.map((s) => s.trim().toLowerCase());
    } else if (typeof user.accesos === "string") {
      // Puede ser JSON string (["Ventas","Seguridad"]) o CSV plano
      const raw = user.accesos.trim();
      if (raw.startsWith("[")) {
        try {
          const parsed = JSON.parse(raw);
          accesos = parsed.map((s) => String(s).trim().toLowerCase());
        } catch {
          // Fallback: limpiar corchetes/comillas y dividir por coma
          accesos = raw
            .replace(/[\[\]"]/g, "")
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        }
      } else {
        accesos = raw
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
      }
    }

    console.log(
      `👤 Usuario: ${user.username} | Rol: ${user.nombre_rol} | Accesos: [${accesos.join(", ")}]`
    );

    // ------------------------------------------------------------
    // 🔑 Acceso "Todos" → permit everything
    // ------------------------------------------------------------
    if (accesos.includes("todos")) {
      console.log(`✅ Acceso total (Todos): ${user.username}`);
      return next();
    }

    // ------------------------------------------------------------
    // 🔍 Verificar permiso para el módulo solicitado
    // ------------------------------------------------------------
    const hasAccess = accesos.some(
      (m) => m === requestedModule.trim().toLowerCase()
    );

    if (!hasAccess) {
      console.warn(`🚫 Acceso denegado: ${user.username} → ${requestedModule}`);
      return res.status(403).json({
        error: "ACCESS_DENIED",
        message: `El usuario ${user.username} no tiene acceso al módulo ${requestedModule}`,
      });
    }

    console.log(`✅ Acceso permitido: ${user.username} → ${requestedModule}`);
    next();
  } catch (err) {
    console.error("[verifyRoleAccess] ❌ Error interno:", err);
    res.status(500).json({ error: "ROLE_CHECK_FAILED" });
  }
};
