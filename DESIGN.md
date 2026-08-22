---
version: "alpha"
name: "Service Bay Atlas"
description: "A calm, instrument-grade visual system for a bilingual automotive workshop SaaS. It combines editorial clarity, technical precision, and unmistakable operational states without looking like a generic dashboard."
colors:
  primary: "#8A3D16"
  on-primary: "#FFFFFF"
  primary-hover: "#713012"
  primary-active: "#58250E"
  primary-soft: "#F8E9DF"
  light-canvas: "#F3F1EC"
  light-surface: "#FFFEFC"
  light-surface-raised: "#FFFFFF"
  light-surface-sunken: "#E9E6DF"
  light-text: "#1D2423"
  light-text-muted: "#596361"
  light-border: "#C9CDC8"
  light-border-strong: "#929B97"
  dark-canvas: "#111514"
  dark-surface: "#181E1C"
  dark-surface-raised: "#202725"
  dark-surface-sunken: "#0C100F"
  dark-text: "#F4F2EC"
  dark-text-muted: "#B7BFBB"
  dark-border: "#35403C"
  dark-border-strong: "#68756F"
  dark-primary: "#FFB27A"
  dark-on-primary: "#281208"
  dark-primary-hover: "#FFC49D"
  dark-primary-active: "#E99A63"
  dark-primary-soft: "#3B2418"
  info: "#2357A6"
  info-soft: "#E5EEFF"
  dark-info: "#91B9FF"
  dark-info-soft: "#172A48"
  success: "#276749"
  success-soft: "#E2F2E9"
  dark-success: "#76D5A6"
  dark-success-soft: "#18372A"
  warning: "#805200"
  warning-soft: "#FFF0CC"
  dark-warning: "#F4C66D"
  dark-warning-soft: "#3A2D12"
  danger: "#A12A2A"
  danger-soft: "#FCE7E7"
  dark-danger: "#FF9994"
  dark-danger-soft: "#431F20"
  admin: "#5746A3"
  technician: "#805200"
  advisor: "#2357A6"
  reception: "#276749"
  super-admin: "#A12A2A"
  focus-light: "#005FCC"
  focus-dark: "#A9C7FF"
  overlay-light: "rgba(17, 21, 20, 0.42)"
  overlay-dark: "rgba(0, 0, 0, 0.68)"
typography:
  display-lg:
    fontFamily: "Sora, Arial, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  heading-xl:
    fontFamily: "Sora, Arial, sans-serif"
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  heading-lg:
    fontFamily: "Sora, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  heading-md:
    fontFamily: "Sora, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
  body-lg:
    fontFamily: "IBM Plex Sans, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: "IBM Plex Sans, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "IBM Plex Sans, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "IBM Plex Sans, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
  metadata:
    fontFamily: "IBM Plex Mono, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.025em"
  numeric:
    fontFamily: "IBM Plex Mono, Consolas, monospace"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  none: "0px"
  xs: "4px"
  sm: "7px"
  md: "11px"
  lg: "16px"
  xl: "22px"
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
  20: "80px"
