# Auditoría visual y sistema propuesto

> Estado: propuesta pendiente de aprobación; no se ha migrado ninguna ruta.
> Producción auditada: `https://mechanic-app-zeta.vercel.app/`, commit `280418a`.
> Fecha: 2026-08-14.

## Alcance y método

Se revisaron en producción, sin escribir datos, las rutas mínimas solicitadas:

`/`, `/login`, `/reception`, `/technician`, `/advisor`, `/quote/view`, `/qc`, `/advisor/payments`, `/inventory`, `/clients`, `/clients/detail`, `/admin/users`, `/admin/settings`, `/super-admin`, `/expired`, `/analytics` y `/help`.

La inspección cubrió:

- escritorio 1440×900;
- móvil 390×844;
- tema claro y oscuro;
- estructura semántica visible, overflow horizontal y consola;
- estados vacíos o de error disponibles sin crear datos;
- código de tokens, componentes compartidos y clases por página.

No se creó ni modificó ninguna OT, cuenta, taller, pago, movimiento, configuración, regla o enlace. La vista pública válida no se recorrió porque habría requerido un token/dato real; se auditó su estado neutral sin token y su implementación actual.

## Lo que ya funciona bien

- No se detectó overflow horizontal en las rutas y viewports recorridos.
- El header conserva objetivos táctiles de 44×44 px.
- Existe enlace de salto, foco visible global y zoom móvil permitido.
- Los modales de Inventario ya comparten semántica, trampa/restauración de foco y Escape.
- Técnico y Asesor tienen estados vacíos comprensibles y responsive.
- El tracker público expone el paso actual semánticamente.
- La preferencia de tema sobrevive a recargas.
- El flujo funcional y RBAC están bien aislados de la capa visual.

Estos comportamientos deben preservarse como regresiones obligatorias.

## Hallazgos globales

### 1. Los temas son extremos, no dos jerarquías completas

El claro usa fondo casi blanco con tarjetas blancas y bordes tenues; a distancia, controles, superficies y fondo se mezclan. El oscuro usa negro casi puro y tarjetas apenas más claras, por lo que el producto se siente como un “modo negro” con acentos brillantes, no como una jerarquía de superficies diseñada.

`globals.css` define tokens semánticos, pero muchas páginas los reemplazan con colores directos de Tailwind. La inspección encontró usos repetidos de emerald, cyan, blue, violet, purple, orange, amber, pink, red y zinc para títulos, fondos, bordes y acciones. El resultado es identidad por página en vez de identidad de producto.

### 2. “Glass” se aplica incluso a superficies no interactivas

`.glass-panel` agrega transparencia, blur, hover, cambio de borde y sombra a todas las cards. Una tarjeta de métricas, un formulario y un estado vacío reaccionan igual aunque no sean clicables. Esto debilita la señal de interacción y añade efectos que la dirección visual pide restringir.

### 3. La navegación depende de iconos y del dashboard

El header ofrece marca, accesos administrativos, idioma, tema y sesión, pero no una navegación principal persistente ni Ayuda. En móvil oculta nombre y rol; varios iconos quedan sin texto visible y el usuario debe volver a `/` para cambiar de módulo.

### 4. Jerarquía tipográfica inconsistente

Se mezclan títulos con pesos `800/900`, emojis, monospace, degradados y colores propios del módulo. Hay páginas con un `h1` claro, mientras `/login` usa otro nivel para el título principal y `/clients/detail` sin parámetros renderiza un encabezado vacío.

### 5. Controles y acciones críticas no comparten escala

Los primitivos base usan alturas de 36–40 px, mientras solo el header garantiza 44 px. En la auditoría móvil aparecieron objetivos visibles menores de 24 px y, en SUPER_ADMIN, acciones de 16 px. Las acciones `Danger`, `Revocar`, `Borrar datos` y `Eliminar` comparten una fila de botones muy pequeños y diferencias visuales insuficientes para su impacto.

### 6. El workflow explica seis estaciones para ocho estados

El componente actual agrupa el flujo en seis nodos y oculta etiquetas en móvil. Usa gradientes, glow, `animate-ping` y `animate-pulse`. Ayuda a orientar, pero hace menos explícita la diferencia entre `Approval` y `Approved`, y entre `Ready` y `Delivered`.

### 7. Animación sin política única

Varias rutas usan `animate-pulse`, `animate-ping`, spinners y transformaciones hover. No existe una capa global que retire movimiento no esencial con `prefers-reduced-motion`.

### 8. El bilingüismo no es completo

