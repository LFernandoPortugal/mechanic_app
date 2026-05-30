import { db } from "./firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { Job } from "@/types";

export interface ClientSummary {
  name: string;
  phone: string;
  email: string;
  vehicles: string[];  // unique plates
  totalVisits: number;
  totalSpent: number;
  lastVisitDate: Date | null;
}

export async function getAllClients(workshopId: string): Promise<ClientSummary[]> {
  const jobsRef = collection(db, "jobs");
  const q = query(jobsRef, where("workshopId", "==", workshopId));
  const snap = await getDocs(q);
  const jobs: Job[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Job));

  const clientMap = new Map<string, ClientSummary>();

  for (const job of jobs) {
    const name = job.clientId;
    if (!name) continue;

    if (!clientMap.has(name)) {
      clientMap.set(name, {
        name,
        phone: job.clientPhone || '',
        email: job.clientEmail || '',
        vehicles: [],
        totalVisits: 0,
        totalSpent: 0,
        lastVisitDate: null,
      });
    }
    const client = clientMap.get(name)!;
    client.totalVisits++;
    client.totalSpent += job.approvedAmount || 0;
    if (job.clientPhone && !client.phone) client.phone = job.clientPhone;
    if (job.clientEmail && !client.email) client.email = job.clientEmail;
    if (job.vehicleId && !client.vehicles.includes(job.vehicleId)) {
      client.vehicles.push(job.vehicleId);
    }
    // Track last visit
    const jobDate = job.createdAt instanceof Timestamp
      ? job.createdAt.toDate()
      : (job.createdAt ? new Date(job.createdAt as unknown as string) : null);
    if (jobDate && (!client.lastVisitDate || jobDate > client.lastVisitDate)) {
      client.lastVisitDate = jobDate;
    }
  }

  return Array.from(clientMap.values()).sort((a, b) =>
    (b.lastVisitDate?.getTime() || 0) - (a.lastVisitDate?.getTime() || 0)
  );
}

export async function getClientJobs(workshopId: string, clientName: string): Promise<Job[]> {
  const jobsRef = collection(db, "jobs");
  const q = query(jobsRef, where("workshopId", "==", workshopId), where("clientId", "==", clientName));
  const snap = await getDocs(q);
  const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Job));
  return jobs.sort((a, b) => {
    const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0);
    const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0);
    return timeB - timeA;
  });
}
