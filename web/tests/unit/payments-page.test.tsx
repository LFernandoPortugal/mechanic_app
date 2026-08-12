// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaymentsPage from "@/app/advisor/payments/page";
import { makeJob, workshopFixture } from "../fixtures/jobs";
import { ApiRequestError } from "@/lib/api-errors";

const state = vi.hoisted(() => ({
  jobs: [] as ReturnType<typeof makeJob>[],
  registerPayment: vi.fn(),
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

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "advisor-fixture" },
    userProfile: { workshopId: "workshop-fixture" },
    workshopSettings: workshopFixture,
    signOut: state.signOut,
  }),
}));

vi.mock("@/hooks/useRealtimeJobs", () => ({
  useRealtimeJobs: () => ({ jobs: state.jobs, loading: false, error: state.jobsError, retry: state.retryJobs }),
}));

vi.mock("@/lib/db", () => ({
  registerPayment: state.registerPayment,
}));

vi.mock("@/lib/pdf", () => ({ generateReceiptPDF: vi.fn() }));

vi.mock("sonner", () => ({
  toast: {
    error: state.toastError,
    success: state.toastSuccess,
  },
}));

beforeEach(() => {
  window.sessionStorage.clear();
  state.jobs = [makeJob({
    id: "job-payment-fixture",
    vehicleId: "QA-PAY-01",
    status: "Ready",
    totalEstimate: 100,
    approvedAmount: 100,
    approvedAt: new Date("2026-08-11T12:30:00.000Z"),
    payments: [{
      id: "payment-1",
      amount: 40,
      method: "Efectivo",
      date: "2026-08-11T13:00:00.000Z",
      actorId: "advisor-fixture",
    }],
  })];
  state.registerPayment.mockReset();
  state.jobsError = null;
  state.retryJobs.mockReset();
  state.toastError.mockReset();
  state.toastSuccess.mockReset();
  state.signOut.mockReset();
  state.signOut.mockResolvedValue(undefined);
  state.routerPush.mockReset();
});

afterEach(() => cleanup());

