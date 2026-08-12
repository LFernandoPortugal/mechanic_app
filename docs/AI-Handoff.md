# AI Handoff — SGA Mechanic App

> Última actualización: 2026-08-12
> Producción oficial: rama `main` en Vercel
> Código funcional de producción verificado: `961d827` en `https://mechanic-app-zeta.vercel.app/`

## Punto de reanudación rápido

> Este bloque es el checkpoint corto para una nueva sesión, cuenta o agente. Debe actualizarse al cerrar cada bloque de trabajo que cambie el estado del proyecto.

- **Producción:** el último cambio runtime es `961d827` e incluye renovación controlada de sesión, idempotencia server-side para pagos/QC y detección de saldos obsoletos; CI y Vercel Production pasaron y `https://mechanic-app-zeta.vercel.app/` respondió HTTP 200 en `/`, login, Asesor, QC y Pagos.
- **Rama de trabajo:** `codex/session-draft-recovery` añade borradores de sesión acotados para QC/pago y evita que los toasts cubran el header; debe pasar CI/Preview antes de integrarse.
- **Árbol local al cerrar:** limpio y sincronizado con `origin/main` después de integrar el checkpoint documental.
- **Firebase esperado:** `mechanic-app-7d459`; las reglas de la estabilización están desplegadas y fueron releídas desde el proyecto activo.
- **Último hito:** PR #37 se integró como `961d827`; fuerza una renovación de token ante el primer 401, guía al login si la sesión sigue inválida, evita dobles envíos en UI y garantiza que repetir el mismo pago/QC produzca una sola escritura.
- **Calidad verificada:** la rama pasa TypeScript, lint, 107 pruebas unitarias, 8 de integración de API, 23 pruebas de reglas, 3 E2E Chromium, audit runtime en 0 vulnerabilidades y build de 19 páginas/5 APIs; producción conserva además QA visual en 390×844 y 1440×900 y HTTP 200 en las rutas oficiales auditadas.
- **Siguiente paso recomendado:** validar la rama de borradores en CI/Preview y después cubrir los flujos secundarios aún sin E2E; mantener cualquier trabajo visual simultáneo en una rama separada.
- **No repetir ni asumir:** EmailJS confirmó aceptación y una persona confirmó recepción/presentación correcta en un inbox controlado. No hace falta recrear las órdenes QA ya eliminadas; verificar siempre el deployment vigente antes de un nuevo cambio.

Para retomar, leer este documento completo y luego seguir el orden obligatorio de `AGENTS.md`. Verificar siempre el estado real con `git fetch`, `git status`, `git log -1`, `origin/main`, `web/.firebaserc` y el deployment objetivo antes de actuar.

## Estado ejecutivo

La aplicación es un SGA multitenant en Next.js 16, Firebase Auth/Firestore y Vercel. La estabilización está integrada en `main`, desplegada en Vercel Production y acompañada por sus reglas Firestore en `mechanic-app-7d459`.

- `origin/main` contiene el runtime `961d827` y producción sirve su recuperación e idempotencia de operaciones críticas sobre el runtime base `f3cac1e` en `https://mechanic-app-zeta.vercel.app/`; los handoffs E2E mínimos quedan en `bf1df3f`, el E2E integral ADMIN en `0043693`, su tramo de recepción/diagnóstico en `b4c27e9`, el E2E base en `02931ea`, los flujos administrativos en `ac49ea7`, los operativos en `4e3882e`, acceso/portal en `1e1b049`, accesibilidad operativa en `eb29f26`, login en `0bd69a3`, enlaces revocables en `4a21b96` y la estabilización en `c903185`.
- Las URLs Preview son efímeras y se toman del PR activo; no reutilizar aliases de ramas ya integradas.
- Las reglas nuevas se compilaron y publicaron únicamente como `firestore:rules`; no se desplegaron Hosting, Storage ni índices.
- El taller tester `p1` fue reparado: conserva su cuenta Auth y ahora tiene un único perfil ADMIN y un `settings/p1` vacío/activo. No se combinaron usuarios antiguos.
- Las órdenes sintéticas de E2E fueron eliminadas al terminar.

## Arquitectura real

- Web y API routes: Next.js 16 en Vercel.
- Identidad: Firebase Authentication (email/password).
- Datos: Cloud Firestore.
- Imágenes actuales: base64 en Firestore; Storage permanece `deny all`.
- Despliegue web: push a `main` y build de Vercel.
- Firebase CLI: solo reglas, índices o Storage cuando corresponda; nunca Firebase Hosting.
- Operaciones privilegiadas server-side: Vercel OIDC → Google Workload Identity Federation → cuenta de servicio sin clave estática.

La aplicación incorpora estas rutas server-side:

- `GET/POST /api/public/quotes/[id]`: DTO público sanitizado y aprobación transaccional.
- `POST /api/jobs/[id]/payments`: pagos autenticados y transaccionales.
- `POST /api/jobs/[id]/qc`: aprobación/rechazo de QC autenticado; decide Ready/Delivered en servidor según saldo.
- `POST/DELETE /api/admin/users`: aprovisionamiento y borrado coordinado de Firebase Auth + Firestore, exclusivo de SUPER_ADMIN.

