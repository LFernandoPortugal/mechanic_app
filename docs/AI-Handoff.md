# AI Handoff — SGA Mechanic App

> Última actualización: 2026-08-09
> Producción oficial: rama `main` en Vercel
> Código funcional de producción verificado: `68b2f49` en `https://mechanic-app-zeta.vercel.app/`

## Punto de reanudación rápido

> Este bloque es el checkpoint corto para una nueva sesión, cuenta o agente. Debe actualizarse al cerrar cada bloque de trabajo que cambie el estado del proyecto.

- **Producción:** `origin/main` incluye el commit funcional `68b2f49`; la estabilización y las dos rondas visuales están desplegadas en `https://mechanic-app-zeta.vercel.app/`. El HEAD puede avanzar por commits exclusivamente documentales.
- **Rama de trabajo:** ninguna funcional pendiente; PR #6 integrada por squash en `main`.
- **Árbol local al cerrar:** limpio y sincronizado con `origin/main` después de integrar el checkpoint documental.
- **Firebase esperado:** `mechanic-app-7d459`; las reglas de la estabilización están desplegadas y fueron releídas desde el proyecto activo.
- **Último hito:** PR #6 integrada y desplegada: QA integral con datos reales descartables, historial de inventario compatible con reglas, tarjetas móviles, estados públicos de carga/error y correcciones responsive en Recepción, Técnico, Asesor, QC y detalle de cliente.
- **Calidad verificada:** TypeScript, lint, 23 pruebas unitarias, 22 pruebas de reglas, build, flujo real completo, revisión móvil/desktop, CI de `main` y Vercel Production.
- **Siguiente paso recomendado:** validar EmailJS con un destinatario controlado si forma parte del release; después decidir si `p1` se conserva como fixture de QA.
- **No repetir ni asumir:** no hace falta recrear la orden ni el inventario ya eliminados; verificar siempre el deployment vigente antes de un nuevo cambio.

Para retomar, leer este documento completo y luego seguir el orden obligatorio de `AGENTS.md`. Verificar siempre el estado real con `git fetch`, `git status`, `git log -1`, `origin/main`, `web/.firebaserc` y el deployment objetivo antes de actuar.

## Estado ejecutivo

La aplicación es un SGA multitenant en Next.js 16, Firebase Auth/Firestore y Vercel. La estabilización está integrada en `main`, desplegada en Vercel Production y acompañada por sus reglas Firestore en `mechanic-app-7d459`.

- Producción sirve el código funcional de `68b2f49` en `https://mechanic-app-zeta.vercel.app/` desde `main`; commits posteriores pueden limitarse a documentación. La estabilización continúa en el historial como `c903185`.
- Preview protegida de la rama (alias estable): `https://mechanic-app-git-codex-secur-abea4c-lfernandoportugals-projects.vercel.app`.
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
/quote/view?id=JOB_ID
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

Resultado más reciente del 2026-08-09:

- TypeScript: 0 errores.
- Lint: 0 errores, 0 warnings.
- Unit tests: 23/23.
- Firestore Rules tests: 22/22.
- Build: correcto; 19/19 páginas estáticas y 4 API routes dinámicas.
- Auditoría runtime: 0 vulnerabilidades.
- Auditoría completa: 5 moderadas, todas transitivas de `firebase-tools`; el aviso alto y los moderados parcheables fueron eliminados sin `--force`.
- E2E público local y Vercel preview: GET sanitizado, firma/aprobación parcial, monto 210, un `declinedItem`, tracker correcto y limpieza confirmada.
- E2E autenticado en Vercel preview: ADMIN tester registró 40.25 + 59.75, mantuvo `Ready` tras el abono, cambió a `Delivered` al completar, rechazó un tercer pago con 409, derivó el actor del token y limpió el job con 404 verificado.
- E2E QC en Vercel preview: una orden rechazada volvió a `Repair`; otra con pago completo previo solo pasó a `Delivered` después de completar el checklist. Ambas conservaron actor y auditoría del servidor, y sus dos documentos desechables fueron eliminados con `not found` verificado.
- Aislamiento privilegiado: el mismo ADMIN recibió 403 al intentar `/api/admin/users`.
- E2E SUPER_ADMIN en Vercel preview: se creó un taller descartable con exactamente una cuenta Auth, un perfil ADMIN y un `settings` sin `tempPassword`; el borrado posterior eliminó Auth/perfil/settings, dejó 0 jobs/inventario/movimientos y restauró los conteos originales.
- El contenido del panel SUPER_ADMIN se monta únicamente después de que `ProtectedRoute` confirma sesión y rol, evitando consultas Firestore transitorias antes de inicializar Auth.

CI vive en `.github/workflows/ci.yml`, se activa en PRs, `main`, ramas `codex/**` y manualmente, y ejecuta instalación, auditoría runtime, TypeScript, lint, pruebas y build. El build usa identificadores Firebase ficticios y públicos para prerenderizar; no necesita ni recibe credenciales de producción.

## Variables requeridas

Las variables públicas Firebase y EmailJS están documentadas en `web/.env.example`. Para las API routes server-side se requieren:

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

La verificación posterior dejó exactamente dos cuentas Auth habilitadas y dos perfiles `users`: la cuenta única SUPER_ADMIN y el ADMIN tester de `p1`. Firestore conserva únicamente `settings/p1`; `jobs`, `inventory`, `inventory_transactions` y `feedback` quedaron vacíos. SUPER_ADMIN y `master-control` no fueron modificados. `p1` se conserva temporalmente para la siguiente ronda de QA visual/exploratoria.

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

## Siguiente bloque recomendado

1. Validar notificaciones EmailJS con un destinatario controlado si forman parte del release.
2. Resolver o aceptar explícitamente los avisos moderados dev-only de `npm audit` sin aplicar un downgrade automático de `firebase-tools`.
3. Decidir si `p1` se conserva como fixture de pruebas o se elimina coordinadamente de Auth, `users` y `settings`.
4. Para futuras mejoras visuales, repetir QA con datos descartables solo en los componentes que cambien y limpiar por IDs exactos.

## Reglas para la próxima IA

1. Leer primero `AGENTS.md` y los documentos obligatorios que enumera.
2. Confirmar rama, `HEAD`, `origin/main`, proyecto Firebase y deployment Vercel antes de afirmar qué está en producción.
3. No leer ni mostrar secretos de `.env.local`.
4. Empezar producción en modo lectura y usar datos descartables con limpieza explícita.
5. No usar Firebase Hosting.
6. No describir un build correcto como cobertura completa de pruebas.
