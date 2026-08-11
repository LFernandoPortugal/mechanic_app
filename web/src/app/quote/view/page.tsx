import { Suspense } from "react";
import type { Metadata } from "next";
import ClientQuoteView from "./QuoteView";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen page-bg flex items-center justify-center text-muted-foreground">Cargando cotización...</div>}>
      <ClientQuoteView />
    </Suspense>
  );
}
