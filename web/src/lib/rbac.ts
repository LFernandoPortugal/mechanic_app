import type { UserRole } from "@/types";

export function hasAssignedRole(assignedRoles: UserRole[], role: UserRole): boolean {
  return assignedRoles.includes("SUPER_ADMIN") || assignedRoles.includes(role);
}

export function hasAnyAssignedRole(
  assignedRoles: UserRole[],
  allowedRoles: UserRole[],
): boolean {
  return assignedRoles.includes("SUPER_ADMIN")
    || allowedRoles.some((role) => assignedRoles.includes(role));
}
