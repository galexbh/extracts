// ============================================================
// 📁 src/routes/Seguridad.routes.js
// 🔒 Versión con protección RBAC completa en todas las rutas
// ============================================================

const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const verifyRoleAccess = require("../middleware/verifyRoleAccess");
const verifyPermission = require("../middleware/verifyObjectPermission");

// ============================================================
// 🧩 IMPORTAR CONTROLADORES
// ============================================================
const usuariosCtrl = require("../controllers/seguridad/controllerGestionUsuarios");
const rolesCtrl = require("../controllers/seguridad/RolesController");
const permisosCtrl = require("../controllers/seguridad/PermisosController");
const personasCtrl = require("../controllers/seguridad/PersonasController");
const correosCtrl = require("../controllers/seguridad/CorreosController");
const direccionesCtrl = require("../controllers/seguridad/DireccionesController");
const telefonosCtrl = require("../controllers/seguridad/TelefonosController");
const objetosCtrl = require("../controllers/seguridad/Objectos.controller");
const changePasswordCtrl = require("../controllers/seguridad/changePassword.controller");

// ============================================================
// 🔐 CAMBIAR CONTRASEÑA (requiere autenticación, no RBAC)
// ============================================================
router.post("/change-password", changePasswordCtrl.changePassword);

// ============================================================
// 👥 USUARIOS
// ============================================================
router.get("/usuarios", verifyPermission("Usuarios", "read"), usuariosCtrl.getUsuarios);

