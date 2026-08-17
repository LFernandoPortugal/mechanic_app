import { describe, expect, it } from "vitest";
import { getAttentionOrders, getDashboardMetrics, getStageCounts, ORDER_STAGES } from "@/lib/dashboard";
import type { Job } from "@/types";

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1", workshopId: "workshop", vehicleId: "ABC-123", clientId: "Client", advisorId: "advisor",
    status: "Reception", fluidAudit: { oilLevel: "OK", coolantLevel: "OK", brakeFluid: "OK" },
    valuables: { lockNutKey: false, sunglasses: false, documents: false }, startingFuel: 50, odometer: 100,
    inspectionItems: [], declinedItems: [], totalEstimate: 0, approvedAmount: 0, createdAt: new Date(), auditLog: [],
    ...overrides,
  };
}

describe("admin dashboard helpers", () => {
  it("preserves the exact canonical workflow", () => {
    expect(ORDER_STAGES).toEqual(["Reception", "Diagnosis", "Approval", "Approved", "Repair", "QC", "Ready", "Delivered"]);
  });

  it("calculates operational and financial metrics from real job fields", () => {
    const jobs = [
      job({ status: "Approval", approvedAmount: 100, payments: [{ id:"p1", amount:40, method:"Efectivo", date:"2026-08-17T10:00:00", actorId:"a" }] }),
      job({ id:"job-2", status:"Repair" }),
      job({ id:"job-3", status:"Delivered", approvedAmount:50, payments:[{ id:"p2", amount:50, method:"Tarjeta", date:"2026-08-17", actorId:"a" }] }),
    ];
    expect(getDashboardMetrics(jobs, new Date(2026, 7, 17))).toEqual({ active:2, awaitingApproval:1, inRepair:1, ready:0, pendingPayments:60, todayRevenue:90 });
  });

  it("counts every stage and only reports evidence-backed attention reasons", () => {
    const jobs = [job({ status:"Diagnosis", technicianId:undefined }), job({ id:"j2", status:"Ready", approvedAmount:25 })];
    expect(getStageCounts(jobs).Diagnosis).toBe(1);
    expect(getAttentionOrders(jobs).map(item => item.reason)).toEqual(["technician", "payment"]);
  });
});
