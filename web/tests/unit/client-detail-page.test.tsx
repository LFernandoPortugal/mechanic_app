// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClientDetailPage from "@/app/clients/detail/ClientDetail";
import { makeJob, workshopFixture } from "../fixtures/jobs";

const state = vi.hoisted(() => ({
  userProfile: { workshopId: "fixture-workshop" },
  getClientJobs: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("id=Cliente%20Fixture"),
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    userProfile: state.userProfile,
    loading: false,
    workshopSettings: workshopFixture,
  }),
}));
vi.mock("@/lib/clients", () => ({ getClientJobs: state.getClientJobs }));

beforeEach(() => {
  state.getClientJobs.mockReset();
  state.getClientJobs.mockResolvedValue([makeJob({
    id: "client-job-fixture",
    clientId: "Cliente Fixture",
    clientPhone: "999111222",
    clientEmail: "cliente@example.com",
    vehicleId: "QA-CLIENT-01",
    status: "Delivered",
    approvedAmount: 120,
    totalEstimate: 120,
    payments: [{
      id: "payment-fixture",
      amount: 120,
      method: "Efectivo",
      date: "2026-08-11T13:00:00.000Z",
      actorId: "advisor-fixture",
    }],
    receptionImages: ["data:image/png;base64,evidence-fixture"],
  })]);
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("ClientDetailPage", () => {
  it("loads the scoped client history and financial summary", async () => {
    render(<ClientDetailPage />);

    expect(await screen.findByRole("heading", { name: "Cliente Fixture" })).toBeTruthy();
    expect(state.getClientJobs).toHaveBeenCalledWith("fixture-workshop", "Cliente Fixture");
    expect(screen.getByText("Vehículo: QA-CLIENT-01")).toBeTruthy();
    expect(screen.getAllByText("S/.120.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Entregado")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Contraer visita.*QA-CLIENT-01/ }).getAttribute("aria-expanded")).toBe("true");
  });

  it("opens evidence as a named modal and restores focus after Escape", async () => {
    const user = userEvent.setup();
    render(<ClientDetailPage />);
    const opener = await screen.findByRole("button", { name: "Ampliar evidencia de ingreso 1" });

    await user.click(opener);
    expect(screen.getByRole("dialog", { name: "Evidencia del vehículo ampliada" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar vista de evidencia" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
