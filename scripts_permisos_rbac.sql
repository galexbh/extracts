-- ============================================================
-- 📁 scripts_permisos_rbac.sql
-- ✅ Registrar objetos del módulo de Seguridad en tbl_objetos
--    y crear permisos iniciales para el rol Administrador
-- ============================================================

-- ============================================================
-- PASO 1: Registrar los objetos de seguridad (si no existen)
-- ============================================================
INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Roles', 'Gestión de roles del sistema', 'pantalla', 'activo', 
       (SELECT id_usuario FROM seguridad.tbl_usuarios LIMIT 1), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'roles');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Permisos', 'Matriz de permisos CRUD por rol y objeto', 'pantalla', 'activo',
       (SELECT id_usuario FROM seguridad.tbl_usuarios LIMIT 1), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'permisos');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Objetos', 'Catálogo de objetos del sistema', 'pantalla', 'activo',
       (SELECT id_usuario FROM seguridad.tbl_usuarios LIMIT 1), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'objetos');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Usuarios', 'Gestión de usuarios del sistema', 'pantalla', 'activo',
       (SELECT id_usuario FROM seguridad.tbl_usuarios LIMIT 1), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'usuarios');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Bitácora', 'Registro de auditoría del sistema', 'pantalla', 'activo',
       (SELECT id_usuario FROM seguridad.tbl_usuarios LIMIT 1), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'bitácora');

-- ============================================================
-- PASO 2: Crear permisos CRUD completos para el rol Administrador
-- (ajusta el nombre del rol si es diferente en tu sistema)
-- ============================================================
DO $$
DECLARE
    v_id_rol INTEGER;
    v_id_objeto INTEGER;
    r RECORD;
BEGIN
    -- Buscar el rol Administrador (ajustar nombre si es necesario)
    SELECT id_rol INTO v_id_rol 
    FROM seguridad.tbl_roles 
    WHERE LOWER(nombre_rol) LIKE '%admin%' 
    LIMIT 1;

    IF v_id_rol IS NULL THEN
        RAISE NOTICE 'No se encontró un rol administrador. Ajusta el nombre del rol en el script.';
        RETURN;
    END IF;

    RAISE NOTICE 'Rol Administrador encontrado: id_rol = %', v_id_rol;

    -- Insertar permisos completos para cada objeto de seguridad
    FOR r IN 
        SELECT id_objeto, nombre_objeto 
        FROM seguridad.tbl_objetos 
        WHERE LOWER(nombre_objeto) IN ('roles', 'permisos', 'objetos', 'usuarios', 'bitácora')
    LOOP
        -- Solo insertar si no existe ya
        IF NOT EXISTS (
            SELECT 1 FROM seguridad.tbl_permisos 
            WHERE id_rol = v_id_rol AND id_objeto = r.id_objeto
        ) THEN
            INSERT INTO seguridad.tbl_permisos (
                id_rol, id_objeto, 
                can_create, can_read, can_update, can_delete,
                id_usuario_creado, fecha_creado
            ) VALUES (
                v_id_rol, r.id_objeto,
                TRUE, TRUE, TRUE, TRUE,
                (SELECT id_usuario FROM seguridad.tbl_usuarios LIMIT 1), NOW()
            );
            RAISE NOTICE 'Permiso creado: Administrador → % (CRUD completo)', r.nombre_objeto;
        ELSE
            RAISE NOTICE 'Permiso ya existe: Administrador → %', r.nombre_objeto;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- PASO 3: Verificar los permisos creados
-- ============================================================
SELECT 
    r.nombre_rol,
    o.nombre_objeto,
    p.can_create AS crear,
    p.can_read AS leer,
    p.can_update AS actualizar,
    p.can_delete AS eliminar
FROM seguridad.tbl_permisos p
JOIN seguridad.tbl_roles r ON p.id_rol = r.id_rol
JOIN seguridad.tbl_objetos o ON p.id_objeto = o.id_objeto
WHERE LOWER(o.nombre_objeto) IN ('roles', 'permisos', 'objetos', 'usuarios', 'bitácora')
ORDER BY r.nombre_rol, o.nombre_objeto;
