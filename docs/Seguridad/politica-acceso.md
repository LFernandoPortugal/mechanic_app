# Política de Acceso y Seguridad — SGA

> Última actualización: 2026-08-12

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
- `demoMode` puede activarse dentro del taller, pero no vuelve al taller inmune a expiración o deshabilitación.
- `expiresAtTimestamp`, `disabled` y `allowResetData` son campos privilegiados.
- Las reglas comprueban que el taller exista, no esté deshabilitado y no haya expirado.

## Portal público

- Ruta visible: `/quote/view?id=JOB_ID#token=TOKEN`.
- El token aleatorio tiene 256 bits, caduca a los 30 días y permanece en el fragmento para no entrar en la URL HTTP ni en referrers.
- El portal lo envía en `X-Quote-Token`; Firestore guarda únicamente SHA-256, tenant y vigencia en `public_quote_links`.
- Ningún navegador, incluido SUPER_ADMIN, puede leer o escribir `public_quote_links`; emisión, regeneración y revocación pasan por `/api/jobs/[id]/quote-link`.
- Regenerar reemplaza el registro e invalida inmediatamente el enlace anterior. Revocar lo elimina. Se conserva después de aprobar para que el mismo enlace muestre el tracker hasta `Delivered`.
- Firestore no permite lectura/escritura pública directa de `jobs` o `settings`.
- `GET /api/public/quotes/[id]` devuelve un DTO sanitizado y limitado a datos necesarios.
- No expone nombre/email/teléfono del cliente, firma de recepción/aprobación, fotos privadas de recepción, pagos, auditoría ni IDs internos del personal.
- `POST` solo acepta decisiones booleanas que coincidan con ítems cotizados y una firma PNG acotada.
- El servidor recalcula el monto, llena `declinedItems`, registra firma/fecha/auditoría y actualiza en una transacción.
- Tanto lectura como aprobación ocultan las cotizaciones de talleres inexistentes, deshabilitados o vencidos.

El ID de la orden no concede acceso por sí solo: un token ausente, incorrecto, vencido, regenerado o revocado recibe la misma respuesta 404 que una cotización inexistente.

## Emuladores y pruebas

- Los E2E usan exclusivamente el proyecto demo `demo-mechanic-app`; Firebase bloquea cualquier servicio no emulado para ese identificador.
- El SDK web conecta Auth/Firestore Emulator solo fuera de producción y con `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`.
- Las API server-side conectan Auth Emulator solo fuera de producción, con `USE_FIREBASE_EMULATORS=true` y un `FIREBASE_AUTH_EMULATOR_HOST` loopback con puerto explícito.
- Una configuración emulada ausente, remota o mal formada falla cerrado. En `NODE_ENV=production`, la verificación de ID token conserva Identity Toolkit oficial aunque existan variables de emulador por error.

## Pagos

- Los navegadores no pueden añadir pagos directamente a Firestore.
- `/api/jobs/[id]/payments` verifica ID token, rol ADMIN/ADVISOR, tenant, trial, estado y saldo.
- El servidor deriva `actorId`, calcula el saldo dentro de una transacción y rechaza sobrepagos o concurrencia inválida.
- Cada intento incluye un `requestId` opaco: repetir exactamente la misma operación devuelve su resultado sin añadir otro pago; reutilizarlo con otros datos devuelve 409.
- El cliente envía el total pagado que observó y el servidor lo compara dentro de la transacción; un abono concurrente obliga a revisar el saldo actualizado.
- Un pago solo entrega automáticamente una orden que ya está en `Ready`; pagar durante `QC` no omite el checklist.

## Control de calidad

- Los clientes Firestore no pueden ejecutar directamente transiciones desde `QC`.
- `/api/jobs/[id]/qc` verifica token, rol, tenant, vigencia y estado dentro de una transacción.
- Un rechazo exige motivo y vuelve a `Repair`.
- Una aprobación pasa a `Ready`, o a `Delivered` si el total aprobado ya estaba pagado.
- El `requestId` de QC queda enlazado a su entrada de auditoría; repetir el mismo resultado es idempotente y reutilizar la clave con otro resultado, actor o notas devuelve 409.

## Sesiones en operaciones server-side

- El cliente intenta una única renovación forzada del ID token si una API autenticada responde 401.
- Si la renovación también falla, no repite indefinidamente: muestra sesión expirada, conserva un borrador acotado y ofrece volver al login con una ruta interna validada.
- Los botones críticos usan un bloqueo síncrono además del estado visual para ignorar dobles clics antes del siguiente render.
- Los borradores de QC y pago viven únicamente en `sessionStorage`, no se sincronizan ni se envían al servidor antes de confirmar la operación.
- Cada clave queda aislada por función, taller, UID y orden; otra identidad o tenant no restaura el contenido.
- Caducan a los 30 minutos y se eliminan al completar la operación o descartarla. Valores vencidos, corruptos o fuera del esquema se borran sin bloquear el flujo.
- Solo se guardan los campos necesarios para retomar QC o pago; nunca tokens, contraseñas, credenciales ni datos de `.env`.

## Inventario y auditoría

- Solo ADMIN modifica stock.
- Todo cambio de stock está enlazado a un documento inmutable en `inventory_transactions` mediante `lastMovementId`.
- Un movimiento existente no puede reutilizarse para volver a alterar el stock y los servicios con stock ilimitado no aceptan entradas/salidas ficticias.
- Las reglas validan tipo, cantidad, actor, tenant y la aritmética del stock.
- Los cambios de estado de jobs requieren una transición permitida y un append de auditoría del actor autenticado.

## Firebase Storage

- `storage.rules` permanece `allow read, write: if false`.
- Las imágenes actuales se almacenan en Firestore; cualquier migración a Storage requiere modelo de rutas y reglas por tenant antes de habilitarlo.
