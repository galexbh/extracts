// ==========================
// 📁 src/server.js
// ==========================
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const { pool } = require("./db"); // conexión PostgreSQL
const firebaseUidInjector = require("./middleware/firebaseUidInjector");

const app = express();

/* ============================================================
   🔹 HELMET — Headers de seguridad HTTP
   ============================================================ */
app.use(helmet({
  contentSecurityPolicy: false, // desactivar CSP para no romper el frontend React
  crossOriginEmbedderPolicy: false,
}));

/* ============================================================
   🔹 CORS (acepta x-user-email + Authorization)
   ============================================================ */
const corsOptions = {
  origin: ["https://extractus-app.sjtwku.easypanel.host", "http://localhost:3000", "http://localhost:3001"],
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: ["Content-Type", "x-user-email", "Authorization"], // 👈 Authorization agregado
};
app.use(cors(corsOptions));

app.use(express.json());

/* ============================================================
   🔹 Rate Limiting
   ============================================================ */
// Limitar endpoints MFA (protección contra fuerza bruta de códigos TOTP)
const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // máximo 15 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMIT", message: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
});

// Limitar API general
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // 300 peticiones por 15 min por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMIT", message: "Demasiadas peticiones. Intenta de nuevo más tarde." },
});

/* ============================================================
   🔹 Healthcheck (público)
   ============================================================ */
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ============================================================
   🔹 ENDPOINTS MFA — Pre-autenticación (flujo de login)
   Estos endpoints NO requieren token JWT porque se usan
   DURANTE el proceso de login, antes de completar la autenticación.
   Se protegen con rate limiting.
   ============================================================ */

/* --- Consultar estado del MFA --- */
app.get("/api/mfa/status", mfaLimiter, async (req, res) => {
  const { uid, email } = req.query;
  if (!uid && !email)
    return res.status(400).json({ error: "uid o email requerido" });

  try {
    const result = await pool.query(
      `
      SELECT mfa_secret, mfa_enabled
      FROM seguridad.tbl_usuarios
      WHERE uid_firebase = $1 OR username = $2 OR LOWER(username) = LOWER($2)
      `,
      [uid, email]
    );

    const enrolled =
      result.rows.length > 0 &&
      !!result.rows[0].mfa_secret &&
      result.rows[0].mfa_enabled === true;

    res.json({ uid, enrolled });
  } catch (err) {
    console.error("❌ Error consultando estado MFA:", err);
    res.status(500).json({ error: "Error consultando estado MFA" });
  }
});

/* --- Generar o reutilizar QR (2FA) --- */
app.get("/api/mfa/generate", mfaLimiter, async (req, res) => {
  try {
    const { uid, email } = req.query;
    if (!uid && !email)
      return res.status(400).json({ error: "uid o email requeridos" });

    // 🔒 Buscar por UID primero, luego por email
    const existing = await pool.query(
      `SELECT mfa_secret, mfa_enabled
       FROM seguridad.tbl_usuarios
       WHERE uid_firebase = $1 OR LOWER(username) = LOWER($2)
       LIMIT 1`,
      [uid || '', email || '']
    );

    let secret;

    if (existing.rows.length && existing.rows[0].mfa_secret && existing.rows[0].mfa_enabled) {
      // ♻️ Reutilizar secreto existente (usuario ya verificó anteriormente)
      secret = existing.rows[0].mfa_secret;
      console.log(`♻️ Reutilizando secreto guardado para ${email}`);
    } else {
      // 🔐 Crear nuevo secreto y guardarlo como PENDIENTE en BD
      const newSecret = speakeasy.generateSecret({
        length: 32,
        name: `Extractus (${email})`,
        issuer: "Extractus",
      });

      secret = newSecret.base32;

      // Guardar el secreto pendiente en BD (mfa_enabled sigue en false)
      await pool.query(
        `UPDATE seguridad.tbl_usuarios
         SET mfa_secret = $1, mfa_enabled = false
         WHERE uid_firebase = $2 OR LOWER(username) = LOWER($3)`,
        [secret, uid || '', email || '']
      );

      console.log(`🆕 Secreto temporal guardado en BD para ${email} (pendiente de verificación)`);
    }

    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: `Extractus:${email}`,
      issuer: "Extractus",
      encoding: "base32",
    });

    const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

    // 🔒 SEGURIDAD: NUNCA enviar el secreto al frontend.
    // El secreto se guarda en BD y se usa desde allí en /verify.
    res.json({ uid, qr: qrDataUrl });
  } catch (err) {
    console.error("❌ Error generando QR:", err);
    res.status(500).json({ error: "No se pudo generar el QR" });
  }
});

