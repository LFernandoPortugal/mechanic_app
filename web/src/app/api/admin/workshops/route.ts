import { Timestamp } from "@google-cloud/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { deleteAuthUser } from "@/lib/identity-toolkit-admin";
import { HttpError, requireSuperAdmin } from "@/lib/server-auth";

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

export async function DELETE(request: Request) {
  try {
    const caller = await requireSuperAdmin(request);
    const body = await request.json() as { workshopId?: unknown };
    const workshopId = typeof body.workshopId === "string" ? body.workshopId.trim() : "";
    if (!workshopId) throw new HttpError(400, "El taller no es válido.");
    if (["master-control", "demo-workshop"].includes(workshopId)) throw new HttpError(400, "Ese taller está protegido.");

    const db = getAdminFirestore();
    const settingsRef = db.collection("settings").doc(workshopId);
    const profiles = await db.collection("users").where("workshopId", "==", workshopId).get();
    if (profiles.docs.some((profile) => profile.id === caller.uid || (profile.data().roles || []).includes("SUPER_ADMIN"))) {
      throw new HttpError(400, "El taller contiene una cuenta SUPER_ADMIN protegida.");
    }
    await settingsRef.set({ deletionPendingAt: Timestamp.now() }, { merge: true });
    const failed: string[] = [];
    for (const profile of profiles.docs) {
      await profile.ref.set({ deletionPendingAt: Timestamp.now() }, { merge: true });
      try { await deleteAuthUser(profile.id); } catch (error) { console.error(`Unable to delete workshop user ${profile.id}:`, error); failed.push(profile.id); }
    }
    if (failed.length) return json({
      ok: false,
      failed,
      error: "No se eliminaron todos los accesos; el taller se conservó y puedes reintentar.",
    }, 207);

    const counts: Record<string, number> = {};
    for (const name of ["public_quote_links", "jobs", "inventory", "inventory_transactions"]) {
      counts[name] = await deleteTenantDocuments(name, workshopId);
    }
    const batch = db.batch();
    profiles.docs.forEach((profile) => batch.delete(profile.ref));
    batch.delete(settingsRef);
    await batch.commit();
    return json({ ok: true, deletedUsers: profiles.size, counts });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "JSON inválido." }, 400);
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("Admin workshop deletion failed:", error);
    return json({ error: "No se pudo eliminar el taller." }, 500);
  }
}
