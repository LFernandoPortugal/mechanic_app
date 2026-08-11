import emailjs from "@emailjs/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildQuoteEmailTemplateParams,
  isEmailConfigured,
  sendQuoteEmail,
} from "@/lib/email";

vi.mock("@emailjs/browser", () => ({
  default: {
    send: vi.fn(),
  },
}));

const quote = {
  clientEmail: " client@example.test ",
  clientName: " Cliente QA ",
  vehicleId: " QA-EMAIL-811 ",
  quoteUrl: " https://example.test/quote/view?id=qa ",
  totalEstimate: 12.34,
  currencySymbol: "S/.",
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("EmailJS quote notifications", () => {
  it("builds trimmed template variables with the workshop currency", () => {
    expect(buildQuoteEmailTemplateParams(quote)).toEqual({
      to_email: "client@example.test",
      client_name: "Cliente QA",
      vehicle_id: "QA-EMAIL-811",
      quote_url: "https://example.test/quote/view?id=qa",
      total_estimate: "S/. 12.34",
    });
  });

  it("rejects incomplete or invalid notification data", () => {
    expect(() => buildQuoteEmailTemplateParams({ ...quote, clientEmail: " " }))
      .toThrow(/incomplete/);
    expect(() => buildQuoteEmailTemplateParams({ ...quote, clientEmail: "invalid" }))
      .toThrow(/invalid/);
    expect(() => buildQuoteEmailTemplateParams({ ...quote, totalEstimate: -1 }))
      .toThrow(/non-negative/);
  });

  it("reports configuration only when every EmailJS variable is present", () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "service");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "template");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "   ");
    expect(isEmailConfigured()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "public-key");
    expect(isEmailConfigured()).toBe(true);
  });

  it("sends the validated template variables through the configured service", async () => {
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "service");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "template");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "public-key");

    await sendQuoteEmail(quote);

    expect(emailjs.send).toHaveBeenCalledWith(
      "service",
      "template",
      expect.objectContaining({
        to_email: "client@example.test",
        total_estimate: "S/. 12.34",
      }),
      {
        publicKey: "public-key",
        limitRate: {
          id: "quote-email",
          throttle: 10_000,
        },
      },
    );
  });
});
