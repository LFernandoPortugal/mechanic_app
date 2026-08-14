# Manual del dueño o ADMIN del taller

> El ADMIN controla únicamente su taller.
> Rutas principales: `/`, `/admin/settings`, `/admin/users`, `/analytics`, `/inventory`, `/clients`

## 1. Primer acceso

1. Abre `/login`.
2. Usa el correo y la contraseña inicial entregados por el responsable.
3. Usa **Olvidé mi contraseña** para establecer o recuperar una contraseña propia.
4. Comprueba el nombre del taller y tu rol antes de operar.

Si aparece **Período de Prueba Expirado**, contacta al responsable global. No crees otra cuenta ni otro taller para evitar la expiración.

## 2. Configurar el taller

En `/admin/settings` puedes mantener:

- nombre comercial o razón social;
- identificación fiscal;
- teléfono o WhatsApp;
- dirección;
- símbolo de moneda;
- nombre y tasa del impuesto;
- logotipo;
- modo demostración.

Revisa moneda e impuestos antes de emitir cotizaciones. Estos valores se muestran en reportes, cotizaciones y mensajes al cliente.

No puedes cambiar desde aquí la expiración, el estado deshabilitado o el permiso de borrado. Esos controles pertenecen a SUPER_ADMIN.

## 3. Gestionar empleados

En `/admin/users`:

### Crear

1. Escribe nombre, correo y contraseña temporal.
2. Usa una contraseña de al menos 12 caracteres.
3. Selecciona al menos un rol operativo.
4. Pulsa **Crear usuario** una sola vez y espera la confirmación.
5. Entrega la contraseña por un canal privado y pide al empleado restablecerla.

### Editar

- Puedes cambiar nombre y roles operativos.
- Un usuario puede tener varios roles.
- No puedes cambiar UID, correo o taller.
- No puedes crear ni modificar SUPER_ADMIN.
- El taller siempre debe conservar al menos un ADMIN.

### Eliminar

> [!WARNING]
> Eliminar un empleado revoca su cuenta de acceso y borra su perfil. No elimina las órdenes históricas donde actuó.

No puedes eliminarte a ti mismo ni eliminar al último ADMIN. Si la operación falla, pulsa **Actualizar**, verifica el estado y reintenta; no recrees de inmediato el mismo correo.

## 4. Supervisar la operación

El ADMIN puede entrar a todos los módulos del taller y cubrir ausencias, pero debe conservar los traspasos por rol:

1. Recepción registra datos, evidencias y firma.
2. Técnico diagnostica.
3. Asesor cotiza y envía el enlace.
4. Cliente aprueba o rechaza ítems.
5. Técnico repara.
6. Técnico o Asesor realiza QC según la organización del taller.
7. Asesor registra pagos y entrega.

Usa `/analytics` para revisar facturación, carga activa y distribución por estados. Usa `/clients` para consultar visitas y evidencia histórica dentro del mismo taller.

## 5. Inventario

En `/inventory` el ADMIN puede:

- crear repuestos o servicios;
- editar datos descriptivos y costos permitidos;
- registrar entradas, salidas y ajustes;
- consultar el historial inmutable de movimientos;
- eliminar un ítem solo cuando SUPER_ADMIN haya habilitado temporalmente Danger Mode.

Cada cambio de stock genera un movimiento auditado. No uses ajustes para ocultar una entrada o salida: describe el motivo real en las notas.

Los servicios con stock ilimitado no aceptan movimientos ficticios.

## 6. Cotizaciones y enlaces públicos

En `/advisor`:

1. Selecciona una orden en `Approval`.
2. Revisa el diagnóstico.
3. Asigna precio a los ítems y mano de obra.
4. Guarda la cotización.
5. Genera el enlace público.
6. Comprueba destinatario, vehículo, moneda y total antes de enviarlo.

El enlace vigente usa `/quote/view?id=JOB_ID#token=TOKEN`, caduca a los 30 días y sigue mostrando el progreso hasta `Delivered`.

- **Regenerar** crea un secreto nuevo e invalida el enlace anterior.
- **Revocar enlace público** impide nuevas lecturas sin borrar la orden.
- Los precios dejan de ser editables después de la aprobación del cliente.

Nunca pegues el token en documentación, tickets públicos o capturas compartidas.

## 7. QC y pagos

### QC

- La orden debe estar en `QC`.
- Para aprobar, confirma los cinco puntos y agrega notas cuando aporten contexto.
- Para rechazar, escribe un motivo concreto; la orden vuelve a `Repair`.
- Si la orden ya estaba pagada, aprobar QC puede cerrarla como `Delivered`.

### Pagos

- Revisa total aprobado, abonos y saldo actualizado.
- Registra monto, método y referencia cuando aplique.
- Un abono parcial no entrega la orden.
- Un pago solo entrega automáticamente cuando la orden ya está `Ready`.
- El efectivo puede superar el saldo para calcular vuelto; otros métodos no.

Si aparece un conflicto de saldo, actualiza y vuelve a revisar antes de reintentar. La API protege contra duplicados mediante una clave idempotente.

## 8. Borrar datos del taller

La zona de peligro solo aparece cuando SUPER_ADMIN activa `allowResetData`.

**Borrar datos** elimina enlaces públicos, órdenes, inventario y movimientos. Conserva configuración, cuentas y perfiles del personal. Para confirmar debes escribir `ELIMINAR`.

> [!CAUTION]
> No uses esta acción como limpieza cotidiana, para corregir una sola orden ni para revocar a un empleado. Solicita autorización, verifica el ID del taller y confirma qué información debe conservarse.

Después de un reset:

1. verifica que las colas operativas estén vacías;
2. verifica que el personal todavía pueda acceder;
3. pide a SUPER_ADMIN desactivar Danger Mode.

## 9. Problemas frecuentes

- **No puedo entrar a una ruta:** revisa tu rol y el estado del trial.
- **Usuario no registrado:** la cuenta Auth puede existir sin perfil; solicita revisión, no dupliques el correo.
- **La lista no carga:** usa **Actualizar** o **Reconectar** cuando esté disponible.
- **El enlace de cotización da 404:** puede faltar el token, estar vencido, regenerado o revocado. Genera uno nuevo desde la orden correcta.
- **QC o pago falló tras reautenticar:** vuelve por el destino indicado; el borrador de la misma pestaña se conserva hasta 30 minutos.
- **Inventario no permite borrar:** Danger Mode está apagado; no intentes borrar por otra vía.

Para más detalle consulta [Recuperacion-y-Operaciones-Destructivas.md](./Recuperacion-y-Operaciones-Destructivas.md).
