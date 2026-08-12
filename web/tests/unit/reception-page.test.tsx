// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Reception from "@/app/reception/page";

const state = vi.hoisted(() => ({
  userProfile: { workshopId: "fixture-workshop" },
  createJob: vi.fn(),
  getJobsByVehicleId: vi.fn(),
  getWorkshopSettings: vi.fn(),
  uploadJobImage: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));
vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "reception-fixture" },
    userProfile: state.userProfile,
  }),
}));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      licensePlate: "Placa",
      vinLabel: "VIN",
      make: "Marca",
      model: "Modelo",
      colorLabel: "Color",
      clientName: "Nombre del cliente",
      clientPhone: "Teléfono del cliente",
      clientEmail: "Correo del cliente",
      odometer: "Odómetro",
      fuelLevel: "Combustible",
      symptomsLabel: "Motivo de ingreso",
      registerAndBegin: "Registrar y comenzar",
      submitting: "Registrando...",
      alertPlateRequired: "Falta placa",
      alertClientRequired: "Falta cliente",
      alertSignatureRequired: "Firma requerida",
      alertNoPhoneWhatsApp: "Falta teléfono",
      receptionComplete: "Recepción completada",
      vehicleQueued: "Vehículo {id} en cola",
      goToTechnician: "Ir al técnico",
      registerAnother: "Registrar otro",
      oilLevel: "Aceite",
      coolantLevel: "Refrigerante",
      brakeLevel: "Frenos",
      lockNutKey: "Llave de ruedas",
      sunglasses: "Gafas de sol",
      documentsInVehicle: "Documentos",
      otherValuables: "Otros objetos",
    })[key] ?? key,
  }),
}));
vi.mock("@/lib/db", () => ({
  createJob: state.createJob,
  getJobsByVehicleId: state.getJobsByVehicleId,
  getWorkshopSettings: state.getWorkshopSettings,
}));
vi.mock("@/lib/storage", () => ({ uploadJobImage: state.uploadJobImage }));
vi.mock("sonner", () => ({
  toast: { warning: state.toastWarning, error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock("@/components/SignatureCanvas", () => ({
  SignatureCanvas: ({ onConfirm }: { onConfirm: (value: string) => void }) => (
    <button type="button" onClick={() => onConfirm("data:image/png;base64,fixture-signature")}>Confirmar firma fixture</button>
  ),
}));
vi.mock("@/components/WorkflowStepper", () => ({ WorkflowStepper: () => <div>Flujo Reception</div> }));
vi.mock("@/components/ui/VehicleTypeSelector", () => ({ default: () => <div>Tipo auto</div> }));
vi.mock("@/components/ui/switch", () => ({
  Switch: ({ id, checked, onCheckedChange }: { id?: string; checked: boolean; onCheckedChange: (value: boolean) => void }) => (
    <input id={id} role="switch" type="checkbox" checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} />
  ),
}));

beforeEach(() => {
  state.createJob.mockReset();
  state.createJob.mockResolvedValue("job-created");
  state.getJobsByVehicleId.mockReset();
  state.getJobsByVehicleId.mockResolvedValue([]);
  state.getWorkshopSettings.mockReset();
  state.getWorkshopSettings.mockResolvedValue({ demoMode: false });
  state.uploadJobImage.mockReset();
  state.toastWarning.mockReset();
});

afterEach(() => cleanup());

async function fillRequiredReception(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Placa *"), "QA-REC-01");
  await user.type(screen.getByLabelText("Marca *"), "Toyota");
  await user.type(screen.getByLabelText("Nombre del cliente *"), "Cliente Fixture");
  await user.type(screen.getByLabelText("Motivo de ingreso"), "Ruido al frenar");
}

describe("Reception", () => {
  it("blocks a reception without the customer's signature", async () => {
    const user = userEvent.setup();
    render(<Reception />);
    await fillRequiredReception(user);

    await user.click(screen.getByRole("button", { name: "Registrar y comenzar" }));

    expect(state.createJob).not.toHaveBeenCalled();
    expect(state.toastWarning).toHaveBeenCalledWith("Firma requerida");
  });

  it("creates the complete normalized reception payload", async () => {
    const user = userEvent.setup();
    render(<Reception />);
    await fillRequiredReception(user);
    await user.type(screen.getByLabelText("VIN"), "  VIN-FIXTURE  ");
    await user.type(screen.getByLabelText("Modelo"), "Yaris");
    await user.type(screen.getByLabelText("Color"), "Azul");
    await user.type(screen.getByLabelText("Teléfono del cliente"), "999111222");
    await user.type(screen.getByLabelText("Correo del cliente"), "cliente@example.com");
    await user.type(screen.getByLabelText("Odómetro (km)"), "45123");
    await user.click(screen.getByRole("button", { name: "Frenos: LOW" }));
    await user.click(screen.getByRole("switch", { name: "Documentos" }));
    await user.click(screen.getByRole("button", { name: "Confirmar firma fixture" }));

    await user.click(screen.getByRole("button", { name: "Registrar y comenzar" }));

    await waitFor(() => {
      expect(state.createJob).toHaveBeenCalledWith({
        workshopId: "fixture-workshop",
        vehicleId: "QA-REC-01",
        vin: "VIN-FIXTURE",
        make: "Toyota",
        model: "Yaris",
        color: "Azul",
        vehicleType: "auto",
        clientId: "Cliente Fixture",
        clientPhone: "999111222",
        clientEmail: "cliente@example.com",
        advisorId: "reception-fixture",
        status: "Reception",
        symptoms: "Ruido al frenar",
        signatureBase64: "data:image/png;base64,fixture-signature",
        receptionImages: undefined,
        fluidAudit: { oilLevel: "OK", coolantLevel: "OK", brakeFluid: "Low", notes: "" },
        valuables: { lockNutKey: false, sunglasses: false, documents: true, other: "" },
        startingFuel: 50,
        odometer: 45123,
        inspectionItems: [],
        declinedItems: [],
        totalEstimate: 0,
        approvedAmount: 0,
      }, "reception-fixture");
    });
    expect(screen.getByText("Recepción completada")).toBeTruthy();
  });
});
