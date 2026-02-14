// ============================================================
// 📁 src/middleware/authRoles.js
// 🔐 Middleware de autenticación + autorización por objetos
// ============================================================

/*
const admin = require("../firebaseAdmin");
const { pool } = require("../db");

// Middleware de autorización basado en permisos de rol
const permit = (modulo) => {
  return async (req, res, next) => {
    try {
      // ------------------------------------------------------------
      // 1️⃣ Leer token Firebase o UID manual
      // ------------------------------------------------------------
      const authHeader = req.headers.authorization;
      const uidHeader = req.headers["x-uid"];

      if (!authHeader && !uidHeader) {
        console.warn("[AuthRoles] ❌ No se recibió Authorization ni UID");
        return res.status(401).json({ error: "No autorizado: falta token o UID" });
      }

      // ------------------------------------------------------------
      // 2️⃣ Validar token Firebase
      // ------------------------------------------------------------
      let decodedToken = null;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];

        try {
          decodedToken = await admin.auth().verifyIdToken(token);
        } catch (err) {
          console.error("[AuthRoles] ❌ Token inválido:", err.message);
          return res.status(401).json({ error: "Token Firebase no válido" });
        }
      }

      const uid = decodedToken?.uid || uidHeader;

      if (!uid) {
        console.warn("[AuthRoles] ⚠️ UID no válido");
        return res.status(401).json({ error: "UID no válido" });
      }

      // ------------------------------------------------------------
      // 3️⃣ Verificar permisos del usuario según tabla de roles + objetos
      // ------------------------------------------------------------
      const result = await pool.query(
        `
          SELECT r.nombre_rol, o.nombre_objeto
          FROM seguridad.tbl_usuarios u
          JOIN seguridad.tbl_roles r ON u.id_rol = r.id_rol
          JOIN seguridad.tbl_permisos p ON r.id_rol = p.id_rol
          JOIN seguridad.tbl_objetos o ON p.id_objeto = o.id_objeto
          WHERE u.uid_firebase = $1;
        `,
        [uid]
      );

      if (result.rowCount === 0) {
        console.warn("[AuthRoles] ⚠️ Usuario sin permisos registrados");
        return res.status(403).json({ error: "Acceso denegado: sin permisos" });
      }

      const rol = result.rows[0].nombre_rol;
      const objetos = result.rows.map((r) => r.nombre_objeto.toLowerCase());

      // ------------------------------------------------------------
      // 4️⃣ Validar si posee permiso para el módulo solicitado
      // ------------------------------------------------------------
      const tienePermiso = objetos.includes(modulo.toLowerCase());

      if (!tienePermiso) {
        console.warn(`[AuthRoles] 🚫 Rol '${rol}' sin permiso para '${modulo}'`);
        return res.status(403).json({ error: "Sin permiso para este módulo" });
      }

      console.log(`[AuthRoles] ✅ Acceso permitido → Rol: ${rol}, Módulo: ${modulo}`);
      next();
    } catch (err) {
      console.error("[AuthRoles] ❌ Error interno:", err.message);
      res.status(500).json({ error: "Error en autenticación" });
    }
  };
};

module.exports = permit;
*/
