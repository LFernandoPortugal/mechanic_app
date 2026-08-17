import type { Job } from "@/types";

export const ORDER_STAGES = [
  "Reception", "Diagnosis", "Approval", "Approved",
  "Repair", "QC", "Ready", "Delivered",
] as const;

export type OrderStage = (typeof ORDER_STAGES)[number];

export function paidTotal(job: Job) {
  return (job.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);
}

export function balanceDue(job: Job) {
  return Math.max(0, (job.approvedAmount || job.totalEstimate || 0) - paidTotal(job));
}

export function getDashboardMetrics(jobs: Job[], today = new Date()) {
  const localDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  return {
    active: jobs.filter((job) => job.status !== "Delivered").length,
    awaitingApproval: jobs.filter((job) => job.status === "Approval").length,
    inRepair: jobs.filter((job) => job.status === "Repair").length,
    ready: jobs.filter((job) => job.status === "Ready").length,
    pendingPayments: jobs.reduce((sum, job) => sum + balanceDue(job), 0),
    todayRevenue: jobs.reduce((sum, job) => sum + (job.payments ?? []).filter((payment) => payment.date?.startsWith(localDate)).reduce((subtotal, payment) => subtotal + payment.amount, 0), 0),
  };
}

export function getStageCounts(jobs: Job[]) {
  return Object.fromEntries(ORDER_STAGES.map((stage) => [stage, jobs.filter((job) => job.status === stage).length])) as Record<OrderStage, number>;
}

export type AttentionReason = "approval" | "technician" | "qc" | "payment";

export function getAttentionOrders(jobs: Job[]) {
  return jobs.flatMap((job) => {
    let reason: AttentionReason | null = null;
    if (job.status === "Approval") reason = "approval";
    else if (job.status === "Diagnosis" && !job.technicianId) reason = "technician";
    else if (job.status === "QC") reason = "qc";
    else if (job.status === "Ready" && balanceDue(job) > 0) reason = "payment";
    return reason ? [{ job, reason }] : [];
  }).slice(0, 5);
}
