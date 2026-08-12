// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsersPage from "@/app/admin/users/page";
import type { UserProfile } from "@/types";

const state = vi.hoisted(() => ({
  userProfile: { workshopId: "fixture-workshop" },
  users: [] as UserProfile[],
  updateUserRoles: vi.fn(),
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ userProfile: state.userProfile, loading: false }),
}));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      userManagement: "Gestión de usuarios",
      registeredUsers: "usuarios registrados",
      refresh: "Actualizar",
      noUsersRegistered: "Sin usuarios",
      roleAdmin: "Administrador",
      roleReception: "Recepción",
      roleTechnician: "Técnico",
      roleAdvisor: "Asesor",
      save: "Guardar",
    })[key] ?? key,
  }),
}));
vi.mock("@/lib/db", () => ({
  getUsersByWorkshop: vi.fn(async () => state.users),
  updateUserRoles: state.updateUserRoles,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const adminFixture: UserProfile = {
  uid: "admin-user-fixture",
  email: "ana@example.com",
  displayName: "Ana Admin",
  roles: ["ADMIN"],
  workshopId: "fixture-workshop",
  createdAt: new Date("2026-08-11T12:00:00.000Z"),
  updatedAt: new Date("2026-08-11T12:00:00.000Z"),
};

beforeEach(() => {
  state.users = [adminFixture];
  state.updateUserRoles.mockReset();
  state.updateUserRoles.mockResolvedValue(undefined);
});

afterEach(() => cleanup());

describe("AdminUsersPage", () => {
  it("distinguishes each user's role controls and persists the selected roles", async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await screen.findByText("Ana Admin");

    const technicianRole = screen.getByRole("button", { name: "Técnico para Ana Admin" });
    expect(technicianRole.getAttribute("aria-pressed")).toBe("false");
    await user.click(technicianRole);
    expect(technicianRole.getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Guardar roles de Ana Admin" }));

    await waitFor(() => {
      expect(state.updateUserRoles).toHaveBeenCalledWith("admin-user-fixture", ["ADMIN", "TECHNICIAN"]);
    });
  });

  it("does not allow removing a user's final role", async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await screen.findByText("Ana Admin");

    const adminRole = screen.getByRole("button", { name: "Administrador para Ana Admin" });
    await user.click(adminRole);

    expect(adminRole.getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", { name: "Guardar roles de Ana Admin" }) as HTMLButtonElement).disabled).toBe(true);
    expect(state.updateUserRoles).not.toHaveBeenCalled();
  });
});