## Flujo canónico

```text
Reception → Diagnosis → Approval → Approved → Repair → QC → Ready → Delivered
```

El enlace público vigente es:

```text
/quote/view?id=JOB_ID#token=TOKEN
```

El cliente selecciona ítems, confirma una firma de aprobación separada de la firma de recepción y el servidor recalcula `approvedAmount`, llena `declinedItems`, registra `approvedAt` y cambia el estado a `Approved`.

## Cambios de estabilización

### Seguridad

- Eliminado el acceso público directo a `jobs` y `settings`.
- Eliminada la creación client-side de perfiles y la autoasignación de roles.
- Eliminado `tempPassword` del flujo nuevo; las contraseñas no deben guardarse en Firestore.
- Reglas con aislamiento de tenant, trial y transiciones/campos permitidos.
- La configuración de trial y `allowResetData` ya no puede ser alterada por un ADMIN.
- Pagos y aprovisionamiento se realizan en API routes autenticadas.
- QC también se ejecuta server-side; Firestore niega transiciones directas desde ese estado.
- Eliminados scripts REST con UID/email/API key reales y el autollenado con credenciales demo conocidas.

### Integridad

- Stock inicial ya no se duplica.
- Cada cambio de stock requiere un movimiento inmutable enlazado mediante `lastMovementId`.
- Un movimiento anterior no puede reutilizarse y el stock inicial positivo exige su movimiento en la misma operación.
- Pagos usan transacción y rechazan sobrepagos/concurrencia.
- `auditLog` deja de usar read-modify-write en actualizaciones comunes; las reglas preservan las entradas anteriores y exigen exactamente un append autenticado.
- Pagar durante QC no omite el checklist; QC pass entrega solo si el saldo ya era cero.
- La aprobación pública valida la cabecera PNG de la firma y limita su tamaño; el DTO no devuelve nombre ni contacto del cliente, firmas, pagos, auditoría o IDs internos del personal.

### Calidad y UI

- Tracker post-aprobación corregido: `Approved`/`Repair` resaltan Reparación, luego QC, Ready y Delivered.
- Marca del taller usa `workshopName`; moneda usa el símbolo configurado.
- Firma obligatoria en el portal; eliminado el botón de autoaprobación demo.
- Restablecimiento de contraseña disponible en login y mínimo de 12 caracteres para nuevos ADMIN.
- Mejor contraste de roles en tema claro y CTA visible en tarjetas móviles.
- Limpieza de código muerto y migración de imágenes dinámicas a `next/image` sin optimizar URLs privadas/base64.
- Next.js actualizado a 16.3.0 y dependencias runtime sin vulnerabilidades conocidas en `npm audit --omit=dev`.

### Primera ronda visual posterior al despliegue

- PR #3: `https://github.com/LFernandoPortugal/mechanic_app/pull/3`.
- Preview: `https://mechanic-app-git-codex-visua-462c2f-lfernandoportugals-projects.vercel.app`.
- Técnico y Asesor muestran estados vacíos informativos y responsive en lugar de paneles desproporcionados.
- La preferencia de tema claro/oscuro sobrevive a recargas completas.
- Inventario usa el símbolo de moneda configurado por el taller en métricas, tabla, formularios e historial.
- La revisión responsive se ejecutó en viewports reales de 320x568 y 390x844: Header, Recepción, Asesor, Inventario, Configuración, Usuarios y QC no presentan desbordamiento horizontal.
- Formularios, acciones y modales largos se apilan en móvil; el formulario de Inventario conserva desplazamiento interno y controles de cierre accesibles.
- El stepper de flujo reduce nodos en móvil y oculta etiquetas que se superponían; la firma y los botones de pago, aprobación, rechazo y restablecimiento se adaptan a una columna.
- QA de navegador sin warnings ni errores de consola. TypeScript, lint, 23 pruebas unitarias, 21 pruebas de reglas y build de producción pasan localmente.

### Segunda ronda visual con datos reales

- PR #6: `https://github.com/LFernandoPortugal/mechanic_app/pull/6`, integrada por squash en `main` como `68b2f49`.
- Preview validada: `https://mechanic-app-git-codex-real-387fde-lfernandoportugals-projects.vercel.app`.
- El 2026-08-09 se recorrió con el ADMIN tester de `p1` el flujo completo Recepción → Diagnóstico → Aprobación parcial pública → Reparación → QC → dos pagos → Entrega.
- La prueba incluyó datos deliberadamente largos, firma, dos ítems de inspección, moneda PEN, inventario con stock inicial y movimiento adicional, historial, rechazo parcial, QC y detalle financiero del cliente.
- El historial de inventario ahora consulta por `workshopId` + `itemId`, en línea con las reglas; una prueba nueva cubre la consulta válida y rechaza lecturas sin tenant o de otro taller.
- Inventario usa tarjetas móviles sin perder la tabla desktop; Recepción mejora el orden de validación nativa; Técnico y Asesor envuelven correctamente textos/acciones largos; QC y detalle de cliente respetan moneda, idioma y fechas.
- El portal público diferencia 404 de errores del servidor, ofrece reintento en fallos transitorios y mantiene estados de carga, badges y tracker localizados.
- Preview y Production se comprobaron a 390x844 sin desbordamiento horizontal ni errores de consola. `/`, `/login` y la vista pública respondieron HTTP 200; el API de la orden ya limpiada respondió el 404 esperado.
- La orden, el artículo y sus dos movimientos descartables se eliminaron por sus IDs exactos. La verificación posterior dejó `jobs`, `inventory` e `inventory_transactions` vacías. No se tocaron Auth, `users`, `settings`, SUPER_ADMIN, reglas ni índices y no hubo despliegue Firebase.

