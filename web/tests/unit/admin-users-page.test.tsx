// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminUsersPage from "@/app/admin/users/page";
import type { UserProfile } from "@/types";

const state = vi.hoisted(() => ({
  userProfile: { uid: "admin-user-fixture", workshopId: "fixture-workshop" },
  users: [] as UserProfile[],
  createWorkshopUser: vi.fn(),
  updateWorkshopUser: vi.fn(),
  deleteWorkshopUser: vi.fn(),
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
      addStaff: "Agregar personal",
      addStaffDesc: "Descripción",
      nameLabel: "Nombre",
      userEmailLabel: "Correo",
      temporaryPassword: "Contraseña temporal",
      temporaryPasswordHint: "Mínimo 12 caracteres",
      createUser: "Crear usuario",
      creatingUser: "Creando…",
      savingUser: "Guardando…",
      deleteUser: "Eliminar",
      deletingUser: "Eliminando…",
      userCreated: "Usuario creado",
      userUpdated: "Usuario actualizado",
      userDeleted: "Usuario eliminado",
      deleteUserConfirmPrefix: "¿Eliminar definitivamente a",
      deleteUserConfirmSuffix: "de Auth y del taller?",
      forNewUser: "para nuevo usuario",
      nameOf: "Nombre de",
      saveUser: "Guardar usuario",
      deleteUserAria: "Eliminar a",
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
}));
vi.mock("@/lib/workshop-users-client", () => ({
  createWorkshopUser: state.createWorkshopUser,
  updateWorkshopUser: state.updateWorkshopUser,
  deleteWorkshopUser: state.deleteWorkshopUser,
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
  state.createWorkshopUser.mockReset();
  state.updateWorkshopUser.mockReset();
  state.deleteWorkshopUser.mockReset();
  state.createWorkshopUser.mockResolvedValue({ ok: true });
  state.updateWorkshopUser.mockResolvedValue({ ok: true });
  state.deleteWorkshopUser.mockResolvedValue({ ok: true });
});

afterEach(() => cleanup());

describe("AdminUsersPage", () => {
  it("distinguishes each user's role controls and persists the selected roles", async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await screen.findByDisplayValue("Ana Admin");

    const technicianRole = screen.getByRole("button", { name: "Técnico para Ana Admin" });
    expect(technicianRole.getAttribute("aria-pressed")).toBe("false");
    await user.click(technicianRole);
    expect(technicianRole.getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Guardar usuario Ana Admin" }));

    await waitFor(() => {
      expect(state.updateWorkshopUser).toHaveBeenCalledWith("admin-user-fixture", {
        displayName: "Ana Admin",
        roles: ["ADMIN", "TECHNICIAN"],
      });
    });
  });

  it("does not allow removing a user's final role", async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await screen.findByDisplayValue("Ana Admin");

    const adminRole = screen.getByRole("button", { name: "Administrador para Ana Admin" });
    await user.click(adminRole);

    expect(adminRole.getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", { name: "Guardar usuario Ana Admin" }) as HTMLButtonElement).disabled).toBe(true);
    expect(state.updateWorkshopUser).not.toHaveBeenCalled();
  });

  it("creates an Auth account and operational profile through the coordinated API", async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);
    await screen.findByDisplayValue("Ana Admin");

    await user.type(screen.getByLabelText("Nombre", { selector: "#new-user-name" }), "Luis Técnico");
    await user.type(screen.getByLabelText("Correo"), "luis@example.com");
    await user.type(screen.getByLabelText("Contraseña temporal"), "temporary-1234");
    await user.click(screen.getByRole("button", { name: "Técnico para nuevo usuario" }));
    await user.click(screen.getByRole("button", { name: "Recepción para nuevo usuario" }));
    await user.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => expect(state.createWorkshopUser).toHaveBeenCalledWith({
      displayName: "Luis Técnico",
      email: "luis@example.com",
      password: "temporary-1234",
      roles: ["TECHNICIAN"],
    }));
  });
});
