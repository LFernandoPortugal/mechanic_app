import { getAdminFirestore } from "@/lib/firebase-admin";

interface IdentityLookupResponse {
  users?: Array<{ localId?: string; email?: string }>;
}

export interface ServerUserProfile {
  uid: string;
  email: string;
  roles: string[];
  workshopId: string;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUser(request: Request): Promise<ServerUserProfile> {
  const authorization = request.headers.get("authorization") || "";
  const idToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!idToken || !apiKey) throw new HttpError(401, "Sesión no válida.");

  const lookupResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );
  if (!lookupResponse.ok) throw new HttpError(401, "La sesión expiró.");

  const lookup = await lookupResponse.json() as IdentityLookupResponse;
  const uid = lookup.users?.[0]?.localId;
  if (!uid) throw new HttpError(401, "La sesión no identifica a un usuario.");

  const profileSnapshot = await getAdminFirestore().collection("users").doc(uid).get();
  const profile = profileSnapshot.data();
  const roles = profile?.roles;
  if (
    !profileSnapshot.exists
    || !Array.isArray(roles)
    || typeof profile?.workshopId !== "string"
  ) {
    throw new HttpError(403, "El usuario no tiene un perfil operativo.");
  }

  return {
    uid,
    email: String(profile?.email || lookup.users?.[0]?.email || ""),
    roles: roles.filter((role): role is string => typeof role === "string"),
    workshopId: profile.workshopId,
  };
}

export async function requireRoles(request: Request, allowedRoles: string[]) {
  const user = await requireUser(request);
  if (!user.roles.includes("SUPER_ADMIN") && !user.roles.some((role) => allowedRoles.includes(role))) {
    throw new HttpError(403, "El usuario no tiene permisos para esta operaci\u00f3n.");
  }
  return user;
}

export async function requireSuperAdmin(request: Request) {
  const user = await requireUser(request);
  if (!user.roles.includes("SUPER_ADMIN")) {
    throw new HttpError(403, "Se requiere acceso de superadministrador.");
  }
  return user;
}
