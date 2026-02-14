// ============================================================
// 📁 src/middleware/firebaseUidInjector.js
// ============================================================
// 🔐 Middleware que inyecta automáticamente el UID de Firebase
// si el token JWT es válido. No interrumpe el flujo si no hay token.
// ============================================================

/*
const admin = require("../firebaseAdmin");

async function firebaseUidInjector(req, res, next) {
  const authHeader = req.headers.authorization;

  // ------------------------------------------------------------
  // 🔎 No viene token → simplemente continuar sin UID
  // ------------------------------------------------------------
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split("Bearer ")[1];

  // ------------------------------------------------------------
  // 🔐 Verificar token JWT Firebase
  // ------------------------------------------------------------
  try {
    const decoded = await admin.auth().verifyIdToken(token);

    // Inserta UID en el header para que otros middlewares lo usen
    req.headers["x-user-uid"] = decoded.uid;

    console.log(`🔑 UID inyectado automáticamente: ${decoded.uid}`);
  } catch (error) {
    console.warn("[firebaseUidInjector] ⚠️ Token Firebase inválido:", error.message);
  }

  next();
}

module.exports = firebaseUidInjector;
*/
