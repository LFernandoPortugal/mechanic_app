import { authenticatedJsonRequest } from "@/lib/authenticated-api";
import type { UserRole } from "@/types";

export interface WorkshopUserInput {
  displayName: string;
  roles: Exclude<UserRole, "SUPER_ADMIN">[];
}

export async function createWorkshopUser(input: WorkshopUserInput & {
  email: string;
  password: string;
}) {
  return authenticatedJsonRequest<{ ok: true; user: { uid: string } }>("/api/workshop/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateWorkshopUser(uid: string, input: WorkshopUserInput) {
  return authenticatedJsonRequest<{ ok: true }>("/api/workshop/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, ...input }),
  });
}

export async function deleteWorkshopUser(uid: string) {
  return authenticatedJsonRequest<{ ok: true }>("/api/workshop/users", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid }),
  });
}