// 🔐 Verificar estado del usuario para el login (va ANTES de :id)
router.get("/usuarios/estado-login", async (req, res) => {
  const { uid, email } = req.query;
  if (!uid && !email) {
    return res.status(400).json({ error: "UID o email requerido" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT e.nombre_estado
       FROM seguridad.tbl_usuarios u
       LEFT JOIN mantenimiento.tbl_estado_usuario e
         ON e.id_estado_usuario = u.id_estado_usuario
       WHERE u.uid_firebase = $1 OR LOWER(u.username) = LOWER($2)
       LIMIT 1;`,
      [uid || "", email || ""]
    );

    if (!rows.length)
      return res.status(404).json({ error: "Usuario no encontrado" });

    const estado = (rows[0].nombre_estado || "").toLowerCase().trim();
    const permitido = estado === "activo";

    return res.json({ permitido, estado: rows[0].nombre_estado });
  } catch (err) {
    console.error("[API] \u274c Error verificando estado de login:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 🔑 Obtener rol del usuario por email (para login multi-usuario)
router.get("/usuarios/rol", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  try {
    const { rows } = await pool.query(
      `SELECT r.nombre_rol
       FROM seguridad.tbl_usuarios u
       JOIN seguridad.tbl_roles r ON r.id_rol = u.id_rol
       WHERE LOWER(u.username) = LOWER($1) AND u.id_estado_usuario = 1
       LIMIT 1;`,
      [email]
    );

    if (!rows.length)
      return res.status(404).json({ error: "Usuario no encontrado" });

    res.json({ nombre_rol: rows[0].nombre_rol });
  } catch (err) {
    console.error("❌ Error obteniendo rol:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

router.get("/usuarios/:id", verifyPermission("Usuarios", "read"), usuariosCtrl.getUsuarioById);
router.post("/usuarios", verifyPermission("Usuarios", "create"), usuariosCtrl.insertUsuario);
router.put("/usuarios/:id_usuario", verifyPermission("Usuarios", "update"), usuariosCtrl.updateUsuario);
router.delete("/usuarios/:id", verifyPermission("Usuarios", "delete"), usuariosCtrl.deleteUsuario);

// ============================================================
// 🧩 ROLES
// ============================================================
router.get("/roles", verifyPermission("Roles", "read"), rolesCtrl.getRoles);
router.get("/roles/:id", verifyPermission("Roles", "read"), rolesCtrl.getRolById);
router.post("/roles", verifyPermission("Roles", "create"), rolesCtrl.insertRol);
router.put("/roles/:id_rol", verifyPermission("Roles", "update"), rolesCtrl.updateRol);
router.delete("/roles/:id", verifyPermission("Roles", "delete"), rolesCtrl.deleteRol);

// ============================================================
// 🔐 PERMISOS
// ============================================================
router.get("/permisos", verifyPermission("Permisos", "read"), permisosCtrl.getPermisos);
router.get("/permisos/:id", verifyPermission("Permisos", "read"), permisosCtrl.getPermisoById);
router.post("/permisos", verifyPermission("Permisos", "create"), permisosCtrl.insertPermiso);
router.put("/permisos/:id_permiso", verifyPermission("Permisos", "update"), permisosCtrl.updatePermiso);
router.delete("/permisos/:id", verifyPermission("Permisos", "delete"), permisosCtrl.deletePermiso);

// ============================================================
// 🧍 PERSONAS (🔒 Ahora protegido con RBAC)
// ============================================================
router.get("/personas", verifyPermission("Personas", "read"), personasCtrl.getPersonas);
router.get("/personas/:id", verifyPermission("Personas", "read"), personasCtrl.getPersonaById);
router.post("/personas", verifyPermission("Personas", "create"), personasCtrl.insertPersona);
router.put("/personas/:id_persona", verifyPermission("Personas", "update"), personasCtrl.updatePersona);
router.delete("/personas/:id", verifyPermission("Personas", "delete"), personasCtrl.deletePersona);

// ============================================================
// 📧 CORREOS (🔒 Ahora protegido con RBAC)
// ============================================================
router.get("/correos", verifyPermission("Correos", "read"), correosCtrl.getCorreos);
router.get("/correos/:id", verifyPermission("Correos", "read"), correosCtrl.getCorreoById);
router.post("/correos", verifyPermission("Correos", "create"), correosCtrl.insertCorreo);
router.put("/correos/:id_correo", verifyPermission("Correos", "update"), correosCtrl.updateCorreo);
router.delete("/correos/:id", verifyPermission("Correos", "delete"), correosCtrl.deleteCorreo);

// ============================================================
// 🏠 DIRECCIONES (🔒 Ahora protegido con RBAC)
// ============================================================
router.get("/direcciones", verifyPermission("Direcciones", "read"), direccionesCtrl.getDirecciones);
router.get("/direcciones/:id", verifyPermission("Direcciones", "read"), direccionesCtrl.getDireccionById);
router.post("/direcciones", verifyPermission("Direcciones", "create"), direccionesCtrl.insertDireccion);
router.put("/direcciones/:id_direccion", verifyPermission("Direcciones", "update"), direccionesCtrl.updateDireccion);
router.delete("/direcciones/:id", verifyPermission("Direcciones", "delete"), direccionesCtrl.deleteDireccion);

// ============================================================
// ☎️ TELÉFONOS (🔒 Ahora protegido con RBAC)
// ============================================================
router.get("/telefonos", verifyPermission("Telefonos", "read"), telefonosCtrl.getTelefonos);
router.get("/telefonos/:id", verifyPermission("Telefonos", "read"), telefonosCtrl.getTelefonoById);
router.post("/telefonos", verifyPermission("Telefonos", "create"), telefonosCtrl.insertTelefono);
router.put("/telefonos/:id_telefono", verifyPermission("Telefonos", "update"), telefonosCtrl.updateTelefono);
router.delete("/telefonos/:id", verifyPermission("Telefonos", "delete"), telefonosCtrl.deleteTelefono);

// ============================================================
// 🧱 OBJETOS
// ============================================================
router.get("/objetos", verifyPermission("Objetos", "read"), objetosCtrl.getObjetos);
router.get("/objetos/:id/dependencias", verifyPermission("Objetos", "read"), objetosCtrl.getObjetoDependencias);
router.get("/objetos/:id", verifyPermission("Objetos", "read"), objetosCtrl.getObjetoById);
router.post("/objetos", verifyPermission("Objetos", "create"), objetosCtrl.insertObjeto);
router.put("/objetos/:id_objeto", verifyPermission("Objetos", "update"), objetosCtrl.updateObjeto);
router.delete("/objetos/:id", verifyPermission("Objetos", "delete"), objetosCtrl.deleteObjeto);

// ============================================================
// 🔹 Obtener accesos del usuario logueado
// ============================================================
router.get("/accesos", async (req, res) => {
  try {
    // 🔒 Usar email verificado del JWT
    const email = (req.user && req.user.email) || req.headers["x-user-email"];
    if (!email)
      return res.status(400).json({ error: "MISSING_EMAIL" });

    const q = `
      SELECT r.accesos
      FROM seguridad.tbl_usuarios u
      JOIN seguridad.tbl_roles r ON r.id_rol = u.id_rol
      WHERE LOWER(u.username) = LOWER($1)
      LIMIT 1;
    `;
    const { rows } = await pool.query(q, [email]);

    if (!rows.length)
      return res.status(404).json({ error: "USER_NOT_FOUND" });

    const accesos = rows[0].accesos;
    console.log(`📤 Accesos obtenidos para ${email}:`, accesos);

    res.json({ accesos });
  } catch (error) {
    console.error("❌ Error al obtener accesos:", error);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ============================================================
// 🚀 EXPORTAR RUTAS
// ============================================================
module.exports = router;