components:
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
  primary-callout-light:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-active}"
    rounded: "{rounded.md}"
    padding: "16px"
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
  primary-callout-dark:
    backgroundColor: "{colors.dark-primary-soft}"
    textColor: "{colors.dark-primary}"
    rounded: "{rounded.md}"
    padding: "16px"
  button-destructive-light:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 18px"
  button-destructive-dark:
    backgroundColor: "{colors.dark-danger}"
    textColor: "#2A0908"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 18px"
  input-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: "46px"
    padding: "0 14px"
  input-dark:
    backgroundColor: "{colors.dark-surface-raised}"
    textColor: "{colors.dark-text}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: "46px"
    padding: "0 14px"
  card-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.md}"
    padding: "20px"
  card-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.md}"
    padding: "20px"
  app-shell-light:
    backgroundColor: "{colors.light-canvas}"
    textColor: "{colors.light-text}"
  raised-surface-light:
    backgroundColor: "{colors.light-surface-raised}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.md}"
  sunken-surface-light:
    backgroundColor: "{colors.light-surface-sunken}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.sm}"
  secondary-text-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text-muted}"
    typography: "{typography.body-sm}"
  divider-light:
    backgroundColor: "{colors.light-border}"
    height: "1px"
  divider-strong-light:
    backgroundColor: "{colors.light-border-strong}"
    height: "2px"
  app-shell-dark:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-text}"
  sunken-surface-dark:
    backgroundColor: "{colors.dark-surface-sunken}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.sm}"
  secondary-text-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text-muted}"
    typography: "{typography.body-sm}"
  divider-dark:
    backgroundColor: "{colors.dark-border}"
    height: "1px"
  divider-strong-dark:
    backgroundColor: "{colors.dark-border-strong}"
    height: "2px"
  status-info-light:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  status-info-dark:
    backgroundColor: "{colors.dark-info-soft}"
    textColor: "{colors.dark-info}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  status-success-light:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  status-success-dark:
    backgroundColor: "{colors.dark-success-soft}"
    textColor: "{colors.dark-success}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  status-warning-light:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  status-warning-dark:
    backgroundColor: "{colors.dark-warning-soft}"
    textColor: "{colors.dark-warning}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
  danger-callout-light:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "16px"
  danger-callout-dark:
    backgroundColor: "{colors.dark-danger-soft}"
    textColor: "{colors.dark-danger}"
    rounded: "{rounded.md}"
    padding: "16px"
  role-admin:
    backgroundColor: "{colors.light-surface-sunken}"
    textColor: "{colors.admin}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  role-technician:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.technician}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  role-advisor:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.advisor}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  role-reception:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.reception}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  role-super-admin:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.super-admin}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  focus-indicator-light:
    backgroundColor: "{colors.focus-light}"
    height: "2px"
  focus-indicator-dark:
    backgroundColor: "{colors.focus-dark}"
    height: "2px"
  modal-overlay-light:
    backgroundColor: "{colors.overlay-light}"
  modal-overlay-dark:
    backgroundColor: "{colors.overlay-dark}"
  touch-target:
    height: "44px"
    width: "44px"
---

## Overview

**Service Bay Atlas** treats the workshop as a coordinated field operation, not as a collection of admin dashboards. Its personality is calm, exact, tactile, and quietly premium. The visual metaphor is an atlas crossed with a professional diagnostic instrument: routes are explicit, evidence is organized, and every action has a known consequence.

The system must feel distinctive without becoming theatrical. Its signature comes from warm mineral neutrals, graphite surfaces, a restrained burnt-copper action color, technical micro-labels, and an editorial use of whitespace. Automotive cues should be structural—alignment marks, bay identifiers, timelines, inspection grids—not decorative photographs, tire textures, speedometers, carbon fiber, or racing stripes.

The product is used all day by workshop staff. Operational speed, error prevention, and confidence take priority over novelty. Innovation should appear in information architecture, adaptive workflows, and context-aware actions rather than visual spectacle.

The canonical workflow is immutable:

`Reception → Diagnosis → Approval → Approved → Repair → QC → Ready → Delivered`

## Colors

The light theme resembles a clean service ledger on warm mineral paper. It is not stark white: the canvas is warm gray, content surfaces are ivory, and sunken controls have enough contrast to remain visible in bright workshop environments.

The dark theme resembles a calibrated diagnostic console. It uses layered graphite-green surfaces instead of pure black. Borders and elevation remain visible without glows. It is a separately composed theme, not an inversion of the light palette.

Burnt copper is the brand action color. It signals intentional human action, never general decoration. In the dark theme it becomes a lighter amber-copper so interactive elements remain accessible. Blue is reserved for information and public communication, green for completion, amber for attention, and red only for errors or irreversible risk.

Role colors are small identifiers, never page backgrounds:

- RECEPTION: measured green.
- TECHNICIAN: workshop amber.
- ADVISOR: information blue.
- ADMIN: muted violet.
- SUPER_ADMIN: risk red.