describe("PaymentsPage", () => {
  it("opens a payment card from the keyboard and registers the exact remaining balance", async () => {
    const user = userEvent.setup();
    state.registerPayment.mockResolvedValue({ remainingBalance: 0, status: "Delivered" });
    render(<PaymentsPage />);

    const cardToggle = screen.getByRole("button", { name: "Detalles de pago para QA-PAY-01" });
    cardToggle.focus();
    await user.keyboard("{Enter}");
    expect(cardToggle.getAttribute("aria-expanded")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Saldo completo" }));
    expect((screen.getByLabelText("Monto (S/.)") as HTMLInputElement).value).toBe("60.00");
    await user.click(screen.getByRole("button", { name: "Registrar Pago" }));

    await waitFor(() => {
      expect(state.registerPayment).toHaveBeenCalledWith("job-payment-fixture", {
        amount: 60,
        method: "Efectivo",
        reference: "",
        expectedTotalPaid: 40,
      });
    });
  });

  it("rejects a non-cash overpayment before calling the API", async () => {
    const user = userEvent.setup();
    render(<PaymentsPage />);

    await user.click(screen.getByRole("button", { name: "Detalles de pago para QA-PAY-01" }));
    const cardMethod = screen.getByRole("button", { name: "Tarjeta" });
    await user.click(cardMethod);
    expect(cardMethod.getAttribute("aria-pressed")).toBe("true");
    await user.type(screen.getByLabelText("Monto (S/.)"), "70");
    await user.click(screen.getByRole("button", { name: "Registrar Pago" }));

    expect(state.registerPayment).not.toHaveBeenCalled();
    expect(state.toastError).toHaveBeenCalledWith("El monto supera el saldo (S/.60.00).");
  });

  it("keeps a fully paid QC order open until QC completes", async () => {
    const user = userEvent.setup();
    state.jobs = [makeJob({
      id: "job-paid-qc",
      vehicleId: "QA-PAID-QC",
      status: "QC",
      totalEstimate: 100,
      approvedAmount: 100,
      approvedAt: new Date("2026-08-11T12:30:00.000Z"),
      payments: [{
        id: "payment-full",
        amount: 100,
        method: "Transferencia",
        date: "2026-08-11T13:00:00.000Z",
        actorId: "advisor-fixture",
      }],
    })];
    render(<PaymentsPage />);

    await user.click(screen.getByRole("button", { name: "Detalles de pago para QA-PAID-QC" }));
    expect(screen.getByText("Pago completo registrado. La orden todavía debe completar el flujo de QC.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Registrar Pago" })).toBeNull();
  });

  it("preserves payment data after an API failure and retries the same payment", async () => {
    const user = userEvent.setup();
    state.registerPayment
      .mockRejectedValueOnce(new Error("La conexión se interrumpió."))
      .mockResolvedValueOnce({ remainingBalance: 0, status: "Delivered" });
    render(<PaymentsPage />);

    await user.click(screen.getByRole("button", { name: "Detalles de pago para QA-PAY-01" }));
    await user.click(screen.getByRole("button", { name: "Saldo completo" }));
    await user.type(screen.getByLabelText("Referencia / N° de Operación"), "OP-RETRY-01");
    await user.click(screen.getByRole("button", { name: "Registrar Pago" }));

    expect((await screen.findByRole("alert")).textContent).toContain("El monto y la referencia se conservaron");
    expect((screen.getByLabelText("Monto (S/.)") as HTMLInputElement).value).toBe("60.00");
    expect((screen.getByLabelText("Referencia / N° de Operación") as HTMLInputElement).value).toBe("OP-RETRY-01");

    await user.click(screen.getByRole("button", { name: "Reintentar Pago" }));
    await waitFor(() => expect(state.registerPayment).toHaveBeenCalledTimes(2));
    expect(state.registerPayment).toHaveBeenLastCalledWith("job-payment-fixture", {
      amount: 60,
      method: "Efectivo",
      reference: "OP-RETRY-01",
      expectedTotalPaid: 40,
    });
  });

  it("shows a reconnect action when payment jobs cannot be loaded", async () => {
    const user = userEvent.setup();
    state.jobsError = "network unavailable";
    render(<PaymentsPage />);

    expect((await screen.findByRole("alert")).textContent).toContain("No se pudieron cargar las órdenes de pago");
    await user.click(screen.getByRole("button", { name: "Reconectar" }));
    expect(state.retryJobs).toHaveBeenCalledOnce();
  });

  it("offers a safe login redirect when the refreshed session is rejected", async () => {
    const user = userEvent.setup();
    state.registerPayment.mockRejectedValue(new ApiRequestError("La sesión expiró.", 401));
    const view = render(<PaymentsPage />);

    await user.click(screen.getByRole("button", { name: "Detalles de pago para QA-PAY-01" }));
    await user.click(screen.getByRole("button", { name: "Saldo completo" }));
    await user.click(screen.getByRole("button", { name: "Registrar Pago" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Tu sesión expiró");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión nuevamente" }));
    expect(state.signOut).toHaveBeenCalledOnce();
    expect(state.routerPush).toHaveBeenCalledWith(
      "/login?redirect=%2Fadvisor%2Fpayments&reason=session-expired",
    );

    view.unmount();
    render(<PaymentsPage />);
    expect(await screen.findByText("Se restauró el borrador de pago guardado en esta pestaña.")).toBeTruthy();
    expect((screen.getByLabelText("Monto (S/.)") as HTMLInputElement).value).toBe("60.00");
  });

  it("restores a scoped payment draft after the page is remounted", async () => {
    const user = userEvent.setup();
    const view = render(<PaymentsPage />);

    await user.click(screen.getByRole("button", { name: "Detalles de pago para QA-PAY-01" }));
    await user.click(screen.getByRole("button", { name: "Transferencia" }));
    await user.type(screen.getByLabelText("Monto (S/.)"), "25.50");
    await user.type(screen.getByLabelText("Referencia / N° de Operación"), "OP-RESTORE-01");
    await waitFor(() => expect(window.sessionStorage.length).toBeGreaterThan(0));

    view.unmount();
    render(<PaymentsPage />);

    expect(await screen.findByText("Se restauró el borrador de pago guardado en esta pestaña.")).toBeTruthy();
    expect((screen.getByLabelText("Monto (S/.)") as HTMLInputElement).value).toBe("25.5");
    expect((screen.getByLabelText("Referencia / N° de Operación") as HTMLInputElement).value).toBe("OP-RESTORE-01");
    expect(screen.getByRole("button", { name: "Transferencia" }).getAttribute("aria-pressed")).toBe("true");
  });
});