### Validación de notificaciones EmailJS

- PR #8: `https://github.com/LFernandoPortugal/mechanic_app/pull/8`, integrada por squash en `main` como `586deda`.
- El total del correo usa `currencySymbol` del taller (`S/. 12.34` en `p1`) en lugar de `$` fijo.
- El helper recorta y valida destinatario, cliente, vehículo, URL y monto; la UI distingue configuración ausente de cliente sin correo y el formulario de Recepción valida el formato email.
- EmailJS aplica un límite local de 10 segundos entre envíos y el README documenta las variables exactas de la plantilla y el escape seguro.
- Preview, CI y Vercel Production pasaron. Producción mostró “Email enviado al cliente” sin errores de consola para el mensaje corregido a un destinatario controlado.
- El enlace incluido se comprobó antes del envío: API HTTP 200, portal visible, vehículo correcto y total `S/. 12.34`.
- EmailJS confirmó aceptación del mensaje y la recepción/presentación final fue confirmada en un inbox controlado.
- Las dos órdenes QA se eliminaron por ID exacto. La primera usó por error un ID manual incompatible con la validación pública de 20 caracteres; la segunda usó un ID válido. Firestore volvió a `0 jobs` y ambos enlaces expiraron con 404.

## Verificación reproducible

Desde `web/` en Windows:

```powershell
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
$env:JAVA_HOME='C:\Program Files\Microsoft\jdk-21.0.12.8-hotspot'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
npm.cmd run test:all
npm.cmd run build
npm.cmd audit --omit=dev
```

Resultado más reciente del 2026-08-12:

- TypeScript: 0 errores.
- Lint: 0 errores, 0 warnings.
- Unit tests: 102/102.
- Integración de API routes con Firestore Emulator: 8/8.
- Firestore Rules tests: 23/23.
- Build: correcto; 19/19 páginas estáticas y 5 API routes dinámicas.
- Auditoría runtime: 0 vulnerabilidades.
- Auditoría completa: 5 moderadas, todas transitivas de `firebase-tools`; el aviso alto y los moderados parcheables fueron eliminados sin `--force`.
- E2E local aislado: 3/3 en Chromium; login/RBAC y una orden firmada recorren las UI reales hasta `Approved`, con API autenticada, enlace público y aprobación firmada contra Auth/Firestore Emulator.
- E2E público local y Vercel preview: GET sanitizado, firma/aprobación parcial, monto 210, un `declinedItem`, tracker correcto y limpieza confirmada.
- E2E autenticado en Vercel preview: ADMIN tester registró 40.25 + 59.75, mantuvo `Ready` tras el abono, cambió a `Delivered` al completar, rechazó un tercer pago con 409, derivó el actor del token y limpió el job con 404 verificado.
- E2E QC en Vercel preview: una orden rechazada volvió a `Repair`; otra con pago completo previo solo pasó a `Delivered` después de completar el checklist. Ambas conservaron actor y auditoría del servidor, y sus dos documentos desechables fueron eliminados con `not found` verificado.
- Aislamiento privilegiado: el mismo ADMIN recibió 403 al intentar `/api/admin/users`.
- E2E SUPER_ADMIN en Vercel preview: se creó un taller descartable con exactamente una cuenta Auth, un perfil ADMIN y un `settings` sin `tempPassword`; el borrado posterior eliminó Auth/perfil/settings, dejó 0 jobs/inventario/movimientos y restauró los conteos originales.
- El contenido del panel SUPER_ADMIN se monta únicamente después de que `ProtectedRoute` confirma sesión y rol, evitando consultas Firestore transitorias antes de inicializar Auth.

CI vive en `.github/workflows/ci.yml`, se activa en PRs, `main`, ramas `codex/**` y manualmente, y ejecuta instalación, auditoría runtime, TypeScript, lint, pruebas unitarias, integración de API routes, Rules, E2E Chromium contra emuladores y build. Las pruebas de integración levantan Firestore Emulator y simulan únicamente la identidad del caller; ejercen transacciones reales sin credenciales o datos de producción. El build usa identificadores Firebase ficticios y públicos para prerenderizar.

## Variables requeridas

Las variables públicas Firebase y EmailJS están documentadas en `web/.env.example`. EmailJS está configurado y fue ejercitado en Preview y Production. Para las API routes server-side se requieren:

