// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdvisorQuoteBuilder from "@/app/advisor/page";
import type { WorkshopSettings } from "@/types";
import { makeJob, workshopFixture } from "../fixtures/jobs";

const state = vi.hoisted(() => ({
  jobs: [] as ReturnType<typeof makeJob>[],
  settings: null as WorkshopSettings | null,
  updateJob: vi.fn(),
  issueQuoteLink: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "advisor-fixture" },
    workshopSettings: state.settings,
  }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      autoQuote: "Auto-Cotizar (Demo)",
      partPrice: "Precio del repuesto",
      globalLabor: "Mano de obra",
      generateQuoteBtn: "Generar cotización",
      estimatedTotal: "Total estimado",
    })[key] ?? key,
  }),
}));

vi.mock("@/hooks/useRealtimeJobs", () => ({
  useRealtimeJobs: () => ({ jobs: state.jobs, loading: false }),
}));

vi.mock("@/lib/db", () => ({
  updateJob: state.updateJob,
  registerPayment: vi.fn(),
}));

vi.mock("@/lib/quote-link-client", () => ({
  issueQuoteLink: state.issueQuoteLink,
  revokeQuoteLink: vi.fn(),
}));

vi.mock("@/lib/pdf", () => ({ generateQuotePDF: vi.fn() }));
vi.mock("@/lib/whatsapp", () => ({ openWhatsAppQuote: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendQuoteEmail: vi.fn(), isEmailConfigured: () => false }));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("@/components/WorkflowStepper", () => ({
  WorkflowStepper: ({ currentStatus }: { currentStatus: string }) => <div>Flujo {currentStatus}</div>,
}));

vi.mock("@/components/WorkflowQueueEmptyState", () => ({
  WorkflowQueueEmptyState: () => <div>Sin cotizaciones</div>,
}));

vi.mock("@/components/ui/vehicle-icons", () => ({
  VehicleIcon: () => <span aria-hidden="true" />,
}));

beforeEach(() => {
  state.settings = { ...workshopFixture, demoMode: false };
  state.jobs = [makeJob({
    id: "job-advisor-fixture",
    vehicleId: "QA-QUOTE-01",
    status: "Approval",
    inspectionItems: [
      { id: "brakes", name: "Pastillas delanteras", status: "Fail", notes: "Desgastadas" },
      { id: "lights", name: "Luces", status: "Pass" },
    ],
  })];
  state.updateJob.mockReset();
  state.updateJob.mockResolvedValue(undefined);
  state.issueQuoteLink.mockReset();
  state.issueQuoteLink.mockResolvedValue({
    token: "fixture-token",
    expiresAt: "2026-09-10T12:00:00.000Z",
  });
});

afterEach(() => cleanup());

describe("AdvisorQuoteBuilder", () => {
  it("keeps demo auto-pricing hidden for a real workshop", async () => {
    const user = userEvent.setup();
    render(<AdvisorQuoteBuilder />);

    await user.click(screen.getByRole("button", { name: /QA-QUOTE-01/ }));
    expect(screen.queryByRole("button", { name: "Auto-Cotizar (Demo)" })).toBeNull();
  });

  it("shows demo auto-pricing only when demoMode is enabled", async () => {
    const user = userEvent.setup();
    state.settings = { ...workshopFixture, demoMode: true };
    render(<AdvisorQuoteBuilder />);

    await user.click(screen.getByRole("button", { name: /QA-QUOTE-01/ }));
    expect(screen.getByRole("button", { name: "Auto-Cotizar (Demo)" })).toBeTruthy();
  });

  it("builds a manual quote and issues its secure link", async () => {
    const user = userEvent.setup();
    render(<AdvisorQuoteBuilder />);

    await user.click(screen.getByRole("button", { name: /QA-QUOTE-01/ }));
    await user.type(screen.getByLabelText("Precio del repuesto (S/.)"), "120");
    await user.type(screen.getByLabelText("Mano de obra (S/.)"), "30");
    expect(screen.getByText("S/.150.00")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Generar cotización" }));

    await waitFor(() => {
      expect(state.updateJob).toHaveBeenCalledWith(
        "job-advisor-fixture",
        {
          inspectionItems: [
            expect.objectContaining({ id: "brakes", price: 120 }),
            expect.objectContaining({ id: "lights", price: 0 }),
          ],
          totalEstimate: 150,
          status: "Approval",
        },
        "advisor-fixture",
        "Quote Generated",
      );
      expect(state.issueQuoteLink).toHaveBeenCalledWith("job-advisor-fixture");
    });
  });
});
