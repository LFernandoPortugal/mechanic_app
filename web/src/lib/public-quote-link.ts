const TOKEN_KEY = "token";

export function buildPublicQuoteUrl(origin: string, jobId: string, token: string): string {
  const url = new URL("/quote/view", origin);
  url.searchParams.set("id", jobId);
  url.hash = new URLSearchParams({ [TOKEN_KEY]: token }).toString();
  return url.toString();
}

export function getQuoteTokenFromHash(hash: string): string {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return params.get(TOKEN_KEY)?.trim() || "";
}
