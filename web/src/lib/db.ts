import { auth, db } from "./firebase";
import { arrayUnion, collection, addDoc, Timestamp, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, setDoc, orderBy, runTransaction } from "firebase/firestore";
import { Job, UserProfile, UserRole, InventoryItem, InventoryTransaction, StockMovementType, WorkshopSettings } from "@/types";
import { calculateStockAfterMovement } from "@/lib/transactions";

// ─── User Profile Functions (RBAC) ──────────────────────

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

export async function getUsersByWorkshop(workshopId: string): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("workshopId", "==", workshopId));
    const snap = await getDocs(q);
    const users: UserProfile[] = [];
    snap.forEach((document) => {
      users.push(document.data() as UserProfile);
    });
    return users;
  } catch (e) {
    console.error("Error fetching users by workshop:", e);
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
    await updateDoc(jobRef, {
      technicianId: technicianUid,
      status: "Diagnosis",
      auditLog: arrayUnion(
        createAuditEntry("Diagnóstico Iniciado", technicianUid, "Técnico asignado"),
      ),
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

    const updateData: Record<string, unknown> = { ...data };

    // If an audit entry is requested, append it
    if (actorId && auditAction) {
      updateData.auditLog = arrayUnion(
        createAuditEntry(auditAction, actorId, `Status → ${data.status || 'updated'}`),
      );
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
    calculateStockAfterMovement(0, "ADJUSTMENT", item.stock);

    const itemRef = doc(collection(db, "inventory"));
    const movementRef = doc(collection(db, "inventory_transactions"));

    await runTransaction(db, async (transaction) => {
      const now = Timestamp.now();
      transaction.set(itemRef, {
        ...item,
        ...(item.stock > 0 ? { lastMovementId: movementRef.id } : {}),
        createdAt: now,
        updatedAt: now,
      });

      // The item already starts with this quantity; only record the audit movement.
      if (item.stock > 0) {
        transaction.set(movementRef, {
          itemId: itemRef.id,
          itemName: item.name,
          type: "IN",
          quantity: item.stock,
          unitPrice: item.costPrice ?? item.unitPrice,
          notes: "Stock inicial",
          actorId,
          workshopId: item.workshopId,
          createdAt: now,
        });
      }
    });

    return itemRef.id;
  } catch (e) {
    console.error("Error adding inventory item:", e);
    throw e;
  }
}

export async function updateInventoryItem(
  itemId: string,
  data: Partial<Omit<InventoryItem, 'id' | 'createdAt'>>
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
    const itemRef = doc(db, "inventory", movement.itemId);
    const movementRef = doc(collection(db, "inventory_transactions"));

    await runTransaction(db, async (transaction) => {
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists()) throw new Error("Inventory item not found");

      const itemData = itemSnap.data() as Partial<InventoryItem>;
      if (itemData.workshopId !== movement.workshopId) {
        throw new Error("El artículo no pertenece al taller indicado.");
      }

      const nextStock = calculateStockAfterMovement(
        itemData.stock ?? 0,
        movement.type,
        movement.quantity,
      );
      const now = Timestamp.now();

      transaction.update(itemRef, {
        stock: nextStock,
        lastMovementId: movementRef.id,
        updatedAt: now,
      });
      transaction.set(movementRef, { ...movement, createdAt: now });
    });
  } catch (e) {
    console.error("Error recording stock movement:", e);
    throw e;
  }
}

export async function getStockMovements(
  workshopId: string,
  itemId: string,
  limitCount = 50,
): Promise<InventoryTransaction[]> {
  try {
    const ref = collection(db, "inventory_transactions");
    // The tenant constraint is required both for isolation and so Firestore can
    // prove that every document returned by the query satisfies the read rule.
    const q = query(
      ref,
      where("workshopId", "==", workshopId),
      where("itemId", "==", itemId),
    );
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
}

export interface PaymentResult {
  payment: NonNullable<Job["payments"]>[number];
  status: Job["status"];
  totalPaid: number;
  remainingBalance: number;
}

/**
 * Registers a payment against a Job.
 * The authenticated server appends to `payments[]` and only transitions a
 * Ready order to Delivered when the balance is cleared.
 */
export async function registerPayment(jobId: string, payment: PaymentInput): Promise<PaymentResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("La sesi\u00f3n no est\u00e1 disponible.");

  const token = await currentUser.getIdToken();
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payment),
  });
  const result = await response.json().catch(() => ({})) as Partial<PaymentResult> & { error?: string };
  if (!response.ok) throw new Error(result.error || "No se pudo registrar el pago.");
  if (!result.payment || !result.status || typeof result.totalPaid !== "number") {
    throw new Error("El servidor devolvió una respuesta de pago incompleta.");
  }
  return result as PaymentResult;
}