```text
FIREBASE_ADMIN_PROJECT_ID
GCP_PROJECT_NUMBER
GCP_SERVICE_ACCOUNT_EMAIL
GCP_WORKLOAD_IDENTITY_POOL_ID
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
```

Vercel ya tiene esos identificadores en Preview y Production. No crear ni subir una clave JSON de cuenta de servicio.

## Estado de datos después de la limpieza

La limpieza autorizada eliminó 12 cuentas Auth de prueba: cuatro cuentas demo históricas y ocho cuentas huérfanas `p2/p3/p4/prueba*`. También se eliminaron tres perfiles demo sin taller, ocho órdenes de prueba huérfanas y el documento legado `settings/workshop`.

La verificación posterior dejó exactamente dos cuentas Auth habilitadas y dos perfiles `users`: la cuenta única SUPER_ADMIN y el ADMIN tester de `p1`. Firestore conserva únicamente `settings/p1`; `jobs`, `inventory`, `inventory_transactions` y `feedback` quedaron vacíos. SUPER_ADMIN y `master-control` no fueron modificados. `p1` se conserva como fixture de testers hasta cerrar las funciones y flujos importantes de la beta; no eliminarlo sin una decisión explícita posterior.

## Cierre de producción del 2026-08-09

1. PR #1 integrado por squash en `main` como `c903185`; CI de `main` completó correctamente.
2. Vercel Production completó el despliegue y la ruta QC autenticada quedó activa antes de publicar las reglas.
3. `firestore.rules` se desplegó desde `web/` al proyecto verificado `mechanic-app-7d459` y se releyó desde Firebase.
4. Smoke integral aprobado en producción: login, recepción, diagnóstico, cotización, portal público, firma/aprobación, reparación, QC, pago y entrega.
5. El job descartable fue eliminado; Firestore volvió a 0 jobs, inventario, movimientos y feedback. Permanecen solo SUPER_ADMIN y el tester `p1`.
6. Los logs del deployment mostraron 200 en las operaciones del smoke, un 401 intencional sin sesión y 0 warnings, errores o fatales.

## Cierre visual de producción del 2026-08-09

1. PR #3 integrada por squash en `main` como `eb74f84`; CI de `main` completó correctamente.
2. Vercel Production completó el deployment asociado y tanto `/` como `/login` respondieron HTTP 200 en la URL oficial.
3. La revisión visual cubrió tema claro/oscuro y viewports de 320x568 y 390x844 sin desbordamientos horizontales ni errores de consola en las rutas principales.
4. No cambiaron reglas, índices ni datos de Firebase; no se ejecutó ningún despliegue Firebase ni se utilizó la cuenta SUPER_ADMIN.

## Cierre de QA visual con datos reales del 2026-08-09

1. PR #6 integrada por squash en `main` como `68b2f49`; CI de `main` y Vercel Production completaron correctamente.
2. Se verificó el flujo funcional completo con el ADMIN de `p1`, incluyendo aprobación parcial, movimiento de inventario, QC, pagos parciales y entrega.
3. TypeScript, lint, 23 pruebas unitarias, 22 pruebas de reglas y build de producción pasaron antes del merge; el preview no presentó errores de consola ni desbordamiento a 390 px.
4. Producción respondió HTTP 200 en `/`, `/login` y `/quote/view`; el API público respondió 404 para la orden después de su eliminación y la UI mostró el estado de no encontrado correcto.
5. Se eliminaron exclusivamente la orden, el artículo y los dos movimientos creados para esta ronda. `jobs`, `inventory` e `inventory_transactions` quedaron en cero; no se modificaron cuentas ni configuración.
6. No cambiaron ni se desplegaron reglas, índices, Storage o Firebase Hosting, y no se usó la cuenta SUPER_ADMIN.

## Cierre de EmailJS del 2026-08-11

1. PR #8 integrada por squash en `main` como `586deda`; CI de `main` y Vercel Production completaron correctamente.
2. TypeScript y lint pasaron; la suite quedó en 27 pruebas unitarias y 22 pruebas de reglas. El build generó 19 páginas estáticas y 4 API routes, y `npm audit --omit=dev` reportó 0 vulnerabilidades.
3. Se verificó la configuración EmailJS activa en Preview y Production con el ADMIN tester de `p1`.
4. El mensaje corregido usó un destinatario controlado, vehículo QA descartable, enlace público oficial y total `S/. 12.34`. EmailJS respondió con éxito y la UI no registró warnings ni errores.
5. El endpoint público y el portal respondieron correctamente antes del envío. Tras la limpieza, el job dejó de existir y el endpoint respondió 404.
6. Las dos órdenes descartables se eliminaron y Firestore volvió a 0 jobs. No se modificaron Auth, `users`, `settings`, SUPER_ADMIN, reglas ni índices; no hubo despliegue Firebase.
7. Una persona con acceso al inbox confirmó la recepción y presentación visual correcta del correo.

## Validación Preview de enlaces revocables del 2026-08-11

