// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AccessibleModal } from "@/components/AccessibleModal";

function ModalHarness({ withControls = true }: { withControls?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Abrir inventario</button>
      {open && (
        <AccessibleModal labelledBy="test-dialog-title" onClose={() => setOpen(false)}>
          <h2 id="test-dialog-title">Editar inventario</h2>
          {withControls && (
            <>
              <button type="button">Primero</button>
              <input aria-label="Cantidad" />
              <button type="button">Último</button>
            </>
          )}
        </AccessibleModal>
      )}
    </div>
  );
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("AccessibleModal", () => {
  it("announces itself as modal, isolates the background, and focuses the first control", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const opener = screen.getByRole("button", { name: "Abrir inventario" });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Editar inventario" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Primero" }));
    expect(opener.inert).toBe(true);
    expect(opener.getAttribute("aria-hidden")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("traps focus in both directions", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    await user.click(screen.getByRole("button", { name: "Abrir inventario" }));

    const first = screen.getByRole("button", { name: "Primero" });
    const last = screen.getByRole("button", { name: "Último" });

    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);

    first.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes with Escape, restores the background, and returns focus to the opener", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const opener = screen.getByRole("button", { name: "Abrir inventario" });
    await user.click(opener);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(opener.inert).not.toBe(true);
    expect(opener.hasAttribute("aria-hidden")).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps focus on the dialog when it has no interactive controls", async () => {
    const user = userEvent.setup();
    render(<ModalHarness withControls={false} />);
    await user.click(screen.getByRole("button", { name: "Abrir inventario" }));

    const dialog = screen.getByRole("dialog", { name: "Editar inventario" });
    expect(document.activeElement).toBe(dialog);
    await user.tab();
    expect(document.activeElement).toBe(dialog);
  });
});
