// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QualityControlPage from "@/app/qc/page";
import { makeJob, workshopFixture } from "../fixtures/jobs";

const state = vi.hoisted(() => ({
  jobs: [] as ReturnType<typeof makeJob>[],
  submitQualityControl: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useRealtimeJobs", () => ({
  useRealtimeJobs: () => ({ jobs: state.jobs, loading: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ workshopSettings: workshopFixture }),
}));

vi.mock("@/lib/db", () => ({
  submitQualityControl: state.submitQualityControl,
}));

vi.mock("sonner", () => ({
  toast: {
    error: state.toastError,
    success: state.toastSuccess,
  },
}));

vi.mock("@/components/WorkflowStepper", () => ({
  WorkflowStepper: ({ currentStatus }: { currentStatus: string }) => <div>Flujo {currentStatus}</div>,
}));

vi.mock("@/components/ui/vehicle-icons", () => ({
  VehicleIcon: () => <span aria-hidden="true" />,
}));

beforeEach(() => {
  state.jobs = [makeJob({
    id: "job-qc-fixture",
    vehicleId: "QA-QC-01",
    status: "QC",
    inspectionItems: [
      { id: "brakes", name: "Pastillas de freno", status: "Fail", approved: true, price: 100 },
    ],
    totalEstimate: 150,
    approvedAmount: 150,
    approvedAt: new Date("2026-08-11T12:30:00.000Z"),
  })];
  state.submitQualityControl.mockReset();
  state.toastError.mockReset();
  state.toastSuccess.mockReset();
});

afterEach(() => cleanup());

describe("QualityControlPage", () => {
  it("requires a rejection reason and sends the order back through the QC API", async () => {
    const user = userEvent.setup();
    state.submitQualityControl.mockResolvedValue({ status: "Repair" });
    render(<QualityControlPage />);

    expect(await screen.findByText("Vehículo: QA-QC-01")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Rechazar y Devolver a Taller" }));

    const confirm = screen.getByRole("button", { name: "Confirmar Rechazo y Enviar a Técnico" });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    await user.type(
      screen.getByLabelText("Motivo del Rechazo / Instrucciones para el Técnico"),
      "El ruido persiste en la rueda delantera.",
    );
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    await user.click(confirm);

    await waitFor(() => {
      expect(state.submitQualityControl).toHaveBeenCalledWith("job-qc-fixture", {
        outcome: "fail",
        notes: "El ruido persiste en la rueda delantera.",
      });
    });
  });

  it("names every QC switch and only approves after all checks pass", async () => {
    const user = userEvent.setup();
    state.submitQualityControl.mockResolvedValue({ status: "Ready" });
    render(<QualityControlPage />);

    expect(await screen.findByText("Vehículo: QA-QC-01")).toBeTruthy();
    const approve = screen.getByRole("button", { name: "Aprobar y Marcar Listo para Entrega" });
    expect((approve as HTMLButtonElement).disabled).toBe(true);

    for (const name of [
      "Síntomas Resueltos",
      "Seguridad y Ajustes Mecánicos",
      "Fluidos y Fugas",
      "Estética y Limpieza",
      "Prueba de Ruta Validada",
    ]) {
      await user.click(screen.getByRole("switch", { name }));
    }
    await user.type(screen.getByLabelText("Notas del Inspector (Opcional)"), "Todo conforme.");

    expect((approve as HTMLButtonElement).disabled).toBe(false);
    await user.click(approve);
    await waitFor(() => {
      expect(state.submitQualityControl).toHaveBeenCalledWith("job-qc-fixture", {
        outcome: "pass",
        notes: "Todo conforme.",
      });
    });
  });
});
