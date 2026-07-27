# SGA Mechanic App — Changelog Rediseño UX/UI Premium

Este documento registra los cambios visuales, componentes nuevos e integraciones de UX realizados durante el proceso de evolución a **Garage Operating System**.

---

## [Fase 1] Design System Base, Dual Theme & Statuses Globales
- **Fecha:** 2026-07-26
- **Pantalla / Alcance:** Design System, Estados Globales y Componentes Base.
- **Cambio:**
  - Definición centralizada de `JOB_STATUS_CONFIG` en `web/src/constants/statuses.ts`.
  - Creación de componentes reutilizables: `StatusBadge`, `MetricCard`, `EmptyState`, `VehicleTimeline`.
- **Motivo:** Evitar duplicación de colores y estilos en código, soportar temas Dark/Light y White-labeling.
- **Archivos Modificados / Creados:**
  - `web/src/constants/statuses.ts` [NEW]
  - `web/src/components/ui/StatusBadge.tsx` [NEW]
  - `web/src/components/ui/MetricCard.tsx` [NEW]
  - `web/src/components/ui/EmptyState.tsx` [NEW]
  - `web/src/components/ui/VehicleTimeline.tsx` [NEW]
- **Riesgos:** Ninguno. Operación puramente visual/UI sin mutación de lógica ni esquemas de datos.
