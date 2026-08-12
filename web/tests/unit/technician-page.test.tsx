// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TechnicianDashboard from "@/app/technician/page";
import { makeJob } from "../fixtures/jobs";

const state = vi.hoisted(() => ({
  jobs: [] as ReturnType<typeof makeJob>[],
  updateJob: vi.fn(),
  assignTechnician: vi.fn(),
  toastError: vi.fn(),
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
  useAuth: () => ({ user: { uid: "technician-fixture" } }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      componentDetail: "Componente inspeccionado",
      enterComponentName: "Nombre del componente",
      statusTitle: "Estado de inspección",
      statusPass: "Correcto",
      statusRecommended: "Recomendado",
      statusFail: "Falla",
      statusCritical: "Crítico",
      technicianNotes: "Notas del técnico",
      addDetails: "Detalles del hallazgo",
      logItem: "Registrar punto",
      submitDiagnosis: "Enviar diagnóstico",
    })[key] ?? key,
  }),
}));

vi.mock("@/hooks/useRealtimeJobs", () => ({
  useRealtimeJobs: () => ({ jobs: state.jobs, loading: false }),
}));

vi.mock("@/hooks/useSpeechRecognition", () => ({
  useSpeechRecognition: () => ({
    transcript: "",
    isListening: false,
    isSupported: false,
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/lib/db", () => ({
  updateJob: state.updateJob,
  assignTechnician: state.assignTechnician,
}));

vi.mock("@/lib/storage", () => ({ uploadJobImage: vi.fn() }));
vi.mock("@/lib/whatsapp", () => ({ openWhatsAppStatusUpdate: vi.fn() }));

vi.mock("sonner", () => ({
  toast: {
    error: state.toastError,
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/components/WorkflowStepper", () => ({
  WorkflowStepper: ({ currentStatus }: { currentStatus: string }) => <div>Flujo {currentStatus}</div>,
}));

vi.mock("@/components/WorkflowQueueEmptyState", () => ({
  WorkflowQueueEmptyState: () => <div>Sin trabajos</div>,
}));

vi.mock("@/components/ui/vehicle-icons", () => ({
  VehicleIcon: () => <span aria-hidden="true" />,
}));

beforeEach(() => {
  state.jobs = [makeJob({
    id: "job-technician-fixture",
    vehicleId: "QA-TECH-01",
    status: "Diagnosis",
    inspectionItems: [],
  })];
  state.updateJob.mockReset();
  state.updateJob.mockResolvedValue(undefined);
  state.assignTechnician.mockReset();
  state.toastError.mockReset();
});

afterEach(() => cleanup());

describe("TechnicianDashboard", () => {
  it("blocks an empty diagnosis before any write", async () => {
    const user = userEvent.setup();
    render(<TechnicianDashboard />);

    await user.click(screen.getByRole("button", { name: /QA-TECH-01/ }));
    await user.click(screen.getByRole("button", { name: "Enviar diagnóstico" }));

    expect(state.updateJob).not.toHaveBeenCalled();
    expect(state.toastError).toHaveBeenCalledWith(
      expect.stringContaining("No puedes enviar un diagnóstico vacío"),
      expect.objectContaining({ duration: 6000 }),
    );
  });

  it("records a named inspection item and submits Diagnosis to Approval", async () => {
    const user = userEvent.setup();
    render(<TechnicianDashboard />);

    await user.click(screen.getByRole("button", { name: /QA-TECH-01/ }));
    await user.type(screen.getByLabelText("Componente inspeccionado"), "Pastillas delanteras");
    const failStatus = screen.getByRole("button", { name: "Falla" });
    await user.click(failStatus);
    expect(failStatus.getAttribute("aria-pressed")).toBe("true");
    await user.type(screen.getByLabelText("Notas del técnico"), "Desgaste por debajo del límite.");
    await user.click(screen.getByRole("button", { name: "Registrar punto" }));
    expect(screen.getByText("Pastillas delanteras")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Enviar diagnóstico" }));
    await waitFor(() => {
      expect(state.updateJob).toHaveBeenCalledWith(
        "job-technician-fixture",
        {
          inspectionItems: [expect.objectContaining({
            name: "Pastillas delanteras",
            status: "Fail",
            notes: "Desgaste por debajo del límite.",
          })],
          status: "Approval",
        },
        "technician-fixture",
        "Diagnóstico Enviado",
      );
    });
  });

  it("moves an approved repair to Repair and then QC", async () => {
    const user = userEvent.setup();
    state.jobs = [makeJob({
      id: "job-repair-fixture",
      vehicleId: "QA-REPAIR-01",
      status: "Approved",
      approvedAmount: 150,
      approvedAt: new Date("2026-08-11T12:30:00.000Z"),
    })];
    render(<TechnicianDashboard />);

    await user.click(screen.getByRole("button", { name: /QA-REPAIR-01/ }));
    await user.click(screen.getByRole("button", { name: "Iniciar Reparación" }));
    await waitFor(() => {
      expect(state.updateJob).toHaveBeenNthCalledWith(
        1,
        "job-repair-fixture",
        { status: "Repair" },
        "technician-fixture",
        "Reparación Iniciada",
      );
    });

    await user.click(screen.getByRole("button", { name: "Finalizar Reparación y Enviar a QC" }));
    await waitFor(() => {
      expect(state.updateJob).toHaveBeenNthCalledWith(
        2,
        "job-repair-fixture",
        { status: "QC" },
        "technician-fixture",
        "Enviado a QC",
      );
    });
  });
});
