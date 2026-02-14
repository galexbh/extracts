// ============================================================
// 📁 src/routes/Seguridad.routes.js
// ============================================================

const express = require("express");
const router = express.Router();
const { pool } = require("../db"); // ✅ necesario para el endpoint de accesos

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
router.get("/usuarios/:id", usuariosCtrl.getUsuarioById);
router.post("/usuarios", usuariosCtrl.insertUsuario);
router.put("/usuarios/:id_usuario", usuariosCtrl.updateUsuario);
router.delete("/usuarios/:id", usuariosCtrl.deleteUsuario);

// ============================================================
// 🧩 ROLES
// ============================================================
router.get("/roles", rolesCtrl.getRoles);
router.get("/roles/:id", rolesCtrl.getRolById);
router.post("/roles", rolesCtrl.insertRol);
router.put("/roles/:id_rol", rolesCtrl.updateRol);
router.delete("/roles/:id", rolesCtrl.deleteRol);

// ============================================================
// 🔐 PERMISOS
// ============================================================
router.get("/permisos", permisosCtrl.getPermisos);
router.post("/permisos", permisosCtrl.insertPermiso);
router.put("/permisos/:id_permiso", permisosCtrl.updatePermiso);
router.delete("/permisos/:id", permisosCtrl.deletePermiso);

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
router.post("/objetos", objetosCtrl.insertObjeto);
router.put("/objetos/:id_objeto", objetosCtrl.updateObjeto);
router.delete("/objetos/:id", objetosCtrl.deleteObjeto);

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