Aunque existe `LanguageContext`, siguen apareciendo textos españoles directos en Configuración, SUPER_ADMIN, QC, Caja y errores. La ayuda debe partir de contenido estructurado ES/EN y la migración debe retirar copy directo por componente.

## Hallazgos por ruta

| Ruta | Evidencia visual/UX | Prioridad para la migración |
|---|---|---|
| `/` | Grid de tarjetas legible, pero cada módulo usa un color distinto y no hay prioridad, progreso ni acceso a ayuda | Alta: AppShell y navegación |
| `/login` | Formulario claro y responsive; exceso de vacío en escritorio y título principal sin `h1` | Alta: primera impresión y recuperación |
| `/reception` | Formulario completo y usable; demasiadas cards, workflow brillante y recorrido vertical muy largo | Alta: plantilla de formularios |
| `/technician` | Estado vacío sólido, pero usa vocabulario visual aislado naranja/gradiente | Media: convertir a patrón compartido |
| `/advisor` | Estado vacío sólido; módulo morado/azul separado de identidad global | Alta: cotización y enlace son críticos |
| `/quote/view` | 404 neutral correcto, pero demasiado vacío y dependiente de color; falta acceso a ayuda contextual | Alta: superficie pública y tracker |
| `/qc` | Arquitectura de lista + workbench útil; rosa dominante, densidad desigual y títulos apretados en móvil | Alta: operación crítica |
| `/advisor/payments` | Métricas y card central claras; cian propio y grandes espacios vacíos | Alta: operación crítica |
| `/inventory` | Métricas y filtros responden bien; el claro mezcla filtros con fondo y el oscuro pierde separación | Media |
| `/clients` | Buena estructura; cards vacías demasiado altas y acento cian distinto | Media |
| `/clients/detail` | Sin parámetros muestra un cliente anónimo con valores cero y `h1` vacío | Alta: estado inválido explícito |
| `/admin/users` | Alta/edición/baja están juntas; acciones destructivas son sutiles y falta navegación contextual | Alta |
| `/admin/settings` | Formulario razonable; textos duros en español y danger zone con fondos específicos de oscuro | Alta |
| `/super-admin` | Mucha capacidad en poco espacio; acciones destructivas pequeñas, equivalentes y sin agrupación por riesgo | Máxima |
| `/expired` | Mensaje comprensible; jerarquía aislada y soporte/datos de cuenta deben minimizarse | Media |
| `/analytics` | Escaneable; emojis, monospace y cuatro acentos compiten con los datos | Media |
| `/help` | 404. En claro, el error estándar queda casi ilegible sobre el fondo heredado | Bloqueante para este proyecto |

## Dirección visual: “Precision Workshop”

La propuesta combina una base de producto SaaS sobria con señales propias de un taller: precisión, estado operativo, trazabilidad y seguridad. La identidad se apoya en verde petróleo, neutros ligeramente verdosos y tipografía limpia; los colores secundarios se reservan para significado, no para decorar cada módulo.

Principios:

1. **Una marca, muchos roles:** el producto permanece verde petróleo; roles y estados aparecen en badges y marcadores, no recolorean páginas completas.
2. **Superficie antes que efecto:** fondo, canvas, card y superficie elevada tienen niveles claros sin depender de blur o glow.
3. **Acción por jerarquía:** un CTA primario por grupo; secundarias neutras; destructivas separadas y con confirmación contextual.
4. **Taller primero en móvil:** targets mínimos de 44 px, acciones persistentes cuando aporten, formularios de una columna y estado actual siempre visible.
5. **Color + texto + forma:** ningún estado se comunica solo por color.

## Paleta semántica propuesta

Los contrastes indicados son WCAG contra su superficie principal. Se validarán también combinaciones hover, focus, disabled y estados durante la implementación.

### Tema claro

| Token | Valor | Uso | Contraste relevante |
|---|---:|---|---:|
| Canvas | `#F4F7F6` | fondo de aplicación | — |
| Surface 1 | `#FFFFFF` | cards y formularios | — |
| Surface 2 | `#EDF2F0` | agrupaciones y filtros | — |
| Surface 3 | `#E4ECE8` | selected/pressed neutro | — |
| Foreground | `#10201B` | texto principal | 15.65:1 sobre Canvas |
| Muted | `#52645E` | texto secundario | 5.83:1 sobre Canvas; 6.28:1 sobre Surface 1 |
| Border | `#CBD8D3` | separación estructural | — |
| Primary | `#006B57` | CTA y foco de marca | 6.48:1 con blanco |
| Info | `#175CD3` | información/Advisor | 5.99:1 con blanco |
| Warning | `#8A4B00` | atención/Technician | 6.80:1 con blanco |
| Danger | `#B42318` | acción destructiva | 6.57:1 con blanco |

