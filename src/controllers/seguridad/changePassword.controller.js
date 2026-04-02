// ============================================================
// 📁 src/controllers/seguridad/changePassword.controller.js
// 🔒 Endpoint real de cambio de contraseña
// ============================================================
const { pool } = require("../../db");
const admin = require("../../firebaseAdmin");
const bcrypt = require("bcryptjs");
const { registrarBitacora, findUserId } = require("../../utils/bitacora");

/**
 * POST /api/seguridad/change-password
 * Body: { currentPassword, newPassword }
 * Requiere autenticación JWT (req.user viene de firebaseUidInjector)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 🔒 Obtener email del token JWT verificado
    const email = req.user && req.user.email;
    if (!email) {
      return res.status(401).json({ error: "Autenticación requerida." });
    }

    // 🛡️ Validación de campos
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Debe proporcionar contraseña actual y nueva." });
    }

    // 🛡️ Validar complejidad de la nueva contraseña
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: "La nueva contraseña debe incluir al menos una mayúscula." });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: "La nueva contraseña debe incluir al menos una minúscula." });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: "La nueva contraseña debe incluir al menos un número." });
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return res.status(400).json({ error: "La nueva contraseña debe incluir al menos un carácter especial." });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "La nueva contraseña debe ser diferente a la actual." });
    }

    // 🔎 Buscar usuario en BD
    const userResult = await pool.query(
      `SELECT id_usuario, username, password, uid_firebase
       FROM seguridad.tbl_usuarios
       WHERE LOWER(username) = LOWER($1)
       LIMIT 1;`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const user = userResult.rows[0];

    // 🔐 Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta." });
    }

    // 🔐 Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 🔹 Actualizar en PostgreSQL
    await pool.query(
      `UPDATE seguridad.tbl_usuarios SET password = $1 WHERE id_usuario = $2;`,
      [hashedPassword, user.id_usuario]
    );

    // 🔥 Actualizar en Firebase (si tiene UID)
    if (user.uid_firebase) {
      try {
        await admin.auth().updateUser(user.uid_firebase, { password: newPassword });
        console.log(`[API] 🔄 Contraseña actualizada en Firebase para ${email}`);
      } catch (fbErr) {
        console.error("[API] ⚠️ Error actualizando contraseña en Firebase:", fbErr.message);
        // No fallar si Firebase tiene problema, la BD ya se actualizó
      }
    }

    // 📋 Bitácora
    await registrarBitacora({
      id_usuario: user.id_usuario,
      tabla: "seguridad.tbl_usuarios",
      accion: "UPDATE",
      descripcion: `Contraseña cambiada por ${email}`,
      detalle: JSON.stringify({ accion: "CHANGE_PASSWORD", username: email }),
    });

    console.log(`[API] ✅ Contraseña cambiada exitosamente para ${email}`);
    res.json({ message: "✅ Contraseña actualizada correctamente." });
  } catch (err) {
    console.error("[API] ❌ Error cambiando contraseña:", err);
    res.status(500).json({ error: "Error al cambiar la contraseña." });
  }
};

module.exports = { changePassword };
