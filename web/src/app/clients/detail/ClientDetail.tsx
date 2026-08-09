"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getClientJobs } from "@/lib/clients";
import { useAuth } from "@/contexts/AuthContext";
import { Job } from "@/types";
import { toDate } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  UserCircle,
  Phone,
  Mail,
  Car,
  DollarSign,
  Wrench,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  TrendingUp,
  Hash,
  Loader2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  ShieldCheck,
} from "lucide-react";

/* ─── helpers ────────────────────────────────────────────── */
function jobDate(job: Job): Date | null {
  return toDate(job.createdAt);
}

const fmtDate = (d: Date | null) => {
  if (!d) return "—";
  return d.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" });
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  Reception: { color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20", icon: <ClipboardList className="w-3 h-3" /> },
  Diagnosis: { color: "text-amber-400 border-amber-500/30 bg-amber-950/20", icon: <Wrench className="w-3 h-3" /> },
  Approval: { color: "text-blue-400 border-blue-500/30 bg-blue-950/20", icon: <Clock className="w-3 h-3" /> },
  Approved: { color: "text-blue-400 border-blue-500/30 bg-blue-950/20", icon: <CheckCircle2 className="w-3 h-3" /> },
  Repair: { color: "text-orange-400 border-orange-500/30 bg-orange-950/20", icon: <Wrench className="w-3 h-3" /> },
  QC: { color: "text-purple-400 border-purple-500/30 bg-purple-950/20", icon: <CheckCircle2 className="w-3 h-3" /> },
  Ready: { color: "text-cyan-400 border-cyan-500/30 bg-cyan-950/20", icon: <CheckCircle2 className="w-3 h-3" /> },
  Delivered: { color: "text-green-400 border-green-500/30 bg-green-950/20", icon: <CheckCircle2 className="w-3 h-3" /> },
};

const inspectionStatusIcon: Record<string, React.ReactNode> = {
  Pass: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  Fail: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  Critical: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  Recommended: <CircleDot className="w-3.5 h-3.5 text-blue-400" />,
};

/* ─── Component ──────────────────────────────────────────── */
export default function ClientDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, loading: authLoading, workshopSettings } = useAuth();
  const clientName = decodeURIComponent((searchParams.get("id") || searchParams.get("name") || "") as string);

  const fmtCurrency = (n: number) => {
    const symbol = workshopSettings?.currencySymbol || "$";
    return `${symbol}${n.toFixed(2)}`;
  };

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      try {
        const wId = userProfile?.workshopId || null;
        if (!wId) {
          setLoading(false);
          return;
        }
        const data = await getClientJobs(wId, clientName);
        setJobs(data);
        // Auto-expand the most recent job
        if (data.length > 0) {
          setExpandedJobs(new Set([data[0].id]));
        }
      } catch (err) {
        console.error("Error loading client jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientName, userProfile, authLoading]);

  const toggleExpand = (id: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Derived data ────────────────────────────────────── */
  const clientPhone = useMemo(() => jobs.find((j) => j.clientPhone)?.clientPhone || "", [jobs]);
  const clientEmail = useMemo(() => jobs.find((j) => j.clientEmail)?.clientEmail || "", [jobs]);

  const vehicles = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs) {
      if (!job.vehicleId) continue;
      if (!map.has(job.vehicleId)) map.set(job.vehicleId, []);
      map.get(job.vehicleId)!.push(job);
    }
    return map;
  }, [jobs]);

  const totalSpent = useMemo(() => jobs.reduce((s, j) => s + (j.approvedAmount || 0), 0), [jobs]);
  const avgTicket = jobs.length > 0 ? totalSpent / jobs.length : 0;
  const totalPaid = useMemo(
    () =>
      jobs.reduce(
        (s, j) => s + (j.payments?.reduce((ps, p) => ps + p.amount, 0) || 0),
        0
      ),
    [jobs]
  );

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "ADVISOR", "RECEPTION"]}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6 flex justify-center">
        <div className="w-full max-w-5xl space-y-6">
          {/* ── Back Button ────────────────────────────────── */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="group self-start gap-1.5 rounded-full border border-border bg-card/45 px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-300 hover:border-cyan-500/50 hover:bg-cyan-950/20 hover:text-cyan-400"
            onClick={() => router.push("/clients")}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Volver a Clientes
          </Button>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-muted-foreground text-sm">Cargando historial del cliente...</p>
            </div>
          ) : (
            <>
              {/* ── Client Header Card ───────────────────────── */}
              <Card className="glass-panel border-cyan-500/30 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-5">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-teal-500/30 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <span className="text-3xl font-bold text-cyan-300">
                        {clientName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl font-bold text-foreground">{clientName}</h1>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-muted-foreground">
                        {clientPhone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-cyan-400" />
                            {clientPhone}
                          </span>
                        )}
                        {clientEmail && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-cyan-400" />
                            {clientEmail}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-cyan-400" />
                          {vehicles.size} vehículo{vehicles.size !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Summary Stats ────────────────────────────── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass-panel">
                  <CardContent className="py-4 flex flex-col items-center text-center gap-1">
                    <Hash className="w-5 h-5 text-cyan-400 mb-1" />
                    <p className="text-xl font-bold text-foreground">{jobs.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Visitas</p>
                  </CardContent>
                </Card>
                <Card className="glass-panel">
                  <CardContent className="py-4 flex flex-col items-center text-center gap-1">
                    <DollarSign className="w-5 h-5 text-emerald-400 mb-1" />
                    <p className="text-xl font-bold text-emerald-400">{fmtCurrency(totalSpent)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total gastado</p>
                  </CardContent>
                </Card>
                <Card className="glass-panel">
                  <CardContent className="py-4 flex flex-col items-center text-center gap-1">
                    <TrendingUp className="w-5 h-5 text-teal-400 mb-1" />
                    <p className="text-xl font-bold text-teal-400">{fmtCurrency(avgTicket)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ticket promedio</p>
                  </CardContent>
                </Card>
                <Card className="glass-panel">
                  <CardContent className="py-4 flex flex-col items-center text-center gap-1">
                    <CreditCard className="w-5 h-5 text-blue-400 mb-1" />
                    <p className="text-xl font-bold text-blue-400">{fmtCurrency(totalPaid)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total pagado</p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Vehicles & Timeline ──────────────────────── */}
              {Array.from(vehicles.entries()).map(([plate, vehicleJobs]) => (
                <div key={plate} className="space-y-3">
                  {/* Vehicle header */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                      <Car className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Vehículo: {plate}</h2>
                      <p className="text-xs text-muted-foreground">
                        {vehicleJobs.length} visita{vehicleJobs.length !== 1 ? "s" : ""} registrada{vehicleJobs.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative border-l-2 border-cyan-500/20 ml-4 pl-6 space-y-4">
                    {vehicleJobs.map((job) => {
                      const date = jobDate(job);
                      const isExpanded = expandedJobs.has(job.id);
                      const sc = statusConfig[job.status] || statusConfig.Reception;
                      const jobPaid = job.payments?.reduce((s, p) => s + p.amount, 0) || 0;

                      return (
                        <div key={job.id} className="relative">
                          {/* Timeline dot */}
                          <div className="absolute -left-[31px] top-4 w-4 h-4 rounded-full bg-cyan-500 border-2 border-background shadow-[0_0_10px_rgba(6,182,212,0.4)]" />

                          <Card
                            className={`glass-panel transition-all duration-200 ${
                              isExpanded ? "border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.06)]" : ""
                            }`}
                          >
                            {/* Collapsed header – always visible */}
                            <div
                              className="flex items-center justify-between px-5 py-4 cursor-pointer"
                              onClick={() => toggleExpand(job.id)}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-sm font-semibold text-foreground">
                                    {fmtDate(date)}
                                  </span>
                                  {job.symptoms && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5 pr-2">
                                      {job.symptoms}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${sc.color}`}
                                >
                                  {sc.icon}
                                  <span className="ml-1">{job.status}</span>
                                </Badge>
                                <span className="text-sm font-semibold text-emerald-400 hidden sm:inline">
                                  {fmtCurrency(job.approvedAmount || 0)}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                              <CardContent className="pt-0 pb-5 space-y-5 border-t border-border/40">
                                {/* Symptoms */}
                                {job.symptoms && (
                                  <div className="mt-4">
                                    <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-1.5">
                                      Motivo de ingreso
                                    </p>
                                    <p className="text-sm text-muted-foreground bg-zinc-950/30 p-3 rounded-lg border border-border/40 italic">
                                      &quot;{job.symptoms}&quot;
                                    </p>
                                  </div>
                                )}

                                {/* 🛡️ Acta de Recepción y Blindaje (Check-in Security Shield) */}
                                <div className="space-y-4 border-t border-border/40 pt-4 animate-fade-in">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      Acta de Recepción y Blindaje (Check-In)
                                    </p>
                                    <span className="text-[10px] text-muted-foreground bg-zinc-900/60 dark:bg-black/30 px-2.5 py-0.5 rounded border border-border/40 font-mono">
                                      Odómetro: {job.odometer ? `${job.odometer.toLocaleString()} km` : "No registrado"}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Combustible y Fluidos */}
                                    <div className="p-3.5 bg-zinc-950/20 rounded-lg border border-border/30 space-y-2">
                                      <h4 className="text-xs font-semibold text-foreground border-b border-border/20 pb-1.5 flex items-center gap-1.5">
                                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                                        Estado y Fluidos
                                      </h4>
                                      <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground font-light">Combustible:</span>
                                          <span className="font-semibold text-foreground">{job.startingFuel !== undefined ? `${job.startingFuel}%` : "—"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground font-light">Aceite de Motor:</span>
                                          <span className={`font-semibold ${job.fluidAudit?.oilLevel === 'OK' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {job.fluidAudit?.oilLevel || "—"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground font-light">Refrigerante:</span>
                                          <span className={`font-semibold ${job.fluidAudit?.coolantLevel === 'OK' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {job.fluidAudit?.coolantLevel || "—"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground font-light">Líquido de Frenos:</span>
                                          <span className={`font-semibold ${job.fluidAudit?.brakeFluid === 'OK' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {job.fluidAudit?.brakeFluid || "—"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Objetos de Valor e Inventario */}
                                    <div className="p-3.5 bg-zinc-950/20 rounded-lg border border-border/30 space-y-2">
                                      <h4 className="text-xs font-semibold text-foreground border-b border-border/20 pb-1.5 flex items-center gap-1.5">
                                        <ClipboardList className="w-3 h-3 text-cyan-500" />
                                        Inventario / Pertenencias
                                      </h4>
                                      <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground font-light">Llave de Ruedas:</span>
                                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${job.valuables?.lockNutKey ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/20" : "text-muted-foreground/60 border-border"}`}>
                                            {job.valuables?.lockNutKey ? "Sí" : "No"}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground font-light">Gafas de Sol:</span>
                                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${job.valuables?.sunglasses ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/20" : "text-muted-foreground/60 border-border"}`}>
                                            {job.valuables?.sunglasses ? "Sí" : "No"}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground font-light">Documentos:</span>
                                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${job.valuables?.documents ? "text-emerald-400 border-emerald-500/20 bg-emerald-950/20" : "text-muted-foreground/60 border-border"}`}>
                                            {job.valuables?.documents ? "Sí" : "No"}
                                          </Badge>
                                        </div>
                                        {job.valuables?.other && (
                                          <div className="pt-1 text-[10px] text-muted-foreground italic truncate">
                                            Obs: {job.valuables.other}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Firma Digital del Cliente */}
                                    <div className="p-3.5 bg-zinc-950/20 rounded-lg border border-border/30 flex flex-col justify-between">
                                      <h4 className="text-xs font-semibold text-foreground border-b border-border/20 pb-1.5 flex items-center gap-1.5">
                                        <UserCircle className="w-3 h-3 text-violet-500" />
                                        Firma de Responsabilidad
                                      </h4>
                                      <div className="flex-1 flex items-center justify-center min-h-[50px] pt-1">
                                        {job.signatureBase64 ? (
                                          <Image
                                            src={job.signatureBase64} 
                                            alt="Firma del Cliente" 
                                            width={320}
                                            height={96}
                                            unoptimized
                                            className="max-h-12 max-w-full object-contain invert dark:invert-0 brightness-95 opacity-90"
                                          />
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground italic">Firma no registrada</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Fotos de Evidencia de Ingreso (Reception Images) */}
                                  {job.receptionImages && job.receptionImages.length > 0 && (
                                    <div className="p-3.5 bg-zinc-950/25 rounded-lg border border-border/30 space-y-2.5">
                                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <Car className="w-3 h-3 text-teal-400" />
                                        Evidencia Fotográfica del Vehículo ({job.receptionImages.length})
                                      </h4>
                                      <div className="flex flex-wrap gap-2.5">
                                        {job.receptionImages.map((imgUrl, i) => (
                                          <button 
                                            key={i} 
                                            type="button"
                                            onClick={() => setActivePhotoUrl(imgUrl)}
                                            className="group relative w-20 h-20 rounded-lg overflow-hidden border border-border/60 hover:border-teal-500/50 shadow-sm transition-all duration-300 hover:scale-105 text-left focus:outline-none"
                                          >
                                            <Image
                                              src={imgUrl} 
                                              alt={`Evidencia de ingreso ${i + 1}`} 
                                              fill
                                              sizes="80px"
                                              unoptimized
                                              className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                                              <span className="text-[9px] text-white font-bold uppercase tracking-wider">Ampliar</span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Inspection Items */}
                                {job.inspectionItems && job.inspectionItems.length > 0 && (
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-2">
                                      Inspección ({job.inspectionItems.length} items)
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {job.inspectionItems.map((item) => (
                                        <div
                                          key={item.id}
                                          className="flex items-center justify-between p-2.5 bg-zinc-950/20 rounded-lg border border-border/30 text-sm"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            {inspectionStatusIcon[item.status] || inspectionStatusIcon.Pass}
                                            <span className="text-foreground truncate">{item.name}</span>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {item.price !== undefined && item.price > 0 && (
                                              <span className="text-xs text-muted-foreground">
                                                {fmtCurrency(item.price)}
                                              </span>
                                            )}
                                            {item.approved !== undefined && (
                                              <Badge
                                                variant="outline"
                                                className={`text-[10px] px-1.5 py-0 ${
                                                  item.approved
                                                    ? "text-emerald-400 border-emerald-500/30"
                                                    : "text-red-400 border-red-500/30"
                                                }`}
                                              >
                                                {item.approved ? "Aprobado" : "Declinado"}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Declined Items */}
                                {job.declinedItems && job.declinedItems.length > 0 && (
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-2">
                                      Items declinados ({job.declinedItems.length})
                                    </p>
                                    <div className="space-y-1.5">
                                      {job.declinedItems.map((item) => (
                                        <div
                                          key={item.id}
                                          className="flex items-center gap-2 text-sm text-red-400/80 p-2 bg-red-950/10 rounded border border-red-500/10"
                                        >
                                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                                          <span>{item.name}</span>
                                          {item.price !== undefined && item.price > 0 && (
                                            <span className="ml-auto text-xs">{fmtCurrency(item.price)}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Financials */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div className="p-3 bg-zinc-950/20 rounded-lg border border-border/30 text-center">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Estimado</p>
                                    <p className="text-sm font-semibold text-foreground">{fmtCurrency(job.totalEstimate || 0)}</p>
                                  </div>
                                  <div className="p-3 bg-zinc-950/20 rounded-lg border border-border/30 text-center">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Aprobado</p>
                                    <p className="text-sm font-semibold text-emerald-400">{fmtCurrency(job.approvedAmount || 0)}</p>
                                  </div>
                                  <div className="p-3 bg-zinc-950/20 rounded-lg border border-border/30 text-center col-span-2 sm:col-span-1">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pagado</p>
                                    <p className="text-sm font-semibold text-blue-400">{fmtCurrency(jobPaid)}</p>
                                  </div>
                                </div>

                                {/* Payment History */}
                                {job.payments && job.payments.length > 0 && (
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-2">
                                      Historial de pagos
                                    </p>
                                    <div className="space-y-2">
                                      {job.payments.map((payment) => (
                                        <div
                                          key={payment.id}
                                          className="flex items-center justify-between p-2.5 bg-zinc-950/20 rounded-lg border border-border/30 text-sm"
                                        >
                                          <div className="flex items-center gap-2">
                                            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-foreground">{fmtCurrency(payment.amount)}</span>
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] px-1.5 py-0 text-muted-foreground border-border"
                                            >
                                              {payment.method}
                                            </Badge>
                                          </div>
                                          <span className="text-xs text-muted-foreground">
                                            {payment.date}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            )}
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* ── No jobs fallback ─────────────────────────── */}
              {jobs.length === 0 && (
                <Card className="glass-panel">
                  <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                    <ClipboardList className="w-12 h-12 text-muted-foreground/40" />
                    <p className="text-muted-foreground">No se encontraron visitas para este cliente.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Premium Lightbox Modal for Fullscreen Reception Images */}
      {activePhotoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-fade-in"
          onClick={() => setActivePhotoUrl(null)}
        >
          <button 
            type="button" 
            className="absolute top-4 right-4 text-white hover:text-red-400 bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors duration-200 focus:outline-none"
            onClick={() => setActivePhotoUrl(null)}
            title="Cerrar vista"
          >
            <XCircle className="w-6 h-6" />
          </button>
          
          <div 
            className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center overflow-hidden rounded-lg shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activePhotoUrl} 
              alt="Evidencia en pantalla completa" 
              width={1600}
              height={900}
              unoptimized
              className="max-w-full max-h-[85vh] object-contain rounded-lg border border-white/10"
            />
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