1. PR #10 se probó con el ADMIN tester de `p1` y una orden descartable `QA-TOKEN-811`; SUPER_ADMIN no se usó.
2. El enlace emitido llevó el secreto únicamente en `#token`, con 43 caracteres URL-safe; el query string no lo contenía.
3. El portal devolvió la misma vista de no encontrado sin token y con token incorrecto. El token correcto mostró la cotización por `S/. 17.34`.
4. Regenerar conservó `S/. 5.00` de mano de obra, cambió el token e invalidó el anterior. El nuevo funcionó también al cambiar solo el fragmento en la misma pestaña.
5. Revocar eliminó el acceso; recargar el enlace vigente devolvió no encontrado.
6. TypeScript, lint, 32 pruebas unitarias, 23 de Rules, `npm audit --omit=dev` y build pasaron. CI y Vercel Preview quedaron en verde.
7. La orden y su registro en `public_quote_links` se eliminaron; Firebase MCP confirmó ambas colecciones vacías.
8. El servidor local no pudo ejercer las APIs Admin por falta de Application Default Credentials; el error se aisló al entorno local y el mismo flujo pasó en Preview mediante OIDC/WIF.

## Cierre de Producción de enlaces revocables del 2026-08-11

1. PR #10 se integró por squash en `main` como `4a21b96`; CI de `main` y Vercel Production completaron correctamente.
2. El ADMIN tester de `p1` recorrió Recepción → Diagnóstico → Approval en el dominio oficial y emitió un enlace seguro para una orden descartable por `S/. 12.34`.
3. El token oficial tuvo el formato esperado y abrió el DTO sanitizado. Tras revocarlo desde la UI, recargar el mismo enlace devolvió no encontrado.
4. `firestore.rules` se desplegó exclusivamente a `mechanic-app-7d459`; una lectura posterior confirmó el deny explícito de `public_quote_links`. No se desplegó Firebase Hosting.
5. La orden QA y su enlace se eliminaron; Firebase MCP confirmó `jobs` y `public_quote_links` vacíos. `p1` y SUPER_ADMIN no se modificaron.

## Cobertura automatizada de enlaces revocables del 2026-08-11

1. `tests/integration/quote-link-routes.test.ts` ejecuta las API routes reales contra Firestore Emulator y simula solo el resultado de autenticación.
2. La suite verifica 401 y aislamiento de tenant, persistencia exclusiva del hash, cabeceras no-cache/no-referrer, regeneración, token ausente/malformado/anterior, caducidad y DTO sanitizado.
3. También verifica aprobación transaccional e idempotente, permanencia del tracker después de aprobar y revocación idempotente con auditoría única.
4. `npm run test:all` bloquea CI si falla cualquiera de las 39 unitarias, 5 integraciones de API o 23 pruebas de Rules.
5. No se utilizaron credenciales, talleres ni documentos reales; el bloque no requiere despliegue de Firebase ni QA destructivo en Production.

## Cierre visual y de login del 2026-08-11

1. PR #13 se integró por squash en `main` como `0bd69a3`; CI de `main` y Vercel Production completaron correctamente.
2. Se revisaron las 10 rutas del ADMIN tester a 390×844 y 1440×900, en temas claro/oscuro: no hubo overflow horizontal ni errores nuevos de consola.
3. `/login` ya no muestra el formulario a una sesión activa, el copy no sugiere auto-registro y `redirect` acepta solo destinos internos seguros.
4. QA local y Vercel Preview confirmaron login de `p1`, destino válido a `/inventory` y neutralización de una URL externa a `/`.
5. Production confirmó el mismo redirect interno después del deployment. La suite quedó en 39 unitarias, 5 integraciones API y 23 Rules.
6. No se crearon órdenes ni se modificaron datos, Auth, SUPER_ADMIN, Rules, índices, Storage o Firebase Hosting.

## Cierre de accesibilidad operativa del 2026-08-11

1. PR #15 se integró por squash en `main` como `eb29f26`; CI de Preview/main y Vercel Preview/Production completaron correctamente.
2. Recepción, Clientes, QC e Inventario exponen nombres semánticos para los campos auditados; fluidos y roles comunican también su estado seleccionado.
3. Todas las rutas comparten `<main>` y un enlace bilingüe de salto; el foco es visible, el zoom móvil no está bloqueado y los controles principales del header miden 44×44 px.
4. Los tres overlays de Inventario usan un contenedor modal común: nombre accesible, foco inicial, Tab/Shift+Tab cíclico, Escape, restauración del foco, fondo `inert` y bloqueo de scroll.
5. QA local cubrió 390×844 y 1440×900, claro/oscuro, formulario de Recepción, búsquedas, toggles de roles y diálogo de Inventario. Preview y las rutas oficiales `/`, `/login` e `/inventory` respondieron HTTP 200.
6. TypeScript, lint, 39 unitarias, 23 Rules, 5 integraciones API y build de 19 páginas/5 APIs pasaron. No hubo cambios ni despliegues de Firebase y no se modificaron datos, Auth, `p1` o SUPER_ADMIN.

## Regresiones automáticas de accesibilidad del 2026-08-11

