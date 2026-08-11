import { auth } from "@/lib/firebase";

export interface IssuedQuoteLink {
  token: string;
  expiresAt: string;
}

async function callQuoteLinkApi(jobId: string, method: "POST" | "DELETE") {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("La sesión no está disponible.");

  const idToken = await currentUser.getIdToken();
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/quote-link`, {
    method,
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const result = await response.json().catch(() => ({})) as Partial<IssuedQuoteLink> & {
    error?: string;
    ok?: boolean;
  };
  if (!response.ok) {
    throw new Error(result.error || "No se pudo administrar el enlace público.");
  }
  return result;
}

export async function issueQuoteLink(jobId: string): Promise<IssuedQuoteLink> {
  const result = await callQuoteLinkApi(jobId, "POST");
  if (!result.token || !result.expiresAt) {
    throw new Error("El servidor devolvió un enlace incompleto.");
  }
  return { token: result.token, expiresAt: result.expiresAt };
}

export async function revokeQuoteLink(jobId: string): Promise<void> {
  await callQuoteLinkApi(jobId, "DELETE");
}
