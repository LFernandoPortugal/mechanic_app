"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { 
  ClipboardList, 
  SearchCode, 
  Calculator, 
  Wrench, 
  ShieldCheck, 
  Coins 
} from "lucide-react";

interface WorkflowStepperProps {
  currentStatus: string;
}

const STEPS = [
  {
    key: "Reception",
    label: "Recepción",
    icon: ClipboardList,
    color: "from-emerald-500 to-teal-400",
    glow: "shadow-emerald-500/30 border-emerald-500/60 text-emerald-400",
    bgGlow: "bg-emerald-950/20",
    statuses: ["Reception"]
  },
  {
    key: "Diagnosis",
    label: "Diagnóstico",
    icon: SearchCode,
    color: "from-blue-500 to-indigo-400",
    glow: "shadow-blue-500/30 border-blue-500/60 text-blue-400",
    bgGlow: "bg-blue-950/20",
    statuses: ["Diagnosis"]
  },
  {
    key: "Approval",
    label: "Presupuesto",
    icon: Calculator,
    color: "from-violet-500 to-purple-400",
    glow: "shadow-violet-500/30 border-violet-500/60 text-violet-400",
    bgGlow: "bg-violet-950/20",
    statuses: ["Approval", "Approved"]
  },
  {
    key: "Repair",
    label: "Reparación",
    icon: Wrench,
    color: "from-orange-500 to-amber-400",
    glow: "shadow-orange-500/30 border-orange-500/60 text-orange-400",
    bgGlow: "bg-orange-950/20",
    statuses: ["Repair"]
  },
  {
    key: "QC",
    label: "Inspección (QC)",
    icon: ShieldCheck,
    color: "from-pink-500 to-rose-400",
    glow: "shadow-pink-500/30 border-pink-500/60 text-pink-400",
    bgGlow: "bg-pink-950/20",
    statuses: ["QC"]
  },
  {
    key: "Ready",
    label: "Listo / Caja",
    icon: Coins,
    color: "from-cyan-500 to-sky-400",
    glow: "shadow-cyan-500/30 border-cyan-500/60 text-cyan-400",
    bgGlow: "bg-cyan-950/20",
    statuses: ["Ready", "Delivered"]
  }
];

export function WorkflowStepper({ currentStatus }: WorkflowStepperProps) {
  const { t } = useLanguage();

  // Find the index of the step matching the current status
  const currentStepIndex = STEPS.findIndex(step => step.statuses.includes(currentStatus));

  return (
    <div className="w-full glass-panel border border-border/40 rounded-xl p-4 sm:p-5 shadow-lg bg-card/45 backdrop-blur-md">
      <div className="relative flex items-center justify-between w-full">
        {/* Connector Line (Backdrop) */}
        <div className="absolute left-6 right-6 top-[22px] h-[3px] bg-zinc-800 rounded-full z-0" />

        {/* Dynamic Glowing Progress Line */}
        <div 
          className="absolute left-6 top-[22px] h-[3px] bg-gradient-to-r from-emerald-500 via-violet-500 to-cyan-400 transition-all duration-700 ease-out rounded-full z-0 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
          style={{ 
            width: `${currentStepIndex >= 0 ? (currentStepIndex / (STEPS.length - 1)) * 100 : 0}%`,
            maxWidth: "calc(100% - 48px)"
          }}
        />

        {/* Stepper Nodes */}
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          let nodeStyle = "border-zinc-700 bg-zinc-900 text-zinc-500";
          let labelStyle = "text-zinc-500 font-light";

          if (isActive) {
            nodeStyle = `border-[2.5px] ${step.glow} ${step.bgGlow} scale-110 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10`;
            labelStyle = "text-foreground font-extrabold select-none";
          } else if (isCompleted) {
            nodeStyle = `border-[2px] border-emerald-500/70 bg-emerald-950/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)] z-10`;
            labelStyle = "text-emerald-400/80 font-medium select-none";
          }

          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
              {/* Node Circle */}
              <div 
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 ${nodeStyle} backdrop-blur-md`}
                title={`${step.label} (${currentStatus})`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
              </div>

              {/* Step Label (Hidden on small mobile screens for spacing, visible on sm and up) */}
              <span className={`text-[10px] sm:text-xs mt-2.5 transition-all duration-300 text-center select-none ${labelStyle} hidden md:block`}>
                {step.label}
              </span>
              <span className={`text-[8px] mt-1 transition-all duration-300 text-center select-none ${labelStyle} md:hidden block max-w-[60px] truncate`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile-Friendly Text Banner (Explaining current stage active) */}
      <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-light">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ruta del Taller SGA
        </span>
        {currentStepIndex >= 0 ? (
          <span className="text-foreground">
            Vehículo en etapa de: <strong className="text-orange-400 font-semibold">{STEPS[currentStepIndex].label}</strong>
          </span>
        ) : (
          <span>Estado del auto: {currentStatus}</span>
        )}
      </div>
    </div>
  );
}
