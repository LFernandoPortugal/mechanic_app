---
version: "alpha"
name: "Emerald Service Glass"
description: "A premium green automotive operations system using restrained glass layers, solid work surfaces, and instrument-grade hierarchy for a bilingual workshop SaaS."
colors:
  primary: "#006B4F"
  on-primary: "#FFFFFF"
  primary-hover: "#00543E"
  primary-active: "#003F2F"
  primary-soft: "#DDF3EA"
  light-canvas: "#EEF3F0"
  light-canvas-accent: "#DCE9E3"
  light-surface: "#FFFFFF"
  light-surface-subtle: "#E7EEEA"
  light-glass: "rgba(255, 255, 255, 0.78)"
  light-text: "#10241D"
  light-text-muted: "#4F625B"
  light-border: "#C2D0CA"
  light-glass-border: "rgba(255, 255, 255, 0.72)"
  dark-canvas: "#08120F"
  dark-canvas-accent: "#10241D"
  dark-surface: "#111D19"
  dark-surface-subtle: "#192A24"
  dark-glass: "rgba(20, 38, 32, 0.78)"
  dark-text: "#F0F8F4"
  dark-text-muted: "#ABC0B7"
  dark-border: "#30483F"
  dark-glass-border: "rgba(128, 181, 159, 0.34)"
  dark-primary: "#62DDB1"
  dark-on-primary: "#062119"
  dark-primary-hover: "#82E8C2"
  dark-primary-active: "#43C598"
  dark-primary-soft: "#153B2E"
  info: "#1559A6"
  info-soft: "#E2EEFF"
  success: "#087443"
  success-soft: "#DCF4E7"
  warning: "#815000"
  warning-soft: "#FFF0C7"
  danger: "#B42318"
  danger-soft: "#FDE7E5"
  focus-light: "#0057C2"
  focus-dark: "#9FC5FF"
  overlay-light: "rgba(5, 18, 14, 0.42)"
  overlay-dark: "rgba(0, 0, 0, 0.70)"
typography:
  display:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  heading-xl:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  heading-lg:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  heading-md:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    lineHeight: 1.35
  body-lg:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
  technical:
    fontFamily: "IBM Plex Mono, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.015em"
rounded:
  none: "0px"
  xs: "5px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  pill: "999px"
spacing:
  none: "0px"
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
  16: "64px"
components:
  app-canvas-light:
    backgroundColor: "{colors.light-canvas}"
    textColor: "{colors.light-text}"
  app-canvas-dark:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-text}"
  ambient-accent-light:
    backgroundColor: "{colors.light-canvas-accent}"
    textColor: "{colors.light-text}"
  ambient-accent-dark:
    backgroundColor: "{colors.dark-canvas-accent}"
    textColor: "{colors.dark-text}"
  solid-surface-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.md}"
    padding: "20px"
  solid-surface-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.md}"
    padding: "20px"
  subtle-surface-light:
    backgroundColor: "{colors.light-surface-subtle}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.sm}"
  subtle-surface-dark:
    backgroundColor: "{colors.dark-surface-subtle}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.sm}"
  navigation-glass-light:
    backgroundColor: "{colors.light-glass}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.lg}"
    padding: "12px"
  navigation-glass-dark:
    backgroundColor: "{colors.dark-glass}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.lg}"
    padding: "12px"
  glass-edge-light:
    backgroundColor: "{colors.light-glass-border}"
    height: "1px"
  glass-edge-dark:
    backgroundColor: "{colors.dark-glass-border}"
    height: "1px"
  divider-light:
    backgroundColor: "{colors.light-border}"
    height: "1px"
  divider-dark:
    backgroundColor: "{colors.dark-border}"
    height: "1px"
  secondary-copy-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text-muted}"
    typography: "{typography.body-sm}"
  secondary-copy-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text-muted}"
    typography: "{typography.body-sm}"
  button-primary-light:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 18px"
  button-primary-light-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-primary-light-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
  button-primary-dark:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 18px"
  button-primary-dark-hover:
    backgroundColor: "{colors.dark-primary-hover}"
    textColor: "{colors.dark-on-primary}"
  button-primary-dark-active:
    backgroundColor: "{colors.dark-primary-active}"
    textColor: "{colors.dark-on-primary}"
  primary-tint-light:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-active}"
    rounded: "{rounded.md}"
    padding: "16px"
  primary-tint-dark:
    backgroundColor: "{colors.dark-primary-soft}"
    textColor: "{colors.dark-primary}"
    rounded: "{rounded.md}"
    padding: "16px"
  status-info-light:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  status-success-light:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  status-warning-light:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  danger-panel-light:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "16px"
  focus-light:
    backgroundColor: "{colors.focus-light}"
    height: "2px"
  focus-dark:
    backgroundColor: "{colors.focus-dark}"
    height: "2px"
  modal-overlay-light:
    backgroundColor: "{colors.overlay-light}"
  modal-overlay-dark:
    backgroundColor: "{colors.overlay-dark}"
