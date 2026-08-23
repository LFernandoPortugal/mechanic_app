// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BrandLockup, BrandMark } from "@/components/brand/BrandMark";

afterEach(() => cleanup());

describe("SGA brand assets", () => {
  it("keeps a decorative mark hidden when the visible wordmark identifies the brand", () => {
    const { container } = render(<BrandLockup />);
    expect(screen.getByText("SGA")).toBeTruthy();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("supports an accessible standalone mark", () => {
    const { container } = render(<BrandMark title="SGA" />);
    expect(screen.getByRole("img", { name: "SGA" })).toBeTruthy();
    expect(container.querySelector('path[fill="var(--brand-orange)"]')).toBeTruthy();
    expect(container.querySelector('path[fill="var(--brand-steel)"]')).toBeTruthy();
    expect(container.querySelector('path[fill="var(--brand-channel)"]')).toBeTruthy();
  });
});
