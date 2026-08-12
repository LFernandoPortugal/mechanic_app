"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { registerPayment, PaymentInput } from "@/lib/db";
import { getPayableTotal } from "@/lib/transactions";
import { generateReceiptPDF } from "@/lib/pdf";
import { useRealtimeJobs } from "@/hooks/useRealtimeJobs";
import { Job, WorkshopSettings } from "@/types";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, CreditCard, Banknote, Smartphone, CheckCircle2,
  ChevronDown, ChevronUp, Loader2, FileText, ArrowLeft,
} from "lucide-react";

type PaymentMethod = PaymentInput["method"];

const METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: React.ReactNode; color: string }> = {
  Efectivo:     { label: "Efectivo",     icon: <Banknote className="w-4 h-4" />,    color: "bg-emerald-600 hover:bg-emerald-500" },
  Tarjeta:      { label: "Tarjeta",      icon: <CreditCard className="w-4 h-4" />,  color: "bg-blue-600 hover:bg-blue-500" },
  Transferencia:{ label: "Transferencia",icon: <DollarSign className="w-4 h-4" />, color: "bg-purple-600 hover:bg-purple-500" },
  "Yape/Plin":  { label: "Yape / Plin",  icon: <Smartphone className="w-4 h-4" />, color: "bg-orange-500 hover:bg-orange-400" },
};

const STATUS_LABELS: Record<string, string> = {
  Reception: "Recepción",
  Diagnosis: "Diagnóstico",
  Approval: "Cotización",
  Approved: "Aprobado",
  Repair: "En Reparación",
  QC: "Control de Calidad",
  Ready: "Listo para Entrega",
  Delivered: "Entregado"
};

function totalPaid(job: Job): number {
  return (job.payments || []).reduce((s, p) => s + p.amount, 0);
}

function payableTotal(job: Job): number {
  try {
    return getPayableTotal(job);
  } catch {
    return 0;
  }
}

