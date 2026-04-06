import { db } from "./firebase";
import { collection, addDoc, Timestamp, doc, getDoc, getDocs, query, where, updateDoc, setDoc, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { Job, UserProfile, UserRole, AuditLog } from "@/types";

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

export async function getAssignedJobs() {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, where("status", "in", ["Reception", "Diagnosis"]));
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

export async function getJobsForQuote() {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, where("status", "==", "Approval"));
    const querySnapshot = await getDocs(q);
    const jobs: Job[] = [];
    querySnapshot.forEach((document) => {
      jobs.push({ id: document.id, ...document.data() } as Job);
    });
    return jobs;
  } catch (e) {
    console.error("Error fetching jobs for quote: ", e);
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

export async function getJobsForClient() {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(jobsRef, where("status", "==", "Ready"));
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

export async function getAllJobs() {
  try {
    const jobsRef = collection(db, "jobs");
    const querySnapshot = await getDocs(jobsRef);
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
