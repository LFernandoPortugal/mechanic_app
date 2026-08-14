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

---

## v1.13 — Flujos operativos reproducibles (2026-08-11)

### TEST-005: Técnico, Asesor, QC y Caja dependían de datos reales

**Riesgo**: los estados intermedios del flujo solo se comprobaban con órdenes descartables. Un cambio visual podía romper controles, importes o transiciones antes de ser detectado en Producción.

**Cobertura añadida**:

- Técnico bloquea diagnósticos vacíos, registra un hallazgo con estado/notas y recorre `Diagnosis -> Approval -> Approved -> Repair -> QC` mediante las acciones reales de la página.
- Asesor calcula una cotización manual, conserva ítems sin costo, guarda `totalEstimate` y emite el enlace seguro. La auto-cotización aleatoria queda visible solo en `demoMode`.
- QC exige motivo para rechazar, envía `fail` a la API y solo permite `pass` después de validar los cinco checks.
- Caja abre tarjetas con mouse, Enter o Espacio; registra el saldo exacto, bloquea sobrepagos no efectivos y conserva una orden pagada en QC hasta completar el control.

### A11Y-004: Controles operativos sin nombre o teclado

- Los cinco switches de QC, los campos de diagnóstico, precios, mano de obra, monto y referencia tienen etiquetas asociadas.
- Selectores de estado/método exponen `aria-pressed`; la tarjeta de Caja comunica `aria-expanded` y su panel controlado.
- El CTA responsive de auto-cotización expone un único nombre accesible.

La suite queda en 69 pruebas unitarias, 23 de reglas y 5 de integración API. Los recorridos usan fixtures locales y dobles de API; no requieren credenciales ni escrituras de Producción.

---

## v1.14 — Flujos administrativos y de recepción reproducibles (2026-08-11)

### TEST-006: Recepción, inventario y administración dependían de pruebas manuales

**Riesgo**: era posible romper el payload de una recepción, los movimientos de stock, la edición de roles, la configuración del taller o el historial de un cliente sin que las suites existentes lo detectaran.

**Cobertura añadida**:

- Recepción bloquea órdenes sin firma y verifica el payload normalizado completo, incluidos fluidos, pertenencias, kilometraje y actor/taller.
- Inventario comprueba altas, entradas auditables con costo de compra y el modo de solo lectura para ADVISOR.
- Usuarios conserva al menos un rol, persiste la selección exacta y diferencia semánticamente los controles repetidos por persona.
- Configuración guarda solo campos editables por ADMIN; el reset de un taller tester permanece condicionado por `allowResetData` y la confirmación exacta `ELIMINAR`.
- El detalle del cliente valida el aislamiento por taller/nombre, el resumen financiero y el visor accesible de evidencia.

### A11Y-005: Historial y roles no identificaban todos sus controles

- Cada selector y botón de guardado de roles incluye el usuario afectado en su nombre accesible.
- La cabecera de cada visita es un botón con `aria-expanded`/`aria-controls` y funciona con teclado.
- El visor de evidencia se anuncia como diálogo, atrapa el foco, cierra con Escape y devuelve el foco a la miniatura.

La suite queda en 80 pruebas unitarias, 23 de reglas y 5 de integración API. TypeScript, lint y build de 19 páginas/5 APIs pasan localmente; todos los recorridos usan fixtures, mocks o Firestore Emulator y no escriben en Producción.

---

## v1.15 — Login y RBAC E2E con emuladores (2026-08-11)

### TEST-007: Los providers reales no se montaban en ningún recorrido automatizado

**Riesgo**: las pruebas de componente validaban páginas y helpers por separado, pero no ejercían conjuntamente Firebase Auth, el listener Firestore de `AuthProvider`, redirects de Next.js y controles visibles según rol.

**Cobertura añadida**:

- Playwright levanta Next.js, Auth Emulator y Firestore Emulator con el proyecto aislado `demo-mechanic-app`.
- El seed crea únicamente un taller y dos usuarios sintéticos locales: ADMIN y RECEPTION.
- ADMIN abre una ruta protegida sin sesión, inicia sesión, recupera `/inventory` y navega a Gestión de Usuarios con ambos perfiles visibles.
- RECEPTION inicia sesión, recibe Acceso Denegado en `/technician` y cierra sesión conservando un redirect interno seguro.
- La conexión del SDK web a emuladores exige `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`, ejecución en navegador y `NODE_ENV !== production`; Producción no puede activarla.

