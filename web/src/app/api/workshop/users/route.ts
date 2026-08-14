import { FieldValue, Timestamp } from "@google-cloud/firestore";
import { NextResponse } from "next/server";
import { createAuthUser, deleteAuthUser, IdentityToolkitError } from "@/lib/identity-toolkit-admin";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { HttpError, requireRoles, type ServerUserProfile } from "@/lib/server-auth";
import { isWorkshopActive } from "@/lib/server-workshop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
const VALID_ROLES = ["ADMIN", "RECEPTION", "TECHNICIAN", "ADVISOR"] as const;
type WorkshopRole = typeof VALID_ROLES[number];

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: RESPONSE_HEADERS });

function parseRoles(value: unknown): WorkshopRole[] {
  if (!Array.isArray(value)) throw new HttpError(400, "Selecciona al menos un rol válido.");
  const roles = [...new Set(value.filter((role): role is string => typeof role === "string"))];
  if (
    roles.length === 0
    || roles.length > VALID_ROLES.length
    || roles.some((role) => !VALID_ROLES.includes(role as WorkshopRole))
  ) {
    throw new HttpError(400, "La lista de roles no es válida.");
  }
  return roles as WorkshopRole[];
}

function parseDisplayName(value: unknown) {
  const displayName = String(value || "").trim();
  if (displayName.length < 2 || displayName.length > 100) {
    throw new HttpError(400, "El nombre debe tener entre 2 y 100 caracteres.");
  }
  return displayName;
}

function parseUid(value: unknown) {
  const uid = String(value || "").trim();
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(uid)) throw new HttpError(400, "El usuario no es válido.");
  return uid;
}

async function requireActiveWorkshop(request: Request) {
  const caller = await requireRoles(request, ["ADMIN"]);
  if (caller.roles.includes("SUPER_ADMIN")) {
    throw new HttpError(403, "Usa una cuenta ADMIN del taller para gestionar su personal.");
  }
  const settings = await getAdminFirestore().collection("settings").doc(caller.workshopId).get();
  if (!settings.exists || !isWorkshopActive(settings.data() ?? {}, caller.workshopId)) {
    throw new HttpError(403, "El taller no está activo.");
  }
  return caller;
}

function assertWorkshopTarget(
  caller: ServerUserProfile,
  target: FirebaseFirestore.DocumentSnapshot,
) {
  const data = target.data();
  if (!target.exists || data?.workshopId !== caller.workshopId) {
    throw new HttpError(404, "El usuario no pertenece a este taller.");
  }
  if (Array.isArray(data.roles) && data.roles.includes("SUPER_ADMIN")) {
    throw new HttpError(403, "No se puede modificar una cuenta SUPER_ADMIN.");
  }
  return data;
}

function assertAdminContinuity(
  targetRoles: unknown,
  nextRoles: WorkshopRole[] | null,
  adminCount: number,
) {
  const isAdmin = Array.isArray(targetRoles) && targetRoles.includes("ADMIN");
  const remainsAdmin = nextRoles?.includes("ADMIN") ?? false;
  if (isAdmin && !remainsAdmin && adminCount <= 1) {
    throw new HttpError(409, "El taller debe conservar al menos una cuenta ADMIN.");
  }
}

function errorResponse(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof IdentityToolkitError) {
    if (error.code.includes("EMAIL_EXISTS")) {
      return json({ error: "Ese correo ya existe en Firebase Authentication y no se combinó con este taller." }, 409);
    }
    if (error.code.includes("INVALID_EMAIL") || error.code.includes("INVALID_PASSWORD")) {
      return json({ error: "Firebase rechazó el correo o la contraseña." }, 400);
    }
  }
  console.error("Workshop user operation failed:", error);
  return json({ error: "No se pudo completar la operación de usuarios." }, 500);
}