---

## Overview

**Emerald Service Glass** is a premium visual system for a workshop operations SaaS. It combines deep mechanical greens, precise solid work surfaces, and a restrained layer of glass for orientation and context. The result should feel like a modern diagnostic studio: trustworthy, technical, clean, and unusually refined without becoming futuristic or ornamental.

Glass is a functional material, not the entire aesthetic. Use it where the interface floats above changing content—navigation, command bars, compact context panels, menus, and mobile sheets. Forms, tables, work queues, destructive confirmations, and long reading surfaces remain solid for clarity.

The canonical workflow must remain intact:

`Reception → Diagnosis → Approval → Approved → Repair → QC → Ready → Delivered`

Design for people working quickly in reception areas and active service bays. The current state, blocker, and next safe action should be understandable within five seconds.

## Colors

Green is the product identity and represents continuity, mechanical health, and controlled progress. It must not become neon, fluorescent, or uniformly applied.

The light theme uses a cool mineral canvas with clean white work surfaces. Deep emerald provides accessible actions and anchors. Soft green appears only in selected, contextual, or positive areas.

The dark theme uses green-black rather than pure black. Surfaces step gradually through charcoal forest tones. Mint is reserved for active controls and progress, never for large text blocks or decorative glow.

Semantic colors remain distinct:

- Green: brand, progress, successful completion.
- Blue: information, public links, and Advisor communication.
- Amber: pending review, Technician attention, and reversible warnings.
- Red: error, destructive action, and SUPER_ADMIN risk.

Never use color alone. Pair each state with a label and recognizable icon or marker. Do not color entire pages differently by role.

Glass surfaces must preserve legibility over every permitted background. If the underlying content becomes visually noisy, increase opacity or replace glass with the corresponding solid surface. Accessibility always overrides the effect.

## Typography

Manrope gives titles a premium geometric character. Inter keeps forms, tables, and help content neutral and highly readable. IBM Plex Mono is reserved for plates, job IDs, timestamps, measurements, quantities, and aligned monetary values.

Use sentence case and concise operational language. Avoid emoji headings, condensed racing typography, italic speed cues, and large all-caps labels. Use tabular figures for comparable numeric data.

Spanish is the primary mockup language. All layouts must tolerate English labels approximately 30% longer without clipping or reducing text below accessible sizes.

## Layout

Desktop uses a stable application shell with a 224 px navigation rail, a compact top command bar, and a centered work canvas. The shell may use glass; the work canvas should not.

Prefer a workbench composition over a card grid:

- Primary work zone: 7–8 columns.
- Context and next-action rail: 4–5 columns.
- Persistent workflow/status band where it materially helps.

This asymmetry should make the product feel designed around decisions, not around widgets. Keep related fields and actions on the same visual plane. Avoid wrapping every subsection in its own floating card.

On mobile, use one work column, a compact glass header, and a bottom navigation of up to four destinations plus “More”. Primary task actions may remain close to the bottom safe area but must never obscure fields, validation, or the on-screen keyboard.

Support widths from 320 px through wide desktop. Default gaps are 16 px mobile and 24 px desktop. Every touch action must be at least 44×44 px.

## Elevation & Depth

Use three depth mechanisms in order: surface tone, border, then shadow. Blur is optional and limited.

Glass recipe:

- Light: white at approximately 78–88% opacity, 12–18 px backdrop blur, white top edge, neutral lower border.
- Dark: forest graphite at approximately 76–88% opacity, 12–18 px backdrop blur, muted green border.
- Apply subtle background saturation only to navigation or transient layers.
- Never stack more than two glass surfaces.
- Never place glass behind dense tables, paragraphs, destructive copy, signatures, or image evidence.

Light elevation:

- Work surface: `0 1px 2px rgba(16, 36, 29, 0.07)`.
- Glass navigation: `0 10px 30px rgba(16, 36, 29, 0.12)`.
- Modal: `0 24px 64px rgba(16, 36, 29, 0.20)`.

Dark elevation:

- Work surface: no shadow; use surface and border hierarchy.
- Glass navigation: `0 14px 34px rgba(0, 0, 0, 0.34)`.
- Modal: `0 28px 72px rgba(0, 0, 0, 0.52)` with a strong border.

Do not use colored shadows, bright edge glows, frosted text, or constant floating animations.

## Shapes

Controls use 8 px radii, work surfaces 12 px, and modals or mobile sheets 16–20 px. Pills are limited to statuses, roles, counts, or compact filters.

Use crisp 1 px structural borders and 2 px focus outlines. Icons use one consistent line weight and appear with labels unless universally understood and given an accessible name.

