import type { UserRole } from "@/types";

export function getRoleHome(roles: UserRole[] | null | undefined) {
  return roles?.includes("SUPER_ADMIN") ? "/super-admin" : "/";
}

export function getPostLoginRedirect(
  safeRedirect: string,
  roles: UserRole[] | null | undefined,
) {
  if (safeRedirect === "/") return getRoleHome(roles);
  return safeRedirect;
}
