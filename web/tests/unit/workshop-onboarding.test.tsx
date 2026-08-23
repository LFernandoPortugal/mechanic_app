// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkshopOnboarding } from "@/components/dashboard/WorkshopOnboarding";

vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ lang: "es" }) }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ workshopSettings: { workshopName: "Taller nuevo", currencySymbol: "S/." } }),
}));

afterEach(() => cleanup());

describe("new workshop onboarding", () => {
  it("presents setup steps before the first operational order", () => {
    render(<WorkshopOnboarding />);
    expect(screen.getByRole("heading", { name: "Configura tu taller y crea la primera orden" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getAllByRole("link", { name: /Abrir/ })).toHaveLength(4);
    expect(screen.getByText("Configuración básica detectada")).toBeTruthy();
    expect(screen.getByText("Opcional")).toBeTruthy();
  });
});
