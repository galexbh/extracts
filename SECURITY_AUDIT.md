# Auditoría de Seguridad Profunda (Extractus)

## Resumen ejecutivo
Se identificaron **múltiples debilidades críticas de autenticación/autorización** que permiten suplantación de identidad por encabezados HTTP controlados por cliente, exposición de secretos MFA, y operaciones sensibles sin autenticación robusta en backend.

## Hallazgos priorizados

### Crítico
1. **Suplantación de identidad por `x-user-email`** para autorización RBAC.
2. **Endpoint MFA expone secreto TOTP (`secret`) y reutiliza secreto existente**.
3. **Reset MFA sin autenticación**, permite deshabilitar MFA de cualquier usuario por correo.

### Alto
4. **Rutas sensibles sin middleware de permisos/autenticación** (lectura y cambios en seguridad/mantenimiento/compras).
5. **Sin rate limiting** en login auxiliar / MFA / APIs críticas.
6. **Ausencia de validación criptográfica del usuario en backend** (no se verifica Firebase ID token en flujo principal).

### Medio
7. **Logging sensible de material criptográfico Firebase** (tramos de private key en logs).
8. **Conexión DB con `ssl: false` hardcodeado**.
9. **Sin cabeceras hardening (`helmet`) ni política CSRF explícita para endpoints con estado**.

### Bajo / Requiere validación
10. **Auditoría de dependencias incompleta por limitación del entorno (`npm audit` 403)**.

## Parches sugeridos (resumen)
- Implementar middleware global `requireFirebaseAuth` que valide `Authorization: Bearer <idToken>` en backend y derive identidad desde el token (no desde headers cliente).
- Eliminar retorno de `secret` en `/api/mfa/generate`; almacenar secreto temporal en backend (cache/DB transitoria) y asociarlo a `uid` autenticado.
- Proteger `/api/mfa/reset` con reautenticación fuerte (token válido + verificación de identidad + control antiabuso).
- Aplicar `verifyPermission(..., "read")` a GET sensibles que hoy están abiertos.
- Agregar `express-rate-limit` por IP + cuenta en endpoints MFA y seguridad.
- Quitar logs de private key y activar `ssl` parametrizable para PostgreSQL.
