import { FieldValue, Timestamp } from "@google-cloud/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { HttpError, requireRoles } from "@/lib/server-auth";
import { isWorkshopActive } from "@/lib/server-workshop";
import { calculatePaymentBalance, getPayableTotal } from "@/lib/transactions";
import type { Job } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: HEADERS });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const caller = await requireRoles(request, ["ADMIN", "ADVISOR", "TECHNICIAN"]);
    if (Number(request.headers.get("content-length") || 0) > 8_192) {
      throw new HttpError(413, "Solicitud demasiado grande.");
    }

    const { id } = await context.params;
    if (!/^[A-Za-z0-9]{20}$/.test(id)) throw new HttpError(404, "Orden no encontrada.");

    const body = await request.json() as Record<string, unknown>;
    const outcome = body.outcome;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const requestId = String(body.requestId || "").trim();
    if (outcome !== "pass" && outcome !== "fail") {
      throw new HttpError(400, "El resultado de QC no es válido.");
    }
    if (notes.length > 1_000) {
      throw new HttpError(400, "Las notas de QC son demasiado largas.");
    }
    if (outcome === "fail" && notes.length === 0) {
      throw new HttpError(400, "El rechazo de QC requiere un motivo.");
    }
    if (!/^qc_[A-Za-z0-9_-]{16,128}$/.test(requestId)) {
      throw new HttpError(400, "El identificador de la operaci\u00f3n no es v\u00e1lido.");
    }

    const db = getAdminFirestore();
    const jobRef = db.collection("jobs").doc(id);
    const result = await db.runTransaction(async (transaction) => {
      const jobSnapshot = await transaction.get(jobRef);
      if (!jobSnapshot.exists) throw new HttpError(404, "Orden no encontrada.");

      const job = { id: jobSnapshot.id, ...jobSnapshot.data() } as Job;
      const isSuperAdmin = caller.roles.includes("SUPER_ADMIN");
      if (!isSuperAdmin && job.workshopId !== caller.workshopId) {
        throw new HttpError(403, "La orden pertenece a otro taller.");
      }
      const repeatedEntry = (job.auditLog ?? []).find((entry) => (
        (entry as unknown as Record<string, unknown>).requestId === requestId
      )) as unknown as Record<string, unknown> | undefined;
      if (repeatedEntry) {
        const expectedAction = outcome === "pass" ? "QC Aprobado" : "QC Rechazado";
        const resultStatus = repeatedEntry.resultStatus;
        if (
          repeatedEntry.actorId !== caller.uid
          || repeatedEntry.action !== expectedAction
          || repeatedEntry.notes !== notes
          || repeatedEntry.requestOutcome !== outcome
          || !["Repair", "Ready", "Delivered"].includes(String(resultStatus))
        ) {
          throw new HttpError(409, "El identificador de QC ya fue utilizado con otros datos.");
        }
        return { status: resultStatus as "Repair" | "Ready" | "Delivered", idempotent: true };
      }

      if (job.status !== "QC") {
        throw new HttpError(409, "La orden ya no está pendiente de QC.");
      }

      const settingsSnapshot = await transaction.get(
        db.collection("settings").doc(job.workshopId),
      );
      if (!isSuperAdmin && (
        !settingsSnapshot.exists
        || !isWorkshopActive(settingsSnapshot.data() ?? {}, job.workshopId)
      )) {
        throw new HttpError(403, "El taller no está activo.");
      }

      const now = Timestamp.now();
      if (outcome === "fail") {
        transaction.update(jobRef, {
          status: "Repair",
          auditLog: FieldValue.arrayUnion({
            timestamp: now,
            action: "QC Rechazado",
            actorId: caller.uid,
            notes,
            requestId,
            requestOutcome: outcome,
            resultStatus: "Repair",
          }),
        });
        return { status: "Repair" as const };
      }

      let payableTotal: number;
      let balance;
      try {
        payableTotal = getPayableTotal(job);
        balance = calculatePaymentBalance(
          payableTotal,
          (job.payments ?? []).map((payment) => payment.amount),
        );
      } catch (error) {
        throw new HttpError(
          409,
          error instanceof Error ? error.message : "La orden contiene importes inválidos.",
        );
      }

      const status = balance.isFullyPaid ? "Delivered" : "Ready";
      const entries: Array<Record<string, unknown>> = [{
        timestamp: now,
        action: "QC Aprobado",
        actorId: caller.uid,
        notes,
        requestId,
        requestOutcome: outcome,
        resultStatus: status,
      }];
      if (status === "Delivered") {
        entries.push({
          timestamp: now,
          action: "Entregado",
          actorId: caller.uid,
          notes: "QC aprobado con el pago total ya registrado",
        });
      }

      transaction.update(jobRef, {
        status,
        auditLog: FieldValue.arrayUnion(...entries),
      });
      return { status, remainingBalance: balance.remainingBalance };
    });

    return json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "JSON inválido." }, 400);
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("QC operation failed:", error);
    return json({ error: "No se pudo registrar el control de calidad." }, 500);
  }
}
