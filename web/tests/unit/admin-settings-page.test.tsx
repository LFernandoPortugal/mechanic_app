// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/app/admin/settings/page";
import { workshopFixture } from "../fixtures/jobs";

const state = vi.hoisted(() => ({
  allowResetData: false,
  userProfile: { workshopId: "fixture-workshop" },
  updateWorkshopSettings: vi.fn(),
  resetWorkshopData: vi.fn(),
  refreshSettings: vi.fn(),
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
    userProfile: state.userProfile,
    loading: false,
    refreshSettings: state.refreshSettings,
  }),
}));
vi.mock("@/lib/db", () => ({
  getWorkshopSettings: vi.fn(async () => ({ ...workshopFixture, allowResetData: state.allowResetData })),
  updateWorkshopSettings: state.updateWorkshopSettings,
  resetWorkshopData: state.resetWorkshopData,
}));
vi.mock("@/lib/storage", () => ({ uploadJobImage: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

beforeEach(() => {
  state.allowResetData = false;
  state.updateWorkshopSettings.mockReset();
  state.updateWorkshopSettings.mockResolvedValue(undefined);
  state.resetWorkshopData.mockReset();
  state.resetWorkshopData.mockResolvedValue({ jobsDeleted: 2, inventoryDeleted: 1, transactionsDeleted: 3 });
  state.refreshSettings.mockReset();
  state.refreshSettings.mockResolvedValue(undefined);
});

afterEach(() => cleanup());

describe("SettingsPage", () => {
  it("saves only the workshop-editable settings", async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    const name = await screen.findByLabelText("Nombre Comercial / Razón Social");

    await user.clear(name);
    await user.type(name, "Taller QA");
    await user.type(screen.getByLabelText("NIT / RUT / Identificación Fiscal"), "RUC-FIXTURE");
    await user.clear(screen.getByLabelText("Divisa / Símbolo"));
    await user.type(screen.getByLabelText("Divisa / Símbolo"), "P/.");
    await user.clear(screen.getByLabelText("Tasa de Impuesto (%)"));
    await user.type(screen.getByLabelText("Tasa de Impuesto (%)"), "10");
    await user.click(screen.getByRole("checkbox", { name: /Habilitar botones de Auto-Llenado/ }));
    await user.click(screen.getByRole("button", { name: "Guardar Configuración" }));

    await waitFor(() => {
      expect(state.updateWorkshopSettings).toHaveBeenCalledWith("fixture-workshop", {
        workshopName: "Taller QA",
        taxId: "RUC-FIXTURE",
        phone: workshopFixture.phone || "+1 234 567 890",
        address: workshopFixture.address,
        logoUrl: workshopFixture.logoUrl,
        demoMode: true,
        currencySymbol: "P/.",
        taxRate: 10,
        taxName: workshopFixture.taxName,
      });
    });
    expect(state.refreshSettings).toHaveBeenCalledTimes(1);
    expect(state.updateWorkshopSettings.mock.calls[0][1]).not.toHaveProperty("allowResetData");
  });

  it("requires the exact confirmation before a tester workshop reset", async () => {
    const user = userEvent.setup();
    state.allowResetData = true;
    render(<SettingsPage />);
    await screen.findByText(/Zona de Peligro/);

    await user.click(screen.getByRole("button", { name: "Iniciar Restablecimiento de Datos" }));
    const confirmButton = screen.getByRole("button", { name: "Sí, borrar todo permanentemente" }) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);
    await user.type(screen.getByLabelText("Confirmación de Seguridad Obligatoria"), "eliminar");
    expect(confirmButton.disabled).toBe(false);
    await user.click(confirmButton);

    await waitFor(() => {
      expect(state.resetWorkshopData).toHaveBeenCalledWith("fixture-workshop");
    });
  });
});
