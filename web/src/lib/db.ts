import { db } from "./firebase";
import { collection, addDoc, Timestamp, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, setDoc, orderBy, limit as firestoreLimit, increment } from "firebase/firestore";
import { Job, UserProfile, UserRole, AuditLog, InventoryItem, InventoryTransaction, StockMovementType } from "@/types";

// ─── User Profile Functions (RBAC) ──────────────────────

export async function createUserProfile(uid: string, email: string, displayName?: string, roles?: UserRole[]) {
  try {
    const userRef = doc(db, "users", uid);
    const existing = await getDoc(userRef);
    if (existing.exists()) return existing.data() as UserProfile;

    const profile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & { createdAt: any; updatedAt: any } = {
      uid,
      email,
      displayName: displayName || email.split('@')[0],
      roles: roles || ['RECEPTION'],
      workshopId: "demo-workshop", // Default workshop for SaaS demo / friend
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(userRef, profile);
    return profile as unknown as UserProfile;
  } catch (e) {
    console.error("Error creating user profile:", e);
    throw e;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (e) {
    console.error("Error fetching user profile:", e);
    return null;
  }
}

export async function updateUserRoles(uid: string, roles: UserRole[]) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { roles, updatedAt: Timestamp.now() });
  } catch (e) {
    console.error("Error updating user roles:", e);
    throw e;
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, "users");
    const snap = await getDocs(usersRef);
    const users: UserProfile[] = [];
    snap.forEach((document) => {
      users.push(document.data() as UserProfile);
    });
    return users;
  } catch (e) {
    console.error("Error fetching all users:", e);
    return [];
  }
}

// ─── Audit Log Helper ───────────────────────────────────

function createAuditEntry(action: string, actorId: string, notes?: string) {
  return {
    timestamp: Timestamp.now(),
    action,
    actorId,
    notes: notes || "",
  };
}

// ─── Job Functions ──────────────────────────────────────

export async function createJob(jobData: Omit<Job, "id" | "createdAt" | "auditLog">, actorId: string) {
  try {
    const docRef = await addDoc(collection(db, "jobs"), {
      ...jobData,
      createdAt: Timestamp.now(),
      auditLog: [
        createAuditEntry("Check-in", actorId, `Vehicle ${jobData.vehicleId} received`),
      ],
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
}

export async function getAssignedJobs(workshopId: string) {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, where("workshopId", "==", workshopId), where("status", "in", ["Reception", "Diagnosis", "Approved", "Repair", "QC"]));
    const querySnapshot = await getDocs(q);
    const jobs: Job[] = [];
    querySnapshot.forEach((document) => {
      jobs.push({ id: document.id, ...document.data() } as Job);
    });
    return jobs;
  } catch (e) {
    console.error("Error fetching jobs: ", e);
    return [];
  }
}

export async function assignTechnician(jobId: string, technicianUid: string) {
  try {
    const jobRef = doc(db, "jobs", jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) throw new Error("Job not found");

    const existingLog = jobSnap.data()?.auditLog || [];

    await updateDoc(jobRef, {
      technicianId: technicianUid,
      status: "Diagnosis",
      auditLog: [
        ...existingLog,
        createAuditEntry("Diagnosis Started", technicianUid, "Technician assigned"),
      ],
    });
  } catch (e) {
    console.error("Error assigning technician:", e);
    throw e;
  }
}

export async function getJobsForAdvisor(workshopId: string) {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, where("workshopId", "==", workshopId), where("status", "in", ["Approval", "Ready", "Approved", "Repair"]));
    const querySnapshot = await getDocs(q);
    const jobs: Job[] = [];
    querySnapshot.forEach((document) => {
      jobs.push({ id: document.id, ...document.data() } as Job);
    });
    return jobs;
  } catch (e) {
    console.error("Error fetching jobs for advisor: ", e);
    return [];
  }
}

export async function updateJob(jobId: string, data: Partial<Job>, actorId?: string, auditAction?: string) {
  try {
    const jobRef = doc(db, "jobs", jobId);

    const updateData: any = { ...data };

    // If an audit entry is requested, append it
    if (actorId && auditAction) {
      const jobSnap = await getDoc(jobRef);
      const existingLog = jobSnap.exists() ? (jobSnap.data()?.auditLog || []) : [];
      updateData.auditLog = [
        ...existingLog,
        createAuditEntry(auditAction, actorId, `Status → ${data.status || 'updated'}`),
      ];
    }

    await updateDoc(jobRef, updateData);
  } catch (e) {
    console.error("Error updating job: ", e);
    throw e;
  }
}

export async function getJobsForClient(workshopId: string) {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, where("workshopId", "==", workshopId), where("status", "==", "Ready"));
    const querySnapshot = await getDocs(q);
    const jobs: Job[] = [];
    querySnapshot.forEach((document) => {
      jobs.push({ id: document.id, ...document.data() } as Job);
    });
    return jobs;
  } catch (e) {
    console.error("Error fetching jobs for client: ", e);
    return [];
  }
}