### Tema oscuro

| Token | Valor | Uso | Contraste relevante |
|---|---:|---|---:|
| Canvas | `#0C1210` | fondo de aplicación | — |
| Surface 1 | `#121A17` | cards y formularios | — |
| Surface 2 | `#17221E` | agrupaciones y filtros | — |
| Surface 3 | `#1D2B26` | selected/pressed neutro | — |
| Foreground | `#F2F7F5` | texto principal | 17.48:1 sobre Canvas |
| Muted | `#AEBEB8` | texto secundario | 9.78:1 sobre Canvas; 9.16:1 sobre Surface 1 |
| Border | `#30403A` | separación estructural | — |
| Primary | `#46D6B0` | CTA y foco de marca | 10.37:1 con Canvas |
| Info | `#84ADFF` | información/Advisor | 8.47:1 con Canvas |
| Warning | `#FFC46B` | atención/Technician | 12.04:1 con Canvas |
| Danger | `#FF8A80` | error y riesgo | 8.29:1 con Canvas |

El texto sobre un botón Primary oscuro usará `#0C1210` (10.37:1), no blanco.

## Tipografía

- **Geist Sans:** interfaz, títulos y contenido. Se conserva para evitar una dependencia nueva.
- **Geist Mono:** IDs, placas, importes tabulares y datos técnicos; nunca párrafos completos.
- Escala: 12 (solo metadato no esencial), 14, 16 base, 20, 24, 32 y 40.
- Pesos: 400 texto, 500 controles/subtítulos, 600 títulos; 700 solo hero o cifra clave.
- Una única convención de `h1` por página y títulos sin emojis decorativos.

## Espaciado, radios, bordes y elevación

- Escala base: 4, 8, 12, 16, 24, 32, 48 y 64 px.
- Control: radio 8 px.
- Card: 12 px.
- Modal/panel principal: 16 px.
- Pill solo para estado corto, filtro o badge; no para toda acción.
- Borde estándar de 1 px; 2 px solo para foco o selección.
- Claro: sombra de card `0 1px 2px rgba(16,32,27,.06)` y elevada `0 12px 32px rgba(16,32,27,.12)`.
- Oscuro: jerarquía por superficie y borde; sombra elevada `0 16px 36px rgba(0,0,0,.28)` sin glow de color.

## Componentes

### AppShell y navegación

- Desktop: rail lateral compacto con módulos permitidos por rol; header con taller, búsqueda/ayuda, idioma, tema y menú de cuenta.
- Móvil: header simple + navegación inferior de hasta cuatro destinos prioritarios y menú **Más**.
- Ayuda siempre visible y contextual: enlace general en el shell, y enlace “Cómo funciona” en formularios o estados críticos.

### Botones

- Altura mínima 44 px; icon-only 44×44.
- Primary: una acción principal por grupo.
- Secondary/outline: acciones reversibles.
- Ghost: navegación de baja prioridad.
- Destructive: rojo semántico, separado espacialmente y con descripción de alcance.
- Estados obligatorios: default, hover, focus-visible, active, disabled, loading, error/success posterior.

### Formularios

- Labels siempre visibles; ayuda y error bajo el campo.
- Altura 44–48 px; áreas de texto con resize vertical.
- Secciones largas usan encabezado, descripción y progreso; no una colección de cards iguales.
- El estado `readonly` se distingue de `disabled`.
- Autofill debe conservar colores de cada tema.

### Cards y tablas

- Card neutral sin hover por defecto.
- Solo una card clicable recibe hover y cursor.
- Métricas usan label, valor y contexto; el color queda en un pequeño indicador.
- Desktop usa tabla tranquila con filas de 48–56 px; móvil usa cards de datos con acciones de ancho completo.
- Skeletons respetan la estructura final y no muestran spinners aislados durante cargas prolongadas.

### Modales y confirmaciones

- Conservan el `AccessibleModal` existente.
- Título, impacto, objetivo exacto y alternativa reversible.
- El CTA destructivo nunca comparte color/posición con Cancelar.
- Bajas de taller muestran una lista explícita de lo que se elimina y lo que se conserva.

### Estados y roles

