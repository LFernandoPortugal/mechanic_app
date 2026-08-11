import { describe, expect, it } from "vitest";
import {
  createQuoteAccessToken,
  hashQuoteAccessToken,
  isQuoteAccessRecordValid,
  isQuoteAccessTokenValid,
  QUOTE_ACCESS_TOKEN_PATTERN,
} from "@/lib/quote-access";
import { buildPublicQuoteUrl, getQuoteTokenFromHash } from "@/lib/public-quote-link";

describe("quote access tokens", () => {
  it("creates independent 256-bit URL-safe secrets and stores only their hashes", () => {
    const first = createQuoteAccessToken(1_700_000_000_000);
    const second = createQuoteAccessToken(1_700_000_000_000);

    expect(first.token).toMatch(QUOTE_ACCESS_TOKEN_PATTERN);
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tokenHash).toBe(hashQuoteAccessToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });

  it("accepts the matching unexpired token and rejects replacements or expiration", () => {
    const now = 1_700_000_000_000;
    const access = createQuoteAccessToken(now, 60_000);
    const replacement = createQuoteAccessToken(now, 60_000);
    const timestampLike = { toMillis: () => access.expiresAt.getTime() };

    expect(isQuoteAccessTokenValid(access.token, access.tokenHash, timestampLike, now)).toBe(true);
    expect(isQuoteAccessTokenValid(replacement.token, access.tokenHash, timestampLike, now)).toBe(false);
    expect(isQuoteAccessTokenValid(access.token, access.tokenHash, timestampLike, now + 60_000)).toBe(false);
    expect(isQuoteAccessTokenValid("malformed", access.tokenHash, timestampLike, now)).toBe(false);
  });

  it("binds each token record to one job and one workshop", () => {
    const now = 1_700_000_000_000;
    const access = createQuoteAccessToken(now, 60_000);
    const record = {
      jobId: "AbCdEfGhIjKlMnOpQrSt",
      workshopId: "ws-a",
      tokenHash: access.tokenHash,
      expiresAt: access.expiresAt,
    };

    expect(isQuoteAccessRecordValid(access.token, record.jobId, "ws-a", record, now)).toBe(true);
    expect(isQuoteAccessRecordValid(access.token, "ZbCdEfGhIjKlMnOpQrSt", "ws-a", record, now)).toBe(false);
    expect(isQuoteAccessRecordValid(access.token, record.jobId, "ws-b", record, now)).toBe(false);
  });
});

describe("public quote URLs", () => {
  it("puts the secret in the fragment instead of the HTTP query string", () => {
    const access = createQuoteAccessToken();
    const quoteUrl = buildPublicQuoteUrl(
      "https://mechanic.example",
      "AbCdEfGhIjKlMnOpQrSt",
      access.token,
    );
    const parsed = new URL(quoteUrl);

    expect(parsed.pathname).toBe("/quote/view");
    expect(parsed.searchParams.get("id")).toBe("AbCdEfGhIjKlMnOpQrSt");
    expect(parsed.search).not.toContain(access.token);
    expect(getQuoteTokenFromHash(parsed.hash)).toBe(access.token);
  });
});
