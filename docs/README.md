# SGA — Documentación del Proyecto

Este vault de Obsidian contiene toda la documentación persistente del proyecto SGA (Sistema de Gestión Automotriz). Está diseñado para que agentes de IA puedan leer estos archivos en lugar de re-investigar todo el código cada sesión.

## Estructura

- **Arquitectura/** — Decisiones técnicas, stack, estructura del proyecto
- **Seguridad/** — Políticas de seguridad, reglas de acceso, auditorías
- **Despliegue/** — SOPs de despliegue, checklists, configuración
- **mechanic-app/** — Flujo funcional, configuración SUPER_ADMIN e historial de correcciones
- **Manuales/** — Manuales humanos por rol, flujo completo, recuperación, operaciones destructivas y guía en inglés
- **Diseno/** — Auditorías visuales y sistema de diseño propuesto
- **AI-Handoff.md** — Estado corto y punto exacto de reanudación entre sesiones

## Cómo usar

Cuando inicies una nueva sesión con un agente de IA:
1. Leer `AGENTS.md` en la raíz.
2. Seguir sin alterar el orden obligatorio que enumera, empezando por `docs/AI-Handoff.md`.
3. Confirmar Git, Vercel y el proyecto Firebase real antes de actuar.

Si la documentación contradice el código o un deployment observado, registrar la evidencia y no asumir cuál es correcto.
