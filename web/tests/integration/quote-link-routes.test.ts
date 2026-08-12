import { Timestamp } from "@google-cloud/firestore";
import type { Firestore } from "@google-cloud/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { hashQuoteAccessToken, QUOTE_ACCESS_TOKEN_PATTERN } from "@/lib/quote-access";

const authState = vi.hoisted(() => ({
  caller: {
    uid: "advisor-route-test",
    email: "advisor@example.test",
    roles: ["ADVISOR"],
    workshopId: "ws-route-a",
  },
  error: null as null | { status: number; message: string },
}));

vi.mock("@/lib/server-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server-auth")>();
  return {
    ...actual,
    requireRoles: vi.fn(async () => {
      if (authState.error) {
        throw new actual.HttpError(authState.error.status, authState.error.message);
      }
      return authState.caller;
    }),
  };
});

import {
  DELETE as revokeQuoteLink,
  POST as issueQuoteLink,
} from "@/app/api/jobs/[id]/quote-link/route";
import {
  GET as getPublicQuote,
  POST as approvePublicQuote,
} from "@/app/api/public/quotes/[id]/route";
import { POST as registerPayment } from "@/app/api/jobs/[id]/payments/route";
import { POST as submitQualityControl } from "@/app/api/jobs/[id]/qc/route";

const JOB_ID = "AbCdEfGhIjKlMnOpQrSt";
const WORKSHOP_ID = "ws-route-a";
const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4SIAAAAASUVORK5CYII=";
const routeContext = { params: Promise.resolve({ id: JOB_ID }) };

let db: Firestore;

function managementRequest(method: "POST" | "DELETE") {
  return new Request(`http://localhost/api/jobs/${JOB_ID}/quote-link`, {
    method,
    headers: { Authorization: "Bearer route-test-token" },
  });
}

function publicRequest(token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set("X-Quote-Token", token);
  return new Request(`http://localhost/api/public/quotes/${JOB_ID}`, {
    ...init,
    headers,
  });
}

