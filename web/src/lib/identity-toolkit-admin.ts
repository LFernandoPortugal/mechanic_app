import { getGoogleAccessToken } from "@/lib/firebase-admin";

export type IdentityToolkitAction = "create" | "update" | "delete" | "lookup";

export interface IdentityToolkitUser {
  localId?: string;
  email?: string;
  displayName?: string;
  disabled?: boolean;
}

interface IdentityToolkitResponse {
  localId?: string;
  users?: IdentityToolkitUser[];
  error?: { message?: string };
}

export class IdentityToolkitError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code || "Identity Toolkit rechazó la operación.");
  }
}

const actionPath: Record<IdentityToolkitAction, string> = {
  create: "accounts",
  update: "accounts:update",
  delete: "accounts:delete",
  lookup: "accounts:lookup",
};

function projectId(environment: NodeJS.ProcessEnv = process.env) {
  return environment.FIREBASE_ADMIN_PROJECT_ID
    || environment.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    || "";
}

function apiKey(environment: NodeJS.ProcessEnv = process.env) {
  return environment.NEXT_PUBLIC_FIREBASE_API_KEY || "";
}

function authEmulatorOrigin(environment: NodeJS.ProcessEnv) {
  const enabled = environment.NODE_ENV !== "production"
    && environment.USE_FIREBASE_EMULATORS === "true";
  if (!enabled) return null;

  const configuredHost = environment.FIREBASE_AUTH_EMULATOR_HOST?.trim();
  if (!configuredHost) {
    throw new Error("FIREBASE_AUTH_EMULATOR_HOST is required when emulators are enabled.");
  }

  const origin = new URL(`http://${configuredHost}`);
  const isLoopback = ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname);
  if (
    !isLoopback
    || !origin.port
    || origin.username
    || origin.password
    || origin.pathname !== "/"
    || origin.search
    || origin.hash
  ) {
    throw new Error("FIREBASE_AUTH_EMULATOR_HOST must be a loopback host and explicit port.");
  }
  return origin;
}

export function getIdentityToolkitAdminEndpoint(
  action: IdentityToolkitAction,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const configuredProjectId = projectId(environment);
  const configuredApiKey = apiKey(environment);
  if (!configuredProjectId || !configuredApiKey) {
    throw new Error("Firebase Admin project ID and web API key are required.");
  }

  const emulatorOrigin = authEmulatorOrigin(environment);
  const endpoint = emulatorOrigin
    ? new URL(`/identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(configuredProjectId)}/${actionPath[action]}`, emulatorOrigin)
    : new URL(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(configuredProjectId)}/${actionPath[action]}`);
  endpoint.searchParams.set("key", configuredApiKey);
  return endpoint.toString();
}

export async function identityToolkitAdminRequest(
  action: IdentityToolkitAction,
  body: Record<string, unknown>,
) {
  const emulator = process.env.NODE_ENV !== "production"
    && process.env.USE_FIREBASE_EMULATORS === "true";
  const token = emulator ? null : await getGoogleAccessToken();
  const response = await fetch(getIdentityToolkitAdminEndpoint(action), {
    method: "POST",
    headers: {
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : emulator
          ? { Authorization: "Bearer owner" }
          : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json() as IdentityToolkitResponse;
  if (!response.ok) {
    throw new IdentityToolkitError(result.error?.message || "IDENTITY_TOOLKIT_ERROR", response.status);
  }
  return result;
}

export async function createAuthUser(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  const result = await identityToolkitAdminRequest("create", {
    email: input.email,
    password: input.password,
    displayName: input.displayName,
    emailVerified: false,
    disabled: false,
  });
  if (!result.localId) throw new IdentityToolkitError("MISSING_LOCAL_ID", 500);
  return result.localId;
}

export async function deleteAuthUser(uid: string) {
  try {
    await identityToolkitAdminRequest("delete", { localId: uid });
  } catch (error) {
    if (error instanceof IdentityToolkitError && error.code.includes("USER_NOT_FOUND")) return;
    throw error;
  }
}
