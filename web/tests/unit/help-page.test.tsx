// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import HelpPage from "@/app/help/page";

const state = vi.hoisted(() => ({ roles: ["RECEPTION"], lang: "es" as "es" | "en" }));

vi.mock("@/components/ProtectedRoute", () => ({ ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ userProfile: { roles: state.roles } }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ lang: state.lang }) }));

afterEach(() => { cleanup(); state.lang = "es"; });

describe("role-aware help", () => {
  it("shows reception guidance without admin-only operations", () => {
    state.roles = ["RECEPTION"];
    render(<HelpPage />);
    expect(screen.getAllByText("Recepción del vehículo").length).toBeGreaterThan(0);
    expect(screen.queryByText("Empleados y permisos")).toBeNull();
    expect(screen.queryByText("Operaciones destructivas")).toBeNull();
  });

  it("shows admin guidance and filters it with the search", async () => {
    state.roles = ["ADMIN"];
    render(<HelpPage />);
    expect(screen.getAllByText("Operaciones destructivas").length).toBeGreaterThan(0);
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en la ayuda" }), "inventario");
    expect(screen.getByRole("heading", { name: "Inventario" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Empleados y permisos" })).toBeNull();
  });

  it("keeps advisor help operational and exposes the English payment guide", () => {
    state.roles = ["ADVISOR"];
    state.lang = "en";
    render(<HelpPage />);
    expect(screen.getByRole("heading", { name: "Payments and delivery" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Open screen/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Employees and permissions")).toBeNull();
    expect(screen.queryByText("Destructive operations")).toBeNull();
  });

  it("gives an admin distinct settings, reset, and destructive-operation guidance", () => {
    state.roles = ["ADMIN"];
    render(<HelpPage />);
    expect(screen.getAllByText("Configuración y reseteo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Operaciones destructivas").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Abrir pantalla/i }).length).toBeGreaterThan(0);
  });
});
