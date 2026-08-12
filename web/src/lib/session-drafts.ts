const DRAFT_PREFIX = "sga:draft:v1";

export const SESSION_DRAFT_TTL_MS = 30 * 60 * 1000;

interface DraftEnvelope<T> {
  version: 1;
  expiresAt: number;
  value: T;
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function makeSessionDraftKey(
  feature: string,
  userId: string,
  workshopId: string,
  itemId: string,
): string {
  return [DRAFT_PREFIX, feature, workshopId, userId, itemId]
    .map((part) => encodeURIComponent(part))
    .join(":");
}

export function readSessionDraft<T>(
  key: string,
  isValid: (value: unknown) => value is T,
  now = Date.now(),
): T | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DraftEnvelope<unknown>>;
    if (parsed.version !== 1 || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= now) {
      removeSessionDraft(key);
      return null;
    }

    if (!isValid(parsed.value)) {
      removeSessionDraft(key);
      return null;
    }

    return parsed.value;
  } catch {
    removeSessionDraft(key);
    return null;
  }
}

export function writeSessionDraft<T>(
  key: string,
  value: T,
  ttlMs = SESSION_DRAFT_TTL_MS,
  now = Date.now(),
): void {
  const storage = getSessionStorage();
  if (!storage) return;

  const envelope: DraftEnvelope<T> = {
    version: 1,
    expiresAt: now + ttlMs,
    value,
  };

  try {
    storage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Draft recovery is best-effort and must never block the primary workflow.
  }
}

export function removeSessionDraft(key: string | null): void {
  if (!key) return;

  try {
    getSessionStorage()?.removeItem(key);
  } catch {
    // The primary workflow remains usable when storage is unavailable.
  }
}
