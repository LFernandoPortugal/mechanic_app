"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { isOrderStage, ORDER_STAGES, WORKFLOW_COPY, type OrderStage } from "@/lib/workflow";

export function WorkflowStepper({ currentStatus }: { currentStatus: string }) {
  const { lang } = useLanguage();
  const [expandedStep, setExpandedStep] = useState<OrderStage | null>(null);
  const currentIndex = isOrderStage(currentStatus) ? ORDER_STAGES.indexOf(currentStatus) : -1;
  const activeStage = currentIndex >= 0 ? ORDER_STAGES[currentIndex] : null;

  return (
    <section className="app-card p-4 sm:p-5" aria-label={lang === "es" ? "Progreso de la orden" : "Order progress"}>
      <ol className="grid grid-cols-4 gap-2 md:grid-cols-8">
        {ORDER_STAGES.map((stage, index) => {
          const content = WORKFLOW_COPY[lang][stage];
          const isComplete = index < currentIndex;
          const isActive = index === currentIndex;
          const isExpanded = expandedStep === stage;

          return (
            <li key={stage} className="relative min-w-0">
              <button type="button" aria-current={isActive ? "step" : undefined} aria-expanded={isExpanded}
                onClick={() => setExpandedStep(isExpanded ? null : stage)}
                className={`group flex w-full flex-col items-center gap-2 rounded-lg px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isActive ? "bg-primary/10 text-primary" : isComplete ? "text-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <span className={`relative z-10 flex size-8 items-center justify-center rounded-full border text-xs font-bold ${isActive ? "border-primary bg-primary text-primary-foreground" : isComplete ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>
                  {isComplete ? <Check size={15} aria-hidden="true" /> : index + 1}
                </span>
                <span className="line-clamp-2 min-h-8 text-[11px] font-semibold leading-4 sm:text-xs">{content.label}</span>
              </button>
              {index < ORDER_STAGES.length - 1 && <ChevronRight size={15} className="absolute -right-2 top-5 z-20 hidden text-border md:block" aria-hidden="true" />}
              {isExpanded && <div className="absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 rounded-xl border border-border bg-popover p-3 text-left text-popover-foreground shadow-lg">
                <strong className="block text-sm">{content.label}</strong><span className="mt-1 block text-xs font-medium text-primary">{content.role}</span>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{content.description}</p>
              </div>}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium text-muted-foreground">{lang === "es" ? "Flujo operativo canónico" : "Canonical operating workflow"}</span>
        {activeStage ? <span><strong>{WORKFLOW_COPY[lang][activeStage].label}</strong><span className="text-muted-foreground"> · {WORKFLOW_COPY[lang][activeStage].role}</span></span> : <span className="text-muted-foreground">{currentStatus}</span>}
      </div>
      {activeStage && <p className="mt-2 text-xs leading-5 text-muted-foreground">{WORKFLOW_COPY[lang][activeStage].description}</p>}
    </section>
  );
}
