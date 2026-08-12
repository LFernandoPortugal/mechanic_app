# Historial de Bugs y Correcciones — SGA

> Actualizado: 2026-08-11

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

---

## v1.6 — QA visual con datos reales (2026-08-09)

### BUG-014: El historial de inventario quedaba vacío para un ADMIN

**Síntoma**: los movimientos se registraban correctamente, pero abrir “Historial” devolvía `Missing or insufficient permissions`.

**Causa raíz**: la regla permite leer únicamente documentos del taller del usuario, pero la consulta filtraba solo por `itemId`. Firestore no podía demostrar antes de ejecutar la consulta que todos los resultados pertenecían al mismo tenant.

**Corrección**:

- `getStockMovements` exige `workshopId` y consulta simultáneamente por taller e ítem.
- Se añadió una prueba de reglas que acepta la consulta del propio taller y rechaza consultas sin tenant o hacia otro taller.
- Las reglas no se relajaron y no requieren un nuevo despliegue.

### UI-001: Contenido real revelaba desbordamientos e inconsistencias de moneda

- Inventario usa tarjetas con acciones legibles en móvil y conserva la tabla en escritorio.
- Recepción marca y enfoca placa, marca y cliente como campos requeridos.
- Asesor y QC usan el símbolo configurado por el taller en lugar de etiquetas o importes fijos en USD/dólares.
- La confirmación de cotización y el CTA de reparación se apilan o permiten varias líneas en pantallas pequeñas.
- El portal público diferencia un enlace inexistente de un fallo temporal del servidor y ofrece reintento.
- Estados de inspección, estado de orden y fechas de pago se presentan localizados.

La ronda se verificó en 320x568, 390x844 y escritorio con una orden descartable completa, dos hallazgos, aprobación parcial, QC, dos pagos e inventario con movimientos. Gates locales: TypeScript y lint sin errores; 23 pruebas unitarias, 22 pruebas de reglas y build de 19 páginas/4 APIs.

---

## v1.7 — Notificaciones EmailJS (2026-08-11)

### NOTIF-001: El correo de cotización fijaba la moneda en dólares

**Síntoma**: la aplicación mostraba importes en la moneda configurada por el taller, pero `total_estimate` se enviaba siempre como `$` en la plantilla EmailJS.

**Corrección**:

- `sendQuoteEmail` recibe `currencySymbol`, valida los campos antes de transmitirlos y genera el total con la moneda del taller.
- La UI distingue EmailJS no configurado de un cliente sin correo y Recepción usa validación nativa de email.
- Se aplica un límite local de 10 segundos para reducir duplicados accidentales.
- El README documenta `to_email`, `client_name`, `vehicle_id`, `quote_url` y `total_estimate`, manteniendo el escape seguro de variables.
- Cuatro pruebas unitarias cubren moneda, normalización, validación, configuración y llamada al SDK.

La validación en Producción confirmó configuración activa, enlace público HTTP 200 antes del envío, total `S/. 12.34`, aceptación de EmailJS y recepción correcta en un inbox controlado. Las órdenes QA se eliminaron y Firestore volvió a 0 jobs.

---

## v1.8 — Enlaces públicos revocables (2026-08-11)

### SEC-004: El ID de la orden funcionaba como único secreto del portal

**Riesgo**: cualquier persona con un ID válido podía abrir la cotización sanitizada y enviar una aprobación mientras el enlace siguiera activo.

**Corrección**:

- Cada emisión genera 256 bits aleatorios y entrega `/quote/view?id=JOB_ID#token=TOKEN`.
- Solo SHA-256, tenant y caducidad de 30 días se guardan en `public_quote_links`; Rules niega esa colección a todos los navegadores.
- `GET/POST /api/public/quotes/[id]` exigen `X-Quote-Token` y comparan el hash en tiempo constante.
- `/api/jobs/[id]/quote-link` limita emitir/regenerar/revocar a ADMIN/ADVISOR autenticados y al tenant correcto.
- Regenerar invalida el enlace previo atómicamente y revocar elimina el registro. El reset del taller revoca antes de borrar cada orden.
- El token no es de un solo uso: permanece válido para el tracker post-aprobación hasta revocación, regeneración o vencimiento.
- WhatsApp conserva el enlace tokenizado y usa la moneda configurada por el taller en vez de fijar `$`.

### BUG-015: Reabrir una cotización ocultaba la mano de obra guardada

Al seleccionar de nuevo una orden en `Approval`, la UI recuperaba los precios de repuestos pero inicializaba mano de obra en cero. Ahora la reconstruye como `totalEstimate - suma de repuestos`, evitando reducir el total al regenerar el enlace.

### BUG-016: Cambiar solo el fragmento no recargaba el token

Si una misma pestaña pasaba de un enlace inválido al regenerado, el navegador no recargaba el documento porque solo cambiaba `#token`. El portal ahora escucha `hashchange` y vuelve a consultar con el token vigente.

La ronda final pasó en Preview y Producción. El enlace oficial se emitió, abrió la cotización sanitizada, fue revocado a 404 y los datos QA quedaron eliminados. Firestore Rules se desplegó sin incluir Hosting.

---

## v1.9 — Flujo visual de acceso (2026-08-11)

### BUG-017: La pantalla de login sugería registro y seguía visible con sesión activa

**Síntoma**: un ADMIN autenticado podía abrir `/login` y ver simultáneamente su identidad en el header y el formulario “Iniciar Sesión / Registrarse”, aunque el registro público está cerrado.

