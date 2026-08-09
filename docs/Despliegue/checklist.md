# Checklist de Despliegue — SGA

## Confirmar alcance

- [ ] Rama actual y `HEAD` verificados.
- [ ] `origin/main` actualizado y revisado; `main` es producción.
- [ ] Árbol de trabajo revisado para no incluir cambios ajenos o secretos.
- [ ] `web/.firebaserc` apunta a `mechanic-app-7d459`.
- [ ] Deployment objetivo confirmado en Vercel.

## Variables

- [ ] Variables `NEXT_PUBLIC_FIREBASE_*` configuradas.
- [ ] Variables EmailJS configuradas si se probarán notificaciones.
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
npm.cmd run build
```

- [ ] Runtime audit sin vulnerabilidades.
- [ ] TypeScript sin errores.
- [ ] Lint sin errores; warnings revisados/aceptados.
- [ ] Unit tests y Firestore Emulator Rules tests pasan.
- [ ] Build Next.js completo pasa. Next.js genera `.next`, no `out/`.

## Preview Vercel

- [x] Crear preview desde la raíz del repositorio, porque el Root Directory del proyecto es `web`.
- [ ] Verificar rutas server-side en el resumen de build.
- [ ] Probar acceso no autenticado: admin/pagos deben responder 401.
- [ ] Probar cotización pública con documento descartable y confirmar que el DTO no filtra nombre/contacto del cliente ni datos internos.
- [ ] Probar firma/aprobación parcial y limpiar el documento temporal.
- [ ] Probar pago autenticado descartable antes de producción.
- [x] Probar QC autenticado: pago previo no debe omitir checklist; pass debe ir a Ready/Delivered según saldo y fail debe volver a Repair.
- [ ] Probar creación/borrado de taller descartable con SUPER_ADMIN antes de producción.

## Firebase

Solo si cambiaron reglas/índices, desde `web/` y después de confirmar proyecto:

> Compatibilidad de esta estabilización: `main` anterior todavía ejecuta QC directamente desde el cliente. Primero debe estar listo en Vercel el código con `/api/jobs/[id]/qc`; inmediatamente después se despliegan las reglas que niegan esa escritura directa.

```powershell
firebase use
firebase deploy --only firestore:rules,firestore:indexes --project mechanic-app-7d459
```

- [ ] Reglas validadas localmente antes de desplegar.
- [ ] No ejecutar `firebase deploy --only hosting`; la web vive en Vercel.
- [ ] Storage solo se despliega si sus reglas cambiaron intencionalmente.

## Integración y producción

- [ ] Diff/PR revisado.
- [ ] Rama integrada a `main`.
- [ ] Build de Vercel Production exitoso.
- [ ] Reglas Firestore desplegadas solo después de confirmar que la nueva API QC está activa en Vercel.
- [ ] Smoke test: login → Reception → Diagnosis → Approval → firma cliente → Approved → Repair → QC → Ready → pago → Delivered.
- [ ] Tema claro/oscuro y viewport móvil revisados.
- [ ] Logs de Vercel y Firebase revisados sin errores nuevos.
- [ ] Datos de prueba eliminados y eliminación verificada.
- [ ] Cuentas demo históricas con credenciales conocidas revisadas y deshabilitadas/eliminadas si ya no se necesitan.
- [ ] Scripts operativos ejecutados primero sin `--apply`; proyecto y confirmación exactos revisados.
- [ ] Documentación y `docs/AI-Handoff.md` actualizados.