1. PR #17 se integró por squash en `main` como `a0c7359`; ambos CI de Preview, CI de `main` y Vercel Preview/Production completaron correctamente.
2. Cuatro pruebas jsdom cubren el diálogo: semántica modal, foco inicial, fondo/scroll, Tab en ambas direcciones, Escape, restauración y ausencia de controles interactivos.
3. Dos pruebas cubren el salto al contenido: foco/scroll/hash del landmark y fallback nativo si el destino falta.
4. Testing Library, user-event y jsdom son dependencias exclusivamente de desarrollo; `npm audit --omit=dev --audit-level=high` reporta 0 vulnerabilidades.
5. La suite queda en 45 unitarias, 23 Rules y 5 integraciones API; TypeScript, lint y build de 19 páginas/5 APIs también pasan.
6. El bloque no modifica código runtime, datos, Auth, Firebase, `p1` o SUPER_ADMIN. Producción `/` y `/login` respondieron HTTP 200 tras el deployment.

## Smoke automatizado de acceso y portal del 2026-08-11

1. PR #19 se integró por squash en `main` como `1e1b049`; CI de Preview/main y Vercel Preview/Production completaron correctamente.
2. `ProtectedRoute` cubre sesión ausente con destino interno, trial vencido, perfil Firestore faltante y la matriz completa de ADMIN, RECEPTION, TECHNICIAN, ADVISOR y SUPER_ADMIN.
3. `AuthContext` usa los mismos helpers RBAC puros ejecutados por los tests, conservando el bypass global de SUPER_ADMIN y las rutas operativas documentadas.
4. El portal público se prueba con DTOs sintéticos: token ausente, secreto solo en `X-Quote-Token`, 404 neutral, 500 con reintento, regeneración por `hashchange` y tracker desde Approved hasta Delivered.
5. El paso vigente del tracker expone `aria-current="step"`. La suite queda en 58 unitarias, 23 Rules y 5 integraciones API; TypeScript, lint, auditoría runtime y build de 19 páginas/5 APIs pasan.
6. Producción respondió HTTP 200 en `/`, `/login` y `/quote/view`. No se modificaron datos, Auth, Rules, índices, Storage, `p1` o SUPER_ADMIN y no hubo despliegue Firebase.

## Flujos operativos reproducibles del 2026-08-11

1. PR #21 se integró por squash en `main` como `4e3882e`; CI de Preview/main y Vercel Preview/Production completaron correctamente.
2. Técnico tiene cobertura de diagnóstico vacío/completo, hallazgo con estado/notas, envío a Approval, inicio de Repair y envío a QC.
3. Asesor calcula importes manuales, persiste `totalEstimate`/precios y emite el enlace seguro. `Auto-Cotizar (Demo)` solo aparece con `demoMode`.
4. QC cubre rechazo con motivo y aprobación tras cinco checks; Caja cubre teclado, saldo exacto, bloqueo de sobrepago no efectivo y pago completo que conserva QC.
5. Switches, campos y selectores auditados exponen etiquetas/estado; la tarjeta de Caja comunica expansión y el CTA responsive de demo tiene un nombre único.
6. La suite queda en 69 unitarias, 23 Rules y 5 integraciones API; TypeScript, lint, auditoría runtime y build de 19 páginas/5 APIs pasan. Producción respondió HTTP 200 en `/technician`, `/advisor`, `/qc` y `/advisor/payments`.
7. Los recorridos usan fixtures locales y dobles de API. No se modificaron datos, Auth, Rules, índices, Storage, `p1` o SUPER_ADMIN y no hubo despliegue Firebase.

## Flujos administrativos y de recepción reproducibles del 2026-08-11

1. PR #23 se integró por squash en `main` como `ac49ea7`; CI de Preview/main y Vercel Preview/Production completaron correctamente.
2. Recepción bloquea una orden sin firma y verifica el payload normalizado completo con actor, taller, fluidos, pertenencias y kilometraje.
3. Inventario cubre alta, entrada auditable con costo de compra y el límite de solo lectura de ADVISOR.
4. Usuarios conserva al menos un rol y guarda la selección exacta; Settings persiste solo campos editables y mantiene el reset tester detrás de `allowResetData` más `ELIMINAR`.
5. El detalle del cliente valida aislamiento, resumen financiero, expansión por teclado y visor de evidencia con diálogo, Escape y restauración de foco.
6. La suite queda en 80 unitarias, 23 Rules y 5 integraciones API; TypeScript, lint, auditoría runtime y build de 19 páginas/5 APIs pasan.
7. Preview y Producción respondieron HTTP 200 en `/`, `/login`, `/reception`, `/inventory`, `/admin/users`, `/admin/settings` y `/clients/detail`. No se modificaron datos, Auth, Rules, índices, Storage, `p1` o SUPER_ADMIN y no hubo despliegue Firebase.

## Login y RBAC E2E emulados del 2026-08-11

