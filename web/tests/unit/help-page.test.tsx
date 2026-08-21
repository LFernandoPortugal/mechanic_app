// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import HelpPage from "@/app/help/page";

const state = vi.hoisted(() => ({ roles: ["RECEPTION"] }));

vi.mock("@/components/ProtectedRoute", () => ({ ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ userProfile: { roles: state.roles } }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ lang: "es" }) }));

afterEach(() => cleanup());

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
});
