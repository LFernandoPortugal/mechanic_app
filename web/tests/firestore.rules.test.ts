import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  collection,
} from "firebase/firestore";

const projectId = "demo-mechanic-app";
let testEnv: RulesTestEnvironment;

const future = Timestamp.fromDate(new Date("2099-01-01T00:00:00.000Z"));

const profile = (
  uid: string,
  email: string,
  roles: string[],
  workshopId: string,
) => ({
  uid,
  email,
  displayName: email.split("@")[0],
  roles,
  workshopId,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
});

const job = (workshopId: string) => ({
  workshopId,
  vehicleId: "TEST-001",
  clientId: "Cliente de prueba",
  clientPhone: "+51999999999",
  clientEmail: "client@example.test",
  advisorId: "admin-a",
  status: "Approval",
  inspectionItems: [
    { id: "brakes", name: "Frenos", status: "Critical", price: 100 },
  ],
  declinedItems: [],
  totalEstimate: 150,
  approvedAmount: 0,
  signatureBase64: "data:image/png;base64,private-signature",
  receptionImages: ["data:image/jpeg;base64,private-photo"],
  auditLog: [],
  createdAt: Timestamp.now(),
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "settings", "master-control"), {
        workshopName: "Control",
        disabled: false,
      }),
      setDoc(doc(db, "settings", "ws-a"), {
        workshopName: "Taller A",
        adminEmail: "admin-a@example.test",
        allowResetData: false,
        disabled: false,
        expiresAtTimestamp: future,
      }),
      setDoc(doc(db, "settings", "ws-b"), {
        workshopName: "Taller B",
        adminEmail: "admin-b@example.test",
        allowResetData: false,
        disabled: false,
        expiresAtTimestamp: future,
      }),
      setDoc(
        doc(db, "users", "super"),
        profile("super", "owner@example.test", ["SUPER_ADMIN"], "master-control"),
      ),
      setDoc(
        doc(db, "users", "admin-a"),
        profile("admin-a", "admin-a@example.test", ["ADMIN"], "ws-a"),
      ),
      setDoc(
        doc(db, "users", "tech-a"),
        profile("tech-a", "tech-a@example.test", ["TECHNICIAN"], "ws-a"),
      ),
      setDoc(
        doc(db, "users", "advisor-a"),
        profile("advisor-a", "advisor-a@example.test", ["ADVISOR"], "ws-a"),
      ),
      setDoc(
        doc(db, "users", "reception-a"),
        profile("reception-a", "reception-a@example.test", ["RECEPTION"], "ws-a"),
      ),
      setDoc(
        doc(db, "users", "admin-b"),
        profile("admin-b", "admin-b@example.test", ["ADMIN"], "ws-b"),
      ),
      setDoc(doc(db, "jobs", "job-a"), job("ws-a")),
      setDoc(doc(db, "jobs", "job-diagnosis"), {
        ...job("ws-a"),
        status: "Diagnosis",
      }),
      setDoc(doc(db, "jobs", "job-ready"), {
        ...job("ws-a"),
        status: "Ready",
        approvedAmount: 150,
      }),
      setDoc(doc(db, "jobs", "job-ready-partial"), {
        ...job("ws-a"),
        status: "Ready",
        approvedAmount: 150,
        payments: [{
          id: "pay-existing",
          amount: 50,
          method: "Efectivo",
          reference: "",
          date: new Date().toISOString(),
          actorId: "advisor-a",
        }],
      }),
      setDoc(doc(db, "jobs", "job-qc"), {
        ...job("ws-a"),
        status: "QC",
        approvedAmount: 150,
        auditLog: [{
          actorId: "tech-a",
          action: "Enviado a QC",
          notes: "ready for inspection",
          timestamp: Timestamp.now(),
        }],
      }),
      setDoc(doc(db, "jobs", "job-audited"), {
        ...job("ws-a"),
        auditLog: [{
          actorId: "tech-a",
          action: "Diagnóstico Enviado",
          notes: "original immutable entry",
          timestamp: Timestamp.now(),
        }],
      }),
      setDoc(doc(db, "inventory", "item-a"), {
        workshopId: "ws-a",
        sku: "TEST-001",
        name: "Repuesto de prueba",
        category: "Otro",
        unitPrice: 10,
        costPrice: 5,
        stock: 10,
        minStock: 2,
        unit: "pcs",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
      setDoc(doc(db, "inventory", "item-unlimited"), {
        workshopId: "ws-a",
        sku: "SERVICE-001",
        name: "Mano de obra",
        category: "Mano de Obra",
        unitPrice: 50,
        stock: -1,
        minStock: 0,
        unit: "hora",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    ]);
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("user privilege boundaries", () => {
  it("rejects self-provisioning a SUPER_ADMIN profile", async () => {
    const db = testEnv
      .authenticatedContext("attacker", { email: "attacker@example.test" })
      .firestore();

    await assertFails(
      setDoc(
        doc(db, "users", "attacker"),
        profile("attacker", "attacker@example.test", ["SUPER_ADMIN"], "master-control"),
      ),
    );
  });

  it("keeps profile provisioning server-side, even for SUPER_ADMIN clients", async () => {
    const db = testEnv
      .authenticatedContext("super", { email: "owner@example.test" })
      .firestore();

    await assertFails(
      setDoc(
        doc(db, "users", "new-tech"),
        profile("new-tech", "new-tech@example.test", ["TECHNICIAN"], "ws-a"),
      ),
    );
  });

  it("prevents a user from changing their own roles", async () => {
    const db = testEnv
      .authenticatedContext("tech-a", { email: "tech-a@example.test" })
      .firestore();

    await assertFails(
      updateDoc(doc(db, "users", "tech-a"), { roles: ["ADMIN"] }),
    );
  });

  it("prevents tenant A from reading tenant B profiles", async () => {
    const db = testEnv
      .authenticatedContext("admin-a", { email: "admin-a@example.test" })
      .firestore();

    await assertFails(getDoc(doc(db, "users", "admin-b")));
  });
});

describe("settings boundaries", () => {
  it("does not expose private workshop settings publicly", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "settings", "ws-a")));
  });

  it("allows an admin to edit branding", async () => {
    const db = testEnv
      .authenticatedContext("admin-a", { email: "admin-a@example.test" })
      .firestore();

    await assertSucceeds(
      updateDoc(doc(db, "settings", "ws-a"), {
        workshopName: "Taller A+",
        demoMode: true,
      }),
    );
  });

  it("prevents an admin from extending their trial or enabling destructive resets", async () => {
    const db = testEnv
      .authenticatedContext("admin-a", { email: "admin-a@example.test" })
      .firestore();

    await assertFails(
      updateDoc(doc(db, "settings", "ws-a"), {
        expiresAtTimestamp: Timestamp.fromDate(new Date("2100-01-01T00:00:00.000Z")),
      }),
    );
    await assertFails(
      updateDoc(doc(db, "settings", "ws-a"), { allowResetData: true }),
    );
  });

  it("only lets SUPER_ADMIN list every workshop", async () => {
    const adminDb = testEnv
      .authenticatedContext("admin-a", { email: "admin-a@example.test" })
      .firestore();
    const superDb = testEnv
      .authenticatedContext("super", { email: "owner@example.test" })
      .firestore();

    await assertFails(getDocs(collection(adminDb, "settings")));
    await assertSucceeds(getDocs(collection(superDb, "settings")));
  });
});