CI instala Chromium y ejecuta este gate después de las suites unitarias/Rules/API. La validación local queda en 80 unitarias, 23 Rules, 5 integraciones API y 2 E2E; TypeScript, lint, audit runtime en 0 vulnerabilidades y build de 19 páginas/5 APIs pasan. La revisión visual del navegador local confirmó login y acceso denegado sin errores de consola ni datos reales.

---

## v1.16 — Recepción y diagnóstico E2E con reglas reales (2026-08-12)

### TEST-008: El primer tramo operativo solo se comprobaba con componentes aislados

**Riesgo**: el formulario podía verse correcto y aun así fallar al crear la orden, guardar la firma, montar el listener en Técnico o cumplir la lista de campos y transiciones permitidas por Firestore Rules.

**Cobertura añadida**:

- ADMIN inicia sesión y completa la recepción real con vehículo, cliente, síntomas y una firma dibujada/confirmada en canvas.
- Firestore Emulator acepta la creación únicamente con el payload `Reception` y el actor/taller del perfil autenticado.
- La pantalla de éxito abre Técnico; el listener en tiempo real muestra la orden recién creada.
- Seleccionar la orden ejecuta `Reception -> Diagnosis`, asigna al técnico autenticado y agrega la auditoría exigida por Rules.
- El técnico registra un elemento de inspección y envía `Diagnosis -> Approval`; la pantalla confirma que la orden está lista para cotización.
- La placa cambia en cada reintento para impedir colisiones si un intento anterior alcanzó a escribir antes de fallar.

La validación local queda en 80 unitarias, 23 Rules, 5 integraciones API y 3 E2E; TypeScript, lint, audit runtime en 0 vulnerabilidades y build de 19 páginas/5 APIs pasan. La revisión visual adicional en 1440×900 y 390×844 confirmó Recepción, firma, resultado y cola técnica sin overflow horizontal ni errores de consola. Todo el recorrido usa `demo-mechanic-app`; no escribe Auth, Firestore, Storage o Vercel reales.

---

## v1.17 — Cotización y aprobación pública E2E aisladas (2026-08-12)

### TEST-009: Las API server-side no usaban Auth Emulator

**Riesgo**: Firestore server-side ya respetaba `FIRESTORE_EMULATOR_HOST`, pero `requireUser` consultaba siempre Identity Toolkit de Google. Un supuesto E2E local de Asesor podía depender de red/credenciales reales o no probar la autenticación de la API.

**Corrección y cobertura**:

- `server-auth` usa Auth Emulator únicamente con `USE_FIREBASE_EMULATORS=true`, `NODE_ENV !== production` y `FIREBASE_AUTH_EMULATOR_HOST` loopback con puerto explícito.
- Un host ausente, remoto, con ruta o credenciales falla cerrado; producción conserva Identity Toolkit oficial aun si recibe variables de emulador por error.
- Ocho pruebas unitarias cubren endpoint oficial, endpoint emulado, guardia de producción y configuraciones inválidas.
- El E2E existente continúa desde `Approval`: Asesor asigna precio y mano de obra, persiste la cotización y recibe HTTP 200 al emitir el enlace autenticado.
- La vista pública abre `/quote/view?id=JOB_ID#token=TOKEN`, obtiene el DTO sanitizado por API, confirma una firma independiente y recibe HTTP 200 al aprobar.
- El servidor recalcula el monto autorizado y la UI termina en `Approved`; el token nunca se pasa en query ni al endpoint, solo en `X-Quote-Token`.
- El campo de stock inicial normaliza un valor vacío a `0`, evitando que React reciba `NaN` durante la edición del inventario.

La validación local queda en 88 unitarias, 23 Rules, 5 integraciones API y 3 E2E; TypeScript, lint, audit de dependencias de producción en 0 vulnerabilidades y build pasan. El recorrido completo desde Recepción hasta aprobación del cliente usa únicamente Next.js local, Auth Emulator y Firestore Emulator bajo `demo-mechanic-app`.

---

## v1.18 — Ciclo completo hasta pago y entrega E2E (2026-08-12)

### TEST-010: El tramo posterior a `Approved` no se recorría integrado en navegador

**Riesgo**: las pruebas de componente y API cubrían cada pantalla por separado, pero no demostraban que los listeners, Firestore Rules, autenticación server-side y estados de UI conservaran la misma orden a través de reparación, rechazo/reintento de QC, pago y entrega.

**Cobertura añadida**:

