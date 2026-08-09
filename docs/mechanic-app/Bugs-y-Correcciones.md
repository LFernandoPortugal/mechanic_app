# Historial de Bugs y Correcciones — SGA

> Actualizado: 2026-08-08

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
- Descripción del paso activo siempre visible debajo del stepper.

### MEJORA-002: Portal del cliente — pantalla post-aprobación
- El portal ya no muestra solo "Cotización Aprobada" estático.
- Muestra un tracker visual de 4 pasos: Reparación → QC → Listo → Entregado.
- El tracker muestra el estado actual al cargar la página.
- Aplica para todos los estados post-aprobación: `Approved`, `Repair`, `QC`, `Ready`, `Delivered`.

### MEJORA-003: SuperAdmin — métricas y gestión mejorada
- **OTs activas por taller**: badge con conteo visible en la tarjeta de cada taller.
- **Días restantes de trial**: reemplaza la fecha fija por "Activo · Nd restantes".
- **Botón "Limpiar Clave"**: aparece si `tempPassword` no está vacío, permite eliminarlo tras entregarlo al cliente.
- Nuevas funciones en `db.ts`: `getActiveJobCountByWorkshop()` y `clearTempPassword()`.

> **Obsoleto desde v1.4**: `tempPassword` y `clearTempPassword()` se eliminaron. Las contraseñas ya no se almacenan en Firestore.

### BUG-005: Estado de cotización del Asesor enviaba a "Ready" en lugar de "Approval"
**Síntoma**: Al generar una cotización en `/advisor`, la orden pasaba directamente a "Listo para entrega" omitiendo la aprobación del cliente y el proceso técnico.
**Fix**:
- `advisor/page.tsx`: Corregido `handleSaveQuote` para asignar `status: "Approval"`.

### BUG-006: Permisos denegados en `firestore.rules` para clientes públicos
**Síntoma**: Al estar la cotización en estado `Approval`, el cliente no podía verla ni aprobarla públicamente desde `/quote/view` por reglas de seguridad.
**Fix**:
- `firestore.rules`: Se actualizó la regla de cliente para permitir `get` en estado `Approval` y `update` hacia `Approved`.

> **Obsoleto desde v1.4**: el acceso público directo a Firestore se eliminó por seguridad. El portal usa `/api/public/quotes/[id]`.

---

## v1.3 — Fase de Seguridad y Borrado en Cascada de Talleres (2026-07-26)

### BUG-007: `getWorkshopSettings` retornaba valores por defecto en talleres eliminados
**Síntoma**: Al eliminar un taller en SuperAdmin, sus usuarios aún podían iniciar sesión y navegar sin problemas.
**Causa raíz**:
1. `getWorkshopSettings` en `db.ts` retornaba `defaults` ("SGA Auto") si el documento `settings/{workshopId}` no existía. Como resultado, `AuthContext` interpretaba que el taller seguía activo y nunca cerraba la sesión.
2. `deleteWorkshopSettings` únicamente borraba `settings/{workshopId}`, dejando huérfanos los perfiles `users/{uid}` en Firestore.

**Fixes Aplicados**:
- `db.ts` (`getWorkshopSettings`):
  - Retorna estrictamente `null` cuando el taller no existe. Desde v1.5 tampoco sintetiza `demo-workshop`; `AuthContext` detecta el `null` y fuerza inmediatamente `firebaseSignOut(auth)`.
- `db.ts` (`deleteWorkshopCompletely`):
  - Nueva función que elimina en cascada: los perfiles de usuarios de `users`, los datos operativos (`jobs`, `inventory`, `inventory_transactions`) y la configuración `settings`.
- `super-admin/page.tsx`:
  - Se actualizó el botón "Eliminar Taller" para invocar `deleteWorkshopCompletely`.

---

## v1.4 — Estabilización de Seguridad e Integridad (2026-08-08)

### SEC-001: Escalada de roles mediante auto-creación de perfil

- Firestore ya no permite `users/{uid}` create desde clientes.
- El aprovisionamiento se movió a `/api/admin/users` y requiere SUPER_ADMIN verificado server-side.
- Si un email ya existe en Firebase Auth, la operación falla sin combinar usuarios.

### SEC-002: Datos privados expuestos por el portal público

- Eliminado el `get/update` público de `jobs` y el `get` público de `settings`.
- El nuevo endpoint devuelve un DTO que excluye nombre/contacto del cliente, firmas, pagos, fotos de recepción, auditoría e IDs de personal.
- La aprobación valida decisiones, cabecera/tamaño de la firma PNG y recalcula el monto en una transacción.
- Una cotización de un taller inexistente, deshabilitado o vencido no puede leerse ni aprobarse.

### BUG-008: Stock inicial duplicado e historial editable

- `addInventoryItem` registra el stock inicial sin incrementarlo dos veces.
- Cambios de stock y movimientos se escriben atómicamente.
- `inventory_transactions` es inmutable y cada cambio queda enlazado por `lastMovementId`.

### BUG-009: Pagos concurrentes o manipulables desde cliente

- Los pagos se movieron a `/api/jobs/[id]/payments`.
- El servidor verifica sesión, rol, tenant, trial, estado, saldo y actor.
- La transacción rechaza sobrepagos y evita perder abonos concurrentes.

### BUG-010: Portal sin firma de aprobación y tracker desplazado

- La firma de aprobación es obligatoria y se guarda separada de recepción.
- `declinedItems` se llena con la decisión real del cliente.
- Corregido el índice visual del tracker post-aprobación.
- Eliminado el botón de autoaprobación demo.

### INFRA-001: Credenciales server-side

- Vercel usa OIDC + Google Workload Identity Federation.
- No se almacena ninguna clave JSON de cuenta de servicio.
- Las API routes usan el SDK server de Firestore con transporte gRPC.

---

## v1.5 — Revisión integral previa a PR (2026-08-08)

### BUG-011: Pago o cliente Firestore podía omitir QC

- Los pagos completados durante `QC` conservan el estado; solo una orden `Ready` se entrega por pago.
- La aprobación/rechazo de QC se movió a `/api/jobs/[id]/qc`, con token, rol, tenant, vigencia y transacción server-side.
- Las reglas niegan cualquier transición directa desde `QC`.

### BUG-012: Auditoría y movimientos reutilizables

- Un update debe preservar todas las entradas históricas y añadir exactamente una entrada del actor autenticado.
- Un `lastMovementId` previo no puede reutilizarse para alterar stock otra vez.
- La creación con stock positivo exige su movimiento inicial enlazado en la misma operación.

### BUG-013: Edición de inventario y extensión de trial

- La edición de inventario ya no envía `id`, stock ni campos inmutables dentro del payload.
- `+7d/+30d` extiende una fecha futura en lugar de reemplazarla desde hoy.

### SEC-003: Herramientas administrativas heredadas

- Eliminados scripts REST con identidad/API key reales embebidas.
- Los scripts Python son dry-run por defecto, fijan y verifican `mechanic-app-7d459`, requieren confirmación fuerte y tienen dependencias reproducibles.
- Eliminado el autollenado de cuentas demo con una contraseña conocida; `demo-workshop` ya no es incondicionalmente activo.
