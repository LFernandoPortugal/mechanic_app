# Checklist de Despliegue — SGA

## Confirmar alcance

- [x] Rama actual y `HEAD` verificados.
- [x] `origin/main` actualizado y revisado; `main` es producción.
- [x] Árbol de trabajo revisado para no incluir cambios ajenos o secretos.
- [x] `web/.firebaserc` apunta a `mechanic-app-7d459`.
- [x] Deployment objetivo confirmado en Vercel.

## Variables

- [ ] Variables `NEXT_PUBLIC_FIREBASE_*` configuradas.
- [x] Variables EmailJS configuradas en Preview y Production; envío controlado aceptado el 2026-08-11.
- [ ] Identificadores WIF/GCP server-side configurados en Vercel Preview y Production.
- [ ] No existe una clave JSON de cuenta de servicio en el repositorio o Vercel.
- [ ] `web/.env.example` refleja los nombres requeridos sin valores reales.

## Gates desde `web/`

```powershell
npm.cmd ci
npm.cmd audit --omit=dev
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
$env:JAVA_HOME='C:\Program Files\Microsoft\jdk-21.0.12.8-hotspot'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
npm.cmd run test:all
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
```

- [x] Runtime audit sin vulnerabilidades.
- [x] TypeScript sin errores.
- [x] Lint sin errores; warnings revisados/aceptados.
- [x] Unit tests, integración de API routes y Firestore Emulator Rules tests pasan.
- [x] E2E de login, redirect y RBAC pasa contra Auth/Firestore Emulator con proyecto `demo-mechanic-app`; nunca contra Producción.
- [x] Build Next.js completo pasa. Next.js genera `.next`, no `out/`.

## Preview Vercel

- [x] Crear preview desde la raíz del repositorio, porque el Root Directory del proyecto es `web`.
- [x] Verificar rutas server-side en el resumen de build.
- [x] Probar acceso no autenticado: admin/pagos deben responder 401.
- [x] Probar cotización pública con documento descartable y confirmar que el DTO no filtra nombre/contacto del cliente ni datos internos.
- [x] Confirmar que el portal responde 404 sin token y con token incorrecto; el token correcto debe abrir la cotización.
- [x] Regenerar el enlace y comprobar que el anterior queda en 404; revocar el nuevo y comprobar otro 404.
- [x] Probar firma/aprobación parcial y limpiar el documento temporal.
- [x] Probar pago autenticado descartable antes de producción.
- [x] Probar QC autenticado: pago previo no debe omitir checklist; pass debe ir a Ready/Delivered según saldo y fail debe volver a Repair.
- [x] Probar creación/borrado de taller descartable con SUPER_ADMIN antes de producción.

## Firebase

Solo si cambiaron reglas/índices, desde `web/` y después de confirmar proyecto:

> Compatibilidad de esta estabilización: `main` anterior todavía ejecuta QC directamente desde el cliente. Primero debe estar listo en Vercel el código con `/api/jobs/[id]/qc`; inmediatamente después se despliegan las reglas que niegan esa escritura directa.

```powershell
firebase use
firebase deploy --only firestore:rules,firestore:indexes --project mechanic-app-7d459
```

- [x] Reglas validadas localmente antes de desplegar.
- [x] No ejecutar `firebase deploy --only hosting`; la web vive en Vercel.
- [x] Storage solo se despliega si sus reglas cambiaron intencionalmente.

## Integración y producción

- [x] Diff/PR revisado.
- [x] Rama integrada a `main`.
- [x] Build de Vercel Production exitoso.
- [x] Reglas Firestore desplegadas solo después de confirmar que la nueva API QC está activa en Vercel.
- [x] Smoke test: login → Reception → Diagnosis → Approval → firma cliente → Approved → Repair → QC → pago → Delivered (el pago completo previo al pass de QC entrega sin omitir el checklist).
- [x] Tema claro/oscuro y viewport móvil revisados en 320x568 y 390x844; sin desbordamientos ni errores de consola en las rutas principales.
- [x] EmailJS probado con destinatario controlado, moneda del taller y enlace público válido; recepción final del inbox confirmada.
- [ ] Logs de Vercel y Firebase revisados sin errores nuevos. Vercel quedó verificado; queda pendiente una revisión específica de logs Firebase cuando exista acceso a esa vista.
- [x] Datos de prueba eliminados y eliminación verificada.
- [x] Cuentas demo históricas con credenciales conocidas revisadas y eliminadas.
- [ ] Scripts operativos ejecutados primero sin `--apply`; proyecto y confirmación exactos revisados.
- [x] Documentación y `docs/AI-Handoff.md` actualizados.