- El ADMIN abre en Técnico la orden recién aprobada, ejecuta `Approved -> Repair` y la envía a `QC` mediante las escrituras reales permitidas por Rules.
- QC rechaza primero la orden por la API autenticada, exige motivo, responde HTTP 200 y devuelve el estado a `Repair`.
- Técnico corrige y reenvía; QC activa los cinco controles, agrega notas y recibe HTTP 200 con estado `Ready`.
- Caja abre la misma orden, selecciona el saldo exacto de `S/. 170.00`, registra el pago por la API real y exige HTTP 200 con `totalPaid: 170`, saldo cero y estado `Delivered`.
- La UI de Caja confirma finalmente la etiqueta `Entregado`; el test no modifica el estado por acceso directo ni simula las respuestas de API.

Los 3 E2E pasan juntos en Chromium y el recorrido principal cubre ahora el flujo canónico completo, incluida la rama de rechazo de QC. Auth, Firestore, usuarios, taller y orden existen solo durante la ejecución bajo `demo-mechanic-app`; los emuladores se destruyen al terminar y no se usan `p1`, SUPER_ADMIN, Firebase real o Vercel.

---

## v1.19 — Handoffs E2E con privilegios mínimos (2026-08-12)

### TEST-011: El ciclo integral usaba ADMIN en todas las etapas

**Riesgo**: el flujo probaba las pantallas y transiciones reales, pero el bypass operativo de ADMIN podía ocultar una discrepancia entre navegación, Firestore Rules y autorización de las API para los roles especializados.

**Cobertura añadida**:

- El seed local incorpora cuatro identidades separadas: ADMIN, RECEPTION, TECHNICIAN y ADVISOR; cada una tiene un único rol y comparte solo el taller sintético.
- RECEPTION crea la orden y confirma la firma, pero no ejecuta Diagnóstico.
- El navegador cierra sesión e inicia como TECHNICIAN para Diagnóstico y los dos ciclos de Reparación.
- Cambia a ADVISOR para cotización, emisión del enlace, rechazo/aprobación de QC y pago/entrega.
- Cada cambio exige volver a `/login`, autenticar contra Auth Emulator y alcanzar únicamente el destino permitido; los listeners recargan la misma orden desde Firestore Emulator.
- La prueba administrativa confirma que los cuatro perfiles sembrados aparecen en Gestión de Usuarios, mientras la prueba negativa independiente conserva el bloqueo de RECEPTION en Técnico.

Los 3 E2E pasan juntos en Chromium con los handoffs reales. No se reutiliza ADMIN en el recorrido funcional ni se escriben datos fuera de `demo-mechanic-app`; `p1`, SUPER_ADMIN y Firebase real permanecen fuera de alcance.

---

## v1.20 — Recuperación visible en operaciones críticas (2026-08-12)

### UX-012: Los fallos transitorios dejaban al usuario sin una recuperación persistente

**Riesgo**: cotización pública, QC y pagos liberaban correctamente sus botones después de un error, pero dependían de un toast efímero. QC y Caja tampoco mostraban el error que ya reportaba el listener de Firestore, por lo que una lista vacía podía confundirse con “sin órdenes”.

**Corrección y cobertura**:

- El portal público muestra un aviso persistente si falla el POST de aprobación, conserva firma y decisiones y cambia la acción a `Reintentar aprobación`.
- QC conserva los cinco checks, notas o motivo de rechazo y ofrece reintentar aprobación/rechazo sin reconstruir el formulario.
- Caja conserva monto, método y referencia y ofrece `Reintentar Pago`; ningún fallo limpia datos antes de una respuesta exitosa.
- `useRealtimeJobs` expone una reconexión explícita. QC y Caja distinguen el fallo del listener de un estado vacío y presentan `Reconectar`.
- Seis pruebas unitarias nuevas simulan fallos seguidos de éxito y verifican preservación de datos, reintento y reconexión.

La validación queda en 94 unitarias, 23 Rules, 5 integraciones API y 3 E2E Chromium; TypeScript, lint y build de 19 páginas/5 APIs pasan. Todas las pruebas usan fixtures o `demo-mechanic-app`; no se tocaron `p1`, SUPER_ADMIN, Firebase real ni datos de Vercel.

---

## v1.21 — Sesión, idempotencia y concurrencia en operaciones críticas (2026-08-12)

### DATA-013: Un reintento de red podía duplicar un pago confirmado

**Riesgo**: pagos eran transaccionales, pero no idempotentes. Si Firestore confirmaba la escritura y la respuesta HTTP se perdía, repetir el mismo formulario podía crear otro abono. QC rechazaba el segundo envío por estado, aunque el usuario no podía distinguir ese conflicto de un fallo real.

