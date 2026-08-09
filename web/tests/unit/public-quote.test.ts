import { describe, expect, it } from "vitest";
import {
  calculateQuoteApproval,
  sanitizePublicQuote,
  validateApprovalSignature,
} from "@/lib/public-quote";
import type { Job } from "@/types";

const sourceJob = {
  id: "AbCdEfGhIjKlMnOpQrSt",
  workshopId: "ws-a",
  vehicleId: "ABC-123",
  clientId: "Cliente Uno",
  clientPhone: "+51999999999",
  clientEmail: "private@example.test",
  advisorId: "private-advisor-id",
  technicianId: "private-technician-id",
  status: "Approval",
  inspectionItems: [
    {
      id: "brakes",
      name: "Frenos",
      status: "Critical",
      price: 100,
      privateTechnicianNote: "nested-private-data",
    },
    { id: "filter", name: "Filtro", status: "Recommended", price: 40 },
    { id: "check", name: "Inspección", status: "Pass" },
  ],
  declinedItems: [],
  totalEstimate: 200,
  approvedAmount: 0,
  odometer: 42_000,
  startingFuel: 50,
  auditLog: [{ actorId: "private", action: "Private audit" }],
  payments: [{ id: "p1", amount: 10 }],
  signatureBase64: "data:image/png;base64,private",
  approvalSignatureBase64: "data:image/png;base64,also-private",
  receptionImages: ["data:image/jpeg;base64,private"],
} as unknown as Job;

describe("sanitizePublicQuote", () => {
  it("returns the quote fields needed by the portal without private job data", () => {
    const publicQuote = sanitizePublicQuote(sourceJob, {
      workshopName: "Taller A",
      address: "Dirección pública",
      currencySymbol: "S/.",
      adminEmail: "private-admin@example.test",
      allowResetData: true,
      tempPassword: "must-never-leak",
    });

    expect(publicQuote.job.vehicleId).toBe("ABC-123");
    expect(publicQuote.settings.currencySymbol).toBe("S/.");
    expect(JSON.stringify(publicQuote)).not.toContain("private@example.test");
    expect(JSON.stringify(publicQuote)).not.toContain("private-advisor-id");
    expect(JSON.stringify(publicQuote)).not.toContain("must-never-leak");
    expect(JSON.stringify(publicQuote)).not.toContain("signatureBase64");
    expect(JSON.stringify(publicQuote)).not.toContain("approvalSignatureBase64");
    expect(JSON.stringify(publicQuote)).not.toContain("payments");
    expect(JSON.stringify(publicQuote)).not.toContain("auditLog");
    expect(JSON.stringify(publicQuote)).not.toContain("nested-private-data");
  });
});

describe("validateApprovalSignature", () => {
  it("accepts a reasonably sized PNG data URL", () => {
    const signature = `data:image/png;base64,${"A".repeat(64)}`;
    expect(validateApprovalSignature(signature)).toBe(signature);
  });

  it("rejects other formats, malformed data, and oversized payloads", () => {
    expect(() => validateApprovalSignature("data:image/jpeg;base64,AAAA")).toThrow();
    expect(() => validateApprovalSignature("data:image/png;base64,not base64")).toThrow();
    expect(() =>
      validateApprovalSignature(`data:image/png;base64,${"A".repeat(174_768)}`),
    ).toThrow();
  });
});

describe("calculateQuoteApproval", () => {
  it("recomputes the approved amount on the server and records declined items", () => {
    const result = calculateQuoteApproval(sourceJob, {
      brakes: true,
      filter: false,
    });

    // 60 labor + 100 approved part; the client cannot forge this amount.
    expect(result.approvedAmount).toBe(160);
    expect(result.status).toBe("Approved");
    expect(result.declinedItems.map((item) => item.id)).toEqual(["filter"]);
    expect(result.inspectionItems.find((item) => item.id === "brakes")?.approved).toBe(true);
    expect(result.inspectionItems.find((item) => item.id === "filter")?.approved).toBe(false);
  });

  it("rejects missing, unknown, or non-boolean decisions", () => {
    expect(() => calculateQuoteApproval(sourceJob, { brakes: true })).toThrow();
    expect(() =>
      calculateQuoteApproval(sourceJob, {
        brakes: true,
        filter: false,
        forged: true,
      }),
    ).toThrow();
    expect(() =>
      calculateQuoteApproval(sourceJob, { brakes: true, filter: "yes" }),
    ).toThrow();
  });

  it("normalizes Firestore numeric wrapper values before writing", () => {
    const wrappedJob = {
      ...sourceJob,
      inspectionItems: sourceJob.inspectionItems.map((item) => ({
        ...item,
        ...(item.price === 100 ? { price: { valueOf: (): number => 100 } } : {}),
      })),
    } as unknown as Job;

    const result = calculateQuoteApproval(wrappedJob, {
      brakes: true,
      filter: false,
    });
    expect(result.approvedAmount).toBe(160);
    expect(result.inspectionItems[0].price).toBe(100);
  });
});
