// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QualityControlPage from "@/app/qc/page";
import { makeJob, workshopFixture } from "../fixtures/jobs";
import { ApiRequestError } from "@/lib/api-errors";

const state = vi.hoisted(() => ({
  jobs: [] as ReturnType<typeof makeJob>[],
  submitQualityControl: vi.fn(),
  jobsError: null as string | null,
  retryJobs: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  signOut: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: state.routerPush }),
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useRealtimeJobs", () => ({
  useRealtimeJobs: () => ({ jobs: state.jobs, loading: false, error: state.jobsError, retry: state.retryJobs }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "qc-fixture" },
    userProfile: { workshopId: "workshop-fixture" },
    workshopSettings: workshopFixture,
    signOut: state.signOut,
  }),
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
  window.sessionStorage.clear();
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
  state.jobsError = null;
  state.retryJobs.mockReset();
  state.toastError.mockReset();
  state.toastSuccess.mockReset();
  state.signOut.mockReset();
  state.signOut.mockResolvedValue(undefined);
  state.routerPush.mockReset();
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

  it("preserves the rejection reason after a failed request and allows retry", async () => {
    const user = userEvent.setup();
    state.submitQualityControl
      .mockRejectedValueOnce(new Error("Servicio temporalmente no disponible."))
      .mockResolvedValueOnce({ status: "Repair" });
    render(<QualityControlPage />);

    await user.click(await screen.findByRole("button", { name: "Rechazar y Devolver a Taller" }));
    const reason = screen.getByLabelText("Motivo del Rechazo / Instrucciones para el Técnico");
    await user.type(reason, "El ruido persiste en la rueda delantera.");
    await user.click(screen.getByRole("button", { name: "Confirmar Rechazo y Enviar a Técnico" }));

    expect((await screen.findByRole("alert")).textContent).toContain("El motivo se conservó");
    expect((reason as HTMLTextAreaElement).value).toBe("El ruido persiste en la rueda delantera.");
    await user.click(screen.getByRole("button", { name: "Reintentar Rechazo" }));
    await waitFor(() => expect(state.submitQualityControl).toHaveBeenCalledTimes(2));
  });

  it("keeps the completed checklist after a failed approval and allows retry", async () => {
    const user = userEvent.setup();
    state.submitQualityControl
      .mockRejectedValueOnce(new Error("Servicio temporalmente no disponible."))
      .mockResolvedValueOnce({ status: "Ready" });
    render(<QualityControlPage />);

    for (const name of [
      "Síntomas Resueltos",
      "Seguridad y Ajustes Mecánicos",
      "Fluidos y Fugas",
      "Estética y Limpieza",
      "Prueba de Ruta Validada",
    ]) {
      await user.click(await screen.findByRole("switch", { name }));
    }

    await user.click(screen.getByRole("button", { name: "Aprobar y Marcar Listo para Entrega" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Tus selecciones siguen intactas");
    expect(screen.getAllByRole("switch").every((control) => control.getAttribute("data-state") === "checked")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Reintentar Aprobación" }));
    await waitFor(() => expect(state.submitQualityControl).toHaveBeenCalledTimes(2));
  });

  it("shows a reconnect action when the realtime job listener fails", async () => {
    const user = userEvent.setup();
    state.jobsError = "network unavailable";
    render(<QualityControlPage />);

    expect((await screen.findByRole("alert")).textContent).toContain("No se pudieron cargar las órdenes");
    await user.click(screen.getByRole("button", { name: "Reconectar" }));
    expect(state.retryJobs).toHaveBeenCalledOnce();
  });

  it("preserves QC input and offers reauthentication after a rejected refresh", async () => {
    const user = userEvent.setup();
    state.submitQualityControl.mockRejectedValue(new ApiRequestError("La sesión expiró.", 401));
    const view = render(<QualityControlPage />);

    for (const name of [
      "Síntomas Resueltos",
      "Seguridad y Ajustes Mecánicos",
      "Fluidos y Fugas",
      "Estética y Limpieza",
      "Prueba de Ruta Validada",
    ]) {
      await user.click(await screen.findByRole("switch", { name }));
    }
    await user.click(screen.getByRole("button", { name: "Aprobar y Marcar Listo para Entrega" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Tu sesión expiró");
    expect(screen.getAllByRole("switch").every((control) => control.getAttribute("data-state") === "checked")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión nuevamente" }));
    expect(state.signOut).toHaveBeenCalledOnce();
    expect(state.routerPush).toHaveBeenCalledWith("/login?redirect=%2Fqc&reason=session-expired");

    view.unmount();
    render(<QualityControlPage />);
    expect(await screen.findByText("Se restauró el borrador de QC guardado en esta pestaña.")).toBeTruthy();
    expect(screen.getAllByRole("switch").every((control) => control.getAttribute("data-state") === "checked")).toBe(true);
  });

  it("disables a stale QC form when the realtime listener reports another outcome", async () => {
    const user = userEvent.setup();
    const view = render(<QualityControlPage />);

    for (const name of [
      "Síntomas Resueltos",
      "Seguridad y Ajustes Mecánicos",
      "Fluidos y Fugas",
      "Estética y Limpieza",
      "Prueba de Ruta Validada",
    ]) {
      await user.click(await screen.findByRole("switch", { name }));
    }
    state.jobs = [{ ...state.jobs[0], status: "Ready" }];
    view.rerender(<QualityControlPage />);

    expect((await screen.findByRole("alert")).textContent).toContain("La orden cambió mientras la revisabas");
    expect((screen.getByRole("button", { name: "Aprobar y Marcar Listo para Entrega" }) as HTMLButtonElement).disabled)
      .toBe(true);
  });

  it("restores the selected QC order, checklist, and notes after remounting", async () => {
    const user = userEvent.setup();
    const view = render(<QualityControlPage />);

    for (const name of [
      "Síntomas Resueltos",
      "Seguridad y Ajustes Mecánicos",
      "Fluidos y Fugas",
      "Estética y Limpieza",
      "Prueba de Ruta Validada",
    ]) {
      await user.click(await screen.findByRole("switch", { name }));
    }
    await user.type(screen.getByLabelText("Notas del Inspector (Opcional)"), "Borrador restaurable.");
    await waitFor(() => expect(window.sessionStorage.length).toBeGreaterThan(1));

    view.unmount();
    render(<QualityControlPage />);

    expect(await screen.findByText("Se restauró el borrador de QC guardado en esta pestaña.")).toBeTruthy();
    expect(screen.getAllByRole("switch").every((control) => control.getAttribute("data-state") === "checked")).toBe(true);
    expect((screen.getByLabelText("Notas del Inspector (Opcional)") as HTMLTextAreaElement).value)
      .toBe("Borrador restaurable.");
  });
});
