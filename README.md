# SGA — Sistema de Gestión Automotriz

Aplicación multitenant para gestionar recepción, diagnóstico, cotización, aprobación, reparación, control de calidad, pagos y entrega de vehículos.

## Arquitectura real

- La aplicación Next.js 16 está en `web/`.
- Vercel aloja la web y sus Route Handlers; `main` es la rama oficial de producción.
- Firebase se usa para Authentication, Cloud Firestore y reglas. **No se usa Firebase Hosting.**
- Las APIs privilegiadas usan Vercel OIDC y Google Workload Identity Federation, sin claves JSON estáticas.

El flujo canónico es:

```text
Reception → Diagnosis → Approval → Approved → Repair → QC → Ready → Delivered
```

El portal público vigente usa `/quote/view?id=JOB_ID`; los documentos completos de Firestore no son públicos.

## Desarrollo

```powershell
cd web
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Completa las variables descritas en `web/.env.example` sin commitear `.env.local`.

Los scripts administrativos Python viven en `execution/`, usan `execution/requirements.txt` y son vista previa por defecto. Requieren `--project mechanic-app-7d459`, `--apply` y confirmación explícita antes de cualquier escritura.

## Verificación

Desde `web/`:

```powershell
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
npm.cmd run test:all
npm.cmd run build
npm.cmd audit --omit=dev
```

Las pruebas de reglas requieren Java 21. Un build correcto no sustituye las pruebas unitarias y de Firestore Rules.

## Despliegue

- Un merge/push a `main` activa el despliegue oficial en Vercel.
- Las ramas de trabajo son previews no oficiales.
- Firebase CLI se limita al recurso solicitado, por ejemplo reglas o índices, y debe ejecutarse desde `web/` tras confirmar `web/.firebaserc` y el proyecto `mechanic-app-7d459`.

## Guía para personas y agentes

Empieza por `AGENTS.md`; allí está el orden obligatorio de lectura, las restricciones de seguridad y cómo distinguir producción, preview, Vercel y Firebase. El estado técnico más reciente vive en `docs/AI-Handoff.md` y el flujo funcional en `docs/mechanic-app/Flujo-de-Trabajo.md`.
