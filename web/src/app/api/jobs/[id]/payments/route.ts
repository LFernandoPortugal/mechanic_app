import { Timestamp } from "@google-cloud/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { HttpError, requireRoles } from "@/lib/server-auth";
import { isWorkshopActive } from "@/lib/server-workshop";
import { calculatePayment, calculatePaymentBalance, getPayableTotal } from "@/lib/transactions";
import type { Job } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METHODS = ["Efectivo", "Tarjeta", "Transferencia", "Yape/Plin"] as const;
const PAYABLE_STATUSES: Job["status"][] = ["Approved", "Repair", "QC", "Ready"];
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
    const caller = await requireRoles(request, ["ADMIN", "ADVISOR"]);
    if (Number(request.headers.get("content-length") || 0) > 8_192) {
      throw new HttpError(413, "Solicitud demasiado grande.");
    }

    const { id } = await context.params;
    if (!/^[A-Za-z0-9]{20}$/.test(id)) throw new HttpError(404, "Orden no encontrada.");

    const body = await request.json() as Record<string, unknown>;
    const amount = Number(body.amount);
    const method = String(body.method || "") as typeof METHODS[number];
    const reference = String(body.reference || "").trim();
    const requestId = String(body.requestId || "").trim();
    const expectedTotalPaid = Number(body.expectedTotalPaid);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpError(400, "El monto no es v\u00e1lido.");
    }
    if (!METHODS.includes(method)) throw new HttpError(400, "El m\u00e9todo de pago no es v\u00e1lido.");
    if (reference.length > 100) throw new HttpError(400, "La referencia es demasiado larga.");
    if (!Number.isFinite(expectedTotalPaid) || expectedTotalPaid < 0) {
      throw new HttpError(400, "El total pagado esperado no es v\u00e1lido.");
    }
    if (!/^pay_[A-Za-z0-9_-]{16,128}$/.test(requestId)) {
      throw new HttpError(400, "El identificador de la operaci\u00f3n no es v\u00e1lido.");
    }

    const db = getAdminFirestore();
    const jobRef = db.collection("jobs").doc(id);
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(jobRef);
      if (!snapshot.exists) throw new HttpError(404, "Orden no encontrada.");

      const job = { id: snapshot.id, ...snapshot.data() } as Job;
      const isSuperAdmin = caller.roles.includes("SUPER_ADMIN");
      if (!isSuperAdmin && job.workshopId !== caller.workshopId) {
        throw new HttpError(403, "La orden pertenece a otro taller.");
      }

      const existingPayments = job.payments ?? [];
      const repeatedPayment = existingPayments.find((payment) => payment.requestId === requestId);
      if (repeatedPayment) {
        if (
          repeatedPayment.actorId !== caller.uid
          || repeatedPayment.method !== method
          || (repeatedPayment.reference ?? "") !== reference
          || Math.abs(repeatedPayment.amount - amount) > 0.001
        ) {
          throw new HttpError(409, "El identificador de pago ya fue utilizado con otros datos.");
        }
        const payableTotal = getPayableTotal(job);
        const balance = calculatePaymentBalance(
          payableTotal,
          existingPayments.map((payment) => payment.amount),
        );
        return {
          payment: repeatedPayment,
          status: job.status,
          totalPaid: balance.totalPaid,
          remainingBalance: balance.remainingBalance,
          idempotent: true,
        };
      }

      if (!PAYABLE_STATUSES.includes(job.status)) {
        throw new HttpError(409, "La orden no admite nuevos pagos en su estado actual.");
      }

      const currentTotalPaid = existingPayments.reduce((total, payment) => total + payment.amount, 0);
      if (Math.abs(currentTotalPaid - expectedTotalPaid) > 0.001) {
        throw new HttpError(409, "La orden recibi\u00f3 otro pago. Revisa el saldo actualizado antes de continuar.");
      }

      const settingsSnapshot = await transaction.get(db.collection("settings").doc(job.workshopId));
      if (!isSuperAdmin && (
        !settingsSnapshot.exists
        || !isWorkshopActive(settingsSnapshot.data() ?? {}, job.workshopId)
      )) {
        throw new HttpError(403, "El taller no est\u00e1 activo.");
      }

      let payableTotal: number;
      try {
        payableTotal = getPayableTotal(job);
      } catch (error) {
        throw new HttpError(400, error instanceof Error ? error.message : "Pago inválido.");
      }
      let calculation;
      try {
        calculation = calculatePayment(
          payableTotal,
          existingPayments.map((payment) => payment.amount),
          amount,
        );
      } catch (error) {
        throw new HttpError(400, error instanceof Error ? error.message : "Pago inv\u00e1lido.");
      }

      const now = Timestamp.now();
      const payment = {
        id: `pay_${db.collection("payment_ids").doc().id}`,
        requestId,
        amount: calculation.appliedAmount,
        method,
        reference,
        date: now.toDate().toISOString(),
        actorId: caller.uid,
      };
      const auditLog = [
        ...(job.auditLog ?? []),
        {
          timestamp: now,
          action: "Pago Registrado",
          actorId: caller.uid,
          notes: `${method} ${calculation.appliedAmount.toFixed(2)}${reference ? ` \u2014 Ref: ${reference}` : ""}`,
        },
      ];
      // A payment must never skip the QC checklist. If the order was paid
      // earlier, the authenticated QC endpoint delivers it after QC passes.
      const status = calculation.isFullyPaid && job.status === "Ready"
        ? "Delivered"
        : job.status;
      if (status === "Delivered") {
        auditLog.push({
          timestamp: now,
          action: "Entregado",
          actorId: caller.uid,
          notes: "Pago total; veh\u00edculo entregado",
        });
      }

      transaction.update(jobRef, {
        payments: [...existingPayments, payment],
        auditLog,
        status,
      });
      return {
        payment,
        status,
        totalPaid: calculation.totalPaid,
        remainingBalance: calculation.remainingBalance,
      };
    });

    return json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "JSON inv\u00e1lido." }, 400);
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("Payment operation failed:", error);
    return json({ error: "No se pudo registrar el pago." }, 500);
  }
}
