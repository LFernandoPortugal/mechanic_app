import { describe, expect, it } from "vitest";
import { buildWhatsAppQuoteMessage } from "@/lib/whatsapp";

describe("buildWhatsAppQuoteMessage", () => {
  it("keeps the secure quote URL intact and uses the workshop currency", () => {
    const quoteUrl = "https://mechanic.example/quote/view?id=AbCdEfGhIjKlMnOpQrSt#token=secure_token";
    const message = buildWhatsAppQuoteMessage(
      "Cliente",
      "ABC-123",
      quoteUrl,
      12.34,
      "S/.",
    );

    expect(message).toContain("S/. 12.34");
    expect(message).toContain(quoteUrl);
    expect(message).not.toContain("$12.34");
  });
});
