/**
 * Real-time Firestore listener hook for Jobs.
 * Uses onSnapshot instead of getDocs for live updates across
 * multiple browser tabs / users.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  QueryConstraint,
  Timestamp,
} from "firebase/firestore";
import { Job } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface UseRealtimeJobsOptions {
  /** Firestore statuses to filter by (uses `in` query) */
  statuses?: string[];
  /** If true, fetch ALL jobs (no status filter) */
  all?: boolean;
}

export function useRealtimeJobs(options: UseRealtimeJobsOptions = {}) {
  const { userProfile, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const prevJobsRef = useRef<Map<string, string>>(new Map());
  const isFirstLoadRef = useRef(true);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const wId = userProfile?.workshopId || null;
    if (!wId) {
      setLoading(false);
      return;
    }

    const jobsRef = collection(db, "jobs");

    const constraints: QueryConstraint[] = [
      where("workshopId", "==", wId)
    ];
    
    if (options.statuses && options.statuses.length > 0 && !options.all) {
      constraints.push(where("status", "in", options.statuses));
    }

    const q = query(jobsRef, ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const updatedJobs: Job[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Job[];

        // Sort by createdAt descending
        updatedJobs.sort((a, b) => {
          const timeA =
            a.createdAt instanceof Timestamp
              ? a.createdAt.toMillis()
              : a.createdAt
              ? new Date(a.createdAt).getTime()
              : 0;
          const timeB =
            b.createdAt instanceof Timestamp
              ? b.createdAt.toMillis()
              : b.createdAt
              ? new Date(b.createdAt).getTime()
              : 0;
          return timeB - timeA;
        });

        // Check for status changes to notify via Toast
        if (isFirstLoadRef.current) {
          const newMap = new Map<string, string>();
          for (const j of updatedJobs) {
            newMap.set(j.id, j.status);
          }
          prevJobsRef.current = newMap;
          isFirstLoadRef.current = false;
        } else {
          const prevMap = prevJobsRef.current;
          for (const j of updatedJobs) {
            const prevStatus = prevMap.get(j.id);
            if (prevStatus && prevStatus !== j.status) {
              toast.info(`🔔 Vehículo ${j.vehicleId}: ${prevStatus} ➔ ${j.status}`, {
                duration: 5000,
                position: "top-right"
              });
            }
          }
          const newMap = new Map<string, string>();
          for (const j of updatedJobs) {
            newMap.set(j.id, j.status);
          }
          prevJobsRef.current = newMap;
        }

        setJobs(updatedJobs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Realtime jobs listener error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // Serialize options to avoid infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(options.statuses), options.all, userProfile?.workshopId, authLoading, retryKey]);

  return { jobs, loading, error, retry };
}
