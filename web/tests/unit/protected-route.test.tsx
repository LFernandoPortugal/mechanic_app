// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { hasAnyAssignedRole } from "@/lib/rbac";
import { ROLE_ROUTE_MAP, type UserRole } from "@/types";

const navigation = vi.hoisted(() => ({
  pathname: "/inventory",
  push: vi.fn(),
  back: vi.fn(),
}));

interface MockAuthState {
  user: { uid: string } | null;
  userProfile: { roles: UserRole[] } | null;
  loading: boolean;
  trialExpired: boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

const auth = vi.hoisted(() => ({
  state: null as MockAuthState | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, back: navigation.back }),
  usePathname: () => navigation.pathname,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => auth.state,
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      accessDenied: "Acceso denegado",
      noPermission: "No tienes permiso",
      requiredRoles: "Roles requeridos:",
      goHome: "Ir al inicio",
      goBack: "Volver",
    })[key] ?? key,
  }),
}));

function setSession(roles: UserRole[], overrides: Partial<MockAuthState> = {}) {
  const userProfile = { roles };
  auth.state = {
    user: { uid: "fixture-user" },
    userProfile,
    loading: false,
    trialExpired: false,
    hasAnyRole: (allowedRoles) => hasAnyAssignedRole(roles, allowedRoles),
    ...overrides,
  };
}

beforeEach(() => {
  navigation.pathname = "/inventory";
  navigation.push.mockReset();
  navigation.back.mockReset();
  setSession(["ADMIN"]);
});

afterEach(() => {
  cleanup();
});

describe("ProtectedRoute", () => {
  it("redirects a signed-out visitor to login while preserving the internal destination", async () => {
    auth.state = {
      user: null,
      userProfile: null,
      loading: false,
      trialExpired: false,
      hasAnyRole: () => false,
    };

    const { container } = render(
      <ProtectedRoute allowedRoles={ROLE_ROUTE_MAP["/inventory"]}>
        <p>Inventario privado</p>
      </ProtectedRoute>,
    );

    expect(container.childElementCount).toBe(0);
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith("/login?redirect=%2Finventory");
    });
  });

  it("redirects an expired workshop to the expiration screen", async () => {
    setSession(["ADMIN"], { trialExpired: true });

    const { container } = render(
      <ProtectedRoute allowedRoles={ROLE_ROUTE_MAP["/inventory"]}>
        <p>Inventario privado</p>
      </ProtectedRoute>,
    );

    expect(container.childElementCount).toBe(0);
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith("/expired");
    });
  });

  it("denies access when Auth exists but the Firestore profile is missing", () => {
    setSession(["ADMIN"], { userProfile: null });

    render(
      <ProtectedRoute allowedRoles={ROLE_ROUTE_MAP["/inventory"]}>
        <p>Inventario privado</p>
      </ProtectedRoute>,
    );

    expect(screen.getByRole("heading", { name: "Acceso denegado" })).toBeTruthy();
    expect(screen.queryByText("Inventario privado")).toBeNull();
  });

  it("enforces the documented route matrix for every operational role", () => {
    const expectedRoutes: Record<UserRole, string[]> = {
      ADMIN: [
        "/reception",
        "/technician",
        "/advisor",
        "/advisor/payments",
        "/analytics",
        "/admin/users",
        "/admin/settings",
        "/inventory",
        "/clients",
        "/qc",
      ],
      RECEPTION: ["/reception", "/clients"],
      TECHNICIAN: ["/technician", "/qc"],
      ADVISOR: ["/advisor", "/advisor/payments", "/inventory", "/clients", "/qc"],
      SUPER_ADMIN: Object.keys(ROLE_ROUTE_MAP),
    };

    for (const [role, routes] of Object.entries(expectedRoutes) as [UserRole, string[]][]) {
      for (const [route, allowedRoles] of Object.entries(ROLE_ROUTE_MAP)) {
        cleanup();
        navigation.pathname = route;
        setSession([role]);

        render(
          <ProtectedRoute allowedRoles={allowedRoles}>
            <p>Ruta permitida</p>
          </ProtectedRoute>,
        );

        if (routes.includes(route)) {
          expect(screen.getByText("Ruta permitida"), `${role} should access ${route}`).toBeTruthy();
        } else {
          expect(screen.queryByText("Ruta permitida"), `${role} should not access ${route}`).toBeNull();
          expect(screen.getByRole("heading", { name: "Acceso denegado" })).toBeTruthy();
        }
      }
    }
  });
});
