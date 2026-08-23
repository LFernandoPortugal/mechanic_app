"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardPlus, Package, Settings, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
  es: {
    eyebrow: "Primeros pasos",
    title: "Configura tu taller y crea la primera orden",
    description: "Prepara la operación una sola vez. Después este espacio se convertirá en tu resumen diario.",
    settings: "Datos del taller",
    settingsDesc: "Confirma nombre, moneda y datos de contacto.",
    employees: "Equipo y permisos",
    employeesDesc: "Invita al personal con el rol mínimo necesario.",
    inventory: "Inventario inicial",
    inventoryDesc: "Opcional: registra repuestos y existencias de apertura.",
    order: "Primera recepción",
    orderDesc: "Registra un vehículo para iniciar el flujo operativo.",
    ready: "Configuración básica detectada",
    open: "Abrir",
    optional: "Opcional",
  },
  en: {
    eyebrow: "Getting started",
    title: "Set up your workshop and create the first order",
    description: "Prepare operations once. This space will then become your daily overview.",
    settings: "Workshop details",
    settingsDesc: "Confirm the name, currency, and contact details.",
    employees: "Team and permissions",
    employeesDesc: "Invite staff with the minimum role they need.",
    inventory: "Opening inventory",
    inventoryDesc: "Optional: register parts and opening stock.",
    order: "First reception",
    orderDesc: "Register a vehicle to start the operational workflow.",
    ready: "Basic configuration detected",
    open: "Open",
    optional: "Optional",
  },
} as const;

export function WorkshopOnboarding() {
  const { lang } = useLanguage();
  const { workshopSettings } = useAuth();
  const c = copy[lang];
  const settingsReady = Boolean(workshopSettings?.workshopName && workshopSettings?.currencySymbol);
  const steps = [
    { href: "/admin/settings", title: c.settings, description: c.settingsDesc, icon: Settings, complete: settingsReady },
    { href: "/admin/users", title: c.employees, description: c.employeesDesc, icon: Users },
    { href: "/inventory", title: c.inventory, description: c.inventoryDesc, icon: Package, optional: true },
    { href: "/reception", title: c.order, description: c.orderDesc, icon: ClipboardPlus, primary: true },
  ];

  return (
    <section className="app-card overflow-hidden" aria-labelledby="workshop-onboarding-title">
      <div className="border-b border-border bg-primary/6 p-6 sm:p-8">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2 id="workshop-onboarding-title" className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">{c.title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{c.description}</p>
      </div>
      <ol className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-4">
        {steps.map(({ href, title, description, icon: Icon, complete, optional, primary }, index) => (
          <li key={href} className="flex min-h-56 flex-col bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${primary ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}><Icon size={20} /></span>
              <span className="text-xs font-bold tabular-nums text-muted-foreground">0{index + 1}</span>
            </div>
            <h3 className="mt-5 font-semibold">{title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            {complete ? <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-success"><CheckCircle2 size={15}/>{c.ready}</span> : optional ? <span className="mt-4 text-xs font-semibold text-muted-foreground">{c.optional}</span> : null}
            <Link href={href} className={`mt-4 justify-between ${primary ? "app-button-primary" : "app-button-secondary"}`}><span>{c.open}</span><ArrowRight size={16}/></Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
