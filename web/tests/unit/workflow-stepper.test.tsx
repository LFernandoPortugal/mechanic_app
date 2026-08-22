// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowStepper } from "@/components/WorkflowStepper";

vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ lang: "es" }) }));
afterEach(() => cleanup());

describe("WorkflowStepper", () => {
  it("renders all eight canonical stages and keeps approval states separate", () => {
    render(<WorkflowStepper currentStatus="Approved" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(screen.getByRole("button", { name: /Por aprobar/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Aprobado/ }).getAttribute("aria-current")).toBe("step");
  });
});
