import { describe, expect, it } from "vitest";
import { getPostLoginRedirect, getRoleHome } from "@/lib/role-home";

describe("role-specific home routing", () => {
  it("sends SUPER_ADMIN to the global console", () => {
    expect(getRoleHome(["SUPER_ADMIN"])).toBe("/super-admin");
    expect(getPostLoginRedirect("/", ["SUPER_ADMIN"])).toBe("/super-admin");
  });

  it("keeps workshop roles on the operational home", () => {
    expect(getRoleHome(["ADMIN"])).toBe("/");
    expect(getRoleHome(["RECEPTION"])).toBe("/");
  });

  it("preserves an explicit protected destination", () => {
    expect(getPostLoginRedirect("/admin/users", ["ADMIN"])).toBe("/admin/users");
    expect(getPostLoginRedirect("/super-admin", ["SUPER_ADMIN"])).toBe("/super-admin");
  });
});
