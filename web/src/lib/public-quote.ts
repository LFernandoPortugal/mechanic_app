import type { InspectionItem, Job } from "@/types";

export const PUBLIC_QUOTE_STATUSES: Job["status"][] = [
  "Approval",
  "Approved",
  "Repair",
  "QC",
  "Ready",
  "Delivered",
];

export interface PublicWorkshopSettings {
  workshopName: string;
  logoUrl: string;
  address: string;
  phone: string;
  taxId: string;
  termsAndConditions: string;
  currencySymbol: string;
  taxRate: number;
  taxName: string;
}

export interface PublicQuoteJob {
  id: string;
  vehicleId: string;
  make?: string;
  model?: string;
  color?: string;
  vehicleType?: Job["vehicleType"];
  clientId: string;
  status: Job["status"];
  inspectionItems: InspectionItem[];
  declinedItems: InspectionItem[];
  totalEstimate: number;
  approvedAmount: number;
  odometer?: number;
  startingFuel?: number;
}

export interface PublicQuote {
  job: PublicQuoteJob;
  settings: PublicWorkshopSettings;
}

export interface QuoteApprovalUpdate {
  inspectionItems: InspectionItem[];
  declinedItems: InspectionItem[];
  approvedAmount: number;
  status: "Approved";
}

const SIGNATURE_PREFIX = "data:image/png;base64,";
const MAX_APPROVAL_SIGNATURE_BYTES = 128 * 1024;

export function validateApprovalSignature(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith(SIGNATURE_PREFIX)) {
    throw new Error("The approval signature is invalid.");
  }

  const encoded = value.slice(SIGNATURE_PREFIX.length);
  if (
    encoded.length < 4 ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  ) {
    throw new Error("The approval signature is invalid.");
  }

  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  const decodedBytes = (encoded.length * 3) / 4 - padding;
  if (decodedBytes < 32 || decodedBytes > MAX_APPROVAL_SIGNATURE_BYTES) {
    throw new Error("The approval signature is invalid.");
  }

  return value;
}

type QuoteSource = Pick<
  Job,
  | "id"
  | "workshopId"
  | "vehicleId"
  | "make"
  | "model"
  | "color"
  | "vehicleType"
  | "clientId"
  | "status"
  | "inspectionItems"
  | "declinedItems"
  | "totalEstimate"
  | "approvedAmount"
  | "odometer"
  | "startingFuel"
>;

const roundCurrency = (amount: number) =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

function normalizeInspectionItem(item: InspectionItem): InspectionItem {
  const status = ["Pass", "Fail", "Critical", "Recommended"].includes(item.status)
    ? item.status
    : "Recommended";
  const price = Number(item.price);

  return {
    id: String(item.id || ""),
    name: String(item.name || ""),
    status,
    ...(Array.isArray(item.mediaUrls)
      ? { mediaUrls: item.mediaUrls.filter((url): url is string => typeof url === "string") }
      : {}),
    ...(typeof item.notes === "string" ? { notes: item.notes } : {}),
    ...(Number.isFinite(price) ? { price } : {}),
    ...(typeof item.approved === "boolean" ? { approved: item.approved } : {}),
  };
}

export function isPublicQuoteStatus(status: unknown): status is Job["status"] {
  return PUBLIC_QUOTE_STATUSES.includes(status as Job["status"]);
}

export function sanitizePublicQuote(
  job: QuoteSource,
  settings: Record<string, unknown>,
): PublicQuote {
  return {
    job: {
      id: job.id,
      vehicleId: job.vehicleId,
      make: job.make,
      model: job.model,
      color: job.color,
      vehicleType: job.vehicleType,
      clientId: job.clientId,
      status: job.status,
      inspectionItems: (job.inspectionItems ?? []).map(normalizeInspectionItem),
      declinedItems: (job.declinedItems ?? []).map(normalizeInspectionItem),
      totalEstimate: Number(job.totalEstimate) || 0,
      approvedAmount: Number(job.approvedAmount) || 0,
      odometer: Number.isFinite(job.odometer) ? job.odometer : undefined,
      startingFuel: Number.isFinite(job.startingFuel) ? job.startingFuel : undefined,
    },
    settings: {
      workshopName: String(settings.workshopName || settings.name || "Taller"),
      logoUrl: String(settings.logoUrl || ""),
      address: String(settings.address || ""),
      phone: String(settings.phone || ""),
      taxId: String(settings.taxId || settings.nit || ""),
      termsAndConditions: String(settings.termsAndConditions || ""),
      currencySymbol: String(settings.currencySymbol || "$"),
      taxRate: Number(settings.taxRate) || 0,
      taxName: String(settings.taxName || "Impuesto"),
    },
  };
}

export function calculateQuoteApproval(
  job: Pick<Job, "inspectionItems" | "totalEstimate">,
  decisions: Record<string, unknown>,
): QuoteApprovalUpdate {
  const items = (job.inspectionItems ?? []).map(normalizeInspectionItem);
  const pricedItems = items.filter(
    (item) => typeof item.price === "number" && item.price > 0,
  );
  const pricedIds = new Set(pricedItems.map((item) => item.id));

  if (pricedIds.size !== pricedItems.length) {
    throw new Error("The quote contains duplicated item identifiers.");
  }
  if (pricedItems.length > 200 || Object.keys(decisions).length > 200) {
    throw new Error("The quote contains too many decision items.");
  }
  if (
    pricedItems.some((item) => typeof decisions[item.id] !== "boolean") ||
    Object.keys(decisions).some((id) => !pricedIds.has(id))
  ) {
    throw new Error("The quote decisions do not match the priced items.");
  }

  const inspectionItems = items.map((item) => {
    if (typeof item.price !== "number" || item.price <= 0) {
      return { ...item, approved: true };
    }
    return { ...item, approved: decisions[item.id] as boolean };
  });
  const declinedItems = inspectionItems.filter(
    (item) => typeof item.price === "number" && item.price > 0 && item.approved === false,
  );
  const allParts = pricedItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const approvedParts = pricedItems.reduce(
    (sum, item) => sum + (decisions[item.id] ? item.price ?? 0 : 0),
    0,
  );
  const labor = Math.max(0, (Number(job.totalEstimate) || 0) - allParts);

  return {
    inspectionItems,
    declinedItems,
    approvedAmount: roundCurrency(labor + approvedParts),
    status: "Approved",
  };
}
