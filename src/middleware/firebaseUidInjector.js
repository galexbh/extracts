// ============================================================
// src/middleware/firebaseUidInjector.js
// ============================================================
// Middleware que verifica el token JWT de Firebase y expone
//    req.user = { uid, email } para uso de otros middlewares.
//
// MODO PERMISIVO: Si no hay token, deja pasar la peticion
//    sin req.user. La proteccion real la hacen los middlewares
//    verifyPermission y verifyRoleAccess en cada ruta.
//
// SEGURIDAD: Al inyectar el email verificado en el header,
//    evitamos que un atacante pueda manipular x-user-email para
//    suplantar a otro usuario (INC-003: Escalacion de Privilegios).
// ============================================================

const admin = require("../firebaseAdmin");

async function firebaseUidInjector(req, res, next) {
  const authHeader = req.headers.authorization;

  // ------------------------------------------------------------
  // 🛡️ SEGURIDAD CRÍTICA: Limpiar cabeceras enviadas por el infractor/cliente
  // Esto evita "Header Injection" / "Auth Bypass" si no viene token
  // ------------------------------------------------------------
  delete req.headers["x-user-email"];
  delete req.headers["X-User-Email"];

  // ------------------------------------------------------------
  // No viene token -> dejar pasar SIN req.user
  // Las rutas protegidas verificaran permisos despues
  // Las rutas pre-login (estado-login, rol, accesos) necesitan pasar
  // ------------------------------------------------------------
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split("Bearer ")[1];

  // ------------------------------------------------------------
  // Verificar token JWT Firebase
  // ------------------------------------------------------------
  try {
    const decoded = await admin.auth().verifyIdToken(token);

    // Inyectar datos del usuario verificado en el request
    req.user = {
      uid: decoded.uid,
      email: decoded.email || "",
    };

    // SEGURIDAD CRITICA: Sobreescribir el header x-user-email
    // con el email VERIFICADO del token JWT.
    // Esto evita que el cliente envie un email falso en el header
    // para suplantar a otro usuario (Escalacion de Privilegios).
    if (decoded.email) {
      req.headers["x-user-email"] = decoded.email;
      req.headers["X-User-Email"] = decoded.email;
    }

    next();
  } catch (error) {
    console.warn("[firebaseUidInjector] Token Firebase invalido:", error.message);
    return res.status(401).json({
      error: "INVALID_TOKEN",
      message: "El token de autenticacion es invalido o ha expirado.",
    });
  }
}

module.exports = firebaseUidInjector;
