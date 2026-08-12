"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, CheckCircle, Download, Wrench, ShieldCheck, Coins, ClipboardList, Clock, Loader2, RefreshCw } from "lucide-react";
import { generateQuotePDF } from "@/lib/pdf";
import { VehicleIcon } from "@/components/ui/vehicle-icons";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import type { PublicQuote, PublicQuoteJob } from "@/lib/public-quote";
import { getQuoteTokenFromHash } from "@/lib/public-quote-link";

export default function ClientQuoteView() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("id") as string;
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [approvalSignature, setApprovalSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<"not-found" | "server" | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const job = quote?.job ?? null;
  const settings = quote?.settings ?? null;
  const configuredCurrencySymbol = settings?.currencySymbol || "$";
  const currencySymbol = `${configuredCurrencySymbol}${/[A-Za-z./]$/.test(configuredCurrencySymbol) ? " " : ""}`;
  const formatMoney = (amount: number) => `${currencySymbol}${amount.toFixed(2)}`;

  useEffect(() => {
    const syncTokenFromFragment = () => {
      setAccessToken(getQuoteTokenFromHash(window.location.hash));
    };
    syncTokenFromFragment();
    window.addEventListener("hashchange", syncTokenFromFragment);
    return () => window.removeEventListener("hashchange", syncTokenFromFragment);
  }, []);

  useEffect(() => {
    if (accessToken === null) return;
    let active = true;

    async function fetchQuote() {
      if (!jobId || !accessToken) {
        setLoadError("not-found");
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      setQuote(null);
      try {
        const response = await fetch(`/api/public/quotes/${encodeURIComponent(jobId)}`, {
          cache: "no-store",
          headers: { "X-Quote-Token": accessToken },
        });
        if (response.status === 404) throw new Error("QUOTE_NOT_FOUND");
        if (!response.ok) throw new Error("QUOTE_LOAD_FAILED");

        const fetched = (await response.json()) as PublicQuote;
        if (!active) return;
        setQuote(fetched);
        setLoadError(null);

        const initialApprovals: Record<string, boolean> = {};
        fetched.job.inspectionItems.forEach((item) => {
          if (typeof item.price === "number" && item.price > 0) {
            initialApprovals[item.id] = item.approved !== false;
          }
        });
        setApprovals(initialApprovals);
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error && error.message === "QUOTE_NOT_FOUND" ? "not-found" : "server");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchQuote();
    return () => {
      active = false;
    };
  }, [accessToken, jobId, retryToken]);

  const getLaborCost = (j: PublicQuoteJob) => {
    const partsTotal = j.inspectionItems?.reduce((acc, item) => acc + (item.price || 0), 0) || 0;
    return Math.max(0, j.totalEstimate - partsTotal);
  };

  const calculateTotalToPay = () => {
    if (!job) return 0;
    const laborCost = getLaborCost(job);
    const approvedPartsTotal = job.inspectionItems?.reduce((acc, item) => {
        if (item.price && approvals[item.id] !== false) {
           return acc + item.price;
        }
        return acc;
    }, 0) || 0;
    
    return laborCost + approvedPartsTotal;
  };

  const toggleApproval = (id: string) => {
    setApprovals(prev => ({
      ...prev,
      [id]: prev[id] === false ? true : false
    }));
  };

  const handleAcceptQuote = async () => {
    if (!job || submittingRef.current) return;
    if (!approvalSignature) {
      toast.warning("Confirma tu firma antes de aprobar la cotizaci\u00f3n.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/public/quotes/${encodeURIComponent(job.id)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Quote-Token": accessToken || "",
        },
        body: JSON.stringify({
          decisions: approvals,
          signatureBase64: approvalSignature,
        }),
      });
      if (!response.ok) throw new Error("No se pudo guardar la aprobación.");

      const updated = (await response.json()) as PublicQuote;
      setQuote(updated);
      toast.success(t('thankYouApproval'));
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo guardar la aprobación.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen page-bg p-6 flex items-center justify-center">
        <div className="glass-panel w-full max-w-sm rounded-2xl border border-border/50 p-8 text-center shadow-xl">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-amber-500" />
          <p className="mt-4 font-semibold text-foreground">{t('loadingQuote')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('loadingQuoteDesc')}</p>
        </div>
      </div>
    );
  }

  if (loadError === "server") {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-md rounded-2xl border border-red-500/25 p-7 text-center shadow-xl">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">{t('quoteLoadError')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('quoteLoadErrorDesc')}</p>
          <Button className="mt-6 w-full" onClick={() => setRetryToken((value) => value + 1)}>
            <RefreshCw className="h-4 w-4" /> {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (loadError === "not-found" || !job) {
     return (
       <div className="min-h-screen page-bg flex items-center justify-center p-4">
         <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">{t('quoteNotFound')}</h1>
            <p className="text-muted-foreground">{t('quoteNotFoundDesc')}</p>
         </div>
       </div>
     );
  }

  const statusToTrackIndex: Record<string, number> = {
    Approved: 0,
    Repair: 0,
    QC: 1,
    Ready: 2,
    Delivered: 3,
  };
  const TRACK_STEPS = [
    { label: "Reparación", icon: Wrench, desc: "Los técnicos trabajan en tu vehículo." },
    { label: "Control de Calidad", icon: ShieldCheck, desc: "Inspeccionamos que todo esté perfecto." },
    { label: "Listo", icon: ClipboardList, desc: "Tu vehículo superó la inspección." },
    { label: "Entregado", icon: Coins, desc: "¡Vehículo entregado con éxito!" },
  ];

  const isPostApproval = ['Approved','Repair','QC','Ready','Delivered'].includes(job.status);
  if (isPostApproval) {
    const trackIdx = statusToTrackIndex[job.status] ?? 0;
    const isDelivered = job.status === 'Delivered';
    return (
      <div className="min-h-screen page-bg flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-5">
          {/* Header card */}
          <div className="glass-panel rounded-2xl border border-emerald-500/30 p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="p-4 rounded-full bg-emerald-950/40 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <CheckCircle className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </div>
            </div>
            {settings?.logoUrl && (
              <Image src={settings.logoUrl} alt="Logo" width={240} height={80} unoptimized className="w-auto h-12 mx-auto mb-3 object-contain rounded" />
            )}
            <h1 className="text-2xl font-bold text-emerald-400">
              {isDelivered ? '¡Vehículo Entregado!' : '¡Cotización Aprobada!'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isDelivered
                ? 'Gracias por confiar en nosotros. ¡Hasta pronto!'
                : 'Tu aprobación fue registrada. El taller ya está trabajando en tu vehículo.'
              }
            </p>
            <div className="mt-4 bg-black/30 rounded-xl p-3 border border-border/40">
              <span className="text-muted-foreground text-xs block mb-0.5">Monto autorizado</span>
              <span className="text-3xl font-mono font-bold text-emerald-400">
                {currencySymbol}{job.approvedAmount?.toFixed(2) ?? '—'}
              </span>
            </div>
          </div>

          {/* Progress tracker */}
          <div className="glass-panel rounded-2xl border border-border/40 p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Estado de tu vehículo
            </p>
            <div className="space-y-3" role="list" aria-label="Progreso de la orden">
              {TRACK_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx < trackIdx;
                return (
                  <div
                    key={step.label}
                    role="listitem"
                    aria-current={trackIdx === idx ? "step" : undefined}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                    isDone
                      ? 'border-emerald-500/30 bg-emerald-950/20'
                      : trackIdx > idx
                        ? 'border-emerald-500/30 bg-emerald-950/20'
                        : trackIdx === idx
                          ? 'border-violet-500/40 bg-violet-950/20'
                          : 'border-border/20 bg-secondary/10 opacity-40'
                  }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      trackIdx > idx || isDelivered
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40'
                        : trackIdx === idx
                          ? 'bg-violet-950/40 text-violet-400 border border-violet-500/40 shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                          : 'bg-secondary/40 text-muted-foreground/40 border border-border/20'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        trackIdx > idx || isDelivered ? 'text-emerald-400' : trackIdx === idx ? 'text-violet-400' : 'text-muted-foreground/40'
                      }`}>{step.label}
                        {(trackIdx > idx || isDelivered) && <span className="ml-1 text-xs">✓</span>}
                        {trackIdx === idx && !isDelivered && <span className="ml-1 text-xs animate-pulse">⟳</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vehicle info */}
          <div className="glass-panel rounded-xl border border-border/30 px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Vehículo: <span className="text-foreground font-mono font-medium">{job.vehicleId}</span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg text-foreground p-4 pb-20 md:p-8 flex justify-center">
      
      <div className="w-full max-w-3xl space-y-6">
        <header className="mb-8 text-center flex flex-col items-center justify-center">
          {settings?.logoUrl && <Image src={settings.logoUrl} alt="Logo" width={320} height={120} unoptimized className="w-auto h-20 mb-4 object-contain rounded-md" />}
          <h1 className="text-3xl font-bold text-amber-500">{settings?.workshopName ? `${settings.workshopName} - ` : ''}{t('clientPortal')}</h1>
          <p className="text-muted-foreground text-sm mt-2">{settings?.address || t('clientSubtitle')}</p>
          <div className="mt-4 p-2 bg-secondary dark:bg-zinc-950 inline-flex items-center rounded-full px-4 border border-border gap-1.5">
            <VehicleIcon type={job.vehicleType} className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground mr-1">{t('vehicleIdLabel')}</span>
            <span className="text-foreground font-mono font-medium">{job.vehicleId}</span>
          </div>
        </header>

        <Card className="glass-panel">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">{t('repairDetails')}</CardTitle>
              <CardDescription>{t('repairDetailsDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-4">
              {(!job.inspectionItems || job.inspectionItems.length === 0) ? (
                <p className="text-sm text-muted-foreground italic">{t('noComponentsDiagnosed')}</p>
              ) : (
                job.inspectionItems.map(item => {
                  const hasPrice = item.price && item.price > 0;
                  const isApproved = approvals[item.id] !== false;

                  return (
                    <div key={item.id} className={`p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${hasPrice ? (isApproved ? 'bg-secondary/60 dark:bg-black/60 border border-emerald-200 dark:border-emerald-900/50' : 'bg-secondary/20 dark:bg-black/20 border border-border opacity-60') : 'bg-secondary/40 dark:bg-black/40 border border-border'}`}>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <span className={`font-medium text-lg ${hasPrice && !isApproved ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.name}</span>
                          <Badge className={`
                            ${item.status === 'Pass' ? 'bg-emerald-600' : ''}
                            ${item.status === 'Fail' ? 'bg-red-600' : ''}
                            ${item.status === 'Critical' ? 'bg-orange-600' : ''}
                            ${item.status === 'Recommended' ? 'bg-blue-600' : ''}
                          `}>
                            {t(`status${item.status}`) || item.status}
                          </Badge>
                        </div>
                        {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                        {item.mediaUrls && item.mediaUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {item.mediaUrls.map((url, idx) => (
                              <a href={url} target="_blank" rel="noopener noreferrer" key={idx}>
                                <Image src={url} alt="Evidencia de daño" width={64} height={64} unoptimized className="w-16 h-16 object-cover rounded border border-border shadow-sm hover:scale-105 transition-transform" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {hasPrice ? (
                        <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0">
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xl w-28 text-right">{formatMoney(item.price ?? 0)}</span>
                            <button 
                              onClick={() => toggleApproval(item.id)}
                              className={`px-4 py-2 rounded font-bold transition-all w-28 text-center ${isApproved ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : 'bg-secondary dark:bg-zinc-800 text-muted-foreground border border-border hover:bg-accent'}`}
                            >
                              {isApproved ? t('included') : t('remove')}
                            </button>
                        </div>
                      ) : (
                          <div className="text-muted-foreground text-sm italic pr-4">{t('noCostReviewed')}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <hr className="border-border" />
            
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-secondary/40 dark:bg-black/40 p-4 rounded-lg border border-border">
                <div className="w-full md:w-1/2 space-y-2">
                    <div className="flex justify-between text-muted-foreground">
                        <span>{t('shopCharges')}</span>
                        <span className="font-mono">{formatMoney(getLaborCost(job))}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>{t('partsVariable')}</span>
                        <span className="font-mono">{formatMoney(calculateTotalToPay() - getLaborCost(job))}</span>
                    </div>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-sm mb-1">{t('totalToPay')}</p>
                  <p className="text-4xl font-mono text-amber-500 font-bold drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                    {formatMoney(calculateTotalToPay())}
                  </p>
                </div>
            </div>

          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-xl">Firma de aprobaci&oacute;n</CardTitle>
            <CardDescription>
              Confirma que autorizas los trabajos seleccionados por el monto mostrado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignatureCanvas
              onConfirm={setApprovalSignature}
              onClear={() => setApprovalSignature(null)}
            />
          </CardContent>
        </Card>

        {submitError && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Tu aprobación todavía no fue registrada.</p>
              <p className="mt-0.5 text-xs text-red-200/80">{submitError} La firma y tus selecciones se conservaron para reintentar.</p>
            </div>
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold h-14 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all mt-6 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          onClick={handleAcceptQuote}
          disabled={!approvalSignature || submitting}
        >
          {submitting ? "Registrando aprobaci\u00f3n\u2026" : submitError ? "Reintentar aprobación" : t('acceptQuoteBtn')}
        </Button>

        <Button
          variant="outline"
          className="w-full border-amber-500/40 text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 h-12 mt-3"
          onClick={() => generateQuotePDF(job, 'client', settings)}
        >
          <Download className="w-4 h-4 mr-2" />
          {t('downloadPDF')}
        </Button>
      </div>
    </div>
  );
}
