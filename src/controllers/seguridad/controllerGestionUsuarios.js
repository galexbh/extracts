// ============================================================
// 📁 src/controllers/Seguridad/controllerGestionUsuarios.js
// ============================================================

const { pool } = require("../../db");
const admin = require("../../firebaseAdmin");
const bcrypt = require("bcryptjs");

console.log("[FIREBASE] ✅ Admin inicializado correctamente");

// ============================================================
// 🔹 LISTAR USUARIOS (con accesos incluidos)
// ============================================================
const getUsuarios = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id_usuario,
        u.nombre_usuario,
        u.username,
        u.password,
        u.id_rol,
        COALESCE(r.nombre_rol, '—') AS nombre_rol,
        COALESCE(r.accesos, '') AS accesos,          -- ✅ incluye accesos del rol
        u.id_estado_usuario,
        COALESCE(e.nombre_estado, 'Desconocido') AS nombre_estado_usuario,
        TO_CHAR(
          u.fecha_creacion AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa',
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS fecha_creacion,
        u.ultimo_login,
        u.uid_firebase
      FROM seguridad.tbl_usuarios u
      LEFT JOIN seguridad.tbl_roles r ON r.id_rol = u.id_rol
      LEFT JOIN mantenimiento.tbl_estado_usuario e 
        ON e.id_estado_usuario = u.id_estado_usuario
      ORDER BY u.id_usuario;
    `);

    // 🧩 Normalizar accesos: convertir texto a array legible
    const usuarios = result.rows.map((u) => {
      if (u.accesos && typeof u.accesos === "string") {
        const accesosText = u.accesos.trim();
        if (accesosText.startsWith("[") && accesosText.endsWith("]")) {
          try {
            u.accesos = JSON.parse(accesosText.replace(/'/g, '"'));
          } catch {
            u.accesos = accesosText
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean);
          }
        } else {
          u.accesos = accesosText
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean);
        }
      } else {
        u.accesos = [];
      }
      return u;
    });

    res.json(usuarios);
  } catch (err) {
    console.error("[API] ❌ Error obteniendo usuarios:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

// ============================================================
// 🔹 OBTENER USUARIO POR ID
// ============================================================
const getUsuarioById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT 
        u.*, 
        r.nombre_rol,
        r.accesos,
        e.nombre_estado AS nombre_estado_usuario
      FROM seguridad.tbl_usuarios u
      LEFT JOIN seguridad.tbl_roles r ON r.id_rol = u.id_rol
      LEFT JOIN mantenimiento.tbl_estado_usuario e 
        ON e.id_estado_usuario = u.id_estado_usuario
      WHERE u.id_usuario = $1;
      `,
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Usuario no encontrado" });

    const usuario = result.rows[0];

    // 🔧 Normalizar accesos también aquí
    if (usuario.accesos && typeof usuario.accesos === "string") {
      const acc = usuario.accesos.trim();
      if (acc.startsWith("[") && acc.endsWith("]")) {
        try {
          usuario.accesos = JSON.parse(acc.replace(/'/g, '"'));
        } catch {
          usuario.accesos = acc.split(",").map((a) => a.trim());
        }
      } else {
        usuario.accesos = acc.split(",").map((a) => a.trim());
      }
    }

    res.json(usuario);
  } catch (err) {
    console.error("[API] ❌ Error obteniendo usuario:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// ============================================================
// 🔹 INSERTAR USUARIO (🔥 Firebase + PostgreSQL)
// ============================================================
const insertUsuario = async (req, res) => {
  const { nombre_usuario, username, password, id_rol, id_estado_usuario } = req.body;

  try {
    // 🔥 Crear usuario en Firebase
    const userRecord = await admin.auth().createUser({
      email: username,
      password,
      displayName: nombre_usuario || username,
    });

    console.log("[API] ✅ Usuario creado en Firebase:", userRecord.uid);

    // 🔹 Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Insertar en PostgreSQL con procedimiento almacenado
    await pool.query(
      `CALL seguridad.sp_usuarios_insert($1, $2, $3, $4, $5, $6);`,
      [nombre_usuario, username, hashedPassword, id_rol, id_estado_usuario, userRecord.uid]
    );

    res.json({ message: "✅ Usuario creado en Firebase y PostgreSQL" });
  } catch (err) {
    console.error("[API] ❌ Error creando usuario:", err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR USUARIO (🔥 Firebase + PostgreSQL)
// ============================================================
const updateUsuario = async (req, res) => {
  const { id_usuario } = req.params;
  const { username, password, id_rol, id_estado_usuario, mfa_secret, mfa_enabled } = req.body;

  try {
    const result = await pool.query(
      `SELECT uid_firebase, username FROM seguridad.tbl_usuarios WHERE id_usuario = $1;`,
      [id_usuario]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Usuario no encontrado" });

    let uid = result.rows[0].uid_firebase;
    const emailActual = result.rows[0].username;
    const newEmail = username || emailActual;

    if (!uid) {
      try {
        const fbUser = await admin.auth().getUserByEmail(emailActual);
        uid = fbUser.uid;

        await pool.query(
          `UPDATE seguridad.tbl_usuarios SET uid_firebase = $1 WHERE id_usuario = $2;`,
          [uid, id_usuario]
        );

        console.log(`[API] 🧩 UID encontrado y guardado (${uid})`);
      } catch {
        console.warn(`[API] ⚠️ No se encontró usuario en Firebase (${emailActual})`);
      }
    }

    if (uid) {
      const fbUpdate = {};
      if (newEmail && newEmail !== emailActual) fbUpdate.email = newEmail;
      fbUpdate.displayName = username || newEmail;

      const isHash = password && (password.startsWith("$2") || password.length > 50);
      if (password && !isHash) fbUpdate.password = password;

      if (Object.keys(fbUpdate).length > 0) {
        await admin.auth().updateUser(uid, fbUpdate);
        console.log(`[API] 🔄 Usuario actualizado en Firebase (${uid})`);
      }
    }

    await pool.query(
      `CALL seguridad.sp_usuarios_update($1,$2,$3,$4,$5,$6,$7);`,
      [
        id_usuario,
        username,
        password || "",
        id_rol,
        id_estado_usuario,
        mfa_secret,
        mfa_enabled,
      ]
    );

    res.json({
      message: uid
        ? "✅ Usuario actualizado en Firebase y PostgreSQL"
        : "✅ Usuario actualizado solo en PostgreSQL (sin UID Firebase)",
    });
  } catch (err) {
    console.error("[API] ❌ Error actualizando usuario:", err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// 🔹 ELIMINAR USUARIO (🔥 Firebase + PostgreSQL)
// ============================================================
const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT uid_firebase FROM seguridad.tbl_usuarios WHERE id_usuario = $1;`,
      [id]
    );

    if (result.rows.length > 0) {
      const uid = result.rows[0].uid_firebase?.trim();
      if (uid && uid !== "") {
        try {
          await admin.auth().deleteUser(uid);
          console.log(`[API] 🔥 Usuario eliminado de Firebase: ${uid}`);
        } catch (firebaseErr) {
          if (firebaseErr.errorInfo?.code === "auth/user-not-found") {
            console.warn(`[API] ⚠️ UID no encontrado en Firebase (${uid}), continuando...`);
          } else {
            console.error("[API] ❌ Error al eliminar en Firebase:", firebaseErr);
          }
        }
      } else {
        console.warn(`[API] ⚠️ UID vacío o inválido (id_usuario=${id}), solo PostgreSQL`);
      }
    } else {
      console.warn(`[API] ⚠️ No existe usuario con id_usuario=${id} en PostgreSQL`);
    }

    await pool.query(`CALL seguridad.sp_usuarios_delete($1);`, [parseInt(id)]);

    res.json({
      message: "✅ Usuario eliminado correctamente (Firebase + PostgreSQL)",
    });
  } catch (err) {
    console.error("[API] ❌ Error eliminando usuario:", err);
    res.status(500).json({ error: err.message });
  }
};

// ============================================================
// ✅ EXPORTACIONES
// ============================================================
module.exports = {
  getUsuarios,
  getUsuarioById,
  insertUsuario,
  updateUsuario,
  deleteUsuario,
};
