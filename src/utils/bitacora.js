// ============================================================
// 📂 src/utils/bitacora.js
// 🔒 Función centralizada para registrar eventos en la bitácora
//    con sanitización de datos sensibles
// ============================================================
const { pool } = require("../db");

/**
 * 🔒 Campos sensibles que NUNCA deben aparecer en logs de auditoría.
 */
const SENSITIVE_FIELDS = ["password", "mfa_secret", "token", "secret", "hashedPassword", "finalPassword"];

/**
 * Sanitiza un objeto eliminando campos sensibles antes de guardarlo en bitácora.
 * @param {object} data - Objeto a sanitizar
 * @returns {object} Objeto limpio sin campos sensibles
 */
const sanitizeForLog = (data) => {
  if (!data || typeof data !== "object") return data;
  const clean = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in clean) {
      clean[field] = "***REDACTED***";
    }
  }
  // Sanitizar objetos anidados (antes/después)
  if (clean.antes && typeof clean.antes === "object") {
    clean.antes = sanitizeForLog(clean.antes);
  }
  if (clean.despues && typeof clean.despues === "object") {
    clean.despues = sanitizeForLog(clean.despues);
  }
  return clean;
};

/**
 * Registra una acción en la bitácora del sistema.
 * @param {Object} params
 * @param {number|null} params.id_usuario - ID del usuario que realizó la acción
 * @param {number|null} [params.id_objeto] - ID del objeto afectado (opcional)
 * @param {string} params.tabla - Nombre de la tabla afectada
 * @param {string} params.accion - Tipo de acción: INSERT, UPDATE, DELETE, LOGIN
 * @param {string} params.descripcion - Descripción legible de la acción
 * @param {string|object|null} [params.detalle] - Detalle JSON con datos antes/después
 */
const registrarBitacora = async ({ id_usuario, id_objeto, tabla, accion, descripcion, detalle }) => {
  try {
    // 🔒 Sanitizar detalle para excluir campos sensibles
    let detalleJSON = null;
    if (detalle) {
      if (typeof detalle === "string") {
        try {
          const parsed = JSON.parse(detalle);
          detalleJSON = JSON.stringify(sanitizeForLog(parsed));
        } catch {
          detalleJSON = detalle; // Si no es JSON válido, guardar como está
        }
      } else {
        detalleJSON = JSON.stringify(sanitizeForLog(detalle));
      }
    }

    await pool.query(
      `INSERT INTO seguridad.tbl_ms_bitacora
        (id_usuario, id_objeto, tabla, accion, descripcion, detalle, fecha_evento, id_usuario_creado, fecha_creado)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $1, NOW());`,
      [id_usuario, id_objeto || null, tabla, accion, descripcion, detalleJSON]
    );
  } catch (err) {
    console.error("[Bitácora] ❌ Error registrando:", err.message);
  }
};

/**
 * Extrae el email/username del request.
 * 🔒 Prioridad: req.user.email (del JWT verificado) > header
 */
const extractUsername = (req) => {
  return (
    (req.user && req.user.email) ||
    req.headers["x-user-email"] ||
    req.headers["X-User-Email"] ||
    req.headers["x-User-Email"] ||
    null
  );
};

/**
 * Busca el id_usuario en la BD a partir del username/email.
 */
const findUserId = async (username) => {
  if (!username) return null;
  const result = await pool.query(
    "SELECT id_usuario FROM seguridad.tbl_usuarios WHERE username ILIKE $1;",
    [username]
  );
  return result.rows.length > 0 ? result.rows[0].id_usuario : null;
};

module.exports = { registrarBitacora, extractUsername, findUserId, sanitizeForLog };
