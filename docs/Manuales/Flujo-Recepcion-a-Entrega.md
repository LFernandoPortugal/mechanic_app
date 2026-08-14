# Flujo completo: recepción hasta entrega

```text
Reception → Diagnosis → Approval → Approved → Repair → QC → Ready → Delivered
```

## Vista rápida

| Estado | Responsable principal | Entrada | Salida correcta |
|---|---|---|---|
| `Reception` | RECEPTION / ADMIN | Cliente y vehículo llegan | OT con evidencia y firma |
| `Diagnosis` | TECHNICIAN / ADMIN | OT recibida | Inspección con al menos un hallazgo |
| `Approval` | ADVISOR / ADMIN | Diagnóstico terminado | Cotización y enlace enviados |
| `Approved` | Cliente | Enlace válido | Decisiones y firma de aprobación |
| `Repair` | TECHNICIAN / ADMIN | Ítems aprobados | Trabajo terminado y enviado a QC |
| `QC` | TECHNICIAN / ADVISOR / ADMIN | Reparación terminada | Pass a Ready/Delivered o fail a Repair |
| `Ready` | Sistema | QC aprobado y saldo pendiente | Pago completado |
| `Delivered` | Sistema | QC aprobado y saldo cero | Cierre final |

## 1. Reception

Recepción registra vehículo, cliente, síntomas, odómetro, combustible, fluidos, pertenencias, hasta cuatro fotos y firma de recepción. Esta firma acredita el ingreso; no es la aprobación de la cotización.

Control de salida:

- placa, marca y cliente presentes;
- firma confirmada;
- fotos legibles y pertinentes;
- taller y actor correctos.

## 2. Diagnosis

Al seleccionar la OT, Técnico toma el trabajo y documenta la inspección. Cada hallazgo debe tener estado y notas suficientes para que Asesor y cliente entiendan la necesidad.

Una inspección vacía no puede avanzar.

## 3. Approval

Asesor asigna precios por ítem y mano de obra. `totalEstimate` representa lo cotizado. Al generar el enlace, la API crea un token aleatorio; el navegador recibe el secreto y el servidor guarda solo su hash.

Antes de enviar:

- confirma moneda e impuesto;
- confirma teléfono/correo;
- confirma vehículo y total;
- no compartas el enlace fuera del cliente autorizado.

## 4. Approved

El cliente abre `/quote/view?id=JOB_ID#token=TOKEN`, selecciona ítems y firma. La firma de aprobación es distinta de la firma de recepción.

El servidor:

- valida que las decisiones correspondan a ítems cotizados;
- recalcula `approvedAmount`;
- guarda `declinedItems`;
- registra `approvedAt` y auditoría;
- cambia a `Approved`.

Un monto aprobado de cero puede ser válido si el cliente rechazó todo. No lo cambies manualmente.

## 5. Repair

Técnico inicia reparación y trabaja los ítems aprobados. Los rechazados quedan como evidencia de alcance. Al terminar, envía la misma OT a `QC`.

## 6. QC

QC comprueba cinco puntos. Hay dos salidas:

- **Pass:** `Ready` si queda saldo, o `Delivered` si el saldo ya era cero.
- **Fail:** vuelve a `Repair` con motivo obligatorio.

No se puede cambiar directamente desde Firestore para omitir QC. Los reintentos usan una clave idempotente y no deben duplicar auditoría.

## 7. Ready

La reparación está aprobada por QC y la entrega espera completar el cobro. Asesor registra abonos contra el monto aprobado.

## 8. Delivered

La orden llega a `Delivered` cuando QC está aprobado y el saldo es cero. Un pago durante `QC` no entrega hasta aprobar el checklist.

## Pagos

- `approvedAmount`: monto autorizado por el cliente.
- `totalEstimate`: monto originalmente cotizado.
- `payments[]`: abonos confirmados.
- saldo: monto aprobado menos abonos.

Un pago parcial no cambia el estado. El servidor rechaza montos inválidos, sobrepagos no efectivos, saldos observados obsoletos y reintentos incompatibles.

## Enlaces públicos

- Caducan a los 30 días.
- Regenerar invalida el anterior.
- Revocar elimina el acceso.
- Permanecen útiles para ver el tracker después de aprobar.
- No muestran datos personales, firmas, pagos, auditoría ni IDs internos.

## Variantes permitidas

- Aprobación parcial: se reparan solo ítems aprobados.
- Rechazo total: `approvedAmount` puede ser cero.
- QC rechazado: vuelve a `Repair` y luego regresa a `QC`.
- Pago completo antes de QC: permanece en `QC`; al aprobar pasa a `Delivered`.
- Pago parcial después de QC: permanece en `Ready` hasta completar.

## Variantes no permitidas

- `Approval` directo a `Ready`.
- `Repair` directo a `Delivered`.
- editar precios después de `Approved`.
- reemplazar el monto aprobado con pagos.
- usar la firma de recepción como aprobación.
- registrar pagos directamente en Firestore.
- aprobar o rechazar QC mediante una escritura cliente directa.
