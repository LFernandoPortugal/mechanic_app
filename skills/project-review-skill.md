# Skill: Revisión Profunda del Proyecto (Project Deep Review)

---
name: project-review-skill
description: >
  Auditoría exhaustiva de un proyecto Next.js + Firebase. Evalúa código, seguridad,
  UX/UI, base de datos, deployment y documentación. Genera un reporte priorizado
  de hallazgos en `.tmp/review_report.md`.
---

## Objetivo

Realizar una revisión profunda y sistemática del proyecto para identificar:
- Bugs, inconsistencias y deuda técnica
- Problemas de seguridad y configuración
- Deficiencias de UX/UI (incluyendo ambos temas claro/oscuro)
- Estado de la base de datos y reglas Firestore
- Estado de deployment y variables de entorno
- Archivos huérfanos, componentes sin usar, imports rotos

---

## Inputs

| Input | Descripción |
|-------|-------------|
| `PROJECT_ROOT` | Ruta raíz del proyecto (ej. `d:\Codes\mechanic-app`) |
| `WEB_DIR` | Ruta de la app web (ej. `d:\Codes\mechanic-app\web`) |
| `FIREBASE_PROJECT` | ID del proyecto Firebase (ej. `mechanic-app-7d459`) |

---

## Pasos de Ejecución

### Fase 1: Exploración Estructural

1. **Listar árbol del proyecto** — `list_dir` recursivo desde `WEB_DIR/src`
2. **Revisar package.json** — dependencias, scripts, versiones desactualizadas
3. **Revisar tsconfig.json** — configuración TypeScript, paths alias
4. **Verificar .gitignore** — que `.env.local`, `node_modules`, `.next` estén excluidos
5. **Verificar .env.example** — que todas las variables requeridas estén documentadas

### Fase 2: Revisión de Código

**Componentes y páginas:**
- [ ] Abrir cada archivo en `src/app/**/page.tsx` y revisar:
  - Importaciones no usadas
  - Console.log en producción
  - Manejo de estados de carga y error
  - Texto hardcodeado (no pasado por `t()`)
  - Clases Tailwind que solo funcionan en dark mode (`dark:*` sin contraparte)
- [ ] Revisar `src/components/` — componentes huérfanos no importados en ningún lugar
- [ ] Revisar `src/lib/` — funciones sin usar, duplicadas, o sin manejo de errores

**TypeScript:**
- [ ] Buscar `any` no justificado en el código
- [ ] Buscar campos con `!` (non-null assertion) que podrían fallar en runtime
- [ ] Verificar que todos los tipos en `src/types/index.ts` estén siendo usados

**Localización:**
- [ ] Comparar `en.json` vs `es.json` — claves faltantes en alguno de los dos
- [ ] Buscar strings hardcodeados en español en los componentes

### Fase 3: Revisión de Seguridad

**Firebase:**
- [ ] Leer `firestore.rules` — verificar que no haya reglas `allow read, write: if true` en colecciones sensibles
- [ ] Verificar que `NEXT_PUBLIC_*` variables no expongan secretos (solo son public las de Firebase SDK)
- [ ] Confirmar que Storage no tenga acceso público irrestricto

**Next.js:**
- [ ] Rutas de API en `src/app/api/` — verificar autenticación en cada endpoint
- [ ] Variables `NEXT_PUBLIC_` vs variables server-only — correcta separación

### Fase 4: Revisión de UI/UX — Ambos Temas

**Proceso:**
1. Para cada página principal, revisar las clases CSS aplicadas
2. Identificar clases que tienen color solo con prefijo `dark:` sin su equivalente light
3. Revisar las clases utilitarias en `globals.css` — `.glass-panel`, `.header-tool-btn`, `.page-bg`
4. Verificar que los colores semánticos de shadcn (primary, secondary, accent, muted) tengan valores apropiados en `:root` (light theme) Y en `.dark`

**Checklist de elementos a revisar:**
- [ ] Fondo de página (`page-bg`)
- [ ] Cards / glass-panel (borde, sombra, fondo)
- [ ] Header (fondo, bordes, botones)
- [ ] Texto: foreground, muted-foreground
- [ ] Botones primarios y secundarios
- [ ] Inputs y formularios
- [ ] Badges y chips de rol/estado
- [ ] Tablas y listas
- [ ] Modales / Dialogs
- [ ] Toasts / notificaciones

### Fase 5: Revisión de Base de Datos

**Via Firebase MCP:**
1. Listar colecciones existentes con `firestore_list_collections`
2. Para cada colección, contar documentos con `firestore_list_documents`
3. Verificar que los índices en `firestore.indexes.json` estén desplegados
4. Revisar si hay documentos huérfanos (ej. `inventory_transactions` con `itemId` que ya no existe)

### Fase 6: Revisión de Deployment

**Git:**
- [ ] `git status` — archivos no comprometidos
- [ ] `git log --oneline -10` — historial reciente
- [ ] `git diff --stat origin/main` — diferencia con remoto

**Vercel:**
- [ ] Verificar que `next.config.ts` esté correctamente configurado
- [ ] Confirmar que todas las variables de entorno estén configuradas en Vercel Dashboard
- [ ] Verificar dominio(s) configurados

**Build:**
- [ ] Ejecutar `npm run build` (en `WEB_DIR`) y registrar errores o warnings

### Fase 7: Revisión de Documentación

- [ ] `README.md` — ¿está actualizado con las nuevas rutas y features?
- [ ] `gemini.md` / `directives/` — ¿los SOPs reflejan el estado actual del sistema?
- [ ] `future_requirements.md` — identificar items ya implementados que se pueden marcar como completos

---

## Outputs

### Reporte en `.tmp/review_report.md`

El reporte debe contener:

```markdown
# Reporte de Revisión — [Fecha]

## Resumen Ejecutivo
- Total de hallazgos: X
- Críticos: X | Altos: X | Medios: X | Bajos: X

## Hallazgos Críticos (bloquean producción)
### [C-001] Título
- **Archivo**: `ruta/al/archivo.tsx`
- **Problema**: descripción
- **Solución**: qué hacer

## Hallazgos Altos (degradan experiencia)
...

## Hallazgos Medios (deuda técnica)
...

## Hallazgos Bajos (mejoras opcionales)
...

## Estado del Deployment
- Git: [ ] limpio / [x] cambios pendientes
- Build: [ ] ✅ sin errores / [ ] ❌ X errores
- Vercel: [ ] desplegado / [ ] pendiente

## Recomendaciones Prioritarias
1. ...
2. ...
```

---

## Notas de Aprendizaje

*(Esta sección se actualiza conforme se ejecuta la revisión)*

- **2026-05-30**: El proyecto usa Next.js 15 App Router + shadcn/ui + Tailwind v4. El tema claro tenía todos los colores con `chroma=0` en oklch (grises puros). Corregido añadiendo paleta emerald/naranja para light mode.
- El proyecto usa `workshopId` como tenant ID para separar datos entre talleres. El default es `"demo-workshop"`.
- Las Firestore rules permiten lectura pública de jobs en estado `Ready`, `Approved`, `Repair`, `QC`, `Delivered` para el portal de clientes.

---

## Edge Cases y Advertencias

- **No ejecutar `npm run build` si hay errores TypeScript conocidos** — fallará y podría ser confuso.
- **No borrar archivos sin verificar que nadie los importe** — usar grep_search primero.
- **Las variables Firebase (`NEXT_PUBLIC_*`) son intencionalmente públicas** — no marcarlas como vulnerabilidad.
- **El campo `demoMode` en settings** no tiene impacto funcional real aún (pendiente implementar lógica de plan).
