-- ================================================================
-- 📋 Script: Registrar nuevos objetos RBAC + permisos Admin
-- ⚠️  Ejecutar DESPUÉS de scripts_permisos_rbac.sql
-- ================================================================

-- ============================================================
-- 1️⃣ Registrar objetos en tbl_objetos (si no existen)
-- ============================================================

-- VENTAS
INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Clientes', 'Gestión de clientes', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'clientes');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Pedidos', 'Gestión de pedidos y reservas', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'pedidos');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Facturas', 'Gestión de facturación', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'facturas');

-- COMPRAS
INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Proveedores', 'Gestión de proveedores', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'proveedores');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Ordenes de compra', 'Gestión de órdenes de compra y detalles', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'ordenes de compra');

-- INVENTARIO
INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Inventario insumos', 'Inventario y movimientos de insumos', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'inventario insumos');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Inventario productos', 'Inventario y movimientos de productos', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'inventario productos');

-- PRODUCCIÓN
INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Productos', 'Catálogo de productos de producción', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'productos');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Insumos', 'Catálogo de insumos de producción', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'insumos');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Produccion', 'Órdenes de producción e insumos usados', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'produccion');

-- CONTABILIDAD
INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Creditos', 'Gestión de créditos', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'creditos');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Moras', 'Gestión de moras', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'moras');

INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Pagos', 'Gestión de pagos', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'pagos');

-- MANTENIMIENTO (un solo objeto para todas las tablas de catálogo)
INSERT INTO seguridad.tbl_objetos (nombre_objeto, descripcion, tipo_objeto, estado, id_usuario_creado, fecha_creado)
SELECT 'Mantenimiento', 'Catálogos de mantenimiento del sistema', 'Pantalla', 'Activo', (SELECT MIN(id_usuario) FROM seguridad.tbl_usuarios), NOW()
WHERE NOT EXISTS (SELECT 1 FROM seguridad.tbl_objetos WHERE LOWER(nombre_objeto) = 'mantenimiento');


-- ============================================================
-- 2️⃣ Crear permisos CRUD completos para el rol Administrador
-- ============================================================

DO $$
DECLARE
  v_id_rol INT;
  v_id_objeto INT;
  v_id_usuario INT;
  v_nombre TEXT;
BEGIN
  SELECT id_rol INTO v_id_rol FROM seguridad.tbl_roles WHERE LOWER(nombre_rol) = 'administrador' LIMIT 1;
  SELECT MIN(id_usuario) INTO v_id_usuario FROM seguridad.tbl_usuarios;

  IF v_id_rol IS NULL THEN
    RAISE NOTICE '⚠️ No se encontró el rol Administrador. Permisos no creados.';
    RETURN;
  END IF;

  FOR v_nombre IN
    SELECT unnest(ARRAY[
      'Clientes', 'Pedidos', 'Facturas',
      'Proveedores', 'Ordenes de compra',
      'Inventario insumos', 'Inventario productos',
      'Productos', 'Insumos', 'Produccion',
      'Creditos', 'Moras', 'Pagos',
      'Mantenimiento'
    ])
  LOOP
    SELECT id_objeto INTO v_id_objeto
      FROM seguridad.tbl_objetos
      WHERE LOWER(nombre_objeto) = LOWER(v_nombre)
      LIMIT 1;

    IF v_id_objeto IS NOT NULL THEN
      INSERT INTO seguridad.tbl_permisos (id_rol, id_objeto, can_create, can_read, can_update, can_delete, id_usuario_creado, fecha_creado)
      SELECT v_id_rol, v_id_objeto, TRUE, TRUE, TRUE, TRUE, v_id_usuario, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM seguridad.tbl_permisos
        WHERE id_rol = v_id_rol AND id_objeto = v_id_objeto
      );
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Permisos del Administrador configurados para todos los objetos.';
END $$;


-- ============================================================
-- 3️⃣ Verificar resultado
-- ============================================================
SELECT o.nombre_objeto, p.can_create, p.can_read, p.can_update, p.can_delete
FROM seguridad.tbl_permisos p
JOIN seguridad.tbl_objetos o ON o.id_objeto = p.id_objeto
JOIN seguridad.tbl_roles r ON r.id_rol = p.id_rol
WHERE LOWER(r.nombre_rol) = 'administrador'
ORDER BY o.nombre_objeto;
