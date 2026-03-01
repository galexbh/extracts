// ============================================================
// 📁 src/routes/Seguridad.routes.js
// ============================================================

const express = require("express");
const router = express.Router();
const { pool } = require("../db"); // ✅ necesario para el endpoint de accesos
const verifyRoleAccess = require("../middleware/verifyRoleAccess"); // 🔐 Middleware módulo
const verifyPermission = require("../middleware/verifyObjectPermission"); // 🔐 Middleware CRUD granular

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

// ============================================================
// 👥 USUARIOS
// ============================================================
router.get("/usuarios", usuariosCtrl.getUsuarios);

// 🔐 Verificar estado del usuario para el login (va ANTES de :id)
router.get("/usuarios/estado-login", async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: "UID requerido" });

  try {
    const { rows } = await pool.query(
      `SELECT e.nombre_estado
       FROM seguridad.tbl_usuarios u
       LEFT JOIN mantenimiento.tbl_estado_usuario e
         ON e.id_estado_usuario = u.id_estado_usuario
       WHERE u.uid_firebase = $1
       LIMIT 1;`,
      [uid]
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
// Va ANTES de /usuarios/:id para que no colisione con esa ruta dinámica
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

router.get("/usuarios/:id", usuariosCtrl.getUsuarioById);
router.post("/usuarios", verifyPermission("Usuarios", "create"), usuariosCtrl.insertUsuario);
router.put("/usuarios/:id_usuario", verifyPermission("Usuarios", "update"), usuariosCtrl.updateUsuario);
router.delete("/usuarios/:id", verifyPermission("Usuarios", "delete"), usuariosCtrl.deleteUsuario);

// ============================================================
// 🧩 ROLES
// ============================================================
router.get("/roles", rolesCtrl.getRoles);
router.get("/roles/:id", rolesCtrl.getRolById);
router.post("/roles", verifyPermission("Roles", "create"), rolesCtrl.insertRol);
router.put("/roles/:id_rol", verifyPermission("Roles", "update"), rolesCtrl.updateRol);
router.delete("/roles/:id", verifyPermission("Roles", "delete"), rolesCtrl.deleteRol);

// ============================================================
// 🔐 PERMISOS
// ============================================================
router.get("/permisos", permisosCtrl.getPermisos);
router.get("/permisos/:id", permisosCtrl.getPermisoById);
router.post("/permisos", verifyPermission("Permisos", "create"), permisosCtrl.insertPermiso);
router.put("/permisos/:id_permiso", verifyPermission("Permisos", "update"), permisosCtrl.updatePermiso);
router.delete("/permisos/:id", verifyPermission("Permisos", "delete"), permisosCtrl.deletePermiso);

// ============================================================
// 🧍 PERSONAS
// ============================================================
router.get("/personas", personasCtrl.getPersonas);
router.get("/personas/:id", personasCtrl.getPersonaById);
router.post("/personas", personasCtrl.insertPersona);
router.put("/personas/:id_persona", personasCtrl.updatePersona);
router.delete("/personas/:id", personasCtrl.deletePersona);

// ============================================================
// 📧 CORREOS
// ============================================================
router.get("/correos", correosCtrl.getCorreos);
router.get("/correos/:id", correosCtrl.getCorreoById);
router.post("/correos", correosCtrl.insertCorreo);
router.put("/correos/:id_correo", correosCtrl.updateCorreo);
router.delete("/correos/:id", correosCtrl.deleteCorreo);

// ============================================================
// 🏠 DIRECCIONES
// ============================================================
router.get("/direcciones", direccionesCtrl.getDirecciones);
router.get("/direcciones/:id", direccionesCtrl.getDireccionById);
router.post("/direcciones", direccionesCtrl.insertDireccion);
router.put("/direcciones/:id_direccion", direccionesCtrl.updateDireccion);
router.delete("/direcciones/:id", direccionesCtrl.deleteDireccion);

// ============================================================
// ☎️ TELÉFONOS
// ============================================================
router.get("/telefonos", telefonosCtrl.getTelefonos);
router.get("/telefonos/:id", telefonosCtrl.getTelefonoById);
router.post("/telefonos", telefonosCtrl.insertTelefono);
router.put("/telefonos/:id_telefono", telefonosCtrl.updateTelefono);
router.delete("/telefonos/:id", telefonosCtrl.deleteTelefono);

// ============================================================
// 🧱 OBJETOS
// ============================================================
router.get("/objetos", objetosCtrl.getObjetos);
router.get("/objetos/:id", objetosCtrl.getObjetoById);
router.post("/objetos", verifyPermission("Objetos", "create"), objetosCtrl.insertObjeto);
router.put("/objetos/:id_objeto", verifyPermission("Objetos", "update"), objetosCtrl.updateObjeto);
router.delete("/objetos/:id", verifyPermission("Objetos", "delete"), objetosCtrl.deleteObjeto);

// ============================================================
// 🔹 NUEVO ENDPOINT → Obtener accesos del usuario logueado
// ============================================================
router.get("/accesos", async (req, res) => {
  try {
    const email = req.headers["x-user-email"];
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