function JobCard({ job, onPaymentRegistered, workshopSettings }: { job: Job; onPaymentRegistered: () => void; workshopSettings: WorkshopSettings | null }) {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount]     = useState("");
  const [reference, setRef]     = useState("");
  const [method, setMethod]     = useState<PaymentMethod>("Efectivo");
  const [loading, setLoading]   = useState(false);

  const paid         = totalPaid(job);
  const approvedTotal = payableTotal(job);
  const balance      = approvedTotal - paid;
  const pctPaid      = approvedTotal > 0 ? Math.min((paid / approvedTotal) * 100, 100) : 0;
  const isDelivered  = job.status === "Delivered";
  const isFullyPaid  = balance <= 0;

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Ingresa un monto válido."); return; }
    
    let appliedAmount = amt;
    let change = 0;
    
    if (amt > balance + 0.01) {
      if (method === "Efectivo") {
        appliedAmount = balance;
        change = amt - balance;
      } else {
        toast.error(`El monto supera el saldo (${workshopSettings?.currencySymbol || "$"}${balance.toFixed(2)}).`); 
        return; 
      }
    }

    setLoading(true);
    try {
      const result = await registerPayment(job.id, { amount: appliedAmount, method, reference });
      if (change > 0) {
        toast.success(`✅ Pago completo. Vuelto a entregar: ${workshopSettings?.currencySymbol || "$"}${change.toFixed(2)}`);
      } else {
        toast.success(result.remainingBalance === 0
          ? result.status === "Delivered"
            ? "✅ Pago completo. Vehículo marcado como Entregado."
            : "✅ Pago completo registrado. La entrega se cerrará después de aprobar QC."
          : `💰 Abono registrado: ${workshopSettings?.currencySymbol || "$"}${appliedAmount.toFixed(2)}`
        );
      }
      setAmount(""); setRef("");
      onPaymentRegistered();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar el pago.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`glass-panel transition-all duration-300 ${isDelivered ? "opacity-60" : ""}`}>
      <CardHeader
        className="cursor-pointer flex flex-row items-start justify-between gap-2"
        onClick={() => setExpanded(p => !p)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded((current) => !current);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`payment-details-${job.id}`}
        aria-label={`Detalles de pago para ${job.vehicleId}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-bold text-foreground truncate">
              {job.vehicleId} — {job.clientId}
            </CardTitle>
            <Badge
              className={isDelivered
                ? "bg-emerald-700/40 text-emerald-300 border-emerald-600/40"
                : "bg-blue-700/40 text-blue-300 border-blue-600/40"
              }
              variant="outline"
            >
              {isDelivered ? "Entregado" : (STATUS_LABELS[job.status] || job.status)}
            </Badge>
          </div>
          <CardDescription className="mt-1 text-xs">
            Total aprobado: <span className="font-semibold text-foreground">{workshopSettings?.currencySymbol || "$"}{approvedTotal.toFixed(2)}</span>
            {" · "}Pagado: <span className="font-semibold text-emerald-400">{workshopSettings?.currencySymbol || "$"}{paid.toFixed(2)}</span>
            {" · "}Saldo: <span className={`font-semibold ${balance > 0 ? "text-amber-400" : "text-emerald-400"}`}>{workshopSettings?.currencySymbol || "$"}{balance.toFixed(2)}</span>
          </CardDescription>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${pctPaid}%` }}
            />
          </div>
        </div>
        <div className="text-muted-foreground mt-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent id={`payment-details-${job.id}`} className="space-y-5 pt-0">
          {/* Payment history */}
          {(job.payments || []).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial de Abonos</p>
              {job.payments!.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm bg-secondary/40 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-2">
                    {METHOD_CONFIG[p.method as PaymentMethod]?.icon}
                    <span className="font-medium">{p.method}</span>
                    {p.reference && <span className="text-muted-foreground text-xs">· {p.reference}</span>}
                  </span>
                  <span className="font-bold text-emerald-400">{workshopSettings?.currencySymbol || "$"}{p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Payment form */}
          {!isDelivered && !isFullyPaid && (
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registrar Pago</p>

              {/* Method selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(METHOD_CONFIG) as PaymentMethod[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    aria-pressed={method === m}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition-all
                      ${method === m
                        ? "border-emerald-500 bg-emerald-950/50 text-emerald-300"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                      }`}
                  >
                    {METHOD_CONFIG[m].icon}
                    {METHOD_CONFIG[m].label}
                  </button>
                ))}
              </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor={`payment-amount-${job.id}`} className="text-xs">Monto ({workshopSettings?.currencySymbol || "$"})</Label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-mono font-semibold text-muted-foreground select-none">
                        {workshopSettings?.currencySymbol || "$"}
                      </span>
                      <Input
                        id={`payment-amount-${job.id}`}
                        type="number"
                        placeholder={`Saldo: ${workshopSettings?.currencySymbol || "$"}${balance.toFixed(2)}`}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="pl-10 bg-background border-border font-mono"
                        min={0}
                        step={0.01}
                      />
                    </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`payment-reference-${job.id}`} className="text-xs">Referencia / N° de Operación</Label>
                  <Input
                    id={`payment-reference-${job.id}`}
                    placeholder="Opcional"
                    value={reference}
                    onChange={e => setRef(e.target.value)}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  onClick={handlePay}
                  disabled={loading || !amount}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando…</>
                    : <>Registrar Pago</>
                  }
                </Button>
                {balance > 0 && (
                  <Button
                    variant="outline"
                    className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/30"
                    onClick={() => setAmount(balance.toFixed(2))}
                  >
                    Saldo completo
                  </Button>
                )}
              </div>

              {parseFloat(amount) > balance && method === "Efectivo" && (
                <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-950/30 border border-amber-600/30 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Vuelto a entregar: <strong>{workshopSettings?.currencySymbol || "$"}{(parseFloat(amount) - balance).toFixed(2)}</strong></span>
                </div>
              )}

              {parseFloat(amount) >= balance && balance > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-600/30 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {job.status === "Ready"
                    ? <>Este pago cancelará el saldo y marcará el vehículo como <strong>Entregado</strong>.</>
                    : <>Este pago cancelará el saldo; la entrega se cerrará después de aprobar <strong>QC</strong>.</>}
                </div>
              )}
            </div>
          )}

          {!isDelivered && isFullyPaid && (
            <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-950/30 border border-blue-600/30 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>Pago completo registrado. La orden todavía debe completar el flujo de QC.</span>
            </div>
          )}

          {isDelivered && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-600/30 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Vehículo entregado y pago completado.</span>
              </div>
              <Button
                variant="outline"
                className="w-full border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/30 gap-2"
                onClick={() => generateReceiptPDF(job, workshopSettings)}
              >
                <FileText className="w-4 h-4" />
                Descargar Recibo de Pago (PDF)
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function PaymentsPage() {
  const router = useRouter();
  const { workshopSettings } = useAuth();
  const { jobs, loading } = useRealtimeJobs({ statuses: ["Ready", "Approved", "Delivered", "QC"] });

  // Sort: pending first, then delivered
  const sorted = [...jobs].sort((a, b) => {
    if (a.status === "Delivered" && b.status !== "Delivered") return 1;
    if (b.status === "Delivered" && a.status !== "Delivered") return -1;
    return 0;
  });

  const pending   = sorted.filter(j => j.status !== "Delivered");
  const delivered = sorted.filter(j => j.status === "Delivered");

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "ADVISOR"]}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="group gap-1.5 rounded-full border border-border bg-card/45 px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-300 hover:border-cyan-500/50 hover:bg-cyan-950/20 hover:text-cyan-400"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                Inicio
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)] animate-pulse" /> Caja / Pagos
                </h1>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Registra abonos y cierra órdenes de trabajo.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 text-xs gap-1 py-1 px-3 bg-cyan-950/20 backdrop-blur-md self-start sm:self-center ml-12 sm:ml-0">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse inline-block" />
              Caja Activa
            </Badge>
          </header>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium">
              <DollarSign className="w-4 h-4" />
              {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {delivered.length} entregado{delivered.length !== 1 ? "s" : ""}
            </div>
            {pending.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium">
                {workshopSettings?.currencySymbol || "$"}{pending.reduce((s, j) => s + Math.max(0, payableTotal(j) - totalPaid(j)), 0).toFixed(2)} por cobrar
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Pending jobs */}
          {!loading && pending.length === 0 && (
            <Card className="glass-panel">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-60" />
                <p className="text-muted-foreground">No hay órdenes pendientes de pago.</p>
              </CardContent>
            </Card>
          )}

          {!loading && pending.map(job => (
            <JobCard key={job.id} job={job} onPaymentRegistered={() => {}} workshopSettings={workshopSettings} />
          ))}

          {/* Delivered section */}
          {!loading && delivered.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">
                Entregados Recientes
              </p>
              {delivered.map(job => (
                <JobCard key={job.id} job={job} onPaymentRegistered={() => {}} workshopSettings={workshopSettings} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