Never communicate status by color alone. Pair color with text, iconography, position, and shape. Do not assign a new accent palette to each module.

## Typography

Sora gives headings a recognizable geometric voice without looking futuristic. IBM Plex Sans keeps dense operational copy readable; IBM Plex Mono is limited to job IDs, license plates, timestamps, measurements, stock quantities, and tabular currency.

Use sentence case. Avoid all-caps headings, except for short technical metadata labels of at most three words. Do not use emoji as section icons. Keep page titles compact and pair them with one practical sentence describing the task.

Numbers that users compare vertically must use tabular figures. Spanish is the primary mockup language, but layouts must tolerate English labels approximately 30% longer without clipping.

## Layout

Desktop uses a compact 224 px navigation rail, a slim contextual top bar, and a centered working canvas up to 1440 px. The shell should feel like a stable frame around changing tasks. Navigation shows only destinations permitted by the current role and always includes Help.

Use a 12-column desktop grid but avoid symmetrical card mosaics. Prefer an asymmetric operational composition: a dominant work area of 7–8 columns and a context rail of 4–5 columns for status, next action, history, or help. This creates a recognizable product rhythm and keeps the next decision visible.

On mobile, the work area becomes one column. Use a compact header and a bottom navigation with no more than four primary destinations plus “More”. Place the most important task action within thumb reach, but never cover content or keyboard input. Convert tables into ordered records with a consistent label/value grid, not unrelated cards.

Spacing follows a 4 px base. Default page gaps are 24 px on desktop and 16 px on mobile. Dense tables may use 8–12 px internally. Long forms are divided by meaningful section headings and progress, not by placing every group in a separate floating card.

Support 320 px through wide desktop without horizontal page scrolling. A horizontal table region may scroll only when preserving column comparison is essential and must announce that behavior accessibly.

## Elevation & Depth

Depth is quiet and structural. Most separation comes from surface tone and borders. Static cards do not lift on hover.

Light theme:

- Base card: `0 1px 2px rgba(29, 36, 35, 0.06)`.
- Floating menu: `0 10px 28px rgba(29, 36, 35, 0.14)`.
- Modal: `0 24px 64px rgba(29, 36, 35, 0.20)`.

Dark theme:

- Base surfaces use no shadow.
- Floating menu: `0 12px 32px rgba(0, 0, 0, 0.34)` plus a visible border.
- Modal: `0 28px 72px rgba(0, 0, 0, 0.52)` plus a strong border.

Do not use colored shadows, glow, persistent blur, glassmorphism, or elevation as decoration. A clickable row may shift its border or background; it should not jump vertically.

## Shapes

Shapes feel engineered but approachable. Controls use 7 px radii, work surfaces 11 px, and modals 16 px. Large 22 px radii are reserved for one high-level mobile sheet or onboarding surface, never ordinary cards. Pills are only for statuses, roles, compact filters, or counts.

Use 1 px borders for structure and 2 px outlines for focus or explicit selection. Icons use a consistent 1.75–2 px stroke and should be paired with labels unless their meaning is universal and an accessible name is present.

The workflow uses connected waypoints rather than a generic progress bar. Each of the eight steps has a short label and state marker. On mobile, show previous, current, and next steps plus “Step N of 8”; never hide every label.

## Components

### Application shell

The rail groups destinations by task, not by database entity. The header shows workshop, current role, contextual help, language, theme, and account controls. SUPER_ADMIN receives a visually separate global context so it cannot be confused with a workshop-scoped session.

### Buttons and actions

Every primary or risky action has a minimum 44×44 px target. Use one primary action per decision group. Secondary buttons are neutral; ghost buttons are for low-priority navigation. Loading preserves the button width and blocks duplicate submission.

Destructive operations are not interchangeable:

- **Revoke access:** reversible control, warning treatment.
- **Delete data:** destructive operational reset, explicit scope summary.
- **Delete workshop:** irreversible global deletion, isolated danger panel, typed confirmation, and exact target identity.

