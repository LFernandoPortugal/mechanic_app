# Política de Acceso y Seguridad — SGA

> Última actualización: 2026-06-11

## SuperAdmin
- Email configurado en `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` en `.env.local`
- Auto-promoción: al hacer login con ese email, se asigna automáticamente `SUPER_ADMIN`
- Panel exclusivo en `/super-admin` protegido con `ProtectedRoute allowedRoles={['SUPER_ADMIN']}`

## Registro de Usuarios
- **El registro público está CERRADO en producción**
- Solo se permite login con `signInWithEmailAndPassword`
- Los testers se crean desde el panel SuperAdmin → se define un email de admin invitado
- Cuando el tester hace login, se auto-onboarda como ADMIN de su taller

## Protección de Rutas
- Cada ruta tiene `<ProtectedRoute allowedRoles={[...]}>` como wrapper
- El mapa de roles está en `src/types/index.ts` → `ROLE_ROUTE_MAP`
- Trial expirado → redirect a `/expired`
- Sin login → redirect a `/login`

## Firestore Rules
- Cada operación valida `request.auth != null`
- Lectura/escritura filtrada por `workshopId` via `isSameWorkshop()`
- SUPER_ADMIN bypass en todas las validaciones de workshop
- Nadie puede auto-asignarse `SUPER_ADMIN` via Firestore (regla de create/update)
- La colección `settings` tiene lectura pública (necesaria para portal de cotización)

## Portal Público de Cotización (`/quote/[id]`)
- Acceso sin autenticación — el cliente recibe un link directo
- Solo puede ver jobs en estados: Ready, Approved, Repair, QC, Delivered
- Solo puede cambiar status de Ready → Approved (aprobar cotización)
- Los IDs de Firestore son aleatorios, mitigando enumeración
- **Riesgo aceptado**: expone nombre del cliente, placa, teléfono del taller

## API de IA
- Migrada a motor client-side (no hay API routes en producción)
- No consume API keys externas en producción
- La GEMINI_API_KEY solo se usa en desarrollo local

## Firebase Storage
- Reglas configuradas como `allow read, write: if false` (deny all)
- Las imágenes se almacenan como base64 en Firestore

## Auditoría
- Cada cambio de estado en un Job genera un `auditLog` entry
- Los audit entries incluyen: timestamp, action, actorId, notes
