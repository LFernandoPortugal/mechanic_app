# AI Handoff — SGA Mechanic App
> Última actualización: 2026-07-26  
> Conversación: `a9341788-b16b-4208-bb29-014a50b61740`  
> Repositorio: `LFernandoPortugal/mechanic_app` (rama `main`)  
> Deploy: Vercel auto-deploy en push a `main`

---

## 1. Estado General del Proyecto

La aplicación es un **Sistema de Gestión de Taller (SGA)** multitenant construido en:
- **Framework**: Next.js 16 (App Router, TypeScript)
- **Auth**: Firebase Auth (email/password)
- **DB**: Cloud Firestore
- **Hosting**: Vercel (NO Firebase Hosting)
- **Deploy**: `git push origin main` → Vercel auto-build

### Regla de oro:
```
git add -A && git commit -m "tipo(scope): desc" && git push origin main
# NUNCA: firebase deploy --only hosting
# SÍ: firebase deploy --only firestore:rules (solo si se cambian reglas)
```

---

## 2. Flujo de Trabajo Completo (Auditado y Correcto)

```
Reception → Diagnosis → Approval → Approved → Repair → QC → Ready → Delivered
```

| Estado      | Actor              | Pantalla                         | Acción clave                                   |
|-------------|--------------------|---------------------------------|------------------------------------------------|
| Reception   | Recepcionista/Admin | `/reception`                   | Crea job con firma, fluidos, fotos             |
| Diagnosis   | Técnico            | `/technician`                   | Registra ítems de inspección (Pass/Fail/etc.)  |
| Approval    | Asesor             | `/advisor` (tab Approval)       | Asigna precios, genera link de cotización      |
| Approved    | (cliente)          | `/quote/view?id=JOB_ID`         | Cliente aprueba ítems. Guarda `approvedAmount` |
| Repair      | Técnico            | `/technician`                   | Inicia reparación → botón "Enviar a QC"        |
| QC          | Inspector/Técnico/Admin | `/qc`                      | Checklist 5 puntos. Aprueba → Ready/Delivered  |
| Ready       | Asesor/Caja        | `/advisor/payments`             | Registra pago(s). Pago completo → Delivered    |
| Delivered   | —                  | `/advisor/payments` (archivado) | Job cerrado. PDF de recibo disponible          |

> [!IMPORTANT]
> El Asesor en `/advisor` sólo ve jobs en `["Approval", "Approved", "Repair"]`.
> Los jobs en `"Ready"` son exclusivos del módulo de Caja `/advisor/payments`.

---

## 3. Bugs Resueltos (commits en `main`)

| Bug | Archivo | Fix |
|-----|---------|-----|
| Usuarios/talleres eliminados mantenían acceso o se auto-creaban | `AuthContext.tsx`, `login/page.tsx`, `firestore.rules`, `db.ts` | `getWorkshopSettings` ahora retorna `null` para talleres borrados. `deleteWorkshopCompletely` borra en cascada (datos + usuarios) protegiendo a `SUPER_ADMIN`. Expulsión de sesión inmediata en `AuthContext` y `signOut(auth)` en catch de login. |
| Esquema del SuperAdmin corrupto (`workshopId\t`) | Firestore DB (`users/uid`) | Se limpiaron los campos con tabuladores invisibles `\t` en Firestore. Se asignó `workshopId: "master-control"`. |
| `handleSaveQuote` ponía `status: "Ready"` en lugar de `"Approval"` | `advisor/page.tsx:69` | Cambiado a `"Approval"`. |
| Permisos denegados en `firestore.rules` para clientes públicos | `firestore.rules` | Permitir `get` en `Approval` y `update` a `Approved`. |
| SuperAdmin no creaba usuario vinculado al taller | `super-admin/page.tsx` + `db.ts` | `workshopIdOverride` en `createUserProfile`. |
| `approvedAmount` se sobreescribía con suma de pagos | `db.ts:registerPayment` | No se modifica `approvedAmount` en pagos. |
| Técnico sin acceso a QC | `qc/page.tsx` | Agregado `TECHNICIAN` a `allowedRoles`. |
| Precios editables post-aprobación | `advisor/page.tsx` | `readOnly={status !== 'Approval'}`. |
| Balance en Pagos usaba `totalEstimate` en lugar de `approvedAmount` | `payments/page.tsx` | `approvedTotal = approvedAmount ∥ totalEstimate`. |

---

## 4. Mejoras Implementadas (Fases 2-4)

### WorkflowStepper (`/web/src/components/WorkflowStepper.tsx`)
- Cada nodo es clicable → muestra popup con descripción del rol y la acción
- Badge "Aquí" animado en el paso activo
- Línea de progreso degradada con brillo
- Descripción del paso activo siempre visible en el pie del stepper

