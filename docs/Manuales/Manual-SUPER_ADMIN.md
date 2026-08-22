# Manual del SUPER_ADMIN

> Rol global y único. No usar para pruebas rutinarias.
> Ruta principal: `/super-admin`

## 1. Responsabilidad del rol

SUPER_ADMIN administra talleres, accesos y trials a nivel global. Puede ver todos los tenants, pero no debe intervenir en la operación diaria de un taller salvo por soporte autorizado.

El rol se valida en el servidor. No se obtiene por usar un correo especial y no puede asignarse desde el navegador. La cuenta propia, cualquier perfil SUPER_ADMIN, `master-control` y los tenants reservados tienen protecciones adicionales frente al borrado.

Antes de cualquier acción:

1. Confirma el taller por su ID y nombre, no solo por el correo mostrado.
2. Empieza por **Sincronizar** y revisa la auditoría Auth + Firestore en modo lectura.
3. Si existe una diferencia, no fusiones identidades ni borres automáticamente.
4. Para una acción destructiva, registra quién la autorizó y qué debe conservarse.

## 2. Crear un taller y su primer ADMIN

En **Nuevo Taller + Admin**:

1. Escribe un ID único de 3 a 48 caracteres. Usa minúsculas, números y guiones; debe empezar y terminar con letra o número.
2. Escribe el nombre visible del taller.
3. Escribe el correo del primer ADMIN.
4. Crea una contraseña inicial de 12 a 128 caracteres.
5. Selecciona los días de trial.
6. Revisa nuevamente ID, correo y duración.
7. Pulsa **Crear Taller y Cuenta** una sola vez y espera el resultado.

La operación crea coordinadamente:

- la cuenta en Firebase Authentication;
- la configuración `settings/{workshopId}`;
- el perfil ADMIN `users/{uid}`.

Si el correo ya existe en Authentication o Firestore, la operación se detiene con conflicto. No intenta unir ni reemplazar cuentas.

Entrega la contraseña inicial por un canal privado. Pide al ADMIN que use **Olvidé mi contraseña** en `/login` para establecer una propia. La contraseña no se guarda en Firestore y nunca debe incluirse en documentación o tickets.

## 3. Leer el estado de un taller

Cada taller muestra:

- nombre e ID;
- estado y días restantes del trial;
- cantidad de OTs activas, si corresponde;
- estado de **Danger Mode**;
- ADMIN de referencia y número de perfiles asociados.

Expande los usuarios solo cuando necesites revisar roles o una incidencia. La auditoría global distingue:

| Estado | Significado | Acción recomendada |
|---|---|---|
| Consistente | Cuenta Auth, perfil y taller concuerdan | No intervenir |
| Solo Auth | Existe identidad, falta perfil | Investigar el origen antes de borrar |
| Solo Firestore | Existe perfil, falta cuenta Auth | Investigar una baja interrumpida; reintentar solo con evidencia |
| Taller inexistente | El perfil apunta a settings ausentes | Confirmar tenant y alcance; no reasignar automáticamente |

## 4. Trials y acceso

### Extender

- **+7d** o **+30d** extiende la expiración vigente.
- Si el trial ya venció, la extensión parte del momento actual.
- Extender no borra datos ni cambia usuarios.

### Revocar

**Revocar** hace vencer el acceso inmediatamente. Los perfiles, cuentas, configuración y datos permanecen. Es la opción correcta para detener temporalmente el uso sin destruir información.

Para restaurar el acceso, extiende el trial después de confirmar que el taller debe reactivarse.

## 5. Danger Mode

**Danger On** permite temporalmente que el ADMIN del taller vea y ejecute el restablecimiento de datos, y habilita la baja individual de inventario donde corresponde. No borra nada por sí solo.

Procedimiento seguro:

1. Confirma por escrito el taller y el objetivo del reset.
2. Activa **Danger On**.
3. Pide al ADMIN que ejecute la acción y confirme el resultado, o usa **Borrar Datos** con autorización explícita.
4. Verifica el resultado.
5. Vuelve a **Danger Off**.

No dejes Danger Mode activo como configuración normal.

## 6. Borrar datos operativos

**Borrar Datos** elimina de manera irreversible:

- enlaces públicos de cotización;
- órdenes de trabajo;
- inventario;
- movimientos de inventario.

Conserva:

- el taller y su configuración;
- cuentas de Firebase Authentication;
- perfiles y roles del personal;
- credenciales de acceso.

La operación es coordinada por servidor, usa lotes acotados y se puede reintentar si una respuesta se pierde. Un reintento sobre datos ya ausentes devuelve contadores en cero. Nunca interpretes eso como autorización para ejecutarla en otro taller.

## 7. Revocar un enlace público

La revocación normal de una cotización se hace desde Asesor. **Borrar Datos** también elimina todos los enlaces del taller, pero no debe usarse para revocar un solo enlace.

Al regenerar un enlace:

- el enlace anterior deja de funcionar inmediatamente;
- el nuevo caduca a los 30 días;
- el secreto permanece después de `#token=` y solo su hash se guarda en el servidor.

## 8. Gestionar usuarios globalmente

Usa la vista expandida del taller o la auditoría global solo cuando el ADMIN local no pueda resolver el caso.

- Cambiar roles no permite dejar al usuario sin rol.
- No se puede editar o borrar un perfil SUPER_ADMIN desde estas acciones.
- No se puede eliminar la cuenta que está ejecutando la operación.
- Eliminar un usuario borra primero su cuenta Auth y luego su perfil Firestore.
- Si la baja se interrumpe, reintentar con el mismo UID completa la operación; no recrees la cuenta para “arreglarla”.

## 9. Eliminar un taller

> [!CAUTION]
> **Eliminar taller** es una baja completa e irreversible. No equivale a revocar acceso ni a borrar datos operativos.

La operación:

1. elimina las cuentas Auth del taller;
2. elimina enlaces públicos;
3. elimina órdenes, inventario y movimientos;
4. elimina perfiles de usuarios;
5. elimina `settings` del taller.

Si alguna identidad Auth no puede eliminarse, el servidor conserva datos y settings con una marca pendiente para poder reintentar. No realices una limpieza manual parcial.

Lista de comprobación antes de confirmar:

- ID y nombre exactos del taller;
- autorización explícita del propietario;
- motivo y fecha de la baja;
- confirmación de que no se requiere exportar información;
- confirmación de que **Revocar** no sería suficiente;
- plan de verificación posterior.

## 10. Recuperación y escalamiento

- **El ADMIN olvidó la contraseña:** debe usar **Olvidé mi contraseña** con su correo.
- **El correo ya existe:** no crees otro taller con ese correo; revisa reconciliación.
- **El taller aparece vencido:** valida expiración y, si está autorizado, extiende el trial.
- **Una baja quedó pendiente:** sincroniza, identifica el UID/taller exacto y reintenta la misma operación.
- **Auth y Firestore no coinciden:** recopila evidencia de solo lectura y escala; no fusiones ni reasignes.
- **La propia cuenta SUPER_ADMIN falla:** usa el procedimiento administrativo auditado descrito en `docs/mechanic-app/Configuracion-SuperAdmin.md`; nunca crees una segunda cuenta por ensayo.

Consulta también [Recuperacion-y-Operaciones-Destructivas.md](./Recuperacion-y-Operaciones-Destructivas.md).
