# Configuración de SuperAdmin — SGA

> Actualizado: 2026-07-20

## ¿Qué es el SuperAdmin?

El SuperAdmin es la cuenta con acceso total a través de todos los talleres (multi-tenant). Tiene el rol `SUPER_ADMIN` y su `workshopId` es `master-control`.

## Cómo activar la cuenta SuperAdmin

1. Definir la variable de entorno `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` en Vercel con tu email real.
2. Iniciar sesión con ese email en la app.
3. El sistema detecta el email al crear el perfil en Firestore y asigna `SUPER_ADMIN` automáticamente.
4. Si la cuenta ya existía con otro rol, `getUserProfile` la promueve en el primer login.

## Flujo para onboardear un nuevo taller

1. Ir a la URL de producción → iniciar sesión como SuperAdmin.
2. Panel del Creador (`/super-admin`) → formulario "Nuevo Taller + Admin":
   - **ID del Taller**: identificador único sin espacios (ej: `taller-garcia-2025`)
   - **Nombre**: nombre visible para el cliente
   - **Email del Admin**: correo que usará el administrador del taller
   - **Contraseña Temporal**: mínimo 6 caracteres (se almacena en `settings.tempPassword`)
   - **Días de Trial**: cuántos días tendrá acceso el taller (7 / 14 / 30 / personalizado)
3. Pulsar "Crear Taller y Cuenta". El sistema:
   - Crea la cuenta en Firebase Auth vía Identity Toolkit API
   - Crea el documento en `settings/{workshopId}` con `adminEmail`, `expiresAt`, `tempPassword`
   - Crea el documento de usuario en `users/{uid}` con `roles: ['ADMIN']` y `workshopId` correcto
4. El admin del taller recibe sus credenciales y puede iniciar sesión inmediatamente.
5. Opcional: limpiar `tempPassword` con el botón "Limpiar Clave" una vez entregadas las credenciales.

## Acciones disponibles por taller

| Acción | Función |
|--------|---------|
| `Danger On/Off` | Activa/desactiva el permiso de "Borrar Datos" para ese taller |
| `+7d / +30d` | Extiende el trial desde la fecha actual |
| `Revocar` | Setea `expiresAt` a epoch 0 (acceso inmediatamente bloqueado) |
| `Borrar Datos` | Elimina todos los jobs, inventario y transacciones del taller |
| `Limpiar Clave` | Borra `tempPassword` del documento de settings (no revoca la cuenta) |
| `Eliminar` | Elimina el documento de `settings`. **No elimina usuarios ni Auth** |

> [!CAUTION]
> Eliminar el taller no elimina las cuentas de Firebase Auth. Para revocar acceso total,
> también debes eliminar el perfil en Firestore (botón 🗑 en la tabla de usuarios).

## Variables de entorno requeridas

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` | Email del superadmin. Define quién obtiene el rol `SUPER_ADMIN` en el primer login |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API key de Firebase (necesaria para crear cuentas via Identity Toolkit desde el panel) |
| Las demás `NEXT_PUBLIC_FIREBASE_*` | Config estándar del proyecto Firebase |

## Métricas que muestra el panel

- **OTs activas**: número de órdenes de trabajo activas (no Delivered) por taller
- **Días restantes de trial**: calculados en tiempo real desde `expiresAt`
- **Contraseña temporal**: visible si no ha sido limpiada
- **Usuarios del taller**: listado de perfiles en Firestore con sus roles y UID
