# Skill: Diseño de Sistema de Colores — Corrección de Temas

---
name: light-theme-design-skill
description: >
  Guía para auditar y corregir el sistema de colores (design tokens) de una aplicación
  Next.js con Tailwind CSS v4 + shadcn/ui, con foco en que tanto el tema claro como
  el oscuro tengan identidad visual consistente y contraste WCAG apropiado.
---

## Objetivo

Asegurar que ambos temas (claro y oscuro) tengan:
1. **Identidad visual** — colores con hue y chroma, no solo grises neutros
2. **Contraste suficiente** — mínimo 4.5:1 para texto normal (WCAG AA)
3. **Consistencia semántica** — primary, accent, muted, etc. deben transmitir su significado en ambos temas
4. **Sin referencias cruzadas rotas** — cada token CSS definido debe ser utilizado

---

## Arquitectura del Sistema de Colores (Tailwind v4 + shadcn)

El sistema funciona en 3 capas:

```
globals.css
  └─ :root { --primary: oklch(...) }       ← Tokens del tema claro
  └─ .dark { --primary: oklch(...) }       ← Tokens del tema oscuro

  └─ @theme inline {
       --color-primary: var(--primary)     ← Mapeo a Tailwind
     }

Componentes: bg-primary, text-primary, etc.
```

### Tokens Semánticos Obligatorios

| Token | Uso en UI |
|-------|-----------|
| `--background` | Fondo de página |
| `--foreground` | Texto principal |
| `--card` / `--card-foreground` | Fondo y texto de cards |
| `--popover` / `--popover-foreground` | Dropdowns, tooltips |
| `--primary` / `--primary-foreground` | Botones principales, CTAs |
| `--secondary` / `--secondary-foreground` | Botones secundarios |
| `--muted` / `--muted-foreground` | Texto de apoyo, labels |
| `--accent` / `--accent-foreground` | Highlights, hover states |
| `--destructive` | Acciones peligrosas (borrar, cancelar) |
| `--border` | Bordes de inputs y cards |
| `--input` | Fondo de inputs |
| `--ring` | Focus ring |
| `--sidebar` / `--sidebar-*` | Todos los elementos del sidebar |
| `--chart-1..5` | Colores de gráficas |

---

## Principios de Diseño para Tema Claro

### 1. No usar neutros puros como primary

❌ **Incorrecto** (lo que había antes):
```css
--primary: oklch(0.205 0 0); /* Negro gris — sin identidad */
```

✅ **Correcto** (con identidad):
```css
--primary: oklch(0.45 0.15 160); /* Verde emerald oscuro */
```

### 2. Regla de contraste oklch

Para texto sobre fondo claro:
- `L < 0.5` → texto oscuro suficientemente contrastante
- Para colores vibrantes en light mode, usar `L ≈ 0.35–0.55` con `C ≈ 0.10–0.20`

Para fondos de elementos interactivos sobre fondo blanco:
- Usar `L ≈ 0.85–0.95` con `C ≈ 0.03–0.08` (tintes muy suaves)

### 3. Paleta semántica para SGA (Sistema de Gestión Automotriz)

| Rol | Color | oklch |
|-----|-------|-------|
| Primary (acción principal) | Emerald oscuro | `oklch(0.45 0.15 160)` |
| Accent (highlights) | Naranja/ámbar | `oklch(0.65 0.16 55)` |
| Success / Positive | Verde | `oklch(0.55 0.16 155)` |
| Warning | Amarillo | `oklch(0.75 0.15 85)` |
| Destructive | Rojo | `oklch(0.55 0.22 28)` |
| Muted text | Gris cálido | `oklch(0.45 0.02 160)` |

### 4. Consistencia de clases utilitarias

Las clases custom en `globals.css` deben funcionar en ambos temas:

```css
/* ✅ Correcto — tiene variantes para ambos temas */
.glass-panel {
  @apply bg-white/90 backdrop-blur-md border border-gray-200 shadow-md;
}
.dark .glass-panel {
  @apply bg-zinc-900/70 backdrop-blur-md border border-white/10;
}

/* ❌ Problemático — colores hardcodeados solo para dark */
.badge {
  @apply bg-zinc-900/60; /* Sin variante para light */
}
```

---

## Proceso de Auditoría Visual

### Paso 1: Identificar elementos con colores hardcodeados

Buscar en el código estas clases peligrosas en light mode:
- `bg-zinc-800`, `bg-zinc-900`, `bg-black/*` → solo funciona bien en dark
- `text-white`, `text-gray-100` → puede perderse sobre fondo claro
- `border-white/10` → invisible en light mode

Usar grep_search para encontrarlos:
```
grep -r "bg-zinc-9\|bg-black/\|dark:bg-" src/
```

### Paso 2: Auditoría por página

Para cada página principal:
1. Identificar el fondo del contenedor principal
2. Verificar contraste de texto sobre ese fondo
3. Revisar cards, inputs, badges, botones
4. Probar estados hover e interactivos

