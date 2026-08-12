// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  makeSessionDraftKey,
  readSessionDraft,
  removeSessionDraft,
  writeSessionDraft,
} from "@/lib/session-drafts";

interface TestDraft {
  note: string;
}

function isTestDraft(value: unknown): value is TestDraft {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as { note?: unknown }).note === "string"
  );
}

beforeEach(() => window.sessionStorage.clear());

describe("session drafts", () => {
  it("scopes a draft to its feature, workshop, user, and item", () => {
    const first = makeSessionDraftKey("qc", "user-1", "workshop-1", "job-1");
    const second = makeSessionDraftKey("qc", "user-2", "workshop-1", "job-1");

    expect(first).not.toBe(second);
    writeSessionDraft(first, { note: "Only user 1 can restore this key." }, 1_000, 100);

    expect(readSessionDraft(first, isTestDraft, 200)).toEqual({ note: "Only user 1 can restore this key." });
    expect(readSessionDraft(second, isTestDraft, 200)).toBeNull();
  });

  it("removes expired or malformed values instead of restoring them", () => {
    const expiredKey = makeSessionDraftKey("payment", "user-1", "workshop-1", "job-1");
    writeSessionDraft(expiredKey, { note: "expired" }, 50, 100);

    expect(readSessionDraft(expiredKey, isTestDraft, 151)).toBeNull();
    expect(window.sessionStorage.getItem(expiredKey)).toBeNull();

    const invalidKey = makeSessionDraftKey("payment", "user-1", "workshop-1", "job-2");
    window.sessionStorage.setItem(invalidKey, "not-json");
    expect(readSessionDraft(invalidKey, isTestDraft)).toBeNull();
    expect(window.sessionStorage.getItem(invalidKey)).toBeNull();
  });

  it("clears a valid draft explicitly after a successful operation", () => {
    const key = makeSessionDraftKey("qc", "user-1", "workshop-1", "job-1");
    writeSessionDraft(key, { note: "complete" });
    removeSessionDraft(key);
    expect(readSessionDraft(key, isTestDraft)).toBeNull();
  });
});
