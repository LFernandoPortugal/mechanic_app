"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Banknote, CarFront, CheckCircle2, ClipboardPlus, Clock3, Package, ShieldCheck, Users, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRealtimeJobs } from "@/hooks/useRealtimeJobs";
import { getAttentionOrders, getDashboardMetrics, getStageCounts } from "@/lib/dashboard";
import { AppShell } from "@/components/shell/AppShell";
import { OrderWorkflow } from "./OrderWorkflow";

const copy = {
 es: { hello:"Resumen operativo", subtitle:"Lo importante del taller, en un solo lugar.", active:"Vehículos activos", approval:"Esperando aprobación", repair:"En reparación", ready:"Listos para entrega", pending:"Pagos pendientes", revenue:"Ingresos de hoy", attention:"Órdenes que requieren atención", noAttention:"Todo está bajo control", noAttentionDesc:"No hay órdenes con bloqueos detectables en este momento.", quick:"Acciones rápidas", newOrder:"Nueva orden", clients:"Ver clientes", inventory:"Inventario", payments:"Registrar pago", approvalReason:"Falta autorización del cliente", technicianReason:"Sin técnico asignado", qcReason:"Control de calidad pendiente", paymentReason:"Pago pendiente", open:"Abrir orden", empty:"El taller aún no tiene órdenes", emptyDesc:"Crea la primera orden desde recepción para comenzar el flujo operativo.", retry:"Reintentar", error:"No pudimos cargar las órdenes." },
 en: { hello:"Operations overview", subtitle:"Everything that matters in the workshop, in one place.", active:"Active vehicles", approval:"Awaiting approval", repair:"In repair", ready:"Ready for delivery", pending:"Pending payments", revenue:"Today's revenue", attention:"Orders requiring attention", noAttention:"Everything is under control", noAttentionDesc:"There are no detectable order blockers right now.", quick:"Quick actions", newOrder:"New order", clients:"View clients", inventory:"Inventory", payments:"Record payment", approvalReason:"Customer approval required", technicianReason:"No technician assigned", qcReason:"Quality check pending", paymentReason:"Payment pending", open:"Open order", empty:"This workshop has no orders yet", emptyDesc:"Create the first order at reception to start the operational workflow.", retry:"Retry", error:"We couldn't load the orders." }
} as const;

export function AdminDashboard() {
  const { lang } = useLanguage();
  const c = copy[lang];
  const { workshopSettings } = useAuth();
  const { jobs, loading, error, retry } = useRealtimeJobs({ all: true });
  const metrics = getDashboardMetrics(jobs);
  const currency = workshopSettings?.currencySymbol || "$";
  const money = (value: number) => `${currency}${value.toLocaleString(lang === "es" ? "es-PE" : "en-US", { maximumFractionDigits: 2 })}`;
  const cards = [
    [c.active, metrics.active, CarFront], [c.approval, metrics.awaitingApproval, Clock3], [c.repair, metrics.inRepair, Wrench],
    [c.ready, metrics.ready, CheckCircle2], [c.pending, money(metrics.pendingPayments), Banknote], [c.revenue, money(metrics.todayRevenue), ShieldCheck],
  ] as const;
  const reasons = { approval:c.approvalReason, technician:c.technicianReason, qc:c.qcReason, payment:c.paymentReason };
  const attention = getAttentionOrders(jobs);

  return <AppShell>
    <div className="space-y-6">
      <div><p className="eyebrow">{workshopSettings?.workshopName || "SGA"}</p><h1 className="page-title">{c.hello}</h1><p className="mt-1 text-sm text-muted-foreground sm:text-base">{c.subtitle}</p></div>
      {error ? <div role="alert" className="app-card flex flex-wrap items-center justify-between gap-4 border-destructive/30 p-5"><div><strong>{c.error}</strong><p className="text-sm text-muted-foreground">{error}</p></div><button className="app-button-secondary" onClick={retry}>{c.retry}</button></div> : loading ? <DashboardSkeleton /> : jobs.length === 0 ? <div className="app-card py-14 text-center"><ClipboardPlus className="mx-auto mb-4 text-primary" size={32}/><h2 className="section-title">{c.empty}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{c.emptyDesc}</p><Link className="app-button-primary mt-5 inline-flex" href="/reception">{c.newOrder}</Link></div> : <>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6" aria-label={c.hello}>{cards.map(([label,value,Icon]) => <article className="metric-card" key={label}><Icon className="mb-5 text-primary" size={20}/><strong className="block text-2xl tabular-nums">{value}</strong><span className="mt-1 block text-xs font-medium text-muted-foreground">{label}</span></article>)}</section>
        <OrderWorkflow counts={getStageCounts(jobs)} lang={lang}/>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,.7fr)]">
          <section className="app-card overflow-hidden" aria-labelledby="attention-title"><div className="border-b border-border p-5 sm:p-6"><p className="eyebrow">{c.attention}</p><h2 id="attention-title" className="section-title">{attention.length} {c.attention.toLowerCase()}</h2></div>{attention.length ? <ul className="divide-y divide-border">{attention.map(({job,reason}) => <li key={job.id}><Link href="/advisor" className="group flex min-h-20 items-center gap-4 px-5 py-4 hover:bg-muted/70"><span className="status-dot status-warning"><AlertTriangle size={15}/></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{job.vehicleId} · {[job.make,job.model].filter(Boolean).join(" ") || job.clientId}</strong><span className="text-xs text-muted-foreground">{reasons[reason]}</span></span><ArrowRight className="text-muted-foreground transition-transform group-hover:translate-x-1" size={17}/><span className="sr-only">{c.open}</span></Link></li>)}</ul> : <div className="p-8 text-center"><CheckCircle2 className="mx-auto text-success"/><h3 className="mt-3 font-semibold">{c.noAttention}</h3><p className="mt-1 text-sm text-muted-foreground">{c.noAttentionDesc}</p></div>}</section>
          <section className="app-card p-5 sm:p-6" aria-labelledby="quick-title"><p className="eyebrow">{c.quick}</p><h2 id="quick-title" className="section-title mb-5">{c.quick}</h2><div className="grid gap-3">{[["/reception",c.newOrder,ClipboardPlus],["/clients",c.clients,Users],["/inventory",c.inventory,Package],["/advisor/payments",c.payments,Banknote]].map(([href,label,Icon],i) => <Link key={String(href)} href={String(href)} className={i===0?"app-button-primary justify-between":"app-button-secondary justify-between"}><span className="flex items-center gap-2"><Icon size={17}/>{String(label)}</span><ArrowRight size={16}/></Link>)}</div></section>
        </div>
      </>}
    </div>
  </AppShell>;
}

function DashboardSkeleton(){ return <div aria-label="Loading" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{Array.from({length:6},(_,i)=><div key={i} className="metric-card h-32 animate-pulse bg-muted"/>)}</div> }
