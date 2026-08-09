# AI Handoff — SGA Mechanic App

> Última actualización: 2026-08-08
> Producción oficial: rama `main` en Vercel
> Trabajo pendiente de integrar: `codex/security-stabilization`

## Estado ejecutivo

La aplicación es un SGA multitenant en Next.js 16, Firebase Auth/Firestore y Vercel. La rama de estabilización compila, pasa TypeScript y cuenta con pruebas unitarias y de reglas; todavía **no está desplegada en producción**.

- Producción continúa en `https://mechanic-app-zeta.vercel.app/` desde `main`.
- Preview protegida de la rama (alias estable): `https://mechanic-app-git-codex-secur-abea4c-lfernandoportugals-projects.vercel.app`.
- No se desplegaron las reglas nuevas a Firebase ni se promovió la preview.
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

### Integridad

- Stock inicial ya no se duplica.
- Cada cambio de stock requiere un movimiento inmutable enlazado mediante `lastMovementId`.
- Pagos usan transacción y rechazan sobrepagos/concurrencia.
- `auditLog` deja de usar read-modify-write en actualizaciones comunes.
- La aprobación pública valida la cabecera PNG de la firma y limita su tamaño; el DTO no devuelve nombre ni contacto del cliente, firmas, pagos, auditoría o IDs internos del personal.

### Calidad y UI

- Tracker post-aprobación corregido: `Approved`/`Repair` resaltan Reparación, luego QC, Ready y Delivered.
- Marca del taller usa `workshopName`; moneda usa el símbolo configurado.
- Firma obligatoria en el portal; eliminado el botón de autoaprobación demo.
- Mejor contraste de roles en tema claro y CTA visible en tarjetas móviles.
- Limpieza de código muerto y migración de imágenes dinámicas a `next/image` sin optimizar URLs privadas/base64.
- Next.js actualizado a 16.3.0 y dependencias runtime sin vulnerabilidades conocidas en `npm audit --omit=dev`.

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

Resultado del 2026-08-08:

- TypeScript: 0 errores.
- Lint: 0 errores, 0 warnings.
- Unit tests: 18/18.
- Firestore Rules tests: 17/17.
- Build: 19/19 páginas generadas; 3 API routes dinámicas.
- Auditoría runtime: 0 vulnerabilidades.
- Auditoría completa: 5 moderadas, todas transitivas de `firebase-tools`; el aviso alto y los moderados parcheables fueron eliminados sin `--force`.
- E2E público local y Vercel preview: GET sanitizado, firma/aprobación parcial, monto 210, un `declinedItem`, tracker correcto y limpieza confirmada.
- E2E autenticado en Vercel preview: ADMIN tester registró 40.25 + 59.75, mantuvo `Ready` tras el abono, cambió a `Delivered` al completar, rechazó un tercer pago con 409, derivó el actor del token y limpió el job con 404 verificado.
- Aislamiento privilegiado: el mismo ADMIN recibió 403 al intentar `/api/admin/users`.

CI vive en `.github/workflows/ci.yml`, se activa en PRs, `main`, ramas `codex/**` y manualmente, y ejecuta instalación, auditoría runtime, TypeScript, lint, pruebas y build. El build usa identificadores Firebase ficticios y públicos para prerenderizar; no necesita ni recibe credenciales de producción.

## Variables requeridas

Las variables públicas Firebase y EmailJS están documentadas en `web/.env.example`. Para las API routes server-side se requieren:

```text
FIREBASE_ADMIN_PROJECT_ID
GCP_PROJECT_ID
GCP_PROJECT_NUMBER
GCP_SERVICE_ACCOUNT_EMAIL
GCP_WORKLOAD_IDENTITY_POOL_ID
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
```

Vercel ya tiene esos identificadores en Preview y Production. No crear ni subir una clave JSON de cuenta de servicio.

## Datos existentes que requieren decisión humana

Hay órdenes antiguas con `workshopId` `p2`, `prueba` y `master-control`, pero sus documentos `settings` ya no existen (excepto otras configuraciones válidas). Son datos huérfanos históricos. No deben migrarse ni borrarse automáticamente sin decidir si se conservan como evidencia o se purgan.

También quedan cuentas Auth antiguas que no tienen perfil `users`. El flujo nuevo evita crear más fantasmas, pero la limpieza histórica debe hacerse con una lista exacta y verificación previa.

## Pendiente antes de producción

1. Revisar el diff y decidir si la rama se integra por PR.
2. Probar con SUPER_ADMIN real la creación y eliminación de un taller descartable; no usar esa cuenta para pruebas rutinarias.
3. Desplegar `firestore.rules` desde `web/` al proyecto verificado `mechanic-app-7d459`.
4. Integrar a `main` y observar el deploy Vercel.
5. Ejecutar smoke test de login, recepción, diagnóstico, cotización, aprobación, reparación, QC, pago y entrega.
6. Resolver o aceptar explícitamente los 5 avisos moderados dev-only de `npm audit`; la sugerencia automática implica degradar `firebase-tools` 15 a 14 y no se aplicó.

## Reglas para la próxima IA

1. Leer primero `AGENTS.md` y los documentos obligatorios que enumera.
2. Confirmar rama, `HEAD`, `origin/main`, proyecto Firebase y deployment Vercel antes de afirmar qué está en producción.
3. No leer ni mostrar secretos de `.env.local`.
4. Empezar producción en modo lectura y usar datos descartables con limpieza explícita.
5. No usar Firebase Hosting.
6. No describir un build correcto como cobertura completa de pruebas.