| Significado | Claro | Oscuro | Uso |
|---|---|---|---|
| Success / Reception | verde petróleo | menta | completado, recepción |
| Info / Advisor | azul | azul claro | cotización, datos informativos |
| Warning / Technician | ámbar oscuro | ámbar claro | atención técnica |
| Danger / SUPER_ADMIN | rojo oscuro | coral | error, baja y riesgo global |
| ADMIN | violeta oscuro sobre tinte suave | lavanda | badge de rol, no página completa |

### Workflow

Desktop muestra los ocho estados canónicos. Móvil muestra:

- estado actual y propietario;
- “paso N de 8”;
- barra de progreso neutral;
- paso anterior completado y siguiente esperado.

Los pasos completados usan check, el actual un marcador sólido y los futuros un contorno. `QC fail → Repair` se representa como excepción con texto, no cambiando el flujo base.

## Estados interactivos y movimiento

- Hover modifica una sola propiedad principal (fondo o borde), sin levantar todas las superficies.
- Focus visible de 2 px con offset y contraste mínimo 3:1.
- Active reduce elevación o cambia Surface 3.
- Disabled conserva legibilidad y explica el requisito cuando sea importante.
- Error/success/warning incluyen icono y texto.
- Loading conserva ancho, añade spinner discreto y bloquea duplicados.
- Transiciones de 120–180 ms para color/transform.
- `prefers-reduced-motion: reduce` elimina ping, pulse, desplazamientos y smooth scrolling no esencial.

## Arquitectura de ayuda propuesta

`/help` usará contenido estructurado y filtrado por permisos:

- SUPER_ADMIN: guía global, trials, reconciliación y bajas.
- ADMIN: configuración, empleados, operación, inventario y reset.
- RECEPTION: recepción, evidencia y firma.
- TECHNICIAN: diagnóstico, reparación y QC.
- ADVISOR: cotización, enlace público, QC, pagos, inventario/cliente de solo lectura.

La página tendrá búsqueda local, índice, workflow, preguntas frecuentes y enlaces a las rutas permitidas. Un usuario con varios roles verá la unión de sus secciones, sin contenido de mayor privilegio. El contenido público de `/quote/view` no expondrá manuales internos.

## Estrategia de implementación después de aprobar

1. Crear tokens semánticos claros/oscuros, motion policy y pruebas de contraste.
2. Crear AppShell, PageHeader, ActionBar, StatusBadge, EmptyState, DataCard, Field y ConfirmDialog.
3. Implementar `/help` ES/EN con filtro por roles, búsqueda, índice y pruebas de RBAC.
4. Migrar primero `/`, `/login`, `/help` y Header como referencia.
5. Migrar flujo crítico: Reception, Technician, Advisor, portal, QC y Payments.
6. Migrar Inventario, Clientes, Usuarios, Settings, SUPER_ADMIN, Expired y Analytics.
7. Añadir enlaces contextuales y retirar copy directo no localizado.
8. Ejecutar comparación antes/después, axe/teclado, 390×844 y 1440×900 en ambos temas.
9. Ejecutar TypeScript, lint, unitarias, integración/Rules si corresponden, E2E y build.
10. Abrir PR, esperar CI y Vercel Preview; no fusionar hasta revisión humana.

## Criterios de aceptación

- Cero rutas con overflow horizontal a 320, 390 y 1440 px.
- Targets táctiles de 44 px para acciones principales y de riesgo.
- Todos los pares de texto/fondo y estados cumplen WCAG AA.
- Navegación y ayuda muestran solo destinos permitidos por rol.
- Todo copy nuevo existe en español e inglés.
- Flujo canónico y reglas de negocio permanecen sin cambios.
- Ninguna acción destructiva se parece visualmente a una acción rutinaria.
- Movimiento reducido se respeta.
- Gates locales, CI y Vercel Preview pasan antes de proponer merge.

## Estado de implementación — 2026-08-21

La dirección Precision Blue se migró progresivamente a todas las rutas enumeradas en esta auditoría. El resultado centraliza jerarquía de superficies, navegación responsive, métricas, formularios, tablas/tarjetas, estados del workflow y acciones destructivas. El vidrio decorativo heredado quedó neutralizado en favor de superficies sólidas; verde se reserva principalmente para éxito, ámbar para advertencia y rojo para error o destrucción.

La validación automatizada genera una matriz visual desktop 1440×1000 y móvil 390×844 en claro y oscuro para las rutas autenticadas, más estados públicos de login, cotización inválida, trial expirado y vistas SUPER_ADMIN. Las capturas sólo se toman después de que la autenticación, el shell y el tema hayan terminado de hidratar. Esta implementación permanece en una rama Preview y requiere revisión humana antes de cualquier merge.
