import { Suspense } from "react";
import ClientDetailPage from "./ClientDetail";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen page-bg flex items-center justify-center text-muted-foreground">Cargando historial del cliente...</div>}>
      <ClientDetailPage />
    </Suspense>
  );
}
