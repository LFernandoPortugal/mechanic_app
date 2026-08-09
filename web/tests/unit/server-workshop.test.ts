import { describe, expect, it } from "vitest";
import { isWorkshopActive } from "@/lib/server-workshop";

const NOW = Date.parse("2026-08-08T12:00:00.000Z");

describe("isWorkshopActive", () => {
  it("rejects workshops explicitly disabled", () => {
    expect(isWorkshopActive({ disabled: true }, "ws-a", NOW)).toBe(false);
  });

  it("checks Firestore timestamps against the supplied clock", () => {
    expect(isWorkshopActive({
      expiresAtTimestamp: { toMillis: () => NOW + 1 },
    }, "ws-a", NOW)).toBe(true);
    expect(isWorkshopActive({
      expiresAtTimestamp: { toDate: () => new Date(NOW - 1) },
    }, "ws-a", NOW)).toBe(false);
  });

  it("supports the legacy ISO expiration while data is migrated", () => {
    expect(isWorkshopActive({
      expiresAt: new Date(NOW + 1).toISOString(),
    }, "ws-a", NOW)).toBe(true);
    expect(isWorkshopActive({
      expiresAt: new Date(NOW - 1).toISOString(),
    }, "ws-a", NOW)).toBe(false);
  });

  it("fails closed when an expiration field is malformed", () => {
    expect(isWorkshopActive({ expiresAtTimestamp: {} }, "ws-a", NOW)).toBe(false);
    expect(isWorkshopActive({ expiresAt: "not-a-date" }, "ws-a", NOW)).toBe(false);
  });

  it("allows workshops without expiration metadata", () => {
    expect(isWorkshopActive({}, "ws-a", NOW)).toBe(true);
  });

  it("keeps only the control workshop unconditionally active", () => {
    expect(isWorkshopActive({ disabled: true }, "demo-workshop", NOW)).toBe(false);
    expect(isWorkshopActive({ disabled: true }, "master-control", NOW)).toBe(true);
  });
});
