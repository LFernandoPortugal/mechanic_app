# SGA — Sistema de Gestión Automotriz

Aplicación multitenant para administrar el flujo completo de un taller: recepción, diagnóstico, cotización, aprobación del cliente, reparación, control de calidad, cobro y entrega.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript.
- Tailwind CSS 4 + shadcn/ui.
- Firebase Authentication y Cloud Firestore.
- Vercel para web y API routes.
- Vitest + Firebase Emulator Suite para pruebas.

La aplicación **no usa Firebase Hosting**.

## Flujo canónico

```text
Reception → Diagnosis → Approval → Approved → Repair → QC → Ready → Delivered
```

El portal público vigente usa:

```text
/quote/view?id=JOB_ID
```

Los jobs completos no son públicos en Firestore. Vercel entrega un DTO sanitizado mediante `/api/public/quotes/[id]` y procesa la firma/aprobación en el servidor.

## Módulos

| Ruta | Función |
|---|---|
| `/reception` | Ingreso, fluidos, valores, fotos y firma de recepción |
| `/technician` | Diagnóstico, inspección y reparación |
| `/advisor` | Precios y generación del enlace de cotización |
| `/quote/view?id=...` | Selección de ítems y firma de aprobación del cliente |
| `/qc` | Control de calidad y retorno a reparación |
| `/advisor/payments` | Abonos, saldo, recibo y entrega |
| `/inventory` | Stock y movimientos inmutables |
| `/analytics` | Métricas del taller |
| `/admin/users` | Roles operativos del taller |
| `/admin/settings` | Marca, contacto, moneda e impuestos |
| `/super-admin` | Aprovisionamiento global de talleres |

## Desarrollo local

Requisitos: Node.js 20.9 o superior y Java 21 para las pruebas de reglas.

```powershell
cd web
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Completa `.env.local` con los valores de tu proyecto Firebase y, si aplica, EmailJS. Nunca commitees ese archivo.

## Verificación

```powershell
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
$env:JAVA_HOME='C:\Program Files\Microsoft\jdk-21.0.12.8-hotspot'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
npm.cmd run test:all
npm.cmd run build
npm.cmd audit --omit=dev
```

Un build correcto no reemplaza las pruebas. `test:all` ejecuta unit tests y Firestore Rules tests contra el emulador.

## Seguridad server-side

- `/api/public/quotes/[id]`: GET sanitizado y POST transaccional con firma.
- `/api/jobs/[id]/payments`: requiere ADMIN/ADVISOR autenticado.
- `/api/admin/users`: requiere SUPER_ADMIN y coordina Firebase Auth + Firestore.
- Vercel obtiene credenciales Google mediante OIDC + Workload Identity Federation; no se requieren claves JSON estáticas.

## Despliegue

- La rama oficial es `main`.
- Un push a `main` activa el deployment de producción en Vercel.
- Las ramas de trabajo generan previews protegidas.
- Desde Firebase solo se despliegan recursos explícitos como reglas o índices, siempre después de confirmar `mechanic-app-7d459`.

Antes de integrar, sigue [el checklist](../docs/Despliegue/checklist.md) y lee [el handoff](../docs/AI-Handoff.md).
