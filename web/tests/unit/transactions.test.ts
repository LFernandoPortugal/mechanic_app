import { describe, expect, it } from "vitest";
import { calculatePayment, calculateStockAfterMovement } from "@/lib/transactions";

describe("calculateStockAfterMovement", () => {
  it("applies entries, exits and absolute adjustments", () => {
    expect(calculateStockAfterMovement(10, "IN", 4)).toBe(14);
    expect(calculateStockAfterMovement(10, "OUT", 4)).toBe(6);
    expect(calculateStockAfterMovement(10, "ADJUSTMENT", 0)).toBe(0);
    expect(calculateStockAfterMovement(10, "ADJUSTMENT", -1)).toBe(-1);
  });

  it("prevents negative and fractional stock movements", () => {
    expect(() => calculateStockAfterMovement(2, "OUT", 3)).toThrow(/supera/);
    expect(() => calculateStockAfterMovement(2, "IN", 1.5)).toThrow(/entero/);
    expect(() => calculateStockAfterMovement(-1, "OUT", 1)).toThrow(/ilimitado/);
  });
});

describe("calculatePayment", () => {
  it("calculates a partial payment without changing the approved total", () => {
    expect(calculatePayment(100, [20], 30)).toEqual({
      appliedAmount: 30,
      totalPaid: 50,
      remainingBalance: 50,
      isFullyPaid: false,
    });
  });

  it("uses currency precision and identifies the final payment", () => {
    expect(calculatePayment(0.3, [0.1], 0.2)).toEqual({
      appliedAmount: 0.2,
      totalPaid: 0.3,
      remainingBalance: 0,
      isFullyPaid: true,
    });
  });

  it("rejects invalid, duplicate or excessive payments", () => {
    expect(() => calculatePayment(100, [], 0)).toThrow(/mayor que cero/);
    expect(() => calculatePayment(100, [100], 1)).toThrow(/ya está pagada/);
    expect(() => calculatePayment(100, [80], 21)).toThrow(/supera/);
  });
});