**Corrección y cobertura**:

- Pago y QC generan claves opacas estables por contenido mientras una operación está pendiente. El cliente reutiliza la misma clave tras 401, error de red o reintento manual.
- Pagos persisten `requestId`; la transacción devuelve el pago existente sin duplicar auditoría y rechaza con 409 una clave reutilizada con otros datos.
- QC enlaza `requestId`, resultado y estado final a la entrada de auditoría; repetir la petición devuelve el resultado original sin volver a transicionar.
- Caja envía `expectedTotalPaid`; si otra sesión registró un pago antes de la transacción, el servidor responde 409 y obliga a revisar el saldo en tiempo real.
- Las acciones críticas combinan bloqueo síncrono y estado `disabled`, evitando que dos clics alcancen la API antes de que React vuelva a renderizar.
- Ante un 401 se fuerza una sola renovación del token. Un segundo 401 se modela como error de sesión, muestra una acción de reautenticación y el login explica por qué se solicitó acceso nuevamente.
- QC detecta mediante su listener que la orden dejó de estar pendiente, conserva lo ingresado y deshabilita las acciones obsoletas.

La validación queda en 102 unitarias, 23 Rules, 8 integraciones API y 3 E2E Chromium; TypeScript, lint, auditoría runtime en 0 vulnerabilidades y build de 19 páginas/5 APIs pasan. Las integraciones comprueban una sola escritura, reutilización inválida de claves y saldo obsoleto contra Firestore Emulator. No se modificaron reglas ni datos reales.

---

## v1.22 — Borradores de sesión y notificaciones no bloqueantes (2026-08-12)

### UX-014: Reautenticar o recargar descartaba el formulario y un toast podía bloquear el header

**Riesgo**: la recuperación de v1.21 preservaba datos solo mientras la página seguía montada. Al aceptar la reautenticación, QC perdía checklist/notas y Caja perdía monto/método/referencia. Además, los toasts `top-right` ocupaban la misma zona que “Cerrar Sesión”; un E2E reprodujo que la notificación interceptaba el clic durante todo el timeout.

**Corrección y cobertura**:

- QC guarda selección, cinco controles, notas y motivo de rechazo en `sessionStorage`; Caja guarda método, monto y referencia.
- Las claves se aíslan por función, taller, UID y orden. Los valores tienen esquema acotado, TTL de 30 minutos y no incluyen tokens o credenciales.
- El borrador se restaura después de recargar o recorrer login en la misma pestaña, se identifica mediante un aviso persistente y puede descartarse manualmente.
- Una respuesta exitosa elimina el borrador. Contenido vencido, corrupto, de otra cuenta o de otro taller no se restaura.
- Sonner conserva `top-right`, pero comienza 72 px debajo del viewport para dejar libre el header sticky tanto en escritorio como en móvil.
- Pruebas unitarias cubren aislamiento, expiración, corrupción y restauración de ambos formularios; el E2E completo vuelve a ejecutar los cambios de usuario con clics normales, sin `force` ni ocultar overlays.

La validación queda en 107 unitarias, 23 Rules, 8 integraciones API y 3 E2E Chromium; TypeScript, lint, auditoría runtime en 0 vulnerabilidades y build de 19 páginas/5 APIs pasan. Todo usa fixtures o `demo-mechanic-app`; no se modificaron Rules, Firebase real, `p1` ni SUPER_ADMIN.

---

## v1.23 — Ciclo ADMIN consistente entre Auth y Firestore (2026-08-14)

### DATA-015: Gestionar solo el perfil podía duplicar u orfanar identidades

**Riesgo**: Gestión de Usuarios solo editaba roles en Firestore. No podía crear cuentas operativas y el borrado directo permitido en ciertas condiciones podía eliminar `users/{uid}` sin borrar Firebase Authentication. Esto reproducía la clase de incidente donde un correo seguía en Auth, desaparecía del taller o reaparecía asociado a perfiles inesperados.

**Corrección y cobertura**:

