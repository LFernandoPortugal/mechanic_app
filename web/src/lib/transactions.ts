import type { StockMovementType } from "@/types";

const CENTS = 100;

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * CENTS) / CENTS;
}

export function calculateStockAfterMovement(
  currentStock: number,
  type: StockMovementType,
  quantity: number,
): number {
  if (!Number.isInteger(currentStock) || currentStock < -1) {
    throw new Error("El stock actual no es válido.");
  }
  if (!Number.isInteger(quantity)) {
    throw new Error("La cantidad debe ser un número entero.");
  }

  if (type === "ADJUSTMENT") {
    if (quantity < -1) {
      throw new Error("El ajuste de stock no puede ser menor que -1.");
    }
    return quantity;
  }

  if (quantity <= 0) {
    throw new Error("La cantidad debe ser mayor que cero.");
  }
  if (currentStock === -1) {
    throw new Error("Los artículos con stock ilimitado no admiten entradas o salidas.");
  }
  if (type === "OUT" && quantity > currentStock) {
    throw new Error("La salida supera el stock disponible.");
  }

  return type === "IN" ? currentStock + quantity : currentStock - quantity;
}

export interface PaymentCalculation {
  appliedAmount: number;
  totalPaid: number;
  remainingBalance: number;
  isFullyPaid: boolean;
}

export function calculatePayment(
  approvedTotal: number,
  existingAmounts: number[],
  requestedAmount: number,
): PaymentCalculation {
  const normalizedTotal = roundCurrency(approvedTotal);
  const normalizedAmount = roundCurrency(requestedAmount);

  if (!Number.isFinite(normalizedTotal) || normalizedTotal <= 0) {
    throw new Error("La orden no tiene un total aprobado válido.");
  }
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("El monto del pago debe ser mayor que cero.");
  }
  if (existingAmounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
    throw new Error("La orden contiene pagos inválidos.");
  }

  const alreadyPaid = roundCurrency(existingAmounts.reduce((sum, amount) => sum + amount, 0));
  const currentBalance = roundCurrency(normalizedTotal - alreadyPaid);

  if (currentBalance <= 0) {
    throw new Error("La orden ya está pagada.");
  }
  if (normalizedAmount > currentBalance) {
    throw new Error("El pago supera el saldo pendiente.");
  }

  const totalPaid = roundCurrency(alreadyPaid + normalizedAmount);
  const remainingBalance = roundCurrency(normalizedTotal - totalPaid);

  return {
    appliedAmount: normalizedAmount,
    totalPaid,
    remainingBalance,
    isFullyPaid: remainingBalance === 0,
  };
}
