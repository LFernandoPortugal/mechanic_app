import { FieldValue, Timestamp } from "@google-cloud/firestore";
import type { DocumentReference, Transaction } from "@google-cloud/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { createQuoteAccessToken } from "@/lib/quote-access";
import { PUBLIC_QUOTE_STATUSES } from "@/lib/public-quote";
import { HttpError, requireRoles } from "@/lib/server-auth";
import { isWorkshopActive } from "@/lib/server-workshop";
import type { Job } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: HEADERS });

interface QuoteManagementContext {
  transaction: Transaction;
  job: Job;
  jobRef: DocumentReference;
  linkRef: DocumentReference;
  callerId: string;
}

function validateJobId(id: string) {
  if (!/^[A-Za-z0-9]{20}$/.test(id)) {
    throw new HttpError(404, "Orden no encontrada.");
  }
}

async function manageQuoteLink(
  request: Request,
  jobId: string,
  operation: (context: QuoteManagementContext) => Promise<void>,
  requirePublicStatus = true,
) {
  const caller = await requireRoles(request, ["ADMIN", "ADVISOR"]);
  validateJobId(jobId);

  const db = getAdminFirestore();
  const jobRef = db.collection("jobs").doc(jobId);
  const linkRef = db.collection("public_quote_links").doc(jobId);
  await db.runTransaction(async (transaction) => {
    const jobSnapshot = await transaction.get(jobRef);
    if (!jobSnapshot.exists) throw new HttpError(404, "Orden no encontrada.");

    const job = { id: jobSnapshot.id, ...jobSnapshot.data() } as Job;
    const isSuperAdmin = caller.roles.includes("SUPER_ADMIN");
    if (!isSuperAdmin && job.workshopId !== caller.workshopId) {
      throw new HttpError(403, "La orden pertenece a otro taller.");
    }
    if (requirePublicStatus && !PUBLIC_QUOTE_STATUSES.includes(job.status)) {
      throw new HttpError(409, "La orden todavía no tiene una cotización pública.");
    }

    const settingsSnapshot = await transaction.get(
      db.collection("settings").doc(job.workshopId),
    );
    if (
      !settingsSnapshot.exists
      || (!isSuperAdmin && !isWorkshopActive(settingsSnapshot.data() ?? {}, job.workshopId))
    ) {
      throw new HttpError(403, "El taller no está activo.");
    }

    await operation({ transaction, job, jobRef, linkRef, callerId: caller.uid });
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const access = createQuoteAccessToken();
    await manageQuoteLink(request, id, async ({
      transaction,
      job,
      jobRef,
      linkRef,
      callerId,
    }) => {
      transaction.set(linkRef, {
        jobId: job.id,
        workshopId: job.workshopId,
        tokenHash: access.tokenHash,
        issuedAt: Timestamp.fromDate(access.issuedAt),
        expiresAt: Timestamp.fromDate(access.expiresAt),
        issuedBy: callerId,
      });
      transaction.update(jobRef, {
        auditLog: FieldValue.arrayUnion({
          timestamp: Timestamp.fromDate(access.issuedAt),
          action: "Enlace de Cotización Emitido",
          actorId: callerId,
          notes: "Enlace público seguro emitido; cualquier enlace anterior quedó revocado",
        }),
      });
    });

    return json({ token: access.token, expiresAt: access.expiresAt.toISOString() });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("Quote link issuance failed:", error);
    return json({ error: "No se pudo generar el enlace público." }, 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const now = Timestamp.now();
    await manageQuoteLink(request, id, async ({
      transaction,
      jobRef,
      linkRef,
      callerId,
    }) => {
      const linkSnapshot = await transaction.get(linkRef);
      if (!linkSnapshot.exists) return;

      transaction.delete(linkRef);
      transaction.update(jobRef, {
        auditLog: FieldValue.arrayUnion({
          timestamp: now,
          action: "Enlace de Cotización Revocado",
          actorId: callerId,
          notes: "El enlace público fue revocado manualmente",
        }),
      });
    }, false);
    return json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("Quote link revocation failed:", error);
    return json({ error: "No se pudo revocar el enlace público." }, 500);
  }
}
