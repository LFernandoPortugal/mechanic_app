import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

interface QueueStep {
  title: string;
  description: string;
}

interface WorkflowQueueEmptyStateProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  steps: QueueStep[];
}

export function WorkflowQueueEmptyState({
  icon,
  eyebrow,
  title,
  description,
  steps,
}: WorkflowQueueEmptyStateProps) {
  return (
    <div className="mx-auto w-full max-w-5xl text-foreground">
        <section className="app-card overflow-hidden">
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-12">
            <div className="flex flex-col justify-center">
              <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                {icon}
              </div>
              <span className="mb-3 text-xs font-semibold text-primary">
                {eyebrow}
              </span>
              <h1 className="max-w-xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-muted/45 p-5 sm:p-6">
              <p className="text-sm font-semibold text-foreground">
                Qué ocurrirá después
              </p>
              <div className="mt-5 space-y-5">
                {steps.map((step) => (
                  <div key={step.title} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-bold text-foreground">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
    </div>
  );
}
