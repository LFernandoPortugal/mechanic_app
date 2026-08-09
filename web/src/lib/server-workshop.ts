const ALWAYS_ACTIVE_WORKSHOPS = new Set(["demo-workshop", "master-control"]);

type TimestampLike = {
  toMillis?: () => number;
  toDate?: () => Date;
};

function timestampToMillis(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;

  const timestamp = value as TimestampLike;
  try {
    if (typeof timestamp.toMillis === "function") {
      const milliseconds = timestamp.toMillis();
      return Number.isFinite(milliseconds) ? milliseconds : null;
    }
    if (typeof timestamp.toDate === "function") {
      const milliseconds = timestamp.toDate().getTime();
      return Number.isFinite(milliseconds) ? milliseconds : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function isWorkshopActive(
  settings: Record<string, unknown>,
  workshopId: string,
  now = Date.now(),
): boolean {
  if (ALWAYS_ACTIVE_WORKSHOPS.has(workshopId)) return true;
  if (settings.disabled === true) return false;

  if (Object.hasOwn(settings, "expiresAtTimestamp")) {
    const expiration = timestampToMillis(settings.expiresAtTimestamp);
    return expiration !== null && expiration > now;
  }

  if (Object.hasOwn(settings, "expiresAt")) {
    const expiration = Date.parse(String(settings.expiresAt));
    return Number.isFinite(expiration) && expiration > now;
  }

  return true;
}