function authenticatedRequest(path: "payments" | "qc", body: Record<string, unknown>) {
  return new Request(`http://localhost/api/jobs/${JOB_ID}/${path}`, {
    method: "POST",
    headers: {
      Authorization: "Bearer route-test-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function issueToken() {
  const response = await issueQuoteLink(managementRequest("POST"), routeContext);
  expect(response.status).toBe(200);
  const body = await response.json() as { token: string; expiresAt: string };
  return { response, ...body };
}

async function deleteFixture() {
  await Promise.all([
    db.collection("public_quote_links").doc(JOB_ID).delete(),
    db.collection("jobs").doc(JOB_ID).delete(),
    db.collection("settings").doc(WORKSHOP_ID).delete(),
  ]);
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Route integration tests must run against the Firestore emulator.");
  }
  process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-mechanic-app";
  db = getAdminFirestore();
});

beforeEach(async () => {
  authState.caller = {
    uid: "advisor-route-test",
    email: "advisor@example.test",
    roles: ["ADVISOR"],
    workshopId: WORKSHOP_ID,
  };
  authState.error = null;

  await deleteFixture();
  await Promise.all([
    db.collection("settings").doc(WORKSHOP_ID).set({
      workshopName: "Taller de Integración",
      address: "Dirección pública",
      currencySymbol: "S/.",
      disabled: false,
      adminEmail: "private-admin@example.test",
    }),
    db.collection("jobs").doc(JOB_ID).set({
      workshopId: WORKSHOP_ID,
      vehicleId: "QA-ROUTE",
      make: "Test",
      model: "Integration",
      clientId: "Cliente Privado",
      clientEmail: "private-client@example.test",
      clientPhone: "+51999999999",
      advisorId: "advisor-route-test",
      status: "Approval",
      inspectionItems: [
        { id: "brakes", name: "Frenos", status: "Critical", price: 100 },
        { id: "filter", name: "Filtro", status: "Recommended", price: 40 },
      ],
      declinedItems: [],
      totalEstimate: 200,
      approvedAmount: 0,
      startingFuel: 50,
      odometer: 42_000,
      fluidAudit: {
        oilLevel: "OK",
        coolantLevel: "OK",
        brakeFluid: "OK",
      },
      valuables: {
        lockNutKey: false,
        sunglasses: false,
        documents: false,
      },
      createdAt: Timestamp.now(),
      auditLog: [],
      payments: [{
        id: "private-payment",
        amount: 10,
        method: "Efectivo",
        date: "2026-08-11T00:00:00.000Z",
        actorId: "private-actor",
      }],
    }),
  ]);
});

afterAll(async () => {
  if (!db) return;
  await deleteFixture();
  await db.terminate();
});

describe("revocable public quote route contract", () => {
  it("keeps management errors indistinguishable from route success internals", async () => {
    authState.error = { status: 401, message: "Sesión no válida." };
    const unauthorized = await issueQuoteLink(managementRequest("POST"), routeContext);
    expect(unauthorized.status).toBe(401);

    authState.error = null;
    authState.caller = { ...authState.caller, workshopId: "ws-route-b" };
    const crossTenant = await issueQuoteLink(managementRequest("POST"), routeContext);
    expect(crossTenant.status).toBe(403);
    expect(await db.collection("public_quote_links").doc(JOB_ID).get())
      .toMatchObject({ exists: false });
  });

  it("issues a URL-safe secret but persists only its hash and audit entry", async () => {
    const { response, token, expiresAt } = await issueToken();

    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(token).toMatch(QUOTE_ACCESS_TOKEN_PATTERN);
    expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now());

    const link = (await db.collection("public_quote_links").doc(JOB_ID).get()).data();
    expect(link).toMatchObject({
      jobId: JOB_ID,
      workshopId: WORKSHOP_ID,
      tokenHash: hashQuoteAccessToken(token),
      issuedBy: "advisor-route-test",
    });
    expect(link).not.toHaveProperty("token");

    const job = (await db.collection("jobs").doc(JOB_ID).get()).data();
    expect(job?.auditLog).toHaveLength(1);
    expect(job?.auditLog[0]).toMatchObject({
      action: "Enlace de Cotización Emitido",
      actorId: "advisor-route-test",
    });
  });

  it("regenerates atomically, rejects the previous token, and hides private fields", async () => {
    const first = await issueToken();
    const second = await issueToken();
    expect(second.token).not.toBe(first.token);

    const missingResponse = await getPublicQuote(publicRequest(""), routeContext);
    expect(missingResponse.status).toBe(404);
    const malformedResponse = await getPublicQuote(publicRequest("malformed"), routeContext);
    expect(malformedResponse.status).toBe(404);

    const oldResponse = await getPublicQuote(publicRequest(first.token), routeContext);
    expect(oldResponse.status).toBe(404);

    const currentResponse = await getPublicQuote(publicRequest(second.token), routeContext);
    expect(currentResponse.status).toBe(200);
    const quote = await currentResponse.json() as {
      job: Record<string, unknown>;
      settings: Record<string, unknown>;
    };
    expect(quote.job).toMatchObject({ id: JOB_ID, vehicleId: "QA-ROUTE" });
    expect(quote.settings).toMatchObject({
      workshopName: "Taller de Integración",
      currencySymbol: "S/.",
    });
    expect(JSON.stringify(quote)).not.toContain("Cliente Privado");
    expect(JSON.stringify(quote)).not.toContain("private-client@example.test");
    expect(JSON.stringify(quote)).not.toContain("private-payment");

    await db.collection("public_quote_links").doc(JOB_ID).update({
      expiresAt: Timestamp.fromDate(new Date(Date.now() - 1_000)),
    });
    const expiredResponse = await getPublicQuote(publicRequest(second.token), routeContext);
    expect(expiredResponse.status).toBe(404);
  });

  it("approves in a transaction, preserves the link, and remains idempotent", async () => {
    const { token } = await issueToken();
    const signatureBase64 = `data:image/png;base64,${ONE_PIXEL_PNG}`;
    const approvalRequest = () => publicRequest(token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decisions: { brakes: true, filter: false },
        signatureBase64,
      }),
    });

    const response = await approvePublicQuote(approvalRequest(), routeContext);
    expect(response.status).toBe(200);
    const approved = await response.json() as {
      job: { status: string; approvedAmount: number; declinedItems: Array<{ id: string }> };
    };
    expect(approved.job.status).toBe("Approved");
    expect(approved.job.approvedAmount).toBe(160);
    expect(approved.job.declinedItems.map((item) => item.id)).toEqual(["filter"]);

    const jobAfterApproval = (await db.collection("jobs").doc(JOB_ID).get()).data();
    expect(jobAfterApproval?.approvalSignatureBase64).toBe(signatureBase64);
    expect(jobAfterApproval?.auditLog).toHaveLength(2);
    expect((await db.collection("public_quote_links").doc(JOB_ID).get()).exists).toBe(true);

    const repeated = await approvePublicQuote(approvalRequest(), routeContext);
    expect(repeated.status).toBe(200);
    const jobAfterRepeat = (await db.collection("jobs").doc(JOB_ID).get()).data();
    expect(jobAfterRepeat?.auditLog).toHaveLength(2);
  });

  it("revokes access, records the action once, and remains idempotent", async () => {
    const { token } = await issueToken();
    const revoked = await revokeQuoteLink(managementRequest("DELETE"), routeContext);
    expect(revoked.status).toBe(200);
    expect((await db.collection("public_quote_links").doc(JOB_ID).get()).exists).toBe(false);

    const publicResponse = await getPublicQuote(publicRequest(token), routeContext);
    expect(publicResponse.status).toBe(404);

    const repeated = await revokeQuoteLink(managementRequest("DELETE"), routeContext);
    expect(repeated.status).toBe(200);
    const job = (await db.collection("jobs").doc(JOB_ID).get()).data();
    expect(job?.auditLog.map((entry: { action: string }) => entry.action)).toEqual([
      "Enlace de Cotización Emitido",
      "Enlace de Cotización Revocado",
    ]);
  });
});

