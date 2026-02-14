// src/server.js
const express = require("express");
const cors = require("cors");
const speakeasy = require("speakeasy"); // npm i speakeasy
const qrcode = require("qrcode");       // npm i qrcode

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// 🔹 Verifica si el usuario ya tiene MFA (simulado)
app.get("/api/mfa/status", (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: "uid requerido" });
  return res.json({ uid, enrolled: false }); // por ahora siempre false
});

// 🔹 Inicia enrolamiento (genera QR y clave secreta)
app.get("/api/mfa/enroll/start", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: "uid requerido" });

    // Crea un secreto TOTP
    const secret = speakeasy.generateSecret({
      name: `EXTRACTUS (${uid})`,
      length: 20,
    });

    // Genera QR URL (otpauth)
    const otpauthUrl = secret.otpauth_url;

    // Convierte a imagen QR (en base64)
    const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Simula guardar en DB temporal
    console.log("📡 [MFA START] Generando QR para:", uid);

    res.json({
      uid,
      qrUrl: otpauthUrl,
      qrImage: qrDataUrl,
      secret: secret.base32,
    });
  } catch (err) {
    console.error("❌ Error generando enrolamiento:", err);
    res.status(500).json({ error: "No se pudo generar el enrolamiento 2FA" });
  }
});

// 🔹 Confirma enrolamiento
app.post("/api/mfa/enroll/confirm", (req, res) => {
  try {
    const { code, secret } = req.body;
    if (!code || !secret)
      return res.status(400).json({ error: "Faltan datos para confirmar." });

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: code,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ error: "Código incorrecto o expirado." });
    }

    console.log("✅ MFA confirmado correctamente!");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error confirmando MFA:", err);
    res.status(500).json({ error: "Error interno confirmando MFA." });
  }
});

// 🔹 Inicia servidor
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ API escuchando en http://localhost:${PORT}`);
});
