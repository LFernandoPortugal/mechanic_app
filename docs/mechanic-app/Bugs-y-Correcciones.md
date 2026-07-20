# Historial de Bugs y Correcciones — SGA

> Actualizado: 2026-07-20

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

## v1.2 — Fase 2-4: UX y SuperAdmin (2026-07-20)

### MEJORA-001: WorkflowStepper con tooltips interactivos
- Cada paso del stepper es ahora clickeable y muestra un popup con la descripción del rol y la acción correspondiente.
- Badge "Aquí" animado en el paso activo.
- Línea de progreso degradada con brillo.
- Descripción del paso activo visible debajo del stepper.

### MEJORA-002: Portal del cliente — pantalla post-aprobación
- El portal ya no muestra solo "Cotización Aprobada" estático.
- Ahora muestra un tracker visual de 4 pasos: Reparación → QC → Listo → Entregado.
- El tracker se actualiza en tiempo real según el estado del job (el cliente puede recargar la página).
- Aplica para todos los estados post-aprobación: `Approved`, `Repair`, `QC`, `Ready`, `Delivered`.

### MEJORA-003: SuperAdmin — métricas y gestión mejorada
- **OTs activas por taller**: badge con conteo visible en la tarjeta de cada taller.
- **Días restantes de trial**: reemplaza la fecha fija por "Activo · Nd restantes".
- **Botón "Limpiar Clave"**: aparece si `tempPassword` no está vacío, permite eliminarlo tras entregarlo al cliente.
- Nuevas funciones en `db.ts`: `getActiveJobCountByWorkshop()` y `clearTempPassword()`.