export async function getAllJobs(workshopId: string) {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, where("workshopId", "==", workshopId));
    const querySnapshot = await getDocs(q);
    const jobs: Job[] = [];
    querySnapshot.forEach((document) => {
      jobs.push({ id: document.id, ...document.data() } as Job);
    });
    return jobs;
  } catch (e) {
    console.error("Error fetching all jobs: ", e);
    return [];
  }
}

export async function getJobById(jobId: string): Promise<Job | null> {
  try {
    const jobRef = doc(db, "jobs", jobId);
    const jobSnap = await getDoc(jobRef);
    if (jobSnap.exists()) {
      return { id: jobSnap.id, ...jobSnap.data() } as Job;
    } else {
      console.log("No such job!");
      return null;
    }
  } catch (e) {
    console.error("Error fetching job: ", e);
    return null;
  }
}

// ─── Inventory Functions ─────────────────────────────────

export async function getInventoryItems(workshopId: string, category?: string): Promise<InventoryItem[]> {
  try {
    const ref = collection(db, "inventory");
    let q;
    if (category) {
      q = query(ref, where("workshopId", "==", workshopId), where("category", "==", category));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
      return items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      q = query(ref, where("workshopId", "==", workshopId), orderBy("name"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
    }
  } catch (e) {
    console.error("Error fetching inventory:", e);
    return [];
  }
}

export async function getInventoryItem(itemId: string): Promise<InventoryItem | null> {
  try {
    const snap = await getDoc(doc(db, "inventory", itemId));
    return snap.exists() ? { id: snap.id, ...snap.data() } as InventoryItem : null;
  } catch (e) {
    console.error("Error fetching inventory item:", e);
    return null;
  }
}

export async function addInventoryItem(
  item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>,
  actorId: string
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "inventory"), {
      ...item,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    // Record the initial stock as an IN movement
    if (item.stock > 0) {
      await recordStockMovement({
        itemId: ref.id,
        itemName: item.name,
        type: 'IN',
        quantity: item.stock,
        unitPrice: item.costPrice ?? item.unitPrice,
        notes: 'Stock inicial',
        actorId,
        workshopId: item.workshopId,
      });
    }
    return ref.id;
  } catch (e) {
    console.error("Error adding inventory item:", e);
    throw e;
  }
}

export async function updateInventoryItem(
  itemId: string,
  data: Partial<Omit<InventoryItem, 'id' | 'createdAt'>>,
  actorId?: string
): Promise<void> {
  try {
    await updateDoc(doc(db, "inventory", itemId), {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (e) {
    console.error("Error updating inventory item:", e);
    throw e;
  }
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "inventory", itemId));
  } catch (e) {
    console.error("Error deleting inventory item:", e);
    throw e;
  }
}

export interface StockMovementInput {
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  unitPrice: number;
  jobId?: string;
  notes?: string;
  actorId: string;
  workshopId: string; // Associate transaction with workshop
}

/**
 * Records a stock movement and atomically updates the item's stock.
 * OUT movements decrease stock; IN movements increase it; ADJUSTMENT sets it.
 */
export async function recordStockMovement(movement: StockMovementInput): Promise<void> {
  try {
    // 1. Write the transaction log entry
    await addDoc(collection(db, "inventory_transactions"), {
      ...movement,
      createdAt: Timestamp.now(),
    });

    // 2. Update the item stock atomically
    const itemRef = doc(db, "inventory", movement.itemId);
    if (movement.type === 'IN') {
      await updateDoc(itemRef, { stock: increment(movement.quantity), updatedAt: Timestamp.now() });
    } else if (movement.type === 'OUT') {
      await updateDoc(itemRef, { stock: increment(-movement.quantity), updatedAt: Timestamp.now() });
    } else {
      // ADJUSTMENT: caller should pass the new absolute stock as quantity
      await updateDoc(itemRef, { stock: movement.quantity, updatedAt: Timestamp.now() });
    }
  } catch (e) {
    console.error("Error recording stock movement:", e);
    throw e;
  }
}

export async function getStockMovements(itemId: string, limitCount = 50): Promise<InventoryTransaction[]> {
  try {
    const ref = collection(db, "inventory_transactions");
    const q = query(ref, where("itemId", "==", itemId));
    const snap = await getDocs(q);
    const txs = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryTransaction));
    return txs
      .sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      })
      .slice(0, limitCount);
  } catch (e) {
    console.error("Error fetching stock movements:", e);
    return [];
  }
}

// ─── Payment Functions ───────────────────────────────────

export interface PaymentInput {
  amount: number;
  method: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Yape/Plin';
  reference?: string;
  actorId: string;
}

/**
 * Registers a payment against a Job.
 * Appends to `payments[]`, updates `approvedAmount`, and optionally
 * transitions status to `Delivered` when the balance is cleared.
 */
