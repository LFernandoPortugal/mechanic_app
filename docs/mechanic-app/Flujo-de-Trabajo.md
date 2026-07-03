# Flujo de Trabajo — SGA Mechanic App

> Actualizado: 2026-07-02 (tras revisión Fase 1)

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
| `Approved` | **Cliente** (portal público `/quote/view`) | El cliente acepta la cotización. El campo `approvedAmount` se establece aquí |
| `Repair` | TECHNICIAN / ADMIN | El técnico inicia la reparación. Al terminar pulsa "Enviar a QC" |
| `QC` | TECHNICIAN / ADVISOR / ADMIN | Inspector verifica 5 puntos del checklist. Puede aprobar (→ Ready) o rechazar (→ Repair) |
| `Ready` | Sistema automático | Trabajo aprobado por QC, pendiente de cobro. El Advisor gestiona el pago |
| `Delivered` | Sistema automático | Pago completado. Vehículo entregado |

## Notas importantes

- **`approvedAmount`**: es el monto que el **cliente aprobó** en el portal. No se debe sobreescribir con pagos acumulados.
- **`totalEstimate`**: es el monto cotizado por el Asesor.
- **`payments[]`**: array de abonos registrados. La suma de estos = total pagado.
- El status pasa a `Delivered` automáticamente cuando `sum(payments) >= approvedAmount` y el job está en `Ready` o `QC`.

## Reglas de negocio clave

1. Los precios de items **solo son editables** cuando `status === "Approval"` (antes de que el cliente apruebe).
2. Un abono puede ser parcial (se registra sin cambiar el status).
3. Si el pago es en **Efectivo** y excede el saldo, se aplica como "Vuelto" y se completa la orden.
4. El QC puede rechazar y devolver a `Repair` con motivo obligatorio.
5. Los items `declined` por el cliente se guardan en `declinedItems[]` para el "blindaje de responsabilidad".
