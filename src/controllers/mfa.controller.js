// ============================================================
// 2️⃣ Iniciar enrolamiento del 2FA (generar código QR)
// ============================================================
exports.startEnrollment = async (req, res) => {
  try {
    const { username } = req.body;

    // Verificar si el usuario existe
    const userRes = await pool.query(
      "SELECT mfa_secret FROM seguridad.tbl_usuarios WHERE username = $1",
      [username]
    );

    let secretBase32;

    // 🔹 Si el usuario ya tiene un secreto, lo reutilizamos
    if (userRes.rows.length > 0 && userRes.rows[0].mfa_secret) {
      secretBase32 = userRes.rows[0].mfa_secret.trim();
    } else {
      // 🔹 Generamos uno nuevo en formato Base32 válido
      const newSecret = speakeasy.generateSecret({
        name: `Extractus (${username})`,
        length: 20,
      });

      secretBase32 = newSecret.base32;

      // Guardar en base de datos (solo Base32)
      await pool.query(
        "UPDATE seguridad.tbl_usuarios SET mfa_secret = $1 WHERE username = $2",
        [secretBase32, username]
      );
    }

    // ✅ Generar la URL segura a partir del Base32 correcto
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secretBase32,
      label: `Extractus:${username}`,
      issuer: "Extractus",
      encoding: "base32",
    });

    // ✅ Generar el QR Code
    const qrImage = await qrcode.toDataURL(otpauthUrl);

    res.json({
      qr: qrImage,
      secret: secretBase32,
      message: "✅ Escanea este código QR en Google Authenticator.",
    });
  } catch (e) {
    console.error("❌ Error en startEnrollment:", e);
    res.status(500).json({ error: e.message });
  }
};
