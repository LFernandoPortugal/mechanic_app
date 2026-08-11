import { describe, expect, it } from "vitest";
import { getSafeAuthRedirect } from "@/lib/auth-redirect";

describe("getSafeAuthRedirect", () => {
  it("preserves an internal path, query, and fragment", () => {
    expect(getSafeAuthRedirect("/advisor/payments?from=login#pending"))
      .toBe("/advisor/payments?from=login#pending");
  });

  it.each([
    null,
    "",
    "https://evil.example/phishing",
    "//evil.example/phishing",
    "/\\evil.example/phishing",
    "javascript:alert(1)",
  ])("falls back to the dashboard for an unsafe redirect: %s", (value) => {
    expect(getSafeAuthRedirect(value)).toBe("/");
  });
});
