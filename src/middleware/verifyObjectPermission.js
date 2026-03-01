// ============================================================
// 📁 src/middleware/verifyObjectPermission.js
// 🔐 Middleware que verifica permisos CRUD por Rol + Objeto
//    usando tbl_permisos (can_create, can_read, can_update, can_delete)
// ============================================================

const { pool } = require("../db");

/**
 * Factory function que genera un middleware de verificación de permisos.
 *
 * @param {string} nombreObjeto - Nombre del objeto en tbl_objetos (ej: "Objetos", "Permisos")
 * @param {string} accion - Permiso a verificar: "create" | "read" | "update" | "delete"
 * @returns {Function} Middleware de Express
 *
 * Uso en rutas:
 *   const verifyPermission = require("../middleware/verifyObjectPermission");
 *   router.post("/objetos", verifyPermission("Objetos", "create"), ctrl.insertObjeto);
 *   router.put("/objetos/:id", verifyPermission("Objetos", "update"), ctrl.updateObjeto);
 *   router.delete("/objetos/:id", verifyPermission("Objetos", "delete"), ctrl.deleteObjeto);
 */
function verifyPermission(nombreObjeto, accion) {
    // Mapeo de acciones a columnas de tbl_permisos
    const columnMap = {
        create: "can_create",
        read: "can_read",
        update: "can_update",
        delete: "can_delete",
    };

    const columna = columnMap[accion];
    if (!columna) {
        throw new Error(`[verifyPermission] Acción inválida: "${accion}". Use: create, read, update, delete`);
    }

    return async (req, res, next) => {
        try {
            // -------------------------------------------------------
            // 1️⃣ Obtener email del usuario
            // -------------------------------------------------------
            const email =
                req.headers["x-user-email"] ||
                req.headers["X-User-Email"] ||
                req.headers["x-User-Email"];

            if (!email) {
                return res.status(401).json({
                    error: "MISSING_USER_EMAIL",
                    message: "Se requiere el header x-user-email para verificar permisos.",
                });
            }

            // -------------------------------------------------------
            // 2️⃣ Buscar usuario y su rol
            // -------------------------------------------------------
            const userResult = await pool.query(
                `SELECT u.id_usuario, u.username, u.id_estado_usuario,
                r.id_rol, r.nombre_rol, r.accesos
         FROM seguridad.tbl_usuarios u
         JOIN seguridad.tbl_roles r ON r.id_rol = u.id_rol
         WHERE LOWER(u.username) = LOWER($1)
         LIMIT 1;`,
                [email]
            );

            if (userResult.rows.length === 0) {
                return res.status(403).json({
                    error: "USER_NOT_FOUND",
                    message: `Usuario ${email} no encontrado en el sistema.`,
                });
            }

            const user = userResult.rows[0];

            // -------------------------------------------------------
            // 3️⃣ Verificar que el usuario esté activo
            // -------------------------------------------------------
            if (user.id_estado_usuario !== 1) {
                return res.status(403).json({
                    error: "USER_INACTIVE",
                    message: "El usuario está inactivo. Contacte al administrador.",
                });
            }

            // -------------------------------------------------------
            // 4️⃣ Si el rol tiene acceso "Todos" → permitir todo
            // -------------------------------------------------------
            let accesos = [];
            if (Array.isArray(user.accesos)) {
                accesos = user.accesos.map((s) => s.trim().toLowerCase());
            } else if (typeof user.accesos === "string") {
                try {
                    const parsed = JSON.parse(user.accesos);
                    accesos = parsed.map((s) => String(s).trim().toLowerCase());
                } catch {
                    accesos = user.accesos.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
                }
            }

            if (accesos.includes("todos")) {
                console.log(`✅ [RBAC] Acceso total: ${user.username} → ${nombreObjeto}.${accion}`);
                return next();
            }

            // -------------------------------------------------------
            // 5️⃣ Buscar el objeto en tbl_objetos
            // -------------------------------------------------------
            const objetoResult = await pool.query(
                "SELECT id_objeto FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = LOWER($1) LIMIT 1;",
                [nombreObjeto]
            );

            if (objetoResult.rows.length === 0) {
                // Si el objeto no está registrado, permitir (no bloquear por falta de config)
                console.warn(`⚠️ [RBAC] Objeto "${nombreObjeto}" no registrado en tbl_objetos — acceso permitido por defecto`);
                return next();
            }

            const id_objeto = objetoResult.rows[0].id_objeto;

            // -------------------------------------------------------
            // 6️⃣ Consultar tbl_permisos para el rol + objeto
            // -------------------------------------------------------
            const permisoResult = await pool.query(
                `SELECT ${columna} AS tiene_permiso
         FROM seguridad.tbl_permisos
         WHERE id_rol = $1 AND id_objeto = $2
         LIMIT 1;`,
                [user.id_rol, id_objeto]
            );

            // Si no hay registro de permiso para esta combinación → denegar
            if (permisoResult.rows.length === 0) {
                console.warn(`🚫 [RBAC] Sin permiso configurado: ${user.nombre_rol} → ${nombreObjeto}`);
                return res.status(403).json({
                    error: "ACCESS_DENIED",
                    message: `El rol "${user.nombre_rol}" no tiene permisos configurados para "${nombreObjeto}".`,
                });
            }

            const tienePermiso = permisoResult.rows[0].tiene_permiso;

            if (!tienePermiso) {
                const accionTexto = { create: "crear", read: "leer", update: "actualizar", delete: "eliminar" };
                console.warn(`🚫 [RBAC] Permiso denegado: ${user.nombre_rol} no puede ${accionTexto[accion]} en ${nombreObjeto}`);
                return res.status(403).json({
                    error: "PERMISSION_DENIED",
                    message: `El rol "${user.nombre_rol}" no tiene permiso para ${accionTexto[accion]} en "${nombreObjeto}".`,
                });
            }

            // -------------------------------------------------------
            // ✅ Permiso concedido
            // -------------------------------------------------------
            console.log(`✅ [RBAC] ${user.username} (${user.nombre_rol}) → ${nombreObjeto}.${accion}`);
            next();
        } catch (err) {
            console.error("[RBAC] ❌ Error verificando permisos:", err);
            res.status(500).json({ error: "PERMISSION_CHECK_FAILED", message: "Error al verificar permisos." });
        }
    };
}

module.exports = verifyPermission;
