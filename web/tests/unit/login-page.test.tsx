// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams({
    redirect: "/advisor/payments",
    reason: "session-expired",
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("@/lib/db", () => ({ getUserProfile: vi.fn() }));
vi.mock("firebase/auth", () => ({
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

afterEach(() => cleanup());

describe("LoginPage", () => {
  it("explains why reauthentication is required after an expired operation", () => {
    render(<LoginPage />);
    expect(screen.getByRole("status").textContent).toContain(
      "Tu sesión expiró. Inicia sesión nuevamente para continuar donde estabas.",
    );
  });
});