describe("public quote boundary", () => {
  it("does not expose complete jobs to unauthenticated clients", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "jobs", "job-a")));
  });

  it("does not let unauthenticated clients rewrite a job", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(db, "jobs", "job-a"), {
        status: "Approved",
        approvedAmount: 0,
        auditLog: [{ actorId: "forged", action: "forged" }],
      }),
    );
  });

  it("still lets the owning workshop read its job", async () => {
    const db = testEnv
      .authenticatedContext("admin-a", { email: "admin-a@example.test" })
      .firestore();
    await assertSucceeds(getDoc(doc(db, "jobs", "job-a")));
  });
});

describe("job workflow boundaries", () => {
  const audit = (actorId: string, action: string) => ({
    actorId,
    action,
    notes: "test",
    timestamp: Timestamp.now(),
  });

  it("lets reception create only a clean Reception job", async () => {
    const db = testEnv
      .authenticatedContext("reception-a", { email: "reception-a@example.test" })
      .firestore();
    const validJob = {
      workshopId: "ws-a",
      vehicleId: "TEST-NEW",
      clientId: "Cliente nuevo",
      advisorId: "reception-a",
      status: "Reception",
      inspectionItems: [],
      declinedItems: [],
      totalEstimate: 0,
      approvedAmount: 0,
      createdAt: Timestamp.now(),
      auditLog: [audit("reception-a", "Check-in")],
    };

    await assertSucceeds(setDoc(doc(db, "jobs", "new-job"), validJob));
    await assertFails(
      setDoc(doc(db, "jobs", "forged-job"), {
        ...validJob,
        status: "Delivered",
        approvedAmount: 999,
      }),
    );
  });

  it("allows a technician to submit diagnosis but not skip workflow states", async () => {
    const db = testEnv
      .authenticatedContext("tech-a", { email: "tech-a@example.test" })
      .firestore();
    const inspectionItems = [
      { id: "oil", name: "Aceite", status: "Recommended" },
    ];

    await assertSucceeds(
      updateDoc(doc(db, "jobs", "job-diagnosis"), {
        inspectionItems,
        status: "Approval",
        auditLog: [audit("tech-a", "Diagnóstico Enviado")],
      }),
    );
    await assertFails(
      updateDoc(doc(db, "jobs", "job-a"), {
        status: "Delivered",
        auditLog: [audit("tech-a", "Salto de estado")],
      }),
    );
  });

  it("lets an advisor price a quote without changing customer data", async () => {
    const db = testEnv
      .authenticatedContext("advisor-a", { email: "advisor-a@example.test" })
      .firestore();
    const pricedItems = [
      { id: "brakes", name: "Frenos", status: "Critical", price: 120 },
    ];

    await assertSucceeds(
      updateDoc(doc(db, "jobs", "job-a"), {
        inspectionItems: pricedItems,
        totalEstimate: 170,
        auditLog: [audit("advisor-a", "Quote Generated")],
      }),
    );
    await assertFails(
      updateDoc(doc(db, "jobs", "job-a"), {
        clientEmail: "changed@example.test",
        auditLog: [audit("advisor-a", "PII changed")],
      }),
    );
  });

  it("rejects every direct client payment mutation", async () => {
    const db = testEnv
      .authenticatedContext("advisor-a", { email: "advisor-a@example.test" })
      .firestore();
    const payment = {
      id: "pay-test",
      amount: 150,
      method: "Efectivo",
      reference: "",
      date: new Date().toISOString(),
      actorId: "advisor-a",
    };

    await assertFails(
      updateDoc(doc(db, "jobs", "job-ready"), {
        payments: [payment],
        status: "Delivered",
        auditLog: [
          audit("advisor-a", "Pago Registrado"),
          audit("advisor-a", "Entregado"),
        ],
      }),
    );
    await assertFails(
      updateDoc(doc(db, "jobs", "job-a"), {
        payments: [{ ...payment, amount: 999 }],
        auditLog: [audit("advisor-a", "Pago excesivo")],
      }),
    );
    await assertFails(
      updateDoc(doc(db, "jobs", "job-ready-partial"), {
        payments: [
          { ...payment, id: "pay-existing", amount: 1 },
          { ...payment, id: "pay-new", amount: 100 },
        ],
        auditLog: [audit("advisor-a", "Reescritura de pago")],
      }),
    );
  });

  it("keeps QC completion server-side so clients cannot skip the checklist", async () => {
    const db = testEnv
      .authenticatedContext("admin-a", { email: "admin-a@example.test" })
      .firestore();
    const original = await getDoc(doc(db, "jobs", "job-qc"));
    const existingAudit = original.data()?.auditLog ?? [];

    await assertFails(
      updateDoc(doc(db, "jobs", "job-qc"), {
        status: "Delivered",
        auditLog: [...existingAudit, audit("admin-a", "QC omitido")],
      }),
    );
    await assertFails(
      updateDoc(doc(db, "jobs", "job-qc"), {
        status: "Ready",
        auditLog: [...existingAudit, audit("admin-a", "QC directo")],
      }),
    );
  });

  it("does not allow rewriting previous audit entries while appending a new one", async () => {
    const db = testEnv
      .authenticatedContext("advisor-a", { email: "advisor-a@example.test" })
      .firestore();
    const snapshot = await getDoc(doc(db, "jobs", "job-audited"));
    const existingAudit = snapshot.data()?.auditLog ?? [];

    await assertSucceeds(
      updateDoc(doc(db, "jobs", "job-audited"), {
        totalEstimate: 175,
        auditLog: [...existingAudit, audit("advisor-a", "Cotización actualizada")],
      }),
    );

    const updated = await getDoc(doc(db, "jobs", "job-audited"));
    const currentAudit = updated.data()?.auditLog ?? [];
    await assertFails(
      updateDoc(doc(db, "jobs", "job-audited"), {
        totalEstimate: 180,
        auditLog: [
          { ...currentAudit[0], notes: "historial alterado" },
          currentAudit[1],
          audit("advisor-a", "Intento de reescritura"),
        ],
      }),
    );
  });
});

