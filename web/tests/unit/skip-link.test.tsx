// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkipLink } from "@/components/SkipLink";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: () => "Saltar al contenido principal" }),
}));

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SkipLink", () => {
  it("moves focus and navigation to the main landmark", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>Contenido</main>
      </>
    );

    fireEvent.click(screen.getByRole("link", { name: "Saltar al contenido principal" }));

    const main = screen.getByRole("main");
    expect(document.activeElement).toBe(main);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(window.location.hash).toBe("#main-content");
  });

  it("keeps native link behavior available when the landmark is absent", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: "Saltar al contenido principal" });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });

    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(link.getAttribute("href")).toBe("#main-content");
  });
});
