import { Timestamp } from "@google-cloud/firestore";
import type { Firestore } from "@google-cloud/firestore";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminFirestore } from "@/lib/firebase-admin";

const authState = vi.hoisted(() => ({
  caller: { uid: "reset-admin", email: "admin@example.test", roles: ["ADMIN"], workshopId: "reset-workshop" },
}));

vi.mock("@/lib/server-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server-auth")>();
  return { ...actual, requireRoles: vi.fn(async () => authState.caller) };
});

import { POST as resetWorkshop } from "@/app/api/workshop/reset/route";

let db: Firestore;
const workshopId = "reset-workshop";
const otherWorkshopId = "reset-other";
const request = (body: unknown) => new Request("http://localhost/api/workshop/reset", {
  method: "POST",
  headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Firestore Emulator is required.");
  process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-mechanic-app";
  db = getAdminFirestore();
});

beforeEach(async () => {
  authState.caller = { uid: "reset-admin", email: "admin@example.test", roles: ["ADMIN"], workshopId };
  for (const name of ["settings", "jobs", "inventory", "inventory_transactions", "public_quote_links"]) {
    const snapshot = await db.collection(name).get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((document) => batch.delete(document.ref));
      await batch.commit();
    }
  }
  await Promise.all([
    db.collection("settings").doc(workshopId).set({ workshopName: "Reset", allowResetData: true, disabled: false }),
    db.collection("settings").doc(otherWorkshopId).set({ workshopName: "Other", allowResetData: true, disabled: false }),
  ]);
  for (const name of ["jobs", "inventory", "inventory_transactions", "public_quote_links"]) {
    await Promise.all([
      db.collection(name).doc(`target-${name}`).set({ workshopId, createdAt: Timestamp.now() }),
      db.collection(name).doc(`other-${name}`).set({ workshopId: otherWorkshopId, createdAt: Timestamp.now() }),
    ]);
  }
});

describe("workshop reset route", () => {
  it("deletes only the caller tenant data and preserves settings", async () => {
    const response = await resetWorkshop(request({ workshopId, confirmation: "ELIMINAR" }));
    expect(response.status).toBe(200);
    const result = await response.json() as Record<string, number>;
    expect(result).toMatchObject({ jobsDeleted: 1, inventoryDeleted: 1, transactionsDeleted: 1, quoteLinksDeleted: 1 });
    for (const name of ["jobs", "inventory", "inventory_transactions", "public_quote_links"]) {
      expect((await db.collection(name).where("workshopId", "==", workshopId).get()).empty).toBe(true);
      expect((await db.collection(name).where("workshopId", "==", otherWorkshopId).get()).size).toBe(1);
    }
    const settings = await db.collection("settings").doc(workshopId).get();
    expect(settings.exists).toBe(true);
    expect(settings.data()?.resetPendingAt).toBeUndefined();
    expect(settings.data()?.lastResetAt).toBeDefined();
  });

  it("rejects another tenant and a disabled reset permission", async () => {
    expect((await resetWorkshop(request({ workshopId: otherWorkshopId, confirmation: "ELIMINAR" }))).status).toBe(403);
    await db.collection("settings").doc(workshopId).update({ allowResetData: false });
    expect((await resetWorkshop(request({ workshopId, confirmation: "ELIMINAR" }))).status).toBe(403);
  });

  it("is safe to retry after the data is already absent", async () => {
    expect((await resetWorkshop(request({ workshopId, confirmation: "ELIMINAR" }))).status).toBe(200);
    const retry = await resetWorkshop(request({ workshopId, confirmation: "ELIMINAR" }));
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({ jobsDeleted: 0, inventoryDeleted: 0, transactionsDeleted: 0, quoteLinksDeleted: 0 });
  });
});