export async function POST(request: Request) {
  let createdUid: string | null = null;
  try {
    const caller = await requireActiveWorkshop(request);
    if (Number(request.headers.get("content-length") || 0) > 16_384) {
      throw new HttpError(413, "Solicitud demasiado grande.");
    }
    const body = await request.json() as Record<string, unknown>;
    const displayName = parseDisplayName(body.displayName);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const roles = parseRoles(body.roles);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "El correo no es válido.");
    if (password.length < 12 || password.length > 128) {
      throw new HttpError(400, "La contraseña debe tener entre 12 y 128 caracteres.");
    }

    const db = getAdminFirestore();
    const existingProfile = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!existingProfile.empty) throw new HttpError(409, "Ese correo ya tiene un perfil operativo.");

    createdUid = await createAuthUser({ email, password, displayName });
    const userRef = db.collection("users").doc(createdUid);
    const now = Timestamp.now();
    await db.runTransaction(async (transaction) => {
      const [settings, user] = await Promise.all([
        transaction.get(db.collection("settings").doc(caller.workshopId)),
        transaction.get(userRef),
      ]);
      if (!settings.exists || !isWorkshopActive(settings.data() ?? {}, caller.workshopId)) {
        throw new HttpError(403, "El taller no está activo.");
      }
      if (user.exists) throw new HttpError(409, "El perfil del usuario ya existe.");
      transaction.create(userRef, {
        uid: createdUid,
        email,
        displayName,
        roles,
        workshopId: caller.workshopId,
        createdAt: now,
        updatedAt: now,
      });
    });

    return json({
      ok: true,
      user: { uid: createdUid, email, displayName, roles, workshopId: caller.workshopId },
    }, 201);
  } catch (error) {
    if (createdUid) {
      await deleteAuthUser(createdUid).catch((cleanupError) => {
        console.error("Unable to compensate Auth user creation:", cleanupError);
      });
    }
    if (error instanceof SyntaxError) return json({ error: "JSON inválido." }, 400);
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const caller = await requireActiveWorkshop(request);
    if (Number(request.headers.get("content-length") || 0) > 16_384) {
      throw new HttpError(413, "Solicitud demasiado grande.");
    }
    const body = await request.json() as Record<string, unknown>;
    const uid = parseUid(body.uid);
    const displayName = parseDisplayName(body.displayName);
    const roles = parseRoles(body.roles);
    const db = getAdminFirestore();
    const targetRef = db.collection("users").doc(uid);
    const adminQuery = db.collection("users")
      .where("workshopId", "==", caller.workshopId)
      .where("roles", "array-contains", "ADMIN");

    await db.runTransaction(async (transaction) => {
      const [target, admins] = await Promise.all([
        transaction.get(targetRef),
        transaction.get(adminQuery),
      ]);
      const data = assertWorkshopTarget(caller, target);
      assertAdminContinuity(data?.roles, roles, admins.size);
      transaction.update(targetRef, { displayName, roles, updatedAt: Timestamp.now() });
    });

    return json({ ok: true, user: { uid, displayName, roles } });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "JSON inválido." }, 400);
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  let deletionMarkerRef: FirebaseFirestore.DocumentReference | null = null;
  let authDeleted = false;
  try {
    const caller = await requireActiveWorkshop(request);
    if (Number(request.headers.get("content-length") || 0) > 16_384) {
      throw new HttpError(413, "Solicitud demasiado grande.");
    }
    const body = await request.json() as Record<string, unknown>;
    const uid = parseUid(body.uid);
    if (uid === caller.uid) throw new HttpError(400, "No puedes eliminar tu propia cuenta.");

    const db = getAdminFirestore();
    const targetRef = db.collection("users").doc(uid);
    const adminQuery = db.collection("users")
      .where("workshopId", "==", caller.workshopId)
      .where("roles", "array-contains", "ADMIN");
    await db.runTransaction(async (transaction) => {
      const [target, admins] = await Promise.all([
        transaction.get(targetRef),
        transaction.get(adminQuery),
      ]);
      const data = assertWorkshopTarget(caller, target);
      assertAdminContinuity(data?.roles, [], admins.size);
      transaction.update(targetRef, { deletionPendingAt: Timestamp.now() });
    });
    deletionMarkerRef = targetRef;

    await deleteAuthUser(uid);
    authDeleted = true;
    await targetRef.delete();
    return json({ ok: true, deleted: uid });
  } catch (error) {
    if (deletionMarkerRef && !authDeleted) {
      await deletionMarkerRef.update({ deletionPendingAt: FieldValue.delete() }).catch(() => undefined);
    }
    if (error instanceof SyntaxError) return json({ error: "JSON inválido." }, 400);
    return errorResponse(error);
  }
}
