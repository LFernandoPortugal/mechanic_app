import { Suspense } from "react";
import ClientQuoteView from "./QuoteView";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen page-bg flex items-center justify-center text-muted-foreground">Cargando cotización...</div>}>
      <ClientQuoteView />
    </Suspense>
  );
}
