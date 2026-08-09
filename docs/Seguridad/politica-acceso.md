# Política de Acceso y Seguridad — SGA

> Última actualización: 2026-08-08

## Principios

- Firebase Authentication, perfiles `users` y configuraciones `settings` son recursos distintos; crear o borrar uno no sincroniza los demás.
- Ningún navegador puede crear su propio perfil ni asignarse roles.
- Los límites de rol y tenant se validan en Firestore Rules o en API routes server-side, no solo en la UI.
- Las API privilegiadas usan Vercel OIDC y Google Workload Identity Federation; no se usan claves JSON estáticas.
- Contraseñas, tokens y credenciales temporales nunca se almacenan en Firestore.

## SUPER_ADMIN

- El perfil SUPER_ADMIN se provisiona de forma administrativa y única; no existe auto-promoción por email.
- `/super-admin` requiere el rol en `users/{uid}`.
- El endpoint `/api/admin/users` vuelve a verificar el ID token y el rol desde el servidor.
- La cuenta única no se usa para pruebas rutinarias ni puede eliminarse a sí misma mediante el endpoint.

## Registro y gestión de usuarios

- El registro público está cerrado.
- El panel SUPER_ADMIN crea talleres y su ADMIN mediante `/api/admin/users`, coordinando Firebase Auth + `settings` + `users`.
- Si el email ya existe en Auth, la operación devuelve conflicto y no combina identidades.
- El borrado coordinado elimina primero las cuentas Auth objetivo y después sus perfiles Firestore.
- Un ADMIN puede modificar nombre/roles operativos dentro de su taller, pero no tenant, UID, email ni SUPER_ADMIN.

## Trials y settings

- `settings/{workshopId}` es privado.
- Un ADMIN solo puede editar branding, contacto, moneda e impuestos.
- `expiresAtTimestamp`, `disabled` y `allowResetData` son campos privilegiados.
- Las reglas comprueban que el taller exista, no esté deshabilitado y no haya expirado.

## Portal público

- Ruta visible: `/quote/view?id=JOB_ID`.
- Firestore no permite lectura/escritura pública directa de `jobs` o `settings`.
- `GET /api/public/quotes/[id]` devuelve un DTO sanitizado y limitado a datos necesarios.
- No expone email/teléfono del cliente, firma de recepción/aprobación, fotos privadas de recepción, pagos, auditoría ni IDs internos del personal.
- `POST` solo acepta decisiones booleanas que coincidan con ítems cotizados y una firma PNG acotada.
- El servidor recalcula el monto, llena `declinedItems`, registra firma/fecha/auditoría y actualiza en una transacción.

Los IDs aleatorios reducen enumeración, pero no sustituyen un token de acceso. Para una fase posterior se recomienda un token revocable/de un solo uso por cotización.

## Pagos

- Los navegadores no pueden añadir pagos directamente a Firestore.
- `/api/jobs/[id]/payments` verifica ID token, rol ADMIN/ADVISOR, tenant, trial, estado y saldo.
- El servidor deriva `actorId`, calcula el saldo dentro de una transacción y rechaza sobrepagos o concurrencia inválida.

## Inventario y auditoría

- Solo ADMIN modifica stock.
- Todo cambio de stock está enlazado a un documento inmutable en `inventory_transactions` mediante `lastMovementId`.
- Las reglas validan tipo, cantidad, actor, tenant y la aritmética del stock.
- Los cambios de estado de jobs requieren una transición permitida y un append de auditoría del actor autenticado.

## Firebase Storage

- `storage.rules` permanece `allow read, write: if false`.
- Las imágenes actuales se almacenan en Firestore; cualquier migración a Storage requiere modelo de rutas y reglas por tenant antes de habilitarlo.
