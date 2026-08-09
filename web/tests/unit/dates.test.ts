import { describe, expect, it } from "vitest";
import { extendExpiration, toDate } from "@/lib/dates";

describe("date helpers", () => {
  it("normalizes Date, ISO and Firestore-like timestamp values", () => {
    const expected = "2026-08-08T12:00:00.000Z";
    expect(toDate(new Date(expected))?.toISOString()).toBe(expected);
    expect(toDate(expected)?.toISOString()).toBe(expected);
    expect(toDate({ seconds: Date.parse(expected) / 1000 })?.toISOString()).toBe(expected);
  });

  it("extends an active expiration instead of shortening it from today", () => {
    const now = new Date("2026-08-08T12:00:00.000Z");
    const current = "2026-09-08T12:00:00.000Z";
    expect(extendExpiration(current, 7, now).toISOString()).toBe("2026-09-15T12:00:00.000Z");
  });

  it("extends from today when the current expiration is missing or expired", () => {
    const now = new Date("2026-08-08T12:00:00.000Z");
    expect(extendExpiration(null, 7, now).toISOString()).toBe("2026-08-15T12:00:00.000Z");
    expect(extendExpiration("2026-08-01T12:00:00.000Z", 7, now).toISOString())
      .toBe("2026-08-15T12:00:00.000Z");
  });
});
