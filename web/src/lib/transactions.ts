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

export interface PaymentBalance {
  totalPaid: number;
  remainingBalance: number;
  isFullyPaid: boolean;
}

type PayableJob = {
  approvedAmount?: unknown;
  totalEstimate?: unknown;
  approvedAt?: unknown;
};

/**
 * New approvals may legitimately authorize zero (for example, every priced
 * item was declined). Legacy records without approvedAt keep the historical
 * fallback to totalEstimate when approvedAmount was never populated.
 */
export function getPayableTotal(job: PayableJob): number {
  const approvedAmount = Number(job.approvedAmount);
  const totalEstimate = Number(job.totalEstimate);
  const hasAuthoritativeApproval = job.approvedAt != null
    || (Number.isFinite(approvedAmount) && approvedAmount > 0);
  const payableTotal = roundCurrency(
    hasAuthoritativeApproval ? approvedAmount : totalEstimate,
  );

  if (!Number.isFinite(payableTotal) || payableTotal < 0) {
    throw new Error("La orden no tiene un total aprobado válido.");
  }
  return payableTotal;
}

export function calculatePaymentBalance(
  approvedTotal: number,
  existingAmounts: number[],
): PaymentBalance {
  const normalizedTotal = roundCurrency(approvedTotal);
  if (!Number.isFinite(normalizedTotal) || normalizedTotal < 0) {
    throw new Error("La orden no tiene un total aprobado válido.");
  }
  if (existingAmounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
    throw new Error("La orden contiene pagos inválidos.");
  }

  const totalPaid = roundCurrency(existingAmounts.reduce((sum, amount) => sum + amount, 0));
  const remainingBalance = roundCurrency(normalizedTotal - totalPaid);

  return {
    totalPaid,
    remainingBalance: Math.max(0, remainingBalance),
    isFullyPaid: remainingBalance <= 0,
  };
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
  const balance = calculatePaymentBalance(normalizedTotal, existingAmounts);
  const currentBalance = balance.remainingBalance;

  if (currentBalance <= 0) {
    throw new Error("La orden ya está pagada.");
  }
  if (normalizedAmount > currentBalance) {
    throw new Error("El pago supera el saldo pendiente.");
  }

  const totalPaid = roundCurrency(balance.totalPaid + normalizedAmount);
  const remainingBalance = roundCurrency(normalizedTotal - totalPaid);

  return {
    appliedAmount: normalizedAmount,
    totalPaid,
    remainingBalance,
    isFullyPaid: remainingBalance === 0,
  };
}
