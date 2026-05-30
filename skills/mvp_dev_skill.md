# Mechanic App MVP Dev Skill (v2 — Stack Confirmado)

Documento maestro de arquitectura, buenas prácticas y contratos de desarrollo para el SGA (Sistema de Gestión Automotriz). Actualizado post-análisis del código fuente real.

---

## Stack Confirmado (Fuente de Verdad)

| Capa | Tecnología | Estado |
|------|-----------|--------|
| Frontend | Next.js 16 + React 19 + TypeScript | ✅ Producción |
| Estilos | Tailwind CSS v4 + Shadcn UI + Radix | ✅ Producción |
| Base de Datos | Firebase Firestore | ✅ Producción |
| Auth | Firebase Authentication + RBAC custom | ✅ Producción |
| Storage | Firebase Storage | ✅ Producción |
| IA | Google Gemini 2.0 Flash (streaming) | ✅ Implementado |
| Notificaciones | WhatsApp Deep Links + EmailJS | ✅ Producción |
| PDF | jsPDF + jsPDF-autotable | ✅ Producción |

---

## 1. Arquitectura del Sistema (Reglas de Oro)

### Frontend (Next.js App Router)
- **Rol:** UI, UX, orquestación de flujos, estado local con React State.
- **Regla de Oro:** **NUNCA** exponer `GEMINI_API_KEY` ni credenciales de Firebase Admin en componentes de cliente (`"use client"`). Toda lógica sensible va en Route Handlers (`app/api/...`).
- **RBAC:** Cada ruta protegida usa `<ProtectedRoute allowedRoles={[...]}>` y debe estar registrada en `ROLE_ROUTE_MAP` de `types/index.ts`.

### Backend IA (Next.js Route Handlers — Server-side)
- **Ruta:** `app/api/ai/diagnose/route.ts`
- **Seguridad:** `GEMINI_API_KEY` solo en `.env.local` sin prefijo `NEXT_PUBLIC_`.
- **Patrón:** Streaming via `ReadableStream` → cliente consume con `res.body!.getReader()`.

### Firebase (BaaS)
- **Firestore:** Toda la lógica de datos centralizada en `lib/db.ts`.
- **Storage:** Toda la lógica de archivos centralizada en `lib/storage.ts`.
- **Regla:** Los componentes nunca llaman a Firebase directamente — siempre usan las funciones exportadas de `lib/`.

---

## 2. Features MVP Implementadas ✅

### Feature 1: Módulo de Caja (Pagos)
- `lib/db.ts` → `registerPayment()`, `getJobsByStatus()`
- `app/advisor/payments/page.tsx` → UI completa de pagos, historial, abonos parciales, auto-entrega

### Feature 2: IA Gemini Real con Streaming
- `app/api/ai/diagnose/route.ts` → Route Handler server-side con streaming
- `directives/diagnose_and_log.md` → Prompt de producción con schema JSON
- `app/technician/page.tsx` → Botón "🤖 Diagnóstico IA", panel de streaming con typewriter effect

### Feature 3: Firma Digital Real (Canvas)
- `components/SignatureCanvas.tsx` → Canvas HTML5, touch + mouse, HiDPI
- `lib/storage.ts` → `uploadSignature()` (data URL → Firebase Storage)
- `app/reception/page.tsx` → Integrado, reemplaza el toggle booleano

### Feature 4: Diagnóstico por Voz
- `hooks/useSpeechRecognition.ts` → Web Speech API, español, continuo, interim results
- `app/technician/page.tsx` → Botón 🎙️ junto al campo de componente, auto-popula el texto

---

## 3. Estándares de Calidad (Checklist MVP)

### A. Seguridad ✅
- [ ] `GEMINI_API_KEY` sin `NEXT_PUBLIC_` — NUNCA exponer al cliente
- [ ] Todas las rutas nuevas en `ROLE_ROUTE_MAP` antes de desplegar
- [ ] `ProtectedRoute` en toda página con datos sensibles

### B. Resiliencia
- [ ] Fallback en IA: si Gemini falla → panel muestra error + botón reintentar
- [ ] Firma: si Firebase Storage falla → toast error, no bloquear el job
- [ ] Pagos: validar que `amount ≤ balance` antes de confirmar

### C. UX / Performance
- [ ] Streaming visible token a token (no esperar a que termine el LLM)
- [ ] Skeleton loaders en listas de jobs (Technician, Payments)
- [ ] Mobile-first: todos los formularios funcionales en pantallas de 360px+

---

## 4. Próximos Pasos (future_requirements.md)

En orden de prioridad según el documento de requerimientos futuros:

1. **🔴 QC Checklist** — Obligar checks básicos antes de "Entregado"
2. **🟠 Configuración de Taller (Settings/Admin)** — Nombre, logo, NIT para PDFs dinámicos
3. **🟠 Historial de Cliente por Placa** — Buscar todos los jobs de un vehículo/cliente
4. **🟡 Analytics reales con Recharts** — KPIs por técnico (horas rentables vs disponibles)
5. **🟡 Multi-tenant (SaaS)** — Agregar `workshopId` a todos los documentos de Firestore

---

> **Nota de Mantenimiento:** Este archivo es la fuente de verdad del proyecto. Actualizar siempre que se agreguen features, se cambie el stack, o se descubran nuevos patrones. No reemplazar — añadir y versionar.
