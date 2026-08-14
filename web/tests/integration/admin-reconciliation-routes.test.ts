import { Timestamp } from "@google-cloud/firestore";
import type { Firestore } from "@google-cloud/firestore";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { createAuthUser } from "@/lib/identity-toolkit-admin";

vi.mock("@/lib/server-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server-auth")>();
  return {
    ...actual,
    requireSuperAdmin: vi.fn(async () => ({
      uid: "protected-super",
      email: "owner@example.test",
      roles: ["SUPER_ADMIN"],
      workshopId: "master-control",
    })),
  };
});

import { GET as reconcileUsers } from "@/app/api/admin/users/route";
import { DELETE as deleteWorkshop } from "@/app/api/admin/workshops/route";

let db: Firestore;
const workshopId = "reconcile-workshop";
const request = (url: string, method = "GET", body?: unknown) => new Request(url, {
  method,
  headers: { Authorization: "Bearer test", ...(body ? { "Content-Type": "application/json" } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});

async function clearAuth() {
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/demo-mechanic-app/accounts`, { method: "DELETE" });
  expect(response.ok).toBe(true);
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error("Emulators are required.");
  process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-mechanic-app";
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "integration-api-key";
  process.env.USE_FIREBASE_EMULATORS = "true";
  db = getAdminFirestore();
});

beforeEach(async () => {
  await clearAuth();
  for (const name of ["users", "settings", "jobs", "inventory", "inventory_transactions", "public_quote_links"]) {
    const snapshot = await db.collection(name).get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((document) => batch.delete(document.ref));
      await batch.commit();
    }
  }
});

describe("SUPER_ADMIN reconciliation", () => {
  it("reports consistent, Auth-only, profile-only, and missing-workshop identities", async () => {
    await db.collection("settings").doc(workshopId).set({ workshopName: "Test" });
    const consistentUid = await createAuthUser({ email: "both@example.test", password: "temporary-1234", displayName: "Both" });
    await db.collection("users").doc(consistentUid).set({ uid: consistentUid, email: "both@example.test", displayName: "Both", roles: ["ADMIN"], workshopId });
    await createAuthUser({ email: "auth-only@example.test", password: "temporary-1234", displayName: "Auth only" });
    await db.collection("users").doc("profile-only").set({ uid: "profile-only", email: "profile@example.test", roles: ["TECHNICIAN"], workshopId });
    await db.collection("users").doc("missing-workshop").set({ uid: "missing-workshop", email: "missing@example.test", roles: ["ADMIN"], workshopId: "absent" });
    await createAuthUser({ email: "missing@example.test", password: "temporary-1234", displayName: "Missing" }).then(async (uid) => {
      const data = (await db.collection("users").doc("missing-workshop").get()).data();
      await db.collection("users").doc(uid).set({ ...data, uid });
      await db.collection("users").doc("missing-workshop").delete();
    });

    const response = await reconcileUsers(request("http://localhost/api/admin/users"));
    expect(response.status).toBe(200);
    const body = await response.json() as { users: Array<{ email: string; status: string }> };
    expect(Object.fromEntries(body.users.map((user) => [user.email, user.status]))).toMatchObject({
      "both@example.test": "consistent",
      "auth-only@example.test": "auth_only",
      "profile@example.test": "profile_only",
      "missing@example.test": "missing_workshop",
    });
  });

  it("treats the reserved master-control SUPER_ADMIN tenant as valid without settings", async () => {
    const uid = await createAuthUser({ email: "owner@example.test", password: "temporary-1234", displayName: "Owner" });
    await db.collection("users").doc(uid).set({
      uid,
      email: "owner@example.test",
      roles: ["SUPER_ADMIN"],
      workshopId: "master-control",
    });
    const response = await reconcileUsers(request("http://localhost/api/admin/users"));
    const body = await response.json() as { users: Array<{ email: string; status: string; hasWorkshop: boolean }> };
    expect(body.users.find((user) => user.email === "owner@example.test")).toMatchObject({
      status: "consistent",
      hasWorkshop: true,
    });
  });

  it("deletes a workshop identity and all tenant data, and is safe to retry", async () => {
    const uid = await createAuthUser({ email: "delete@example.test", password: "temporary-1234", displayName: "Delete" });
    await db.collection("settings").doc(workshopId).set({ workshopName: "Delete" });
    await db.collection("users").doc(uid).set({ uid, email: "delete@example.test", roles: ["ADMIN"], workshopId });
    for (const name of ["jobs", "inventory", "inventory_transactions", "public_quote_links"]) {
      await db.collection(name).doc(`delete-${name}`).set({ workshopId, createdAt: Timestamp.now() });
    }

    const first = await deleteWorkshop(request("http://localhost/api/admin/workshops", "DELETE", { workshopId }));
    expect(first.status).toBe(200);
    for (const name of ["users", "settings", "jobs", "inventory", "inventory_transactions", "public_quote_links"]) {
      expect((await db.collection(name).where("workshopId", "==", workshopId).get()).empty).toBe(true);
    }
    const retry = await deleteWorkshop(request("http://localhost/api/admin/workshops", "DELETE", { workshopId }));
    expect(retry.status).toBe(200);
  });
});
