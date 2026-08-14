import { FieldValue, Timestamp } from "@google-cloud/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { HttpError, requireRoles } from "@/lib/server-auth";
import { isWorkshopActive } from "@/lib/server-workshop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

async function deleteTenantDocuments(collectionName: string, workshopId: string) {
  const db = getAdminFirestore();
  let deleted = 0;
  while (true) {
    const snapshot = await db.collection(collectionName).where("workshopId", "==", workshopId).limit(400).get();
    if (snapshot.empty) return deleted;
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
}

export async function POST(request: Request) {
  try {
    const caller = await requireRoles(request, ["ADMIN"]);
    if (Number(request.headers.get("content-length") || 0) > 4_096) throw new HttpError(413, "Solicitud demasiado grande.");
    const body = await request.json() as { workshopId?: unknown; confirmation?: unknown };
    const requestedWorkshopId = typeof body.workshopId === "string" ? body.workshopId.trim() : "";
    const isSuperAdmin = caller.roles.includes("SUPER_ADMIN");
    const workshopId = isSuperAdmin ? requestedWorkshopId : caller.workshopId;
    if (!workshopId || workshopId === "master-control") throw new HttpError(400, "El taller no es válido para restablecimiento.");
    if (!isSuperAdmin && requestedWorkshopId && requestedWorkshopId !== caller.workshopId) throw new HttpError(403, "No puedes restablecer otro taller.");
    if (body.confirmation !== "ELIMINAR") throw new HttpError(400, "La confirmación no es válida.");

    const db = getAdminFirestore();
    const settingsRef = db.collection("settings").doc(workshopId);
    const settingsSnapshot = await settingsRef.get();
    if (!settingsSnapshot.exists) throw new HttpError(404, "El taller no existe.");
    const settings = settingsSnapshot.data() || {};
    if (!isSuperAdmin) {
      if (!isWorkshopActive(settings, workshopId)) throw new HttpError(403, "El taller no está activo.");
      if (settings.allowResetData !== true) throw new HttpError(403, "El restablecimiento no está habilitado para este taller.");
    }

    await settingsRef.set({ resetPendingAt: Timestamp.now() }, { merge: true });
    const counts: Record<string, number> = {};
    for (const collectionName of ["public_quote_links", "jobs", "inventory", "inventory_transactions"]) {
      counts[collectionName] = await deleteTenantDocuments(collectionName, workshopId);
    }
    await settingsRef.update({ resetPendingAt: FieldValue.delete(), lastResetAt: Timestamp.now() });
    return json({
      ok: true,
      jobsDeleted: counts.jobs,
      inventoryDeleted: counts.inventory,
      transactionsDeleted: counts.inventory_transactions,
      quoteLinksDeleted: counts.public_quote_links,
    });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "JSON inválido." }, 400);
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("Workshop reset failed:", error);
    return json({ error: "No se pudo restablecer el taller; puedes reintentar la operación." }, 500);
  }
}
