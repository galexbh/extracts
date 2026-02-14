// ==========================
// 📁 src/server.js
// ==========================
const express = require("express");
const cors = require("cors");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const { pool } = require("./db"); // conexión PostgreSQL

const app = express();

/* ============================================================
   🔹 CORS (ahora acepta x-user-email)
   ============================================================ */
const corsOptions = {
  origin: ["https://extractus-app.sjtwku.easypanel.host", "http://localhost:3000", "http://localhost:3001"], // dirección del frontend React
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: ["Content-Type", "x-user-email"], // 👈 IMPORTANTE
};
app.use(cors(corsOptions));

app.use(express.json());

/* ============================================================
   🔹 Healthcheck
   ============================================================ */
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ============================================================
   🔹 Consultar estado del MFA
   ============================================================ */
app.get("/api/mfa/status", async (req, res) => {
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

/* ============================================================
   🔹 Generar o reutilizar QR (2FA)
   ============================================================ */
app.get("/api/mfa/generate", async (req, res) => {
  try {
    const { uid, email } = req.query;
    if (!uid && !email)
      return res.status(400).json({ error: "uid o email requeridos" });

    const existing = await pool.query(
      `
      SELECT mfa_secret, mfa_enabled
      FROM seguridad.tbl_usuarios
      WHERE uid_firebase = $1 OR username = $2 OR LOWER(username) = LOWER($2)
      `,
      [uid, email]
    );

    let secret;
    if (existing.rows.length && existing.rows[0].mfa_secret && existing.rows[0].mfa_enabled) {
      // ♻️ Reutilizar secreto existente (usuario ya verificó anteriormente)
      secret = existing.rows[0].mfa_secret;
      console.log(`♻️ Reutilizando secreto guardado para ${email}`);
    } else {
      // 🔐 Crear nuevo secreto TEMPORAL (no se guarda hasta verificar el código)
      const newSecret = speakeasy.generateSecret({
        length: 32,
        name: `Extractus (${email})`,
        issuer: "Extractus",
      });

      secret = newSecret.base32;

      console.log(`🆕 Secreto temporal generado para ${email} (pendiente de verificación)`);
    }

    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: `Extractus:${email}`,
      issuer: "Extractus",
      encoding: "base32",
    });

    const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

    res.json({ uid, qr: qrDataUrl, secret });
  } catch (err) {
    console.error("❌ Error generando QR:", err);
    res.status(500).json({ error: "No se pudo generar el QR" });
  }
});

/* ============================================================
   🔹 Verificar código TOTP (2FA)
   ============================================================ */
app.post("/api/mfa/verify", async (req, res) => {
  try {
    const { uid, token, email, secret: providedSecret } = req.body;

    if ((!uid && !email) || !token)
      return res.status(400).json({ error: "Faltan datos para verificar." });

    const result = await pool.query(
      `
      SELECT username, mfa_secret, mfa_enabled
      FROM seguridad.tbl_usuarios
      WHERE uid_firebase = $1 OR username = $2 OR LOWER(username) = LOWER($2)
      `,
      [uid, email]
    );

    if (!result.rows.length) {
      console.log(`⚠️ Usuario no encontrado → ${email || uid}`);
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const { username, mfa_secret, mfa_enabled } = result.rows[0];

    // 🔹 Determinar qué secreto usar
    let secretToVerify;
    let isFirstEnrollment = false;

    if (mfa_secret && mfa_enabled) {
      // Usuario ya tiene MFA activo, usar secreto de BD
      secretToVerify = mfa_secret;
      console.log(`🔐 Verificando código para usuario con MFA activo: ${username}`);
    } else if (providedSecret) {
      // Primera inscripción: usar secreto temporal del frontend
      secretToVerify = providedSecret;
      isFirstEnrollment = true;
      console.log(`🆕 Primera inscripción MFA para: ${username}`);
    } else {
      console.log(`⚠️ Usuario sin secreto guardado ni proporcionado → ${username}`);
      return res.status(400).json({ error: "No se encontró secreto MFA." });
    }

    // 🔹 Verificar el código TOTP
    const verified = speakeasy.totp.verify({
      secret: secretToVerify,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      console.log(`❌ Código inválido → Usuario: ${username}`);
      return res.json({ success: false, message: "Código inválido o expirado." });
    }

    // 🔹 Si es primera inscripción, AHORA guardamos el secreto en la BD
    if (isFirstEnrollment) {
      await pool.query(
        `
        UPDATE seguridad.tbl_usuarios
        SET mfa_secret = $1, mfa_enabled = true
        WHERE uid_firebase = $2 OR username = $3 OR LOWER(username) = LOWER($3)
        `,
        [secretToVerify, uid, email]
      );
      console.log(`✅ MFA activado y guardado para: ${username}`);
    } else {
      console.log(`✅ Código verificado correctamente → Usuario: ${username}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error verificando código:", err);
    res.status(500).json({ error: "Error verificando código 2FA" });
  }
});

/* ============================================================
   🔹 Restablecer MFA (al cambiar contraseña)
   ============================================================ */
app.post("/api/mfa/reset", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ error: "Email requerido" });

    const result = await pool.query(
      `
      UPDATE seguridad.tbl_usuarios
      SET mfa_secret = NULL, mfa_enabled = false
      WHERE username = $1 OR LOWER(username) = LOWER($1)
      RETURNING username
      `,
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️ Usuario no encontrado para resetear MFA: ${email}`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    console.log(`🔄 MFA reseteado para usuario: ${result.rows[0].username}`);
    res.json({ success: true, message: "MFA reseteado correctamente" });
  } catch (err) {
    console.error("❌ Error reseteando MFA:", err);
    res.status(500).json({ error: "Error reseteando MFA" });
  }
});


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
