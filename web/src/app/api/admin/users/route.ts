import { Timestamp } from "@google-cloud/firestore";
import { NextResponse } from "next/server";
import { getAdminFirestore, getGoogleAccessToken } from "@/lib/firebase-admin";
import { HttpError, requireSuperAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: RESPONSE_HEADERS });

interface IdentityToolkitResponse {
  localId?: string;
  error?: { message?: string };
}

const projectId = () =>
  process.env.FIREBASE_ADMIN_PROJECT_ID
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  || "";

const apiKey = () => process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

async function identityToolkitRequest(path: string, body: unknown) {
  const token = await getGoogleAccessToken();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId())}/${path}?key=${encodeURIComponent(apiKey())}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  const result = await response.json() as IdentityToolkitResponse;
  return { response, result };
}

async function deleteAuthUser(uid: string) {
  const { response, result } = await identityToolkitRequest("accounts:delete", { localId: uid });
  const code = result.error?.message || "";
  if (!response.ok && code !== "USER_NOT_FOUND") {
    throw new Error(code || "No se pudo eliminar la cuenta de Firebase Authentication.");
  }
}

function errorResponse(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error("Admin user operation failed:", error);
  return json({ error: "No se pudo completar la operación de usuarios." }, 500);
}

export async function POST(request: Request) {
  let createdUid: string | null = null;
  try {
    await requireSuperAdmin(request);
    if (Number(request.headers.get("content-length") || 0) > 16_384) {
      throw new HttpError(413, "Solicitud demasiado grande.");
    }

    const body = await request.json() as Record<string, unknown>;
    const workshopId = String(body.workshopId || "").trim().toLowerCase();
    const workshopName = String(body.workshopName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const expiresAt = String(body.expiresAt || "");
    const expiration = new Date(expiresAt);
    const maximumExpiration = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000);

    if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/.test(workshopId)) {
      throw new HttpError(400, "El ID del taller debe tener entre 3 y 48 caracteres simples.");
    }
    if (["master-control", "demo-workshop"].includes(workshopId)) {
      throw new HttpError(400, "Ese ID de taller está reservado.");
    }
    if (workshopName.length < 2 || workshopName.length > 100) {
      throw new HttpError(400, "El nombre del taller no es válido.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, "El correo no es válido.");
    }
    if (password.length < 12 || password.length > 128) {
      throw new HttpError(400, "La contraseña debe tener entre 12 y 128 caracteres.");
    }
    if (Number.isNaN(expiration.getTime()) || expiration <= new Date() || expiration > maximumExpiration) {
      throw new HttpError(400, "La fecha de expiración no es válida.");
    }
    if (!projectId() || !apiKey()) throw new HttpError(500, "Firebase no está configurado.");

    const db = getAdminFirestore();
    const settingsRef = db.collection("settings").doc(workshopId);
    if ((await settingsRef.get()).exists) throw new HttpError(409, "El taller ya existe.");

    const { response, result } = await identityToolkitRequest("accounts", {
      email,
      password,
      displayName: `${workshopName} Admin`,
      emailVerified: false,
      disabled: false,
    });
    if (!response.ok || !result.localId) {
      const code = result.error?.message || "";
      if (code.includes("EMAIL_EXISTS")) {
        throw new HttpError(409, "El correo ya existe en Firebase Authentication; no se combinó con el taller nuevo.");
      }
      throw new HttpError(400, code || "No se pudo crear la cuenta de acceso.");
    }
    createdUid = result.localId;

    const now = Timestamp.now();
    const userRef = db.collection("users").doc(createdUid);
    await db.runTransaction(async (transaction) => {
      const [settingsSnapshot, userSnapshot] = await Promise.all([
        transaction.get(settingsRef),
        transaction.get(userRef),
      ]);
      if (settingsSnapshot.exists || userSnapshot.exists) {
        throw new HttpError(409, "El taller o el perfil ya existe.");
      }

      transaction.create(settingsRef, {
        workshopName,
        logoUrl: "",
        address: "",
        phone: "",
        taxId: "",
        termsAndConditions: "",
        demoMode: false,
        currencySymbol: "$",
        taxRate: 0,
        taxName: "Impuesto",
        expiresAt: expiration.toISOString(),
        expiresAtTimestamp: Timestamp.fromDate(expiration),
        allowResetData: false,
        adminEmail: email,
        disabled: false,
        createdAt: now,
      });
      transaction.create(userRef, {
        uid: createdUid,
        email,
        displayName: `${workshopName} Admin`,
        roles: ["ADMIN"],
        workshopId,
        createdAt: now,
        updatedAt: now,
      });
    });

    return json({ ok: true }, 201);
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

export async function DELETE(request: Request) {
  try {
    const caller = await requireSuperAdmin(request);
    if (Number(request.headers.get("content-length") || 0) > 16_384) {
      throw new HttpError(413, "Solicitud demasiado grande.");
    }

    const body = await request.json() as { uids?: unknown };
    const uids = Array.isArray(body.uids)
      ? [...new Set(body.uids.filter((uid): uid is string => typeof uid === "string" && uid.length > 0))]
      : [];
    if (uids.length === 0 || uids.length > 100) {
      throw new HttpError(400, "La lista de usuarios no es válida.");
    }
    if (uids.includes(caller.uid)) throw new HttpError(400, "No puedes eliminar tu propia cuenta.");

    const db = getAdminFirestore();
    const profiles = await Promise.all(
      uids.map((uid) => db.collection("users").doc(uid).get()),
    );
    if (profiles.some((profile) => {
      const roles = profile.data()?.roles;
      return Array.isArray(roles) && roles.includes("SUPER_ADMIN");
    })) {
      throw new HttpError(400, "No se puede eliminar una cuenta SUPER_ADMIN.");
    }

    for (const uid of uids) await deleteAuthUser(uid);

    const batch = db.batch();
    profiles.forEach((profile) => batch.delete(profile.ref));
    await batch.commit();
    return json({ ok: true, deleted: uids.length });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "JSON inválido." }, 400);
    return errorResponse(error);
  }
}
