# Instrucciones por rol operativo

## RECEPTION — Recepción

> Ruta: `/reception`
> Objetivo: crear una OT completa y transferir la custodia del vehículo al taller.

### Antes de empezar

- Confirma que estás trabajando en el taller correcto.
- Pide al cliente datos de contacto y autorización para registrar evidencia.
- Revisa daños previos antes de mover el vehículo.

### Registrar la recepción

1. Escribe placa y marca; son obligatorias.
2. Completa VIN, modelo, color y tipo de vehículo cuando estén disponibles.
3. Registra nombre del cliente; agrega teléfono y correo para notificaciones.
4. Anota odómetro, combustible y síntomas con las palabras del cliente.
5. Revisa fluidos y pertenencias.
6. Adjunta hasta cuatro fotos de daños previos. La app rechaza archivos que no sean imágenes, originales mayores de 15 MB o evidencia que no pueda comprimirse con seguridad.
7. Explica la transferencia de responsabilidad.
8. Pide al cliente firmar y confirma que la firma sea visible.
9. Pulsa el registro una sola vez y espera la confirmación.

La orden nace en `Reception`. Al abrirla en Técnico pasa a `Diagnosis` y queda asignada al actor que la tomó.

### Buenas prácticas

- No inventes correos para completar el formulario.
- Describe objetos de valor de forma concreta.
- Si la firma o una foto se rechaza por tamaño, vuelve a capturarla; no recargues archivos repetidamente.
- No uses datos reales en modo demostración o pruebas de desarrollo.

## TECHNICIAN — Técnico

> Rutas: `/technician` y `/qc`
> Objetivo: diagnosticar, reparar y documentar evidencia técnica.

### Diagnóstico

1. Selecciona una orden recibida.
2. Confirma vehículo, síntomas y evidencia de ingreso.
3. Registra al menos un punto de inspección.
4. Para cada punto elige el estado correcto: pasa, falla, crítico o recomendado.
5. Agrega notas y evidencia útil; evita frases vagas como “revisar”.
6. Envía el diagnóstico a cotización. La orden pasa a `Approval`.

No es posible enviar un diagnóstico vacío.

### Reparación

1. Cuando el cliente apruebe, selecciona la orden `Approved`.
2. Pulsa **Iniciar reparación**; la orden pasa a `Repair`.
3. Trabaja únicamente los ítems aprobados. Los rechazados permanecen documentados.
4. Registra observaciones relevantes.
5. Al terminar, pulsa **Enviar a QC**.

### Participar en QC

El rol TECHNICIAN puede abrir `/qc`. No apruebes tu propio trabajo si el procedimiento del taller exige separación de funciones.

- Una aprobación requiere los cinco controles.
- Un rechazo exige motivo y devuelve la orden a `Repair`.
- Completar el pago antes de QC no permite saltar el checklist.

## ADVISOR — Asesor

> Rutas: `/advisor`, `/advisor/payments`, `/qc`, `/inventory`, `/clients`
> Objetivo: cotizar, comunicar, controlar el cierre y cobrar.

### Preparar la cotización

1. Abre una orden en `Approval`.
2. Revisa cada hallazgo técnico.
3. Asigna precios y mano de obra.
4. Verifica símbolo de moneda, impuesto y total.
5. Guarda la cotización y genera el enlace seguro.
6. Verifica destinatario y vehículo antes de usar WhatsApp o correo.

Los precios solo son editables mientras la orden está en `Approval`.

### Administrar el enlace

- El enlace caduca a los 30 días.
- **Regenerar** invalida el enlace anterior.
- **Revocar** bloquea el acceso sin borrar la orden.
- Un enlace sin token, incorrecto, vencido o revocado muestra el mismo 404 neutral.
- El token debe permanecer en el fragmento `#token=`.

### Después de la decisión del cliente

El cliente puede aprobar todos, algunos o ningún ítem cotizado. La app conserva `declinedItems`, la firma de aprobación y el monto aprobado. No reemplaces ese monto con la suma de pagos.

### QC

ADVISOR puede ejecutar control de calidad cuando así lo define el taller:

1. selecciona una orden `QC`;
2. completa los cinco controles;
3. aprueba, o rechaza con motivo;
4. si la orden cambió por otra sesión, revisa el aviso y no envíes un formulario obsoleto.

### Pagos y entrega

1. Abre `/advisor/payments`.
2. Selecciona la orden.
3. Revisa total aprobado, total pagado y saldo.
4. Escribe monto, método y referencia.
5. Confirma una sola vez.

- Los abonos parciales se conservan sin cambiar el monto aprobado.
- Efectivo puede registrar vuelto; otros métodos no pueden superar el saldo.
- La orden pasa de `Ready` a `Delivered` cuando el saldo llega a cero.
- Si el saldo llega a cero durante `QC`, la entrega espera la aprobación de QC.

### Inventario y clientes

ADVISOR puede consultar inventario y clientes, pero no modificar stock. Usa el historial de clientes para entender visitas anteriores; no copies evidencia privada fuera de la operación autorizada.

## Si una persona tiene varios roles

La aplicación permite varias funciones en un mismo perfil. Cambia de módulo según la tarea y conserva los mismos controles:

- no saltes estados;
- no apruebes ítems en nombre del cliente;
- no registres un pago sin confirmación real;
- no uses permisos de ADMIN para ocultar un traspaso operativo.