Mechanical character comes from alignment, modular grids, inspection marks, labeled stages, and precise numeric typography—not gears, wrenches, tire patterns, speedometers, carbon fiber, or racing stripes.

## Components

### Application shell and navigation

The navigation rail and top command bar are the signature glass elements. They remain calm, mostly neutral, and separated from the solid work canvas. Navigation shows only routes permitted by the current role and always includes Help, language, theme, workshop identity, role, and account access.

SUPER_ADMIN receives an unmistakable global-context label and a neutral red risk marker so global scope cannot be mistaken for a workshop session.

### Buttons

Use one solid emerald primary action per decision group. Secondary actions use solid neutral surfaces. Ghost actions are reserved for low-priority navigation; glass buttons should exist only inside a glass command surface.

Buttons preserve their width while loading and prevent duplicate submissions. Hover changes background or border—not both plus elevation. Active states feel pressed through tone, not scale animation.

Destructive actions never use green. Separate them spatially and explain their scope:

- Revoke access: warning, reversible.
- Delete data: destructive operational reset; preserves workshop and employees.
- Delete workshop: irreversible global deletion; isolated panel, exact target, typed confirmation.

### Forms and evidence

Forms always sit on solid surfaces. Labels remain visible above inputs, with help and validation below. Read-only and disabled states are different. Autofill must remain legible in both themes.

Reception prioritizes camera capture, upload progress, signature, and recovery. Technician screens use larger checklist rows, clear photo states, and glove-friendly controls. Advisor screens foreground customer approval, quote amount, public-link status, and next action.

### Tables and mobile records

Desktop tables are solid, quiet, and optimized for scanning. Use a stable identity column, restrained dividers, sticky headers where helpful, and a final column for the next action. Glass must not sit behind table rows.

On mobile, convert tables into compact structured records. Retain identity, status, elapsed time, blocker, relevant amount, and one dominant action. Do not reproduce every desktop column as a separate card.

### Cards, metrics, and empty states

Cards are solid by default and do not float on hover unless clickable. Metrics use one small emerald signal rather than colored backgrounds. Empty states explain the situation and provide one meaningful action or contextual-help link.

### Workflow

Desktop displays all eight steps as connected service checkpoints. Completed steps use a check, the current step uses a solid emerald marker plus “Current”, and future steps use outlined neutral markers. `QC fail → Repair` appears as a labeled return path, never a new canonical stage.

Mobile displays previous, current, and next stages together with “Step N of 8” and total progress. Never hide every workflow label.

### Help center

`/help` uses a glass search/command header over a solid reading surface. Its content is filtered by role and includes tasks, workflow, FAQs, frequent errors, recovery, destructive warnings, and contextual links back to permitted screens.

Long-form help content never appears directly on translucent glass.

### Modals and system states

Dialogs require a semantic title, focus trap, Escape support, focus restoration, and explicit close control. Use a dim overlay; the dialog itself is solid or nearly opaque.

Render default, hover, focus-visible, active, selected, disabled, read-only, loading, empty, success, warning, error, offline, and retry states in both themes. Text meets WCAG AA; focus indicators maintain at least 3:1 contrast with adjacent colors.

Motion lasts 120–180 ms and explains cause and effect. Respect `prefers-reduced-motion` by removing transforms, blur interpolation, smooth scrolling, ping, pulse, and nonessential movement.

## Do's and Don'ts

### Do

- Use glass as a navigation and context layer, not as the default container.
- Maintain solid, high-contrast work surfaces for operational tasks.
- Create deliberate and independent light and dark compositions.
- Use emerald consistently as the product identity and primary action signal.
- Keep the current state, blocker, owner, and next action easy to scan.
- Design desktop and 360 px mobile variants.
- Preserve role permissions and the complete eight-stage workflow.
- Use realistic anonymized Spanish content and test longer English copy.
- Show recovery paths for errors, offline work, and expired access.
- Make destructive scope clear before confirmation.

### Don't

- Do not cover the entire application in translucent cards.
- Do not place glass behind forms, tables, signatures, evidence, or long text.
- Do not use neon green, luminous glows, aurora backgrounds, or cyberpunk styling.
- Do not use decorative gradients on headings or routine buttons.
- Do not add automotive clichés such as gears, tire tracks, flames, racing stripes, carbon fiber, or dashboard gauges.
- Do not create a different full-page palette for each role.
- Do not communicate status only through color.
- Do not shrink controls below 44×44 px.
- Do not hide critical operational detail to look minimal.
- Do not simplify or reorder the canonical workflow.
- Do not invent business rules or permissions.

When generating variations, explore one layout with a glass side rail and another with a glass top command deck. Keep all work content solid. Explain which alternative best balances premium identity, workshop readability, mobile speed, and implementation practicality.
