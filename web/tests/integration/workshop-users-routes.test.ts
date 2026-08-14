import { Timestamp } from "@google-cloud/firestore";
import type { Firestore } from "@google-cloud/firestore";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminFirestore } from "@/lib/firebase-admin";

const authState = vi.hoisted(() => ({
  caller: {
    uid: "admin-route-test",
    email: "admin@example.test",
    roles: ["ADMIN"],
    workshopId: "ws-users-route",
  },
}));

vi.mock("@/lib/server-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server-auth")>();
  return {
    ...actual,
    requireRoles: vi.fn(async () => authState.caller),
  };
});

import {
  DELETE as deleteWorkshopUser,
  PATCH as updateWorkshopUser,
  POST as createWorkshopUser,
} from "@/app/api/workshop/users/route";

const WORKSHOP_ID = "ws-users-route";
const OTHER_WORKSHOP_ID = "ws-users-other";
let db: Firestore;

function request(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
  return new Request("http://localhost/api/workshop/users", {
    method,
    headers: {
      Authorization: "Bearer integration-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function profile(uid: string, email: string, roles: string[], workshopId = WORKSHOP_ID) {
  const now = Timestamp.now();
  return { uid, email, displayName: email.split("@")[0], roles, workshopId, createdAt: now, updatedAt: now };
}

async function clearAuth() {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host) throw new Error("Auth emulator host is missing.");
  const response = await fetch(`http://${host}/emulator/v1/projects/demo-mechanic-app/accounts`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Unable to clear Auth emulator: ${response.status}`);
}

async function authEmails() {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const response = await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/projects/demo-mechanic-app/accounts:batchGet?key=integration-api-key`,
    { headers: { Authorization: "Bearer owner" } },
  );
  const result = await response.json() as { users?: Array<{ email?: string }> };
  return (result.users || []).map((user) => user.email);
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("User route tests require the Auth and Firestore emulators.");
  }
  process.env.FIREBASE_ADMIN_PROJECT_ID = "demo-mechanic-app";
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "integration-api-key";
  process.env.USE_FIREBASE_EMULATORS = "true";
  db = getAdminFirestore();
});

beforeEach(async () => {
  authState.caller = {
    uid: "admin-route-test",
    email: "admin@example.test",
    roles: ["ADMIN"],
    workshopId: WORKSHOP_ID,
  };
  await clearAuth();
  const existingUsers = await db.collection("users").get();
  const batch = db.batch();
  existingUsers.docs.forEach((document) => batch.delete(document.ref));
  batch.delete(db.collection("settings").doc(WORKSHOP_ID));
  batch.delete(db.collection("settings").doc(OTHER_WORKSHOP_ID));
  await batch.commit();
  await Promise.all([
    db.collection("settings").doc(WORKSHOP_ID).set({
      workshopName: "Taller usuarios",
      disabled: false,
      expiresAtTimestamp: Timestamp.fromDate(new Date("2099-01-01T00:00:00.000Z")),
    }),
    db.collection("settings").doc(OTHER_WORKSHOP_ID).set({ workshopName: "Otro taller", disabled: false }),
    db.collection("users").doc("admin-route-test").set(
      profile("admin-route-test", "admin@example.test", ["ADMIN"]),
    ),
  ]);
});

describe("workshop staff route", () => {
  it("creates Auth and Firestore records together and rejects duplicate email reuse", async () => {
    const payload = {
      displayName: "Técnica Uno",
      email: "tecnica@example.test",
      password: "temporary-1234",
      roles: ["TECHNICIAN"],
    };
    const created = await createWorkshopUser(request("POST", payload));
    expect(created.status).toBe(201);
    const body = await created.json() as { user: { uid: string } };
    expect((await db.collection("users").doc(body.user.uid).get()).data()).toMatchObject({
      email: payload.email,
      workshopId: WORKSHOP_ID,
      roles: ["TECHNICIAN"],
    });
    expect(await authEmails()).toContain(payload.email);

    const duplicate = await createWorkshopUser(request("POST", payload));
    expect(duplicate.status).toBe(409);
    expect((await db.collection("users").where("email", "==", payload.email).get()).size).toBe(1);
    expect((await authEmails()).filter((email) => email === payload.email)).toHaveLength(1);
  });

  it("updates only a user from the caller workshop", async () => {
    await Promise.all([
      db.collection("users").doc("tech-route-test").set(
        profile("tech-route-test", "tech@example.test", ["TECHNICIAN"]),
      ),
      db.collection("users").doc("other-route-test").set(
        profile("other-route-test", "other@example.test", ["TECHNICIAN"], OTHER_WORKSHOP_ID),
      ),
    ]);
    const updated = await updateWorkshopUser(request("PATCH", {
      uid: "tech-route-test",
      displayName: "Técnica Actualizada",
      roles: ["TECHNICIAN", "ADVISOR"],
    }));
    expect(updated.status).toBe(200);
    expect((await db.collection("users").doc("tech-route-test").get()).data()).toMatchObject({
      displayName: "Técnica Actualizada",
      roles: ["TECHNICIAN", "ADVISOR"],
    });

    const crossTenant = await updateWorkshopUser(request("PATCH", {
      uid: "other-route-test",
      displayName: "Intrusión",
      roles: ["ADMIN"],
    }));
    expect(crossTenant.status).toBe(404);
  });

  it("preserves the final ADMIN and prevents self-deletion", async () => {
    const removeLastAdmin = await updateWorkshopUser(request("PATCH", {
      uid: "admin-route-test",
      displayName: "Admin",
      roles: ["RECEPTION"],
    }));
    expect(removeLastAdmin.status).toBe(409);
    expect((await db.collection("users").doc("admin-route-test").get()).data()?.roles).toEqual(["ADMIN"]);

    const selfDelete = await deleteWorkshopUser(request("DELETE", { uid: "admin-route-test" }));
    expect(selfDelete.status).toBe(400);
  });

  it("deletes both the Auth account and operational profile", async () => {
    const created = await createWorkshopUser(request("POST", {
      displayName: "Recepción Temporal",
      email: "temporary@example.test",
      password: "temporary-5678",
      roles: ["RECEPTION"],
    }));
    const { user } = await created.json() as { user: { uid: string } };
    const deleted = await deleteWorkshopUser(request("DELETE", { uid: user.uid }));
    expect(deleted.status).toBe(200);
    expect((await db.collection("users").doc(user.uid).get()).exists).toBe(false);
    expect(await authEmails()).not.toContain("temporary@example.test");
  });
});
