"use client";

import { useState } from "react";
import {
  ClipboardList,
  SearchCode,
  Calculator,
  Wrench,
  ShieldCheck,
  Coins,
} from "lucide-react";

interface WorkflowStepperProps {
  currentStatus: string;
}

const STEPS = [
  {
    key: "Reception",
    label: "Recepción",
    icon: ClipboardList,
    glow: "shadow-emerald-500/30 border-emerald-500/60 text-emerald-400",
    bgGlow: "bg-emerald-950/20",
    statuses: ["Reception"],
    role: "Recepcionista",
    description: "Se registra el vehículo: datos del cliente, odómetro, fluidos, fotos de daños previos y firma digital.",
  },
  {
    key: "Diagnosis",
    label: "Diagnóstico",
    icon: SearchCode,
    glow: "shadow-blue-500/30 border-blue-500/60 text-blue-400",
    bgGlow: "bg-blue-950/20",
    statuses: ["Diagnosis"],
    role: "Técnico",
    description: "El técnico inspecciona el vehículo y registra hallazgos (Pass / Fail / Crítico / Recomendado) con fotos como evidencia.",
  },
  {
    key: "Approval",
    label: "Presupuesto",
    icon: Calculator,
    glow: "shadow-violet-500/30 border-violet-500/60 text-violet-400",
    bgGlow: "bg-violet-950/20",
    statuses: ["Approval", "Approved"],
    role: "Asesor → Cliente",
    description: "El asesor asigna precios y genera el link de cotización. El cliente lo revisa, selecciona qué aprobar y firma.",
  },
  {
    key: "Repair",
    label: "Reparación",
    icon: Wrench,
    glow: "shadow-orange-500/30 border-orange-500/60 text-orange-400",
    bgGlow: "bg-orange-950/20",
    statuses: ["Repair"],
    role: "Técnico",
    description: "El técnico ejecuta los trabajos aprobados por el cliente. Al terminar, envía el vehículo a Control de Calidad.",
  },
  {
    key: "QC",
    label: "Control de Calidad",
    icon: ShieldCheck,
    glow: "shadow-pink-500/30 border-pink-500/60 text-pink-400",
    bgGlow: "bg-pink-950/20",
    statuses: ["QC"],
    role: "Inspector / Admin / Técnico",
    description: "Se verifica la calidad del trabajo mediante un checklist de 5 puntos. Si pasa, el vehículo queda listo para cobro.",
  },
  {
    key: "Ready",
    label: "Caja / Entrega",
    icon: Coins,
    glow: "shadow-cyan-500/30 border-cyan-500/60 text-cyan-400",
    bgGlow: "bg-cyan-950/20",
    statuses: ["Ready", "Delivered"],
    role: "Asesor / Caja",
    description: "Se registra el pago final (abonos, vuelto, recibo PDF). Al cobrar el monto completo, el vehículo queda Entregado.",
  },
];

export function WorkflowStepper({ currentStatus }: WorkflowStepperProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const currentStepIndex = STEPS.findIndex((step) =>
    step.statuses.includes(currentStatus)
  );

  return (
    <div className="w-full glass-panel border border-border/40 rounded-xl p-4 sm:p-5 shadow-lg bg-card/45 backdrop-blur-md">
      <div className="relative flex items-center justify-between w-full">
        {/* Connector backdrop */}
        <div className="absolute left-5 right-5 top-[18px] h-[3px] bg-zinc-800 rounded-full z-0 sm:left-6 sm:right-6 sm:top-[22px]" />

        {/* Progress line */}
        <div
          className="absolute left-5 top-[18px] h-[3px] bg-gradient-to-r from-emerald-500 via-violet-500 to-cyan-400 transition-all duration-700 ease-out rounded-full z-0 shadow-[0_0_8px_rgba(16,185,129,0.4)] sm:left-6 sm:top-[22px]"
          style={{
            width: `${currentStepIndex >= 0 ? (currentStepIndex / (STEPS.length - 1)) * 100 : 0}%`,
            maxWidth: "calc(100% - 48px)",
          }}
        />

        {/* Nodes */}
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;
          const isExpanded = expandedStep === step.key;

          let nodeStyle = "border-zinc-700 bg-zinc-900 text-zinc-500";
          let labelStyle = "text-zinc-500 font-light";

          if (isActive) {
            nodeStyle = `border-[2.5px] ${step.glow} ${step.bgGlow} scale-110 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10`;
            labelStyle = "text-foreground font-extrabold select-none";
          } else if (isCompleted) {
            nodeStyle = "border-[2px] border-emerald-500/70 bg-emerald-950/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)] z-10";
            labelStyle = "text-emerald-400/80 font-medium select-none";
          }

          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
              {/* Clickable node */}
              <button
                type="button"
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-500 ${nodeStyle} backdrop-blur-md relative`}
                onClick={() => setExpandedStep(isExpanded ? null : step.key)}
                title={step.description}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                {isActive && (
                  <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />
                )}
              </button>

              {/* Label */}
              <span className={`text-[10px] sm:text-xs mt-2.5 text-center select-none ${labelStyle} hidden md:block`}>
                {step.label}
              </span>
              {/* "Aquí" badge */}
              {isActive && (
                <span className="hidden md:block text-[9px] font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-500 px-1.5 py-0.5 rounded-full mt-1 shadow-sm animate-pulse">
                  Aquí
                </span>
              )}

              {/* Tooltip popup */}
              {isExpanded && (
                <div className="absolute top-14 z-50 w-52 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-xl p-3 text-left">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-[11px] font-bold text-foreground">{step.label}</p>
                  </div>
                  <p className="text-[10px] text-violet-400 font-semibold mb-1.5">👤 {step.role}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="mt-4 pt-3 border-t border-border/20 flex flex-col items-start gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-1.5 font-light">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ruta del Taller SGA
        </span>
        {currentStepIndex >= 0 ? (
          <span className="text-left sm:text-right">
            <span className="text-foreground font-semibold">{STEPS[currentStepIndex].label}</span>
            <span className="text-muted-foreground/60 ml-1.5">· {STEPS[currentStepIndex].role}</span>
          </span>
        ) : (
          <span>Estado: {currentStatus}</span>
        )}
      </div>

      {/* Active step description — always visible */}
      {currentStepIndex >= 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground/70 leading-relaxed border-t border-border/10 pt-2">
          {STEPS[currentStepIndex].description}
        </p>
      )}
    </div>
  );
}
