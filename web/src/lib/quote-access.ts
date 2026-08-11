import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const QUOTE_ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
export const QUOTE_ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

interface TimestampLike {
  toMillis?: () => number;
  toDate?: () => Date;
}

function expirationToMillis(value: unknown): number | null {
  if (value instanceof Date) {
    const milliseconds = value.getTime();
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
  if (typeof value === "string" || typeof value === "number") {
    const milliseconds = new Date(value).getTime();
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
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

export function hashQuoteAccessToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createQuoteAccessToken(
  now = Date.now(),
  ttlMs = QUOTE_ACCESS_TOKEN_TTL_MS,
) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashQuoteAccessToken(token),
    issuedAt: new Date(now),
    expiresAt: new Date(now + ttlMs),
  };
}

export function isQuoteAccessTokenValid(
  token: unknown,
  storedHash: unknown,
  expiresAt: unknown,
  now = Date.now(),
): boolean {
  if (
    typeof token !== "string"
    || !QUOTE_ACCESS_TOKEN_PATTERN.test(token)
    || typeof storedHash !== "string"
    || !/^[a-f0-9]{64}$/.test(storedHash)
  ) {
    return false;
  }

  const expiration = expirationToMillis(expiresAt);
  if (expiration === null || expiration <= now) return false;

  const presentedHash = Buffer.from(hashQuoteAccessToken(token), "hex");
  const expectedHash = Buffer.from(storedHash, "hex");
  return presentedHash.length === expectedHash.length
    && timingSafeEqual(presentedHash, expectedHash);
}

export function isQuoteAccessRecordValid(
  token: unknown,
  jobId: string,
  workshopId: string,
  record: Record<string, unknown>,
  now = Date.now(),
): boolean {
  return record.jobId === jobId
    && record.workshopId === workshopId
    && isQuoteAccessTokenValid(token, record.tokenHash, record.expiresAt, now);
}
