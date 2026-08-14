# Recuperación de acceso y operaciones destructivas

## Tres acciones que no son equivalentes

| Acción | Acceso | Datos operativos | Usuarios y roles | Configuración | Reversible |
|---|---|---|---|---|---|
| **Revocar acceso** | Se detiene al vencer el trial | Se conservan | Se conservan | Se conserva | Sí, extendiendo el trial |
| **Borrar datos** | Continúa | Se eliminan enlaces, OTs, inventario y movimientos | Se conservan | Se conserva | No |
| **Eliminar taller** | Se elimina | Se eliminan | Se eliminan cuentas Auth y perfiles | Se elimina | No |

### Cuándo usar cada una

- Usa **Revocar** para suspender temporalmente un taller sin destruir información.
- Usa **Borrar datos** solo para reiniciar la operación de un taller autorizado conservando su personal y configuración.
- Usa **Eliminar taller** para una baja contractual o administrativa definitiva y autorizada.

> [!CAUTION]
> Si no puedes explicar en una frase qué debe conservarse, no confirmes la acción.

## Otras acciones sensibles

### Eliminar empleado

Elimina una cuenta Auth y su perfil operativo. No borra el taller ni el historial de órdenes. Está bloqueado para la propia cuenta y para el último ADMIN.

### Eliminar ítem de inventario

Requiere ADMIN y Danger Mode. No es un sustituto de un movimiento de salida o ajuste.

### Regenerar enlace

No borra la orden. Invalida el secreto anterior y crea uno nuevo.

### Revocar enlace

No borra la orden. El portal devuelve el mismo 404 neutral que un enlace inexistente.

## Recuperar una contraseña

1. Abre `/login`.
2. Escribe el correo de la cuenta.
3. Pulsa **Olvidé mi contraseña**.
4. Revisa el correo y sigue el enlace oficial.
5. Vuelve a iniciar sesión.

La aplicación responde de forma neutral aunque la cuenta no exista. No solicites que soporte revele si un correo está registrado.

## Cuenta Auth sin perfil o perfil sin cuenta

Authentication y Firestore no se sincronizan solos.

1. No crees otra cuenta con el mismo correo.
2. ADMIN pulsa **Actualizar**; SUPER_ADMIN pulsa **Sincronizar**.
3. SUPER_ADMIN revisa el estado de reconciliación en modo lectura.
4. Confirma UID, correo, taller y evento previo.
5. Si fue una baja interrumpida, reintenta la misma baja.
6. Si el origen es desconocido, escala sin borrar ni reasignar.

## Trial vencido

Síntoma: aparece `/expired` y las rutas protegidas dejan de estar disponibles.

Solución:

1. confirma el ID del taller;
2. SUPER_ADMIN revisa la fecha;
3. si existe autorización, extiende +7d/+30d;
4. el usuario vuelve a iniciar sesión o recarga.

Revocar o vencer no borra datos.

## Sesión expirada durante QC o pago

La aplicación intenta renovar el token una vez. Si falla:

- muestra sesión expirada;
- conserva un borrador en la misma pestaña durante 30 minutos;
- ofrece volver al login con un destino interno seguro.

Después de autenticarte, revisa el estado actual antes de reenviar. Si otra sesión ya completó la acción, el formulario obsoleto se bloquea.

## Error de red o lista vacía inesperada

- Usa **Reconectar** en QC o Caja.
- Usa **Actualizar/Sincronizar** en usuarios o SUPER_ADMIN.
- Distingue “sin resultados” de un aviso de error.
- No recrees órdenes, pagos o cuentas hasta saber si la primera operación se confirmó.

## Conflicto al registrar un pago

Un 409 suele indicar que el saldo cambió o que una clave de reintento se reutilizó con otros datos.

1. conserva el comprobante;
2. actualiza la orden;
3. revisa abonos y saldo;
4. reintenta únicamente si el pago no aparece.

No dividas artificialmente el mismo pago para evitar el conflicto.

## Enlace público con 404

Puede significar cualquiera de estos casos:

- falta el token;
- token incorrecto o mal copiado;
- enlace vencido;
- enlace regenerado;
- enlace revocado;
- orden inexistente o taller sin acceso.

El portal no revela cuál. ADVISOR debe abrir la orden, verificar que siga en el flujo correcto y generar un enlace nuevo cuando corresponda.

## Errores de recepción

- **Firma demasiado grande:** limpiar y volver a firmar.
- **Más de cuatro fotos:** conservar solo evidencia necesaria.
- **Archivo inválido o demasiado grande:** volver a capturar o comprimir fuera de la app sin alterar la evidencia.
- **Falta taller operativo:** cerrar sesión y solicitar revisión del perfil; no crear la OT en otro tenant.

## Error al eliminar un taller o usuario

Las bajas coordinadas eliminan Authentication antes del perfil/datos.

1. no hagas borrados manuales en Firestore;
2. sincroniza y revisa la marca pendiente;
3. confirma el mismo UID o workshopId;
4. reintenta la misma operación;
5. si vuelve a fallar, escala con el mensaje, hora y objetivo exacto.

## Formato mínimo de un ticket de soporte

Incluye:

- ruta donde ocurrió;
- rol del usuario, sin contraseña;
- ID del taller y, si aplica, ID de la OT;
- hora y zona horaria;
- acción intentada;
- mensaje visible;
- si la operación aparece o no después de actualizar.

Nunca incluyas contraseñas, tokens de cotización, claves, valores de `.env`, cookies o capturas que expongan datos no necesarios.