export interface QualityControlInput {
  outcome: "pass" | "fail";
  notes?: string;
}

export async function submitQualityControl(
  jobId: string,
  input: QualityControlInput,
): Promise<{ status: Job["status"]; remainingBalance?: number }> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("La sesión no está disponible.");

  const token = await currentUser.getIdToken();
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/qc`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => ({})) as {
    error?: string;
    status?: Job["status"];
    remainingBalance?: number;
  };
  if (!response.ok) throw new Error(result.error || "No se pudo registrar el control de calidad.");
  if (!result.status) throw new Error("El servidor devolvió una respuesta de QC incompleta.");
  return { status: result.status, remainingBalance: result.remainingBalance };
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

export async function getWorkshopSettings(workshopId: string): Promise<WorkshopSettings | null> {
  try {
    const docRef = doc(db, "settings", workshopId);
    const docSnap = await getDoc(docRef);
    const defaults: WorkshopSettings = {
      workshopName: "SGA Auto",
      logoUrl: "",
      address: "Av. Principal 123, Lima",
      phone: "+51 900 123 456",
      taxId: "20123456789", // Default Peruvian RUC
      termsAndConditions: "Al firmar, el cliente autoriza los diagnósticos y reparaciones presupuestadas.",
      demoMode: false,
      currencySymbol: "S/.",
      taxRate: 18,
      taxName: "IGV"
    };

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...defaults,
        ...data,
        workshopName: data.workshopName || data.name || defaults.workshopName,
        taxId: data.taxId || data.nit || defaults.taxId
      } as WorkshopSettings;
    }

    // Deleted or non-existent workshops are never synthesized client-side.
    return null;
  } catch (e) {
    console.error("Error fetching settings:", e);
    return null;
  }
}

export async function updateWorkshopSettings(workshopId: string, data: Partial<WorkshopSettings>) {
  try {
    const docRef = doc(db, "settings", workshopId);
    const payload: Record<string, unknown> = { ...data };
    if (data.expiresAt) {
      payload.expiresAtTimestamp = Timestamp.fromDate(new Date(data.expiresAt));
    }
    await setDoc(docRef, payload, { merge: true });
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

export type WorkshopListItem = Partial<WorkshopSettings> & {
  id: string;
  workshopName: string;
  name?: string;
};

export async function getAllWorkshops(): Promise<WorkshopListItem[]> {
  try {
    const ref = collection(db, "settings");
    const snap = await getDocs(ref);
    const workshops: WorkshopListItem[] = [];
    snap.forEach((document) => {
      const data = document.data() as Partial<WorkshopSettings> & { name?: string };
      workshops.push({
        ...data,
        id: document.id,
        workshopName: data.workshopName || data.name || document.id,
      });
    });
    return workshops;
  } catch (e) {
    console.error("Error fetching all workshops:", e);
    return [];
  }
}

export async function deleteWorkshopSettings(workshopId: string) {
  try {
    const docRef = doc(db, "settings", workshopId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error("Error deleting workshop settings:", e);
    throw e;
  }
}

/** Cascade deletes a workshop: removes settings, all user profiles, and operating data */
export async function deleteWorkshopCompletely(workshopId: string): Promise<{ usersDeleted: number; jobsDeleted: number; inventoryDeleted: number; transactionsDeleted: number }> {
  try {
    // 1. Delete operating data (jobs, inventory, transactions)
    const resetResult = await resetWorkshopData(workshopId);

    // 2. Delete all user profiles belonging to this workshop (protecting SUPER_ADMIN)
    const usersRef = collection(db, "users");
    const usersSnap = await getDocs(query(usersRef, where("workshopId", "==", workshopId)));
    let usersDeleted = 0;
    for (const uDoc of usersSnap.docs) {
      const uData = uDoc.data() as UserProfile;
      if (!uData.roles?.includes('SUPER_ADMIN')) {
        await deleteDoc(doc(db, "users", uDoc.id));
        usersDeleted++;
      }
    }

    // 3. Delete the settings document
    const settingsRef = doc(db, "settings", workshopId);
    await deleteDoc(settingsRef);

    return {
      usersDeleted,
      jobsDeleted: resetResult.jobsDeleted,
      inventoryDeleted: resetResult.inventoryDeleted,
      transactionsDeleted: resetResult.transactionsDeleted
    };
  } catch (e) {
    console.error("Error completely deleting workshop:", e);
    throw e;
  }
}

/** Returns the count of active (non-Delivered) jobs for a given workshop */
export async function getActiveJobCountByWorkshop(workshopId: string): Promise<number> {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(
      jobsRef,
      where("workshopId", "==", workshopId),
      where("status", "in", ["Reception", "Diagnosis", "Approval", "Approved", "Repair", "QC", "Ready"])
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (e) {
    console.error("Error counting active jobs:", e);
    return 0;
  }
}
