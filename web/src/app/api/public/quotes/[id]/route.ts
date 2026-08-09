import { FieldValue, Timestamp } from "@google-cloud/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  calculateQuoteApproval,
  isPublicQuoteStatus,
  sanitizePublicQuote,
  validateApprovalSignature,
} from "@/lib/public-quote";
import type { Job } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: RESPONSE_HEADERS });

const validJobId = (id: string) => /^[A-Za-z0-9]{20}$/.test(id);

async function loadPublicQuote(jobId: string) {
  const db = getAdminFirestore();
  const jobSnapshot = await db.collection("jobs").doc(jobId).get();
  if (!jobSnapshot.exists) return null;

  const job = { id: jobSnapshot.id, ...jobSnapshot.data() } as Job;
  if (!isPublicQuoteStatus(job.status)) return null;

  const settingsSnapshot = await db.collection("settings").doc(job.workshopId).get();
  if (!settingsSnapshot.exists) return null;

  return sanitizePublicQuote(job, settingsSnapshot.data() ?? {});
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!validJobId(id)) return json({ error: "Cotización no encontrada." }, 404);

    const quote = await loadPublicQuote(id);
    return quote
      ? json(quote)
      : json({ error: "Cotización no encontrada." }, 404);
  } catch (error) {
    console.error("Unable to load public quote:", error);
    return json({ error: "No se pudo cargar la cotización." }, 500);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!validJobId(id)) return json({ error: "Cotización no encontrada." }, 404);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 196_608) return json({ error: "Solicitud demasiado grande." }, 413);

    const body = (await request.json()) as {
      decisions?: Record<string, unknown>;
      signatureBase64?: unknown;
    };
    if (!body.decisions || Array.isArray(body.decisions)) {
      return json({ error: "Decisiones inválidas." }, 400);
    }

    const approvalSignatureBase64 = validateApprovalSignature(body.signatureBase64);
    const db = getAdminFirestore();
    const jobRef = db.collection("jobs").doc(id);
    const updatedJob = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(jobRef);
      if (!snapshot.exists) throw new Error("NOT_FOUND");

      const job = { id: snapshot.id, ...snapshot.data() } as Job;
      if (job.status !== "Approval") {
        if (isPublicQuoteStatus(job.status)) return job;
        throw new Error("NOT_FOUND");
      }

      const approval = calculateQuoteApproval(job, body.decisions ?? {});
      const approvedAt = Timestamp.now();
      transaction.update(jobRef, {
        ...approval,
        approvalSignatureBase64,
        approvedAt,
        auditLog: FieldValue.arrayUnion({
          timestamp: approvedAt,
          action: "Quote Approved",
          actorId: "client",
          notes: "Client approval submitted through the public quote API",
        }),
      });

      return { ...job, ...approval, approvalSignatureBase64, approvedAt };
    });

    const settingsSnapshot = await db
      .collection("settings")
      .doc(updatedJob.workshopId)
      .get();
    if (!settingsSnapshot.exists) return json({ error: "Cotización no encontrada." }, 404);

    return json(sanitizePublicQuote(updatedJob, settingsSnapshot.data() ?? {}));
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "JSON inválido." }, 400);
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return json({ error: "Cotización no encontrada." }, 404);
    }
    if (error instanceof Error && error.message.startsWith("The quote")) {
      return json({ error: "Las decisiones no coinciden con la cotización." }, 400);
    }
    if (error instanceof Error && error.message.startsWith("The approval signature")) {
      return json({ error: "Se requiere una firma de aprobaci\u00f3n v\u00e1lida." }, 400);
    }
    console.error("Unable to approve public quote:", error);
    return json({ error: "No se pudo registrar la aprobación." }, 500);
  }
}