1. PR #25 se integró por squash en `main` como `02931ea`; CI de Preview/main y Vercel Preview/Production completaron correctamente.
2. Playwright levanta Next.js y los emuladores Auth/Firestore con el proyecto cerrado `demo-mechanic-app`; crea un taller, un ADMIN y un RECEPTION únicamente locales.
3. ADMIN recorre ruta protegida → login → redirect a Inventario → Gestión de Usuarios; el listener real de `AuthProvider` carga perfil/settings y muestra dos perfiles.
4. RECEPTION inicia sesión, ve Acceso Denegado al abrir Técnico y cierra sesión conservando un redirect interno seguro.
5. La conexión del SDK cliente a emuladores exige bandera explícita, navegador y `NODE_ENV !== production`; Production no puede activar ese bloque.
6. CI instala Chromium y ejecuta 2 E2E además de 80 unitarias, 23 Rules y 5 integraciones API. TypeScript, lint, auditoría runtime y build de 19 páginas/5 APIs pasan.
7. La revisión visual local no mostró errores de consola. Preview y Producción respondieron HTTP 200 en `/`, `/login`, `/inventory`, `/admin/users` y `/technician`. No se tocaron datos reales, Auth real, Rules, `p1`, SUPER_ADMIN ni Firebase Hosting.

## Recepción y diagnóstico E2E emulados del 2026-08-12

1. PR #27 se integró por squash en `main` como `b4c27e9`; CI de Preview/main y Vercel Preview/Production completaron correctamente.
2. ADMIN completa el formulario real de Recepción, dibuja/confirma una firma y crea una orden `Reception` con actor/taller autenticados bajo Firestore Rules.
3. La pantalla de éxito abre Técnico; el listener real muestra la orden y seleccionarla ejecuta `Reception -> Diagnosis`, asigna al actor y agrega la auditoría permitida.
4. Técnico registra un elemento con notas y ejecuta `Diagnosis -> Approval`; la UI confirma que el vehículo queda listo para cotización.
5. La placa cambia por reintento y los emuladores se destruyen al terminar. El recorrido solo usa `demo-mechanic-app`, `e2e-workshop` y usuarios sintéticos.
6. CI ejecuta 3 E2E además de 80 unitarias, 23 Rules y 5 integraciones API. TypeScript, lint, auditoría runtime y build de 19 páginas/5 APIs pasan.
7. QA local en 1440×900 y 390×844 confirmó formulario, firma, resultado y cola técnica sin overflow ni errores de consola. Producción respondió HTTP 200 en `/`, `/login`, `/reception` y `/technician`; no se tocaron Firebase real, Storage, `p1` ni SUPER_ADMIN.

## Cotización y aprobación pública E2E emuladas del 2026-08-12

1. PR #29 se integró por squash en `main` como `f3cac1e`; ambos CI de Preview, CI de `main` y Vercel Preview/Production completaron correctamente.
2. La verificación server-side de ID tokens usa Auth Emulator solo fuera de producción, con bandera explícita y host loopback con puerto; una configuración ausente o mal formada falla cerrado y producción conserva Identity Toolkit oficial.
3. El ADMIN continúa la orden anterior en Asesor, asigna repuesto y mano de obra y recibe HTTP 200 al emitir el enlace seguro mediante la API autenticada real.
4. Una segunda página abre `/quote/view?id=JOB_ID#token=TOKEN`, carga el DTO sanitizado, dibuja/confirma la firma del cliente y recibe HTTP 200 al aprobar; la UI termina en `Approved` con el monto correcto.
5. El recorrido completo utiliza exclusivamente Next.js local, `demo-mechanic-app`, Auth Emulator, Firestore Emulator y usuarios sintéticos. No requiere red de Firebase, datos reales, `p1` o SUPER_ADMIN.
6. La suite queda en 88 unitarias, 23 Rules, 5 integraciones API y 3 E2E; TypeScript, lint, auditoría runtime y build de 19 páginas/5 APIs pasan. El campo de stock inicial ya no entrega `NaN` a React al vaciarse.
7. Producción respondió HTTP 200 en `/`, `/login`, `/reception` y `/quote/view`. No cambiaron ni se desplegaron Rules, índices, Storage o Firebase Hosting.

## Ciclo completo hasta entrega E2E emulado del 2026-08-12

1. PR #31 se integró por squash en `main` como `0043693`; ambos CI de Preview, CI de `main` y Vercel Preview/Production completaron correctamente.
2. El ADMIN abre la orden aprobada en Técnico, ejecuta `Approved -> Repair -> QC` y observa cada estado mediante los listeners reales y Firestore Rules.
3. La primera revisión QC exige un motivo, llama la API autenticada, recibe HTTP 200 y devuelve la orden a `Repair`; Técnico corrige y la reenvía.
4. La segunda revisión activa los cinco controles, agrega notas y recibe HTTP 200 con `Ready` y saldo pendiente.
5. Caja selecciona el saldo exacto de `S/. 170.00`, llama la API autenticada y exige HTTP 200 con `totalPaid: 170`, saldo cero y `Delivered`; la UI confirma `Entregado`.
6. Los 3 E2E pasan juntos en Chromium en aproximadamente 46 segundos locales. El principal usa UI, APIs y persistencia reales dentro de los emuladores; no sustituye estados ni respuestas con mocks.
7. Producción respondió HTTP 200 en `/`, `/login`, `/technician`, `/qc` y `/advisor/payments`. No cambiaron ni se desplegaron Rules, índices, Storage o Firebase Hosting y no se tocaron datos reales, `p1` o SUPER_ADMIN.