describe("inventory audit boundaries", () => {
  it("requires an immutable movement for every stock change", async () => {
    const db = testEnv
      .authenticatedContext("admin-a", { email: "admin-a@example.test" })
      .firestore();

    await assertFails(
      updateDoc(doc(db, "inventory", "item-a"), {
        stock: 999,
        updatedAt: Timestamp.now(),
      }),
    );

    const batch = writeBatch(db);
    batch.update(doc(db, "inventory", "item-a"), {
      stock: 12,
      lastMovementId: "move-valid",
      updatedAt: Timestamp.now(),
    });
    batch.set(doc(db, "inventory_transactions", "move-valid"), {
      workshopId: "ws-a",
      itemId: "item-a",
      itemName: "Repuesto de prueba",
      type: "IN",
      quantity: 2,
      unitPrice: 5,
      actorId: "admin-a",
      createdAt: Timestamp.now(),
    });
    await assertSucceeds(batch.commit());

    await assertFails(
      updateDoc(doc(db, "inventory_transactions", "move-valid"), {
        quantity: 200,
      }),
    );

    await assertFails(
      updateDoc(doc(db, "inventory", "item-a"), {
        stock: 14,
        lastMovementId: "move-valid",
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("rejects a movement that is not linked to its resulting item state", async () => {
    const db = testEnv
      .authenticatedContext("admin-a", { email: "admin-a@example.test" })
      .firestore();

    await assertFails(
      setDoc(doc(db, "inventory_transactions", "move-forged"), {
        workshopId: "ws-a",
        itemId: "item-a",
        itemName: "Repuesto de prueba",
        type: "IN",
        quantity: 500,
        unitPrice: 5,
        actorId: "admin-a",
        createdAt: Timestamp.now(),
      }),
    );
  });

  it("validates initial stock and requires its matching initial movement", async () => {
    const db = testEnv
      .authenticatedContext("admin-a", { email: "admin-a@example.test" })
      .firestore();
    const initialItem = {
      workshopId: "ws-a",
      sku: "NEW-001",
      name: "Artículo nuevo",
      category: "Otro",
      unitPrice: 12,
      costPrice: 8,
      stock: 3,
      minStock: 1,
      unit: "pcs",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await assertFails(setDoc(doc(db, "inventory", "item-without-movement"), initialItem));

    const batch = writeBatch(db);
    batch.set(doc(db, "inventory", "item-with-movement"), {
      ...initialItem,
      lastMovementId: "move-initial",
    });
    batch.set(doc(db, "inventory_transactions", "move-initial"), {
      workshopId: "ws-a",
      itemId: "item-with-movement",
      itemName: "Artículo nuevo",
      type: "IN",
      quantity: 3,
      unitPrice: 8,
      actorId: "admin-a",
      createdAt: Timestamp.now(),
    });
    await assertSucceeds(batch.commit());
  });

  it("allows metadata edits but rejects stock movements on unlimited services", async () => {
    const db = testEnv
      .authenticatedContext("admin-a", { email: "admin-a@example.test" })
      .firestore();

    await assertSucceeds(
      updateDoc(doc(db, "inventory", "item-a"), {
        name: "Repuesto actualizado",
        updatedAt: Timestamp.now(),
      }),
    );

    const batch = writeBatch(db);
    batch.update(doc(db, "inventory", "item-unlimited"), {
      stock: -1,
      lastMovementId: "move-unlimited",
      updatedAt: Timestamp.now(),
    });
    batch.set(doc(db, "inventory_transactions", "move-unlimited"), {
      workshopId: "ws-a",
      itemId: "item-unlimited",
      itemName: "Mano de obra",
      type: "IN",
      quantity: 1,
      unitPrice: 50,
      actorId: "admin-a",
      createdAt: Timestamp.now(),
    });
    await assertFails(batch.commit());
  });
});