**Corrección**:

- `/login` espera la resolución de Auth y redirige una sesión vigente al destino interno solicitado o al dashboard.
- El parámetro `redirect` rechaza orígenes externos, URLs protocol-relative, barras invertidas y saltos de línea antes de entregarlo al router.
- El CTA y el subtítulo en español/inglés ya no ofrecen auto-registro; indican que las credenciales son asignadas por el administrador.
- Pruebas unitarias cubren destinos internos y entradas inseguras. El navegador local confirmó redirección a `/`, redirección válida a `/inventory`, login tester y ausencia de errores de consola.

---

## v1.10 — Accesibilidad operativa (2026-08-11)

### A11Y-001: Formularios y búsquedas dependían de placeholders

**Síntoma**: campos de Recepción, las búsquedas de Clientes/QC/Inventario y todos los controles de los modales de Inventario perdían su nombre al desaparecer el placeholder o no asociaban visualmente la etiqueta con el control.

**Corrección**:

- Se asociaron etiquetas mediante `id`/`htmlFor` en Recepción e Inventario, incluyendo VIN, modelo, color, teléfono, síntomas, objetos de valor, cantidades y notas de stock.
- Las búsquedas y filtros ahora tienen nombres semánticos aunque la etiqueta permanezca visualmente oculta.
- Los botones repetidos de fluidos anuncian tanto el fluido como el valor y exponen su estado mediante `aria-pressed`.
- Los selectores de roles de usuario exponen su estado seleccionado con `aria-pressed`.

### A11Y-002: Modales de Inventario sin gestión de teclado

**Síntoma**: los formularios superpuestos no se anunciaban como diálogos, no atrapaban el foco, no cerraban con Escape y permitían seguir accediendo al fondo.

**Corrección**:

- Se incorporó un contenedor modal reutilizable con nombre accesible, foco inicial, trampa de Tab/Shift+Tab, cierre con Escape y restauración del foco al control que lo abrió.
- Mientras el diálogo está activo, el fondo queda `inert`, oculto del árbol accesible y con el scroll bloqueado.

### A11Y-003: Navegación y ampliación móvil limitadas

- Todas las páginas comparten un landmark `<main>` y un enlace bilingüe para saltar directamente al contenido.
- Los controles interactivos reciben un foco visible global y los botones principales del header alcanzan 44×44 px.
- Se eliminó `maximumScale: 1` para permitir zoom en dispositivos móviles.

La validación local cubrió 390×844 y 1440×900, ambos temas, etiquetas anunciadas, diálogo nombrado, trampa de foco en ambas direcciones, Escape, restauración del foco y ausencia de desbordamiento visible. Gates: TypeScript y lint sin errores, 39 pruebas unitarias, 23 de reglas, 5 de integración y build de 19 páginas/5 APIs.

---

## v1.11 — Regresiones automáticas de accesibilidad (2026-08-11)

### TEST-003: El comportamiento de teclado dependía solo de QA manual

**Riesgo**: una modificación posterior podía romper el foco inicial, la trampa de Tab, Escape, la restauración del fondo o el salto al contenido sin que las pruebas unitarias lo detectaran.

**Cobertura añadida**:

- `AccessibleModal` anuncia nombre y modalidad, enfoca el primer control, aísla el fondo y bloquea el scroll.
- Tab y Shift+Tab permanecen dentro del diálogo; un diálogo sin controles conserva el foco en su contenedor.
- Escape desmonta el diálogo, restaura `inert`/`aria-hidden`/scroll y devuelve el foco al botón que lo abrió.
- `SkipLink` enfoca y desplaza el landmark principal, conserva el fragmento y mantiene el fallback nativo cuando el destino no existe.
- Testing Library, user-event y jsdom se incorporan exclusivamente como dependencias de desarrollo; el audit de dependencias runtime permanece en 0 vulnerabilidades.

La suite queda en 45 pruebas unitarias, 23 de reglas y 5 de integración API. TypeScript, lint, `npm audit --omit=dev --audit-level=high`, `test:all` y build de 19 páginas/5 APIs pasan localmente.

---

## v1.12 — Smoke automatizado de acceso y portal público (2026-08-11)

### TEST-004: RBAC, trial y portal dependían de recorridos manuales

**Riesgo**: cambios en Auth, la matriz de rutas o el portal podían permitir una ruta indebida, perder el destino de login, filtrar el token en la URL de la API o desplazar el tracker sin que CI lo detectara.

**Cobertura añadida**:

- `ProtectedRoute` verifica sesión ausente, destino interno codificado, trial vencido y el caso Auth sin perfil Firestore.
- La matriz completa de ADMIN, RECEPTION, TECHNICIAN, ADVISOR y SUPER_ADMIN se ejecuta contra el mismo helper RBAC que usa `AuthContext`.
- El portal usa fixtures sanitizados y comprueba token ausente, token exclusivamente en `X-Quote-Token`, 404 neutral, error temporal, reintento y recarga al cambiar solo el fragmento.
- Los estados `Approved`, `Repair`, `QC`, `Ready` y `Delivered` señalan semánticamente el paso actual mediante `aria-current="step"`.

La suite queda en 58 pruebas unitarias, 23 de reglas y 5 de integración API. TypeScript, lint, `npm audit --omit=dev --audit-level=high`, `test:all` y build de 19 páginas/5 APIs pasan localmente. Los tests usan fixtures y Firestore Emulator; no escriben datos de Producción ni requieren SUPER_ADMIN.
