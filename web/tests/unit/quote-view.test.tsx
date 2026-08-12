// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClientQuoteView from "@/app/quote/view/QuoteView";
import type { PublicQuote } from "@/lib/public-quote";

const route = vi.hoisted(() => ({ jobId: "job-fixture-00000001" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ id: route.jobId }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock("@/components/SignatureCanvas", () => ({
  SignatureCanvas: ({ onConfirm }: { onConfirm: (value: string) => void }) => (
    <button type="button" onClick={() => onConfirm("data:image/png;base64,fixture-signature")}>Confirmar firma de prueba</button>
  ),
}));

vi.mock("@/lib/pdf", () => ({ generateQuotePDF: vi.fn() }));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => ({
      loadingQuote: "Cargando cotización",
      loadingQuoteDesc: "Espera un momento",
      quoteLoadError: "No pudimos cargar la cotización",
      quoteLoadErrorDesc: "Ocurrió un problema temporal",
      retry: "Reintentar",
      quoteNotFound: "Cotización no encontrada",
      quoteNotFoundDesc: "Revisa el enlace",
      clientPortal: "Portal del cliente",
      clientSubtitle: "Datos del taller",
      vehicleIdLabel: "Vehículo",
      repairDetails: "Detalle de reparación",
      repairDetailsDesc: "Selecciona los trabajos",
      noComponentsDiagnosed: "Sin componentes",
      statusFail: "Falla",
      statusRecommended: "Recomendado",
      included: "Incluido",
      remove: "Quitar",
      noCostReviewed: "Sin costo",
      shopCharges: "Mano de obra",
      partsVariable: "Repuestos",
      totalToPay: "Total",
      acceptQuoteBtn: "Aceptar cotización",
      downloadPDF: "Descargar PDF",
    })[key] ?? key,
  }),
}));

const fixture: PublicQuote = {
  job: {
    id: route.jobId,
    vehicleId: "QA-PORTAL-01",
    make: "Toyota",
    model: "Yaris",
    status: "Approval",
    inspectionItems: [
      { id: "brakes", name: "Pastillas de freno", status: "Fail", price: 120 },
      { id: "oil", name: "Cambio de aceite", status: "Recommended", price: 80 },
    ],
    declinedItems: [],
    totalEstimate: 250,
    approvedAmount: 0,
  },
  settings: {
    workshopName: "Taller Fixture",
    logoUrl: "",
    address: "Dirección local",
    phone: "",
    taxId: "",
    termsAndConditions: "",
    currencySymbol: "S/.",
    taxRate: 0,
    taxName: "IGV",
  },
};

function response(status: number, body: PublicQuote = fixture) {
  const fixtureResponse = {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
  return fixtureResponse as unknown as Response;
}

beforeEach(() => {
  route.jobId = "job-fixture-00000001";
  window.history.replaceState(null, "", `/quote/view?id=${route.jobId}`);
  window.location.hash = "";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("public quote view", () => {
  it("shows the same neutral not-found state when the fragment token is absent", async () => {
    render(<ClientQuoteView />);

    expect(await screen.findByRole("heading", { name: "Cotización no encontrada" })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads the sanitized fixture with the token only in the request header", async () => {
    window.location.hash = "#token=fixture-secret";
    vi.mocked(fetch).mockResolvedValue(response(200));

    render(<ClientQuoteView />);

    expect(await screen.findByRole("heading", { name: "Taller Fixture - Portal del cliente" })).toBeTruthy();
    expect(screen.getByText("Pastillas de freno")).toBeTruthy();
    expect(screen.getByText("S/. 250.00")).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      `/api/public/quotes/${route.jobId}`,
      {
        cache: "no-store",
        headers: { "X-Quote-Token": "fixture-secret" },
      },
    );
    expect(String(vi.mocked(fetch).mock.calls[0][0])).not.toContain("fixture-secret");
  });

  it("distinguishes a transient server failure and retries successfully", async () => {
    const user = userEvent.setup();
    window.location.hash = "#token=fixture-secret";
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(200));

    render(<ClientQuoteView />);

    expect(await screen.findByRole("heading", { name: "No pudimos cargar la cotización" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { name: "Taller Fixture - Portal del cliente" })).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reloads with a regenerated token when only the URL fragment changes", async () => {
    window.location.hash = "#token=old-token";
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(404))
      .mockResolvedValueOnce(response(200));

    render(<ClientQuoteView />);
    expect(await screen.findByRole("heading", { name: "Cotización no encontrada" })).toBeTruthy();

    window.location.hash = "#token=new-token";
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(await screen.findByRole("heading", { name: "Taller Fixture - Portal del cliente" })).toBeTruthy();
    expect(vi.mocked(fetch).mock.calls[1][1]).toMatchObject({
      headers: { "X-Quote-Token": "new-token" },
    });
  });

  it("preserves the approval after a failed submission and retries it", async () => {
    const user = userEvent.setup();
    window.location.hash = "#token=fixture-secret";
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(200))
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(200, {
        ...fixture,
        job: { ...fixture.job, status: "Approved", approvedAmount: 250 },
      }));

    render(<ClientQuoteView />);
    expect(await screen.findByRole("heading", { name: "Taller Fixture - Portal del cliente" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Confirmar firma de prueba" }));
    await user.click(screen.getByRole("button", { name: "Aceptar cotización" }));

    expect((await screen.findByRole("alert")).textContent).toContain("La firma y tus selecciones se conservaron");
    await user.click(screen.getByRole("button", { name: "Reintentar aprobación" }));

    expect(await screen.findByRole("heading", { name: "¡Cotización Aprobada!" })).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(vi.mocked(fetch).mock.calls[1][1]).toMatchObject(vi.mocked(fetch).mock.calls[2][1] as RequestInit);
  });

  it.each([
    ["Approved", "Reparación"],
    ["Repair", "Reparación"],
    ["QC", "Control de Calidad"],
    ["Ready", "Listo"],
    ["Delivered", "Entregado"],
  ] as const)("marks the correct tracker step for %s", async (status, currentStep) => {
    window.location.hash = "#token=fixture-secret";
    vi.mocked(fetch).mockResolvedValue(response(200, {
      ...fixture,
      job: { ...fixture.job, status, approvedAmount: 250 },
    }));

    render(<ClientQuoteView />);

    await waitFor(() => {
      expect(document.querySelector('[aria-current="step"]')).not.toBeNull();
    });
    const current = document.querySelector('[aria-current="step"]');
    expect(current?.textContent).toContain(currentStep);
  });
});
