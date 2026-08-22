// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import VehicleTypeSelector from "@/components/ui/VehicleTypeSelector";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

afterEach(() => cleanup());

describe("VehicleTypeSelector", () => {
  it("exposes the selected vehicle and preserves keyboard-friendly button semantics", async () => {
    const onChange = vi.fn();
    render(<VehicleTypeSelector value="suv" onChange={onChange} />);

    const selected = screen.getByRole("button", { name: /vehicleSUV/ });
    const pickup = screen.getByRole("button", { name: /vehiclePickup/ });

    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(pickup.getAttribute("aria-pressed")).toBe("false");

    await userEvent.click(pickup);
    expect(onChange).toHaveBeenCalledWith("pickup");
  });
});
