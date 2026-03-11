const { pool } = require("../db");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

// ============================================================
// 1️⃣ Obtener el estado del MFA para un usuario
// ============================================================
exports.getStatus = async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: "Falta UID del usuario" });
    }

    const { rows } = await pool.query(
      "SELECT mfa_enabled FROM seguridad.tbl_usuarios WHERE uid_firebase = $1",
      [uid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ enrolled: rows[0].mfa_enabled === true });
  } catch (e) {
    console.error("❌ Error en getStatus:", e);
    res.status(500).json({ error: e.message });
  }
};

// ============================================================
// 2️⃣ Generar QR y secreto temporal para enrolamiento MFA
// ============================================================
exports.generate = async (req, res) => {
  try {
    const { uid, email } = req.query;
    if (!uid || !email) {
      return res.status(400).json({ error: "Falta UID o Email" });
    }

    // Verificar si el usuario ya tiene un secreto
    const userRes = await pool.query(
      "SELECT mfa_secret FROM seguridad.tbl_usuarios WHERE uid_firebase = $1",
      [uid]
    );

    let secretBase32;

    if (userRes.rows.length > 0 && userRes.rows[0].mfa_secret) {
      secretBase32 = userRes.rows[0].mfa_secret.trim();
    } else {
      // Generar nuevo secreto Base32
      const newSecret = speakeasy.generateSecret({
        name: `Extractus (${email})`,
        length: 20,
      });

      secretBase32 = newSecret.base32;

      // Guardar el secreto y poner mfa_enabled en false temporalmente
      await pool.query(
        "UPDATE seguridad.tbl_usuarios SET mfa_secret = $1, mfa_enabled = false WHERE uid_firebase = $2",
        [secretBase32, uid]
      );
    }

    // Generar la URL OTP y luego el QR Code
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secretBase32,
      label: `Extractus:${email}`,
      issuer: "Extractus",
      encoding: "base32",
    });

    const qrImage = await qrcode.toDataURL(otpauthUrl);

    res.json({
      qr: qrImage,
      secret: secretBase32,
      message: "✅ Escanea este código QR en Google Authenticator.",
    });
  } catch (e) {
    console.error("❌ Error en generate:", e);
    res.status(500).json({ error: e.message });
  }
};

// ============================================================
// 3️⃣ Verificar código 2FA (TOTP)
// ============================================================
exports.verify = async (req, res) => {
  try {
    const { uid, token, secret, email } = req.body;
    if (!uid || !token) {
      return res.status(400).json({ success: false, message: "Faltan datos (uid o token)" });
    }

    let secretToVerify = secret;

    // Si no se envía el secreto desde el cliente, buscarlo en la DB
    if (!secretToVerify) {
      const userRes = await pool.query(
        "SELECT mfa_secret FROM seguridad.tbl_usuarios WHERE uid_firebase = $1",
        [uid]
      );
      if (userRes.rows.length === 0 || !userRes.rows[0].mfa_secret) {
        return res.status(400).json({ success: false, message: "Usuario sin MFA configurado" });
      }
      secretToVerify = userRes.rows[0].mfa_secret.trim();
    }

    // Validar el token contra el secreto utilizando speakeasy
    const verified = speakeasy.totp.verify({
      secret: secretToVerify,
      encoding: "base32",
      token: token,
      window: 1 // Permite un rango de validación ligeramente mayor (antes/después)
    });

    if (verified) {
      // Si se envió un secreto en el body y fue verificado, marcamos el mfa_enabled = true
      // pues se asume que es la primera vez (confirmando el enrolamiento)
      if (secret) {
        await pool.query(
          "UPDATE seguridad.tbl_usuarios SET mfa_enabled = true WHERE uid_firebase = $1",
          [uid]
        );
        console.log(`✅ MFA activado para el usuario ${uid}`);
      }
      return res.json({ success: true, message: "Código MFA válido" });
    } else {
      return res.status(401).json({ success: false, message: "Código MFA inválido" });
    }
  } catch (e) {
    console.error("❌ Error en verify:", e);
    res.status(500).json({ success: false, message: "Error interno verificando código" });
  }
};
