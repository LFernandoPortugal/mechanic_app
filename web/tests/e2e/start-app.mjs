import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const projectId = "demo-mechanic-app";
const workshopId = "e2e-workshop";
const authHost = "127.0.0.1:9099";
const firestoreHost = "127.0.0.1:8080";
const password = "FixturePassword123!";

process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;

async function createAuthUser(email) {
  const endpoint = `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2e-api-key`;
  let lastError;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      if (!response.ok) throw new Error(`Auth Emulator returned ${response.status}: ${await response.text()}`);
      return response.json();
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  throw lastError ?? new Error("Auth Emulator did not become ready.");
}

async function waitForFirestore() {
  const endpoint = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents`;
  let lastError;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.status >= 500) throw new Error(`Firestore Emulator returned ${response.status}.`);
      return;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  throw lastError ?? new Error("Firestore Emulator did not become ready.");
}

const { Firestore } = await import("@google-cloud/firestore");
const firestore = new Firestore({ projectId });

const seededUsers = [
  {
    email: "admin.e2e@example.com",
    displayName: "Admin E2E",
    roles: ["ADMIN"],
  },
  {
    email: "reception.e2e@example.com",
    displayName: "Recepción E2E",
    roles: ["RECEPTION"],
  },
  {
    email: "technician.e2e@example.com",
    displayName: "Técnico E2E",
    roles: ["TECHNICIAN"],
  },
  {
    email: "advisor.e2e@example.com",
    displayName: "Asesor E2E",
    roles: ["ADVISOR"],
  },
];

const authUsers = [];
for (const seededUser of seededUsers) {
  authUsers.push({ seededUser, authUser: await createAuthUser(seededUser.email) });
}

await waitForFirestore();
await firestore.doc(`settings/${workshopId}`).set({
  workshopName: "Taller E2E",
  logoUrl: "",
  address: "Entorno local",
  phone: "",
  taxId: "E2E-RUC",
  termsAndConditions: "Fixture local",
  demoMode: false,
  currencySymbol: "S/.",
  taxRate: 18,
  taxName: "IGV",
  disabled: false,
});

for (const { seededUser, authUser } of authUsers) {
  const now = new Date();
  await firestore.doc(`users/${authUser.localId}`).set({
    uid: authUser.localId,
    email: seededUser.email,
    displayName: seededUser.displayName,
    roles: seededUser.roles,
    workshopId,
    createdAt: now,
    updatedAt: now,
  });
}

const nextBin = resolve("node_modules", "next", "dist", "bin", "next");
const nextProcess = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", "3003"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_FIREBASE_API_KEY: "e2e-api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:e2e000000000000",
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-E2E000000",
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: authHost,
    NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: firestoreHost,
    USE_FIREBASE_EMULATORS: "true",
    FIREBASE_AUTH_EMULATOR_HOST: authHost,
    FIREBASE_ADMIN_PROJECT_ID: projectId,
  },
});

const stop = () => nextProcess.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
nextProcess.on("exit", (code) => process.exit(code ?? 0));