### Paso 3: Corrección en globals.css

Actualizar el bloque `:root` con colores con chroma real. Prioridad:
1. `--primary` y `--primary-foreground` (afecta todos los botones CTA)
2. `--accent` y `--accent-foreground` (afecta hover states y highlights)
3. `--sidebar-*` (afecta la navegación)
4. `--chart-*` (afecta las gráficas)

### Paso 4: Actualizar clases utilitarias

En `@layer utilities` de `globals.css`, asegurar que:
- `.glass-panel` tenga variante para light (fondo blanco con sombra)
- `.header-tool-btn` sea visible en light (texto oscuro, borde visible)
- `.page-bg` tenga un gradiente sutil en light (no solo blanco puro)

---

## Paleta de Referencia para el Proyecto SGA

### Tema Claro (`:root`)
```css
--background: oklch(0.98 0.005 160);      /* Blanco con tinte verde muy sutil */
--foreground: oklch(0.15 0.01 160);       /* Casi negro con tinte verde */
--primary: oklch(0.42 0.15 160);          /* Emerald oscuro — botones principales */
--primary-foreground: oklch(0.99 0 0);    /* Blanco puro */
--secondary: oklch(0.93 0.04 160);        /* Verde muy claro — botones secundarios */
--secondary-foreground: oklch(0.25 0.08 160); /* Verde oscuro */
--muted: oklch(0.94 0.015 160);           /* Fondo de elementos apagados */
--muted-foreground: oklch(0.45 0.03 160); /* Texto de apoyo — gris verdoso */
--accent: oklch(0.78 0.15 55);            /* Naranja/ámbar para highlights */
--accent-foreground: oklch(0.15 0.05 55); /* Texto sobre accent */
--destructive: oklch(0.55 0.22 28);       /* Rojo para acciones destructivas */
--border: oklch(0.88 0.02 160);           /* Borde con tinte verde sutil */
--input: oklch(0.96 0.01 160);            /* Input background */
--ring: oklch(0.42 0.15 160);             /* Focus ring = primary */
--sidebar: oklch(0.96 0.015 160);         /* Sidebar fondo */
--sidebar-foreground: oklch(0.20 0.05 160);
--sidebar-primary: oklch(0.42 0.15 160);
--sidebar-primary-foreground: oklch(0.99 0 0);
--sidebar-accent: oklch(0.90 0.04 160);
--sidebar-accent-foreground: oklch(0.25 0.08 160);
--sidebar-border: oklch(0.88 0.02 160);
--sidebar-ring: oklch(0.42 0.15 160);
--chart-1: oklch(0.55 0.22 145);   /* Verde vibrante */
--chart-2: oklch(0.60 0.18 210);   /* Azul */
--chart-3: oklch(0.65 0.20 55);    /* Naranja */
--chart-4: oklch(0.55 0.22 305);   /* Violeta */
--chart-5: oklch(0.60 0.20 15);    /* Rojo-naranja */
```

---

## Checklist de Validación Post-Corrección

- [ ] Toggle tema oscuro → claro: la app sigue siendo legible
- [ ] Botones primarios (emerald) visibles sobre fondo blanco
- [ ] Cards tienen sombra y borde visibles (no invisible sobre blanco)
- [ ] Header tiene contraste suficiente (no se mezcla con el fondo)
- [ ] Inputs tienen borde visible en light mode
- [ ] Badges de rol (ADMIN, TECHNICIAN, etc.) legibles en ambos temas
- [ ] Texto `muted-foreground` tiene contraste ≥ 3:1 sobre `background`
- [ ] Gráficas en analytics tienen colores distintos y visibles
- [ ] Pipeline status pills (amber, blue, violet, etc.) visibles en light
- [ ] Focus rings visibles al navegar con teclado

---

## Herramientas de Referencia

- **oklch color picker**: [oklch.com](https://oklch.com) — para elegir colores en oklch
- **Contrast checker**: [contrastchecker.com](https://contrastchecker.com)
- **WCAG guidelines**: nivel AA = 4.5:1 para texto normal, 3:1 para texto grande
- **shadcn theming docs**: [ui.shadcn.com/docs/theming](https://ui.shadcn.com/docs/theming)

---

## Notas de Aprendizaje

*(Actualizar con hallazgos de cada revisión)*

- **2026-05-30**: El tema claro de SGA tenía `chroma=0` en todos los tokens de `:root`. El sistema de Tailwind v4 mapea los tokens via `@theme inline`, por lo que cambiar el valor de la variable CSS en `:root` afecta automáticamente todas las clases `bg-primary`, `text-primary`, etc.
- Las clases `.glass-panel` en `globals.css` ya tienen variante para light y dark, pero los colores hardcodeados en páginas (ej. `bg-zinc-900/60`) necesitan prefijo `dark:`.
- Los charts en la página de analytics usan `--chart-1..5` directamente, por lo que cambiar esos tokens mejora automáticamente las gráficas en light mode.
