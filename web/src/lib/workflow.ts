export const ORDER_STAGES = ["Reception", "Diagnosis", "Approval", "Approved", "Repair", "QC", "Ready", "Delivered"] as const;

export type OrderStage = (typeof ORDER_STAGES)[number];

export const WORKFLOW_COPY = {
  es: {
    Reception: { label: "Recepción", role: "Recepción", description: "Registra cliente, vehículo, condición de ingreso y autorización." },
    Diagnosis: { label: "Diagnóstico", role: "Técnico", description: "Inspecciona, documenta hallazgos y adjunta evidencia." },
    Approval: { label: "Por aprobar", role: "Asesor", description: "Prepara y comparte la cotización con el cliente." },
    Approved: { label: "Aprobado", role: "Cliente · Asesor", description: "Confirma los trabajos autorizados y su alcance." },
    Repair: { label: "Reparación", role: "Técnico", description: "Ejecuta únicamente los trabajos aprobados." },
    QC: { label: "Control QC", role: "Control de calidad", description: "Valida el trabajo antes de liberar el vehículo." },
    Ready: { label: "Listo", role: "Asesor · Caja", description: "Prepara cobro, documentación y entrega." },
    Delivered: { label: "Entregado", role: "Asesor · Caja", description: "Registra la entrega y cierra la orden." },
  },
  en: {
    Reception: { label: "Reception", role: "Reception", description: "Records the customer, vehicle, intake condition, and authorization." },
    Diagnosis: { label: "Diagnosis", role: "Technician", description: "Inspects, documents findings, and attaches evidence." },
    Approval: { label: "Awaiting approval", role: "Advisor", description: "Prepares and shares the estimate with the customer." },
    Approved: { label: "Approved", role: "Customer · Advisor", description: "Confirms the authorized work and its scope." },
    Repair: { label: "Repair", role: "Technician", description: "Performs only the approved work." },
    QC: { label: "Quality check", role: "Quality control", description: "Validates the work before releasing the vehicle." },
    Ready: { label: "Ready", role: "Advisor · Cashier", description: "Prepares payment, documentation, and delivery." },
    Delivered: { label: "Delivered", role: "Advisor · Cashier", description: "Records delivery and closes the order." },
  },
} as const;

export function isOrderStage(status: string): status is OrderStage {
  return ORDER_STAGES.includes(status as OrderStage);
}
