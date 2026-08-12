import { describe, expect, it } from "vitest";
import { getIdentityLookupEndpoint } from "@/lib/server-auth";

const apiKey = "api key/with symbols";

describe("getIdentityLookupEndpoint", () => {
  it("uses Identity Toolkit when emulator mode is not explicitly enabled", () => {
    expect(getIdentityLookupEndpoint(apiKey, { NODE_ENV: "development" })).toBe(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=api%20key%2Fwith%20symbols",
    );
  });

  it("uses the local Auth Emulator outside production", () => {
    expect(getIdentityLookupEndpoint(apiKey, {
      NODE_ENV: "test",
      USE_FIREBASE_EMULATORS: "true",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    })).toBe(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:lookup?key=api+key%2Fwith+symbols",
    );
  });

  it("cannot switch a production runtime to the emulator", () => {
    expect(getIdentityLookupEndpoint(apiKey, {
      NODE_ENV: "production",
      USE_FIREBASE_EMULATORS: "true",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    })).toMatch(/^https:\/\/identitytoolkit\.googleapis\.com\//);
  });

  it("fails closed when emulator mode has no Auth host", () => {
    expect(() => getIdentityLookupEndpoint(apiKey, {
      NODE_ENV: "test",
      USE_FIREBASE_EMULATORS: "true",
    })).toThrow("FIREBASE_AUTH_EMULATOR_HOST is required");
  });

  it.each([
    "auth.example.com:9099",
    "127.0.0.1",
    "127.0.0.1:9099/path",
    "user@127.0.0.1:9099",
  ])("rejects a non-local or malformed emulator host: %s", (host) => {
    expect(() => getIdentityLookupEndpoint(apiKey, {
      NODE_ENV: "test",
      USE_FIREBASE_EMULATORS: "true",
      FIREBASE_AUTH_EMULATOR_HOST: host,
    })).toThrow("must be a loopback host and explicit port");
  });
});
