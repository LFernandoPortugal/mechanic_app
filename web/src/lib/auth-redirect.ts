const DEFAULT_AUTH_REDIRECT = "/";

export function getSafeAuthRedirect(value: string | null | undefined) {
  if (
    !value
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || /[\r\n]/.test(value)
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const baseUrl = "https://mechanic-app.invalid";
    const parsed = new URL(value, baseUrl);
    if (parsed.origin !== baseUrl) return DEFAULT_AUTH_REDIRECT;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}