### Portal del Cliente (`/web/src/app/quote/view/QuoteView.tsx`)
- Pantalla post-aprobación: tracker visual de 4 pasos en tiempo real
  - Muestra progreso real: `Approved` → `Repair` → `QC` → `Ready` → `Delivered`
- Logo del taller visible si está configurado en settings
- Símbolo de moneda del taller en el monto autorizado

### Módulo de Pagos (`/web/src/app/advisor/payments/page.tsx`)
- Muestra "Total aprobado" en lugar de "Total estimado"
- Calcula balance contra `approvedAmount` con fallback a `totalEstimate`

### SuperAdmin (`/web/src/app/super-admin/page.tsx`)
- Badge de OTs activas por taller (en tiempo real al cargar)
- Días restantes del trial calculados dinámicamente
- Botón "Limpiar Clave" (elimina `tempPassword` de settings)
- Eliminación de talleres en cascada (`deleteWorkshopCompletely`) notificando conteo de datos borrados

### Nuevas funciones en `db.ts`
- `getActiveJobCountByWorkshop(workshopId)` — cuenta jobs activos
- `clearTempPassword(workshopId)` — borra la contraseña temporal
- `deleteWorkshopCompletely(workshopId)` — elimina en cascada datos operativos y usuarios del taller borrado

---

## 5. Estructura de Archivos Clave

```
web/
  src/
    app/
      reception/page.tsx        — Creación de OT + firma
      technician/page.tsx       — Diagnóstico + Reparación + Envío a QC
      advisor/page.tsx          — Cotización (Approval/Approved/Repair)
      advisor/payments/page.tsx — Caja y cobros (Ready/Delivered)
      qc/page.tsx               — Control de calidad
      quote/view/QuoteView.tsx  — Portal del cliente (sin login)
      super-admin/page.tsx      — Panel multitenant
      admin/
        settings/page.tsx       — Configuración del taller
        users/page.tsx          — Gestión de roles
    components/
      WorkflowStepper.tsx       — Barra de progreso interactiva
      ProtectedRoute.tsx        — Guard de roles
    lib/
      db.ts                     — Todas las funciones de Firestore
      pdf.ts                    — Generación de PDFs
      whatsapp.ts               — Links de WhatsApp
      email.ts                  — Envío de cotizaciones por email
    contexts/
      AuthContext.tsx            — Auth + userProfile + workshopSettings
    hooks/
      useRealtimeJobs.ts        — Listener en tiempo real de jobs por status
    types/index.ts              — Tipos globales (Job, UserProfile, etc.)
```

---

## 6. Variables de Entorno Requeridas (en Vercel)

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_SUPER_ADMIN_EMAIL          # Email que obtiene SUPER_ADMIN en el primer login
NEXT_PUBLIC_GEMINI_API_KEY             # Para el diagnóstico AI en /technician
```

---

## 7. Cómo Continuar (para la próxima IA)

1. Leer este archivo primero.
2. Leer `docs/mechanic-app/Bugs-y-Correcciones.md` para el historial.
3. Leer `docs/mechanic-app/Flujo-de-Trabajo.md` para el flujo de estados.
4. Verificar el último commit en GitHub para saber qué fue lo último desplegado.
5. **No usar** `firebase deploy --only hosting` bajo ninguna circunstancia.
6. Siempre verificar con `npm run build` antes de hacer push (desde `/web`).
7. El build exitoso + push a `main` = deploy automático en Vercel en ~60s.

---

## 8. Checklist de Auditoría (Estado Actual)

- [x] Reception → Diagnosis: flujo correcto
- [x] Diagnosis → Approval (técnico envía diagnóstico): correcto
- [x] Approval (asesor asigna precios) → status="Approval": correcto
- [x] Portal cliente aprueba → status="Approved", guarda `approvedAmount`: correcto
- [x] Approved → Repair (técnico inicia): correcto
- [x] Repair → QC (técnico envía): correcto  
- [x] QC checklist y Fail → Repair: correcto
- [x] QC Pass → Ready/Delivered (según si hay pago): correcto
- [x] Pagos en `/advisor/payments`: balance usa `approvedAmount`: correcto
- [x] Técnico no puede editar ítems cuando está en Repair (post-aprobación): verificado (bloqueado)
- [x] Dashboard home `/` muestra jobs correctos por rol: verificado
- [x] Admin settings guarda logo + moneda correctamente: verificado (reactivo con `refreshSettings`)
- [x] Analytics: métricas correctas: verificado
- [x] Seguridad y revocado de usuarios/talleres borrados: **CORREGIDO Y DESPLEGADO**
- [x] Reparación de campos en esquema de SuperAdmin: **CORREGIDO Y DESPLEGADO**
