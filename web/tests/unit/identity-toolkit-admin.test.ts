import { describe, expect, it } from "vitest";
import { getIdentityToolkitAdminEndpoint } from "@/lib/identity-toolkit-admin";

const baseEnvironment = {
  FIREBASE_ADMIN_PROJECT_ID: "demo-project",
  NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
};

describe("getIdentityToolkitAdminEndpoint", () => {
  it("uses the project-scoped Identity Toolkit admin endpoint in production", () => {
    expect(getIdentityToolkitAdminEndpoint("create", {
      ...baseEnvironment,
      NODE_ENV: "production",
      USE_FIREBASE_EMULATORS: "true",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    })).toBe("https://identitytoolkit.googleapis.com/v1/projects/demo-project/accounts?key=api-key");
  });

  it("uses only the loopback Auth Emulator when explicitly enabled outside production", () => {
    expect(getIdentityToolkitAdminEndpoint("create", {
      ...baseEnvironment,
      NODE_ENV: "test",
      USE_FIREBASE_EMULATORS: "true",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    })).toBe("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-project/accounts?key=api-key");
    expect(getIdentityToolkitAdminEndpoint("delete", {
      ...baseEnvironment,
      NODE_ENV: "test",
      USE_FIREBASE_EMULATORS: "true",
      FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
    })).toBe("http://localhost:9099/identitytoolkit.googleapis.com/v1/projects/demo-project/accounts:delete?key=api-key");
  });

  it.each(["auth.example.test:9099", "127.0.0.1", "127.0.0.1:9099/path"])(
    "rejects an unsafe emulator host: %s",
    (host) => {
      expect(() => getIdentityToolkitAdminEndpoint("lookup", {
        ...baseEnvironment,
        NODE_ENV: "test",
        USE_FIREBASE_EMULATORS: "true",
        FIREBASE_AUTH_EMULATOR_HOST: host,
      })).toThrow("must be a loopback host and explicit port");
    },
  );
});
