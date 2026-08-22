"use client";

import { Check, ChevronRight } from "lucide-react";
import { ORDER_STAGES, WORKFLOW_COPY, type OrderStage } from "@/lib/workflow";

export function OrderWorkflow({ counts, lang = "es" }: { counts: Record<OrderStage, number>; lang?: "es" | "en" }) {
  return (
    <section className="app-card p-5 sm:p-6" aria-labelledby="workflow-title">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div><p className="eyebrow">{lang === "es" ? "Flujo canónico" : "Canonical workflow"}</p><h2 id="workflow-title" className="section-title">{lang === "es" ? "Estado de las órdenes" : "Order status"}</h2></div>
        <span className="text-sm text-muted-foreground">{Object.values(counts).reduce((a, b) => a + b, 0)} {lang === "es" ? "órdenes" : "orders"}</span>
      </div>
      <ol className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8" aria-label={lang === "es" ? "Etapas de una orden" : "Order stages"}>
        {ORDER_STAGES.map((stage, index) => (
          <li key={stage} className="relative">
            <div className="workflow-step">
              <span className="workflow-index" aria-hidden="true">{index === ORDER_STAGES.length - 1 ? <Check size={14} /> : index + 1}</span>
              <span className="min-w-0"><span className="block truncate text-xs font-semibold">{WORKFLOW_COPY[lang][stage].label}</span><strong className="mt-1 block text-xl tabular-nums">{counts[stage]}</strong></span>
            </div>
            {index < ORDER_STAGES.length - 1 && <ChevronRight className="absolute -right-3 top-7 z-10 hidden text-primary/40 xl:block" size={18} aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </section>
  );
}
