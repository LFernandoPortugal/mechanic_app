# Historial de Bugs y Correcciones — SGA

> Actualizado: 2026-07-26

## v1.1 — Fase 1: Bugs Críticos (2026-07-02)

### BUG-001: SuperAdmin — usuarios no aparecen en el taller al crearlos
**Síntoma**: Al crear un taller desde el panel de SuperAdmin, el contador de usuarios mostraba "Ningún usuario ha iniciado sesión aún."
**Causa raíz**: La función `createUserProfile` no recibía el `workshopId` del taller nuevo. En cambio, buscaba el email en la colección `settings`, pero el documento aún no existía porque la creación era asíncrona.
**Fix**:
- `db.ts`: Agregado parámetro `workshopIdOverride` que omite el auto-lookup y usa el ID directamente.
- `super-admin/page.tsx`: Pasa el `workshopId` explícito en el paso 3 del flujo de creación.

---

### BUG-002: Técnico no podía acceder a la pantalla de QC
**Síntoma**: Al intentar acceder a `/qc`, el técnico era redirigido a la página de inicio.
**Fix**:
- `qc/page.tsx`: Agregado `TECHNICIAN` a `allowedRoles`.
- `types/index.ts`: Actualizado `ROLE_ROUTE_MAP` para incluir `/qc` en las rutas del técnico.

---

### BUG-003: `approvedAmount` sobreescrito con suma de pagos
**Síntoma**: Luego de registrar un pago parcial, `approvedAmount` se actualizaba con la suma acumulada de abonos, perdiendo el monto original aprobado por el cliente.
**Fix**:
- `db.ts` (`registerPayment`): Eliminada la línea que sobreescribía `approvedAmount`. Ahora solo se usan `payments[]` y se calcula `totalPaid` localmente.
- `payments/page.tsx`: El balance se calcula contra `approvedAmount` (con fallback a `totalEstimate`).

---

### BUG-004: Precios editables post-aprobación del cliente
**Síntoma**: Un asesor o admin podía modificar los precios de los ítems después de que el cliente ya había aprobado la cotización, aumentando silenciosamente el total.
**Fix**:
- `advisor/page.tsx`: Inputs de precio con `readOnly={status !== 'Approval'}`. Si el job ya pasó de ese estado, los precios son de solo lectura.

---

## v1.2 — Fase 2-4: UX, SuperAdmin y Flujo de Cotización (2026-07-20)

### MEJORA-001: WorkflowStepper con tooltips interactivos
- Cada paso del stepper es ahora clickeable y muestra un popup con la descripción del rol y la acción correspondiente.
- Badge "Aquí" animado en el paso activo.
- Línea de progreso degradada con brillo.
- Descripción del paso activo visible debajo del stepper.

### MEJORA-002: Portal del cliente — pantalla post-aprobación
- El portal ya no muestra solo "Cotización Aprobada" estático.
- Muestra un tracker visual de 4 pasos: Reparación → QC → Listo → Entregado.
- El tracker se actualiza en tiempo real según el estado del job.
- Aplica para todos los estados post-aprobación: `Approved`, `Repair`, `QC`, `Ready`, `Delivered`.

### MEJORA-003: SuperAdmin — métricas y gestión mejorada
- **OTs activas por taller**: badge con conteo visible en la tarjeta de cada taller.
- **Días restantes de trial**: reemplaza la fecha fija por "Activo · Nd restantes".
- **Botón "Limpiar Clave"**: aparece si `tempPassword` no está vacío, permite eliminarlo tras entregarlo al cliente.
- Nuevas funciones en `db.ts`: `getActiveJobCountByWorkshop()` y `clearTempPassword()`.

### BUG-005: Estado de cotización del Asesor enviaba a "Ready" en lugar de "Approval"
**Síntoma**: Al generar una cotización en `/advisor`, la orden pasaba directamente a "Listo para entrega" omitiendo la aprobación del cliente y el proceso técnico.
**Fix**:
- `advisor/page.tsx`: Corregido `handleSaveQuote` para asignar `status: "Approval"`.

### BUG-006: Permisos denegados en `firestore.rules` para clientes públicos
**Síntoma**: Al estar la cotización en estado `Approval`, el cliente no podía verla ni aprobarla públicamente desde `/quote/view` por reglas de seguridad.
**Fix**:
- `firestore.rules`: Se actualizó la regla de cliente para permitir `get` en estado `Approval` y `update` hacia `Approved`.

---

## v1.3 — Fase de Seguridad y Revocado de Usuarios (2026-07-26)

### BUG-007: Usuarios eliminados o talleres borrados mantenían acceso y podían operar
**Síntoma**: Cuando un SuperAdmin o Admin eliminaba un usuario en Firestore o borraba un taller completo, los usuarios borrados aún podían iniciar sesión, realizar acciones en la base de datos o volver a autogenerar su perfil.

**Causas raíz**:
1. **Sesión de Auth huérfana**: En `/login`, al fallar la auto-creación del perfil (por estar eliminado o no autorizado), el SDK de Firebase Auth dejaba la sesión iniciada en segundo plano porque no se ejecutaba `signOut(auth)` en el bloque `catch`.
2. **Expulsión incompleta en `AuthContext`**: `AuthContext` no seteaba `setUser(null)` al detectar la eliminación del perfil en `onSnapshot`, y no verificaba si el documento del taller `settings/{workshopId}` había sido eliminado.
3. **Falta de verificación en Security Rules**: `firestore.rules` no comprobaba si `users/{uid}` existía en Firestore ni si `settings/{workshopId}` continuaba activo antes de autorizar lecturas y escrituras.

**Fixes Aplicados**:
- `AuthContext.tsx`:
  - Se añadió expulsión inmediata (`await firebaseSignOut(auth)` y `setUser(null)`) si el documento de usuario no existe en Firestore.
  - Se añadió verificación de existencia de `settings/{workshopId}`. Si el taller fue borrado en SuperAdmin, se cierra automáticamente la sesión de todos los usuarios de ese taller.
- `login/page.tsx`:
  - Se añadió `await signOut(auth)` dentro del bloque `catch` de `handleLogin` para limpiar cualquier sesión huérfana de Firebase Auth cuando la verificación de perfil falla.
- `firestore.rules`:
  - Se crearon las funciones helper `hasUserProfile()` (que exige `exists(/users/uid)`) y `isWorkshopActive()` (que exige `exists(/settings/workshopId)`).
  - Todas las operaciones de lectura/escritura en `jobs`, `inventory`, `inventory_transactions` y `users` ahora requieren `hasUserProfile()` y `isWorkshopActive()`, garantizando que usuarios o talleres borrados sean **bloqueados al 100% a nivel de base de datos**.
  - Reglas desplegadas exitosamente a producción en Firebase Console.