- `/api/workshop/users` coordina alta, edición y baja del personal del taller autenticado; deriva el tenant del ADMIN y nunca acepta `workshopId` del navegador.
- El alta crea primero Auth y luego el perfil; si Firestore falla, compensa borrando la cuenta Auth. Un correo existente en Auth o Firestore devuelve 409 y no se combina automáticamente.
- La edición limita roles a ADMIN/RECEPTION/TECHNICIAN/ADVISOR, bloquea cruces de taller y protege SUPER_ADMIN y el último ADMIN.
- La baja prohíbe autoeliminación, marca la operación pendiente y elimina Auth antes del perfil. `USER_NOT_FOUND` es idempotente para que un reintento termine una limpieza interrumpida.
- Firestore Rules deja de permitir a ADMIN cambiar roles o borrar perfiles directamente; esas mutaciones pasan por la API server-side.
- La pantalla ADMIN incorpora alta, nombre/roles editables y baja explícita, con mensajes persistentes, estados de carga, ES/EN y confirmación destructiva.
- Integraciones con Auth + Firestore Emulator demuestran creación conjunta, rechazo de duplicados, aislamiento de tenant, protección del último ADMIN y eliminación conjunta. El E2E verifica POST/PATCH/DELETE desde la UI y confirma al final que no queda la cuenta en Auth.

La validación queda en 113 unitarias, 24 Rules, 12 integraciones API y 4 E2E Chromium; TypeScript, lint y build de 19 páginas/6 APIs pasan. La revisión visual local cubrió escritorio y 390×844 sin errores de consola. Todo usa `demo-mechanic-app`; no se modificaron `p1`, SUPER_ADMIN, Firebase real ni datos de Vercel durante las pruebas.

---

## v1.24 — Reconciliación global y bajas reintentables (2026-08-14)

### DATA-016: El panel global no distinguía Auth de Firestore y una baja podía quedar a medias

**Riesgo**: SUPER_ADMIN contaba únicamente documentos `users`. Una identidad existente solo en Firebase Authentication era invisible; una baja total coordinada por el navegador podía borrar el perfil o el taller sin confirmar que todos sus accesos Auth hubieran desaparecido.

**Corrección y cobertura**:

- `GET /api/admin/users` construye un inventario sanitizado y solo-lectura de Auth, perfiles y talleres, con estados `consistent`, `auth_only`, `profile_only` y `missing_workshop`.
- La auditoría global muestra esas diferencias sin exponer contraseñas, tokens ni secretos.
- Las bajas de usuarios marcan el perfil como pendiente, consideran idempotente `USER_NOT_FOUND`, informan resultados por UID y permiten terminar un intento interrumpido.
- `DELETE /api/admin/workshops` mueve la cascada al servidor: primero elimina todas las identidades del taller y únicamente después elimina enlaces públicos, órdenes, inventario, movimientos, perfiles y settings.
- Si una identidad falla, los datos y settings se conservan con marca pendiente para un reintento; `master-control`, `demo-workshop`, el llamador y cualquier perfil `SUPER_ADMIN` quedan protegidos.
- Firestore Rules ya no permite borrar perfiles directamente, ni siquiera desde la UI SUPER_ADMIN; la coordinación Auth + Firestore es obligatoria.
- Integraciones con Auth y Firestore Emulator cubren los cuatro estados de reconciliación, baja total y reintento. La suite queda en 113 unitarias, 25 Rules y 14 integraciones; TypeScript, lint y build de 19 páginas/7 APIs pasan.
- `master-control` se considera un tenant reservado válido aunque no tenga documento `settings`; así la cuenta única SUPER_ADMIN no aparece como falso positivo en la auditoría.

---

## v1.25 — Presupuesto seguro para evidencia de recepción (2026-08-14)

### DATA-017: Fotos ilimitadas podían superar el documento Firestore y perder la recepción

**Riesgo**: Recepción permitía seleccionar cualquier número de imágenes y solo las comprimía a un ancho fijo. Cuatro o más fotos complejas —o una imagen vertical extrema— podían acercar o superar el límite de 1 MB de Firestore y hacer fallar el alta completa al final del formulario.

**Corrección y cobertura**:

- La UI acepta como máximo cuatro imágenes válidas, rechaza archivos no-imagen y originales mayores de 15 MB antes de procesarlos.
- La compresión limita ambos ejes a 800 px y reduce calidad/dimensiones de forma acotada hasta respetar un presupuesto de 180 000 caracteres por foto.
- La firma de recepción tiene un presupuesto independiente de 150 000 caracteres; una firma fuera de rango se rechaza antes de escribir.
- Firestore Rules repite los límites de firma, cantidad de fotos, tipo y tamaño individual, por lo que un cliente modificado no puede saltarse el presupuesto.
- Pruebas de componente cubren el límite de cuatro fotos y Rules rechaza listas o firmas sobredimensionadas.
