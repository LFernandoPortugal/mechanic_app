// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InventoryPage from "@/app/inventory/page";
import type { InventoryItem } from "@/types";

const state = vi.hoisted(() => ({
  isAdmin: true,
  userProfile: { workshopId: "fixture-workshop" },
  items: [] as InventoryItem[],
  addInventoryItem: vi.fn(),
  updateInventoryItem: vi.fn(),
  recordStockMovement: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "admin-fixture" },
    userProfile: state.userProfile,
    workshopSettings: { currencySymbol: "S/.", allowResetData: false },
    hasRole: (role: string) => role === "ADMIN" && state.isAdmin,
    loading: false,
  }),
}));
vi.mock("@/lib/db", () => ({
  getInventoryItems: vi.fn(async () => state.items),
  addInventoryItem: state.addInventoryItem,
  updateInventoryItem: state.updateInventoryItem,
  deleteInventoryItem: vi.fn(),
  recordStockMovement: state.recordStockMovement,
  getStockMovements: vi.fn(async () => []),
}));
vi.mock("sonner", () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

const inventoryFixture: InventoryItem = {
  id: "inventory-fixture",
  workshopId: "fixture-workshop",
  sku: "FRE-001",
  name: "Pastillas Fixture",
  category: "Frenos",
  unitPrice: 100,
  costPrice: 70,
  stock: 4,
  minStock: 2,
  unit: "pcs",
  supplier: "Proveedor Fixture",
  createdAt: new Date("2026-08-11T12:00:00.000Z"),
  updatedAt: new Date("2026-08-11T12:00:00.000Z"),
};

beforeEach(() => {
  state.isAdmin = true;
  state.items = [inventoryFixture];
  state.addInventoryItem.mockReset();
  state.addInventoryItem.mockResolvedValue("new-item");
  state.updateInventoryItem.mockReset();
  state.recordStockMovement.mockReset();
  state.recordStockMovement.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("InventoryPage", () => {
  it("adds an inventory item with the active workshop and actor", async () => {
    const user = userEvent.setup();
    render(<InventoryPage />);
    await screen.findAllByText("Pastillas Fixture");

    await user.click(screen.getByRole("button", { name: "Agregar Repuesto" }));
    await user.type(screen.getByLabelText("SKU *"), "FIL-010");
    await user.type(screen.getByLabelText("Nombre del repuesto / servicio *"), "Filtro de aceite");
    await user.selectOptions(screen.getByLabelText("Categoría"), "Filtros");
    await user.clear(screen.getByLabelText("Precio Venta (S/.)"));
    await user.type(screen.getByLabelText("Precio Venta (S/.)"), "45.5");
    await user.clear(screen.getByLabelText("Costo (S/.)"));
    await user.type(screen.getByLabelText("Costo (S/.)"), "30");
    await user.clear(screen.getByLabelText("Stock Inicial"));
    await user.type(screen.getByLabelText("Stock Inicial"), "8");
    await user.click(screen.getByRole("button", { name: "Agregar al Inventario" }));

    await waitFor(() => {
      expect(state.addInventoryItem).toHaveBeenCalledWith(expect.objectContaining({
        workshopId: "fixture-workshop",
        sku: "FIL-010",
        name: "Filtro de aceite",
        category: "Filtros",
        unitPrice: 45.5,
        costPrice: 30,
        stock: 8,
      }), "admin-fixture");
    });
  }, 10_000);

  it("records an auditable stock entry with the purchase cost", async () => {
    const user = userEvent.setup();
    render(<InventoryPage />);
    await screen.findAllByText("Pastillas Fixture");

    await user.click(screen.getByRole("button", { name: "Entrada de stock para Pastillas Fixture" }));
    await user.clear(screen.getByLabelText("Cantidad"));
    await user.type(screen.getByLabelText("Cantidad"), "3");
    await user.type(screen.getByLabelText("Notas (opcional)"), "Compra de prueba");
    await user.click(screen.getByRole("button", { name: "Registrar Movimiento" }));

    await waitFor(() => {
      expect(state.recordStockMovement).toHaveBeenCalledWith({
        itemId: "inventory-fixture",
        itemName: "Pastillas Fixture",
        type: "IN",
        quantity: 3,
        unitPrice: 70,
        notes: "Compra de prueba",
        actorId: "admin-fixture",
        workshopId: "fixture-workshop",
      });
    });
  });

  it("keeps inventory read-only for an advisor", async () => {
    state.isAdmin = false;
    render(<InventoryPage />);
    await screen.findAllByText("Pastillas Fixture");

    expect(screen.queryByRole("button", { name: "Agregar Repuesto" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Editar Pastillas Fixture/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Entrada de stock para Pastillas Fixture/ })).toBeNull();
  });
});