describe("idempotent authenticated job operations", () => {
  it("records a repeated payment request exactly once", async () => {
    await db.collection("jobs").doc(JOB_ID).update({
      status: "Ready",
      approvedAmount: 100,
      totalEstimate: 100,
      payments: [],
      auditLog: [],
    });
    const payload = {
      amount: 40,
      method: "Efectivo",
      reference: "IDEMPOTENT-01",
      expectedTotalPaid: 0,
      requestId: "pay_1234567890abcdef",
    };

    const first = await registerPayment(authenticatedRequest("payments", payload), routeContext);
    const repeated = await registerPayment(authenticatedRequest("payments", payload), routeContext);
    expect(first.status).toBe(200);
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toMatchObject({ idempotent: true, totalPaid: 40 });

    const job = (await db.collection("jobs").doc(JOB_ID).get()).data();
    expect(job?.payments).toHaveLength(1);
    expect(job?.payments[0]).toMatchObject({ requestId: payload.requestId, amount: 40 });
    expect(job?.auditLog.filter((entry: { action: string }) => entry.action === "Pago Registrado"))
      .toHaveLength(1);

    const reusedWithOtherData = await registerPayment(authenticatedRequest("payments", {
      ...payload,
      amount: 41,
    }), routeContext);
    expect(reusedWithOtherData.status).toBe(409);
  });

  it("rejects a payment based on a stale balance before writing", async () => {
    await db.collection("jobs").doc(JOB_ID).update({
      status: "Ready",
      approvedAmount: 100,
      totalEstimate: 100,
      payments: [{
        id: "existing-payment",
        amount: 10,
        method: "Efectivo",
        date: "2026-08-12T00:00:00.000Z",
        actorId: "advisor-route-test",
      }],
      auditLog: [],
    });

    const response = await registerPayment(authenticatedRequest("payments", {
      amount: 20,
      method: "Efectivo",
      reference: "",
      expectedTotalPaid: 0,
      requestId: "pay_stale1234567890x",
    }), routeContext);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "La orden recibió otro pago. Revisa el saldo actualizado antes de continuar.",
    });
    const job = (await db.collection("jobs").doc(JOB_ID).get()).data();
    expect(job?.payments).toHaveLength(1);
  });

  it("applies a repeated QC request once and rejects key reuse with other notes", async () => {
    await db.collection("jobs").doc(JOB_ID).update({
      status: "QC",
      approvedAmount: 100,
      totalEstimate: 100,
      payments: [],
      auditLog: [],
    });
    const payload = {
      outcome: "fail",
      notes: "Persiste una vibración.",
      requestId: "qc_1234567890abcdef",
    };

    const first = await submitQualityControl(authenticatedRequest("qc", payload), routeContext);
    const repeated = await submitQualityControl(authenticatedRequest("qc", payload), routeContext);
    expect(first.status).toBe(200);
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toMatchObject({ idempotent: true, status: "Repair" });

    const job = (await db.collection("jobs").doc(JOB_ID).get()).data();
    expect(job?.status).toBe("Repair");
    expect(job?.auditLog.filter((entry: { action: string }) => entry.action === "QC Rechazado"))
      .toHaveLength(1);

    const reusedWithOtherNotes = await submitQualityControl(authenticatedRequest("qc", {
      ...payload,
      notes: "Otro resultado.",
    }), routeContext);
    expect(reusedWithOtherNotes.status).toBe(409);
  });
});