/* --- Verificar código TOTP (2FA) --- */
app.post("/api/mfa/verify", mfaLimiter, async (req, res) => {
  try {
    const { uid, token, email } = req.body;

    if ((!uid && !email) || !token)
      return res.status(400).json({ error: "Faltan datos para verificar." });

    // 🔒 Buscar por UID primero, luego por email
    const result = await pool.query(
      `SELECT username, mfa_secret, mfa_enabled
       FROM seguridad.tbl_usuarios
       WHERE uid_firebase = $1 OR LOWER(username) = LOWER($2)
       LIMIT 1`,
      [uid || '', email || '']
    );

    if (!result.rows.length) {
      console.log(`⚠️ Usuario no encontrado → ${email || uid}`);
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const { username, mfa_secret, mfa_enabled } = result.rows[0];

    // 🔒 SEGURIDAD: Solo usar el secreto almacenado en la BD.
    // NUNCA aceptar un secreto proporcionado por el frontend.
    if (!mfa_secret) {
      console.log(`⚠️ Usuario sin secreto MFA guardado → ${username}`);
      return res.status(400).json({ error: "No se encontró secreto MFA. Genere un nuevo QR." });
    }

    let isFirstEnrollment = !mfa_enabled;

    // 🔹 Verificar el código TOTP
    const verified = speakeasy.totp.verify({
      secret: mfa_secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      console.log(`❌ Código inválido → Usuario: ${username}`);
      return res.json({ success: false, message: "Código inválido o expirado." });
    }

    // 🔹 Si es primera inscripción, activar MFA
    if (isFirstEnrollment) {
      await pool.query(
        `UPDATE seguridad.tbl_usuarios
         SET mfa_enabled = true
         WHERE uid_firebase = $1 OR LOWER(username) = LOWER($2)`,
        [uid || '', email || '']
      );
      console.log(`✅ MFA activado para: ${username}`);
    } else {
      console.log(`✅ Código verificado correctamente → Usuario: ${username}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error verificando código:", err);
    res.status(500).json({ error: "Error verificando código 2FA" });
  }
});

/* --- Restablecer MFA (requiere autenticación JWT + admin o self-reset) --- */
app.post("/api/mfa/reset", firebaseUidInjector, async (req, res) => {
  try {
    const { email } = req.body;
    const requestingUser = req.user; // 🔒 Del JWT verificado

    if (!requestingUser || !requestingUser.email) {
      return res.status(401).json({ error: "Autenticación requerida para esta acción." });
    }

    if (!email)
      return res.status(400).json({ error: "Email requerido" });

    // 🔒 SEGURIDAD: Solo permitir reset si:
    // 1) El usuario resetea su propio MFA, O
    // 2) El usuario tiene rol con acceso "Todos" (admin)
    const isSelfReset = requestingUser.email && requestingUser.email.toLowerCase() === email.toLowerCase();

    if (!isSelfReset) {
      // Verificar si el solicitante es admin
      const adminCheck = await pool.query(
        `SELECT r.accesos
         FROM seguridad.tbl_usuarios u
         JOIN seguridad.tbl_roles r ON r.id_rol = u.id_rol
         WHERE LOWER(u.username) = LOWER($1)
         LIMIT 1`,
        [requestingUser.email]
      );

      let isAdmin = false;
      if (adminCheck.rows.length) {
        const accesos = adminCheck.rows[0].accesos;
        const accArr = Array.isArray(accesos) 
          ? accesos.map(s => s.trim().toLowerCase())
          : String(accesos || '').toLowerCase().split(',').map(s => s.trim());
        isAdmin = accArr.includes('todos');
      }

      if (!isAdmin) {
        console.warn(`🚧 [MFA] Reset denegado: ${requestingUser.email} intentó resetear MFA de ${email}`);
        return res.status(403).json({ 
          error: "ACCESS_DENIED",
          message: "Solo un administrador puede resetear el MFA de otro usuario." 
        });
      }
    }

    const result = await pool.query(
      `UPDATE seguridad.tbl_usuarios
       SET mfa_secret = NULL, mfa_enabled = false
       WHERE LOWER(username) = LOWER($1)
       RETURNING username`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️ Usuario no encontrado para resetear MFA: ${email}`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    console.log(`🔄 MFA reseteado para ${result.rows[0].username} por ${requestingUser.email}`);
    res.json({ success: true, message: "MFA reseteado correctamente" });
  } catch (err) {
    console.error("❌ Error reseteando MFA:", err);
    res.status(500).json({ error: "Error reseteando MFA" });
  }
});


/* ============================================================
   🔹 MIDDLEWARE GLOBAL para todas las rutas /api/* (excepto MFA pre-login)
   Requiere token JWT válido de Firebase
   ============================================================ */
app.use("/api", apiLimiter, firebaseUidInjector);


/* ============================================================
   🔹 Rutas principales (con /api)
   ============================================================ */
const contabilidadRoutes = require("./routes/contabilidad.routes");
const mantenimientoRoutes = require("./routes/mantenimiento.routes");
const seguridadRoutes = require("./routes/seguridad.routes");
const bitacoraRoutes = require("./routes/bitacora.routes");
const ventasRoutes = require("./routes/ventas.routes");
const comprasRoutes = require("./routes/compras.routes");
const produccionRoutes = require("./routes/produccion.routes");
const inventarioRoutes = require("./routes/Inventario.routes");
const pagosFacturaRoutes = require("./routes/pagosFactura.routes");
const reportesContabilidadRoutes = require("./routes/reportesContabilidad.routes");

app.use("/api/contabilidad", contabilidadRoutes);
app.use("/api/seguridad", seguridadRoutes);
app.use("/api/mantenimiento", mantenimientoRoutes);
app.use("/api/bitacora", bitacoraRoutes);
app.use("/api/ventas", ventasRoutes);
app.use("/api/compras", comprasRoutes);
app.use("/api/produccion", produccionRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/ventas/pagos-factura", pagosFacturaRoutes);
app.use("/api/contabilidad/reportes-contabilidad", reportesContabilidadRoutes);

// Servir archivos estáticos del frontend (React build)
const path = require("path");
app.use(express.static(path.join(__dirname, "../build")));

// Cualquier otra ruta -> Servir index.html (React Router)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

/* ============================================================
   🚀 Iniciar servidor
   ============================================================ */
const PORT = process.env.API_PORT || process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor activo en http://localhost:${PORT}`);
});