export async function registerPayment(jobId: string, payment: PaymentInput): Promise<void> {
  try {
    const jobRef = doc(db, "jobs", jobId);
    const jobSnap = await getDoc(jobRef);
    if (!jobSnap.exists()) throw new Error("Job not found");

    const data = jobSnap.data();
    const existingPayments: any[] = data?.payments || [];
    const totalEstimate: number = data?.totalEstimate || 0;

    const newPayment = {
      id: `pay_${Date.now()}`,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference || "",
      date: new Date().toISOString(),
      actorId: payment.actorId,
    };

    const allPayments = [...existingPayments, newPayment];
    const totalPaid = allPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const isFullyPaid = totalPaid >= totalEstimate;

    const existingLog: any[] = data?.auditLog || [];
    const auditEntry = createAuditEntry(
      "Payment Registered",
      payment.actorId,
      `${payment.method} $${payment.amount.toFixed(2)}${payment.reference ? ` — Ref: ${payment.reference}` : ""}`
    );

    const updates: any = {
      payments: allPayments,
      approvedAmount: totalPaid,
      auditLog: [...existingLog, auditEntry],
    };

    if (isFullyPaid) {
      updates.status = "Delivered";
      updates.auditLog = [
        ...existingLog,
        auditEntry,
        createAuditEntry("Delivered", payment.actorId, "Fully paid — vehicle delivered"),
      ];
    }

    await updateDoc(jobRef, updates);
  } catch (e) {
    console.error("Error registering payment:", e);
    throw e;
  }
}

export async function getJobsByStatus(workshopId: string, statuses: string[]): Promise<Job[]> {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, where("workshopId", "==", workshopId), where("status", "in", statuses));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Job));
  } catch (e) {
    console.error("Error fetching jobs by status:", e);
    return [];
  }
}

export async function searchInventoryItems(workshopId: string, term: string, limit = 10): Promise<InventoryItem[]> {
  // Firestore doesn't support full-text search natively.
  // We fetch all items and filter client-side (fine for workshop-scale inventory < 5k items).
  try {
    const items = await getInventoryItems(workshopId);
    const lower = term.toLowerCase();
    return items
      .filter(i => i.name.toLowerCase().includes(lower) || i.sku.toLowerCase().includes(lower))
      .slice(0, limit);
  } catch (e) {
    console.error("Error searching inventory:", e);
    return [];
  }
}

export async function getWorkshopSettings(workshopId: string) {
  try {
    const docRef = doc(db, "settings", workshopId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    // Default settings if they don't exist yet
    return {
      workshopName: "Taller Automotriz",
      logoUrl: "",
      address: "",
      phone: "",
      taxId: "",
      termsAndConditions: "Al firmar, el cliente autoriza los diagnósticos y reparaciones presupuestadas.",
      demoMode: true
    };
  } catch (e) {
    console.error("Error fetching settings:", e);
    return null;
  }
}

export async function updateWorkshopSettings(workshopId: string, data: any) {
  try {
    const docRef = doc(db, "settings", workshopId);
    await setDoc(docRef, data, { merge: true });
  } catch (e) {
    console.error("Error updating settings:", e);
    throw e;
  }
}

export async function getJobsByVehicleId(workshopId: string, vehicleId: string): Promise<Job[]> {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, where("workshopId", "==", workshopId), where("vehicleId", "==", vehicleId));
    const snap = await getDocs(q);
    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Job));
    return jobs.sort((a, b) => {
      const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  } catch (e) {
    console.error("Error fetching jobs by vehicleId:", e);
    return [];
  }
}

export async function resetWorkshopData(workshopId: string): Promise<{ jobsDeleted: number; inventoryDeleted: number; transactionsDeleted: number }> {
  try {
    let jobsDeleted = 0;
    let inventoryDeleted = 0;
    let transactionsDeleted = 0;

    // 1. Delete jobs
    const jobsRef = collection(db, "jobs");
    const jobsSnap = await getDocs(query(jobsRef, where("workshopId", "==", workshopId)));
    for (const document of jobsSnap.docs) {
      await deleteDoc(doc(db, "jobs", document.id));
      jobsDeleted++;
    }

    // 2. Delete inventory
    const invRef = collection(db, "inventory");
    const invSnap = await getDocs(query(invRef, where("workshopId", "==", workshopId)));
    for (const document of invSnap.docs) {
      await deleteDoc(doc(db, "inventory", document.id));
      inventoryDeleted++;
    }

    // 3. Delete inventory transactions
    const txRef = collection(db, "inventory_transactions");
    const txSnap = await getDocs(query(txRef, where("workshopId", "==", workshopId)));
    for (const document of txSnap.docs) {
      await deleteDoc(doc(db, "inventory_transactions", document.id));
      transactionsDeleted++;
    }

    return { jobsDeleted, inventoryDeleted, transactionsDeleted };
  } catch (e) {
    console.error("Error resetting workshop data:", e);
    throw e;
  }
}

