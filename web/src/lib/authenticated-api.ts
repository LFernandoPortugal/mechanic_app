import { auth } from "@/lib/firebase";
import { ApiRequestError } from "@/lib/api-errors";

export async function authenticatedJsonRequest<T>(
  url: string,
  init: Omit<RequestInit, "headers"> & { headers?: HeadersInit } = {},
): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new ApiRequestError("La sesión no está disponible.", 401);

  let response: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let token: string;
    try {
      token = await currentUser.getIdToken(attempt === 1);
    } catch {
      throw new ApiRequestError("La sesión expiró. Inicia sesión nuevamente.", 401);
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    response = await fetch(url, { ...init, headers });
    if (response.status !== 401 || attempt === 1) break;
  }

  if (!response) throw new ApiRequestError("No se pudo completar la solicitud.", 500);
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) {
    throw new ApiRequestError(
      result.error || (response.status === 401
        ? "La sesión expiró. Inicia sesión nuevamente."
        : "No se pudo completar la solicitud."),
      response.status,
    );
  }
  return result;
}