## Handoffs E2E con roles mínimos del 2026-08-12

1. PR #33 se integró por squash en `main` como `bf1df3f`; ambos CI de Preview, CI de `main` y Vercel Preview/Production completaron correctamente.
2. El seed emulado contiene cuatro identidades de un único rol: ADMIN, RECEPTION, TECHNICIAN y ADVISOR. El recorrido funcional ya no reutiliza ADMIN.
3. RECEPTION crea y firma; TECHNICIAN diagnostica y repara; ADVISOR cotiza, emite el enlace, ejecuta QC y cobra. Cada traspaso cierra sesión e inicia otra contra Auth Emulator.
4. Los listeners vuelven a cargar la misma orden desde Firestore Emulator y las API server-side derivan la nueva identidad del token; el ciclo termina en `Delivered`.
5. La prueba negativa independiente conserva el 403 visual de RECEPTION al intentar Técnico y la prueba administrativa confirma los cuatro perfiles locales.
6. Los 3 E2E pasan juntos junto con 88 unitarias, 23 Rules y 5 integraciones API; TypeScript, lint, auditoría runtime y build de 19 páginas/5 APIs pasan.
7. Producción respondió HTTP 200 en `/`, `/reception`, `/technician`, `/advisor`, `/qc` y `/advisor/payments`. No cambiaron ni se desplegaron Rules, índices, Storage o Firebase Hosting y no se tocaron datos reales, `p1` o SUPER_ADMIN.

## Idempotencia y recuperación de sesión del 2026-08-12

1. PR #37 se integró por squash en `main` como `961d827`; ambos CI de Preview, CI de `main` y Vercel Preview/Production completaron correctamente.
2. Las llamadas autenticadas de pagos y QC fuerzan una sola renovación del ID token después del primer 401; un segundo 401 se presenta como sesión expirada con una ruta clara de regreso al login.
3. Pagos y QC generan claves estables de idempotencia. Repetir la misma solicitud después de perder la respuesta devuelve el resultado ya registrado sin duplicar pagos, auditoría ni transiciones.
4. Pagos compara el total observado por el formulario con el total vigente dentro de la transacción y devuelve 409 antes de escribir si otra caja registró un abono concurrente.
5. La UI bloquea dobles clics sin esperar un rerender. QC también detecta por listener si la orden dejó de estar en `QC`, conserva lo escrito en memoria y desactiva el envío obsoleto.
6. La suite queda en 102 unitarias, 23 Rules, 8 integraciones API y 3 E2E Chromium; TypeScript, lint, auditoría runtime y build de 19 páginas/5 APIs pasan.
7. Producción respondió HTTP 200 en `/`, `/login`, `/advisor`, `/qc` y `/advisor/payments`. No cambiaron ni se desplegaron Rules, índices, Storage o Firebase Hosting y no se tocaron datos reales, `p1` o SUPER_ADMIN.
8. Un job E2E duplicado falló una vez porque un toast interceptó el clic de cierre de sesión; el job paralelo del mismo SHA y el rerun pasaron. Estabilizar esa interacción del test es la primera tarea menor pendiente, sin confundirla con un fallo del flujo runtime.

## Siguiente bloque recomendado

1. Diseñar recuperación de borradores al recargar o reautenticar sin persistir datos sensibles innecesarios; priorizar notas/checklist de QC y el contexto de pago, con expiración y limpieza explícitas.
2. Coordinar cualquier chat de Diseño mediante una rama `codex/*` distinta; verificar `origin/main`, rebase/merge no destructivo y los gates antes de integrar para evitar solapar archivos de runtime.
3. La variante de pago completo antes de QC ya está cubierta por integración de API y QA histórico; automatizarla en navegador solo si se requiere una regresión visual/estado adicional.
4. Mantener `p1` como fixture de testers hasta finalizar el flujo crítico y limpiar cada orden descartable creada. No repetir despliegues de Rules ni pruebas con SUPER_ADMIN si el siguiente cambio no toca seguridad, roles o datos privilegiados.
5. Mantener aceptados por ahora los 5 avisos moderados dev-only de `firebase-tools`; no aplicar el downgrade automático sugerido por `npm audit --force`.

## Reglas para la próxima IA

1. Leer primero `AGENTS.md` y los documentos obligatorios que enumera.
2. Confirmar rama, `HEAD`, `origin/main`, proyecto Firebase y deployment Vercel antes de afirmar qué está en producción.
3. No leer ni mostrar secretos de `.env.local`.
4. Empezar producción en modo lectura y usar datos descartables con limpieza explícita.
5. No usar Firebase Hosting.
6. No describir un build correcto como cobertura completa de pruebas.
