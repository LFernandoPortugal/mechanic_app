# Flujo de Trabajo — SGA Mechanic App

> Actualizado: 2026-08-08 (auditoría de seguridad e integridad)

## Flujo Completo de una Orden de Trabajo

```
Reception → Diagnosis → Approval → Approved → Repair → QC → Ready → Delivered
```

### Descripción de cada estado

| Estado | Quién actúa | Qué sucede |
|--------|-------------|------------|
| `Reception` | RECEPTION / ADMIN | Se registra el vehículo, fluidos, valuables, firma del cliente y fotos de daños previos |
| `Diagnosis` | TECHNICIAN / ADMIN | El técnico inspecciona el vehículo y registra items (Pass/Fail/Critical/Recommended) |
| `Approval` | ADVISOR / ADMIN | El asesor construye la cotización: precios por item + mano de obra. Genera link y lo envía al cliente |
| `Approved` | **Cliente** (`/quote/view?id=JOB_ID`) | Selecciona ítems, firma y acepta. El servidor calcula `approvedAmount`, `declinedItems` y `approvedAt` |
| `Repair` | TECHNICIAN / ADMIN | El técnico inicia la reparación. Al terminar pulsa "Enviar a QC" |
| `QC` | TECHNICIAN / ADVISOR / ADMIN | Inspector verifica 5 puntos del checklist. Puede aprobar (→ Ready) o rechazar (→ Repair) |
| `Ready` | Sistema automático | Trabajo aprobado por QC, pendiente de cobro. El Advisor gestiona el pago |
| `Delivered` | Sistema automático | Pago completado. Vehículo entregado |

## Notas importantes

- **`approvedAmount`**: es el monto que el **cliente aprobó** en el portal. No se debe sobreescribir con pagos acumulados.
- **`totalEstimate`**: es el monto cotizado por el Asesor.
- **`payments[]`**: array de abonos registrados por `/api/jobs/[id]/payments`; el actor e importe se validan server-side.
- El status pasa a `Delivered` automáticamente cuando `sum(payments) >= approvedAmount` y el job está en `Ready` o `QC`.

## Reglas de negocio clave

1. Los precios de items **solo son editables** cuando `status === "Approval"` (antes de que el cliente apruebe).
2. Un abono puede ser parcial (se registra sin cambiar el status).
3. Si el pago es en **Efectivo** y excede el saldo, se aplica como "Vuelto" y se completa la orden.
4. El QC puede rechazar y devolver a `Repair` con motivo obligatorio.
5. Los items `declined` por el cliente se guardan en `declinedItems[]` para el "blindaje de responsabilidad".
6. La firma de recepción (`signatureBase64`) y la firma de aprobación (`approvalSignatureBase64`) son evidencias distintas y no se sobrescriben.
7. El portal público no accede directamente a Firestore; usa un DTO sanitizado servido por Vercel.
