import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

interface QueueStep {
  title: string;
  description: string;
}

interface WorkflowQueueEmptyStateProps {
  accent: "orange" | "violet";
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  steps: QueueStep[];
}

const ACCENT_STYLES = {
  orange: {
    border: "border-orange-500/25",
    glow: "bg-orange-500/15",
    icon: "bg-orange-500/10 text-orange-500 dark:text-orange-400 ring-orange-500/25",
    eyebrow: "text-orange-600 dark:text-orange-400 border-orange-500/25 bg-orange-500/10",
    step: "text-orange-500 dark:text-orange-400",
  },
  violet: {
    border: "border-violet-500/25",
    glow: "bg-violet-500/15",
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/25",
    eyebrow: "text-violet-600 dark:text-violet-400 border-violet-500/25 bg-violet-500/10",
    step: "text-violet-600 dark:text-violet-400",
  },
} as const;

export function WorkflowQueueEmptyState({
  accent,
  icon,
  eyebrow,
  title,
  description,
  steps,
}: WorkflowQueueEmptyStateProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div className="min-h-screen page-bg px-4 py-6 text-foreground md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </Link>

        <section className={`glass-panel relative overflow-hidden rounded-3xl border ${styles.border}`}>
          <div className={`pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl ${styles.glow}`} />
          <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-12">
            <div className="flex flex-col justify-center">
              <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ${styles.icon}`}>
                {icon}
              </div>
              <span className={`mb-4 w-fit rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${styles.eyebrow}`}>
                {eyebrow}
              </span>
              <h1 className="max-w-xl text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/55 p-5 backdrop-blur-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Qué ocurrirá después
              </p>
              <div className="mt-5 space-y-5">
                {steps.map((step) => (
                  <div key={step.title} className="flex gap-3">
                    <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${styles.step}`} />
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
    </div>
  );
}