Never place these three actions as equivalent small buttons in one row.

### Forms

Labels remain visible above fields. Supporting text and errors appear below the relevant control. Read-only and disabled states are visually distinct. The current value, requirement, and recovery path must be understandable without relying on placeholder text.

Reception forms prioritize large touch targets, camera capture, upload progress, signature clarity, and save/retry confidence. Technician forms support gloves and interrupted work: checklists are spacious, evidence thumbnails are selectable, and the main action stays obvious. Advisor screens emphasize customer decision, quote total, public-link status, and next action.

### Work queues and records

Desktop queues use quiet tables with a sticky header where valuable. The first column carries vehicle/job identity; the final column carries the next action. Status, owner, age, and blockers should be scannable without opening a record.

Mobile queues become compact record sheets with one dominant action. Do not repeat every desktop column. Keep job identity, state, age, blocker, amount where relevant, and next action.

### Cards and metrics

Cards are neutral containers, not individually branded tiles. A metric contains label, value, timeframe, and optional trend; color is a small semantic marker. Empty states explain why the area is empty and offer one relevant action or help link.

### Modals and alerts

Dialogs require a semantic title, initial focus, focus containment, Escape support, focus restoration, and an explicit close control. Confirmation dialogs name the exact target and explain what changes and what remains. Errors include a recovery action whenever possible.

### Contextual help

`/help` is a role-filtered operational manual, not a documentation dump. It includes search, task index, canonical workflow, FAQs, common errors, recovery, and links back to permitted screens. Inline “How this works” links open the relevant help section without losing the user’s current task.

### Workflow treatment

Show all eight canonical states on desktop. Completed steps use a check and connecting line; the current step uses a filled waypoint and explicit “Current” label; future steps use outlined markers. Exceptions such as `QC fail → Repair` appear as a clearly labeled return path, not as a ninth canonical step.

### Interaction states

Specify and render default, hover, focus-visible, active, selected, disabled, read-only, loading, empty, success, warning, error, offline, and retry states in both themes. Focus rings must have at least 3:1 contrast against adjacent colors. Text and essential icons must meet WCAG AA.

Motion lasts 120–180 ms and clarifies cause and effect. Avoid autonomous movement, ping, pulse, parallax, large scale changes, or celebratory effects. Under `prefers-reduced-motion`, remove transforms, smooth scrolling, and nonessential animation while preserving state feedback.

## Do's and Don'ts

### Do

- Create one coherent system across all roles and routes.
- Make the current state and next safe action obvious within five seconds.
- Use asymmetric workbench layouts to distinguish the product from generic dashboards.
- Preserve operational density while giving decisions enough breathing room.
- Treat light and dark themes as independent, equally complete compositions.
- Show bilingual, realistic workshop content with anonymized customer data.
- Design desktop and 360 px mobile versions of every representative screen.
- Distinguish incomplete, blocked, failed, expired, offline, and empty states.
- Keep contextual help and recovery visible at moments of uncertainty.
- Preserve the canonical workflow and existing role permissions.

### Don't

- Do not create a marketing landing page or lifestyle automotive aesthetic.
- Do not use speedometers, tire tracks, carbon fiber, racing stripes, flames, neon, or decorative car silhouettes.
- Do not use glassmorphism, excessive gradients, colored glows, or pure-black canvases.
- Do not make every section a large rounded card.
- Do not recolor entire pages by role or module.
- Do not hide critical data to make the interface appear minimal.
- Do not use color as the only status indicator.
- Do not reduce the workflow to fewer than eight states.
- Do not place destructive actions beside routine actions with equal weight.
- Do not create touch targets smaller than 44×44 px.
- Do not invent new business rules, permissions, or workflow stages.

When exploring variations, preserve these rules but vary composition, navigation density, typography scale, and the balance between workbench and context rail. Generate at least one direction that feels unexpectedly editorial and one that feels more instrument-like, then explain which better supports speed, confidence, and error prevention in a real workshop.
