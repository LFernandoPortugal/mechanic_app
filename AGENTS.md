# Guía para agentes de IA

Estas instrucciones aplican a todo el repositorio. Antes de modificar código, datos o infraestructura, entiende primero el flujo real y confirma qué rama y entorno están en alcance.

## Lectura obligatoria

Lee estos archivos en este orden:

1. `docs/AI-Handoff.md` — arquitectura, despliegue y estado general.
2. `docs/mechanic-app/Flujo-de-Trabajo.md` — flujo funcional de una orden.
3. `docs/mechanic-app/Bugs-y-Correcciones.md` — decisiones y correcciones conocidas.
4. `docs/Arquitectura/overview.md` — mapa técnico.
5. `docs/Seguridad/politica-acceso.md` — roles y límites de acceso.
6. `docs/Despliegue/checklist.md` — comprobaciones de release.

Si la documentación contradice el código o el despliegue observado, no adivines: registra la contradicción, usa evidencia reproducible y pide confirmación antes de cambiar el comportamiento.

## Arquitectura y despliegue

- La aplicación web es Next.js y vive en `web/`.
- El hosting oficial es Vercel. No uses Firebase Hosting ni presentes `firebase deploy` como despliegue completo de la aplicación.
- Firebase se usa para Auth, Firestore y Storage. Los despliegues de Firebase deben limitarse al recurso solicitado (por ejemplo, reglas o índices) y ejecutarse desde `web/`.
- Antes de cualquier operación Firebase, comprueba `web/.firebaserc`; el proyecto esperado actualmente es `mechanic-app-7d459`. No continúes si las credenciales activas apuntan a otro proyecto.
- `main` es la rama oficial que alimenta producción en Vercel. Las ramas de funcionalidades o diseño son previews/no oficiales hasta que se integren.
- Antes de afirmar qué versión está desplegada, comprueba la rama actual, `HEAD`, `origin/main` y, cuando sea relevante, la interfaz o metadata del despliegue en Vercel. No asumas que el árbol de trabajo local coincide con producción.

## Flujo funcional canónico

La orden de trabajo sigue:

`Reception -> Diagnosis -> Approval -> Approved -> Repair -> QC -> Ready -> Delivered`

- Recepción crea la orden y registra vehículo/cliente.
- Técnico diagnostica y documenta la inspección.
- Asesor prepara la cotización y la envía al portal público.
- El cliente aprueba o rechaza ítems.
- Taller repara, QC valida y caja registra pagos/entrega.
- El enlace público vigente usa `/quote/view?id=JOB_ID#token=TOKEN`; el token permanece en el fragmento y el portal lo envía a la API mediante `X-Quote-Token`.

## Seguridad y datos

- Nunca muestres ni confirmes valores de `.env.local`, contraseñas, tokens, claves de servicio o credenciales temporales.
- No borres ni resetees talleres, usuarios, órdenes, inventario o datos globales sin autorización explícita y una comprobación previa del objetivo exacto.
- No uses la cuenta única de superadministrador para pruebas rutinarias. Prefiere una cuenta descartable con el rol mínimo.
- Distingue Firebase Authentication de los documentos `users` de Firestore y de `settings`: borrar o recrear uno no sincroniza automáticamente los demás.
- En producción, empieza las pruebas en modo lectura. Antes de crear órdenes, pagos, movimientos de stock o usuarios, confirma que se permite escribir datos de prueba y cómo se limpiarán.
- Conserva los cambios ajenos del árbol de trabajo y evita operaciones Git destructivas.

## Forma de trabajo

- Una solicitud de análisis o diagnóstico no autoriza cambios funcionales, despliegues ni modificaciones de datos.
- Para cambios, implementa lo mínimo necesario y verifica en proporción al riesgo.
- Ejecuta los comandos web desde `web/`. En Windows usa `npm.cmd`/`npx.cmd` cuando corresponda.
- Comprobación mínima de código: `npx.cmd tsc --noEmit --incremental false`, `npm.cmd run lint` y `npm.cmd run build`.
- El repositorio incluye pruebas unitarias y de reglas de Firestore; amplíalas cuando cambien los flujos críticos y no describas una validación manual o un build correcto como cobertura completa.
- Si cambia el flujo, la arquitectura o el despliegue, actualiza también la documentación correspondiente cuando el usuario lo haya pedido.
