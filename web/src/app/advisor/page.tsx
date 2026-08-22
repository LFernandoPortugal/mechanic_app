"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateJob, registerPayment, type PaymentInput } from "@/lib/db";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Job } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, CircleHelp, DollarSign, Wand2, Copy, ExternalLink, CheckCircle, MessageCircle, Download, Mail, FileSearch, Link2, Link2Off } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { openWhatsAppQuote } from "@/lib/whatsapp";
import { generateQuotePDF } from "@/lib/pdf";
import { sendQuoteEmail, isEmailConfigured } from "@/lib/email";
import { useRealtimeJobs } from "@/hooks/useRealtimeJobs";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { VehicleIcon } from "@/components/ui/vehicle-icons";
import { toDate } from "@/lib/dates";
import { getPayableTotal } from "@/lib/transactions";
import { WorkflowQueueEmptyState } from "@/components/WorkflowQueueEmptyState";
import { buildPublicQuoteUrl } from "@/lib/public-quote-link";
import { issueQuoteLink, revokeQuoteLink, type IssuedQuoteLink } from "@/lib/quote-link-client";
import { isSessionExpiredError } from "@/lib/api-errors";

const payableTotal = (job: Job) => {
  try {
    return getPayableTotal(job);
  } catch {
    return 0;
  }
};

export default function AdvisorQuoteBuilder() {
  const { t, lang } = useLanguage();
  const { user, workshopSettings, signOut } = useAuth();
  const { jobs, loading } = useRealtimeJobs({ statuses: ["Approval", "Approved", "Repair"] });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [baseLaborCost, setBaseLaborCost] = useState(0);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [submittedJob, setSubmittedJob] = useState<Job | null>(null);
  const [submittedQuoteLink, setSubmittedQuoteLink] = useState<IssuedQuoteLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [managingQuoteLink, setManagingQuoteLink] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentInput["method"]>("Efectivo");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const paymentSubmittingRef = useRef(false);
  
  const router = useRouter();

  const calculateTotal = () => {
    const partsTotal = Object.values(prices).reduce((acc, curr) => acc + (curr || 0), 0);
    return partsTotal + baseLaborCost;
  };

  const handleAutoQuote = () => {
    if (!selectedJob) return;
    const mockPrices: Record<string, number> = {};
    selectedJob.inspectionItems?.forEach(item => {
        if (item.status !== 'Pass') {
            mockPrices[item.id] = Math.floor(Math.random() * 200) + 50; 
        }
    });
    setPrices(mockPrices);
    setBaseLaborCost(150); 
  };

  const handleSaveQuote = async () => {
    if (!selectedJob) return;
    if (!user?.uid) {
      toast.error("La sesión no está disponible.");
      return;
    }

    const updatedInspectionItems = selectedJob.inspectionItems.map(item => ({
      ...item,
      price: prices[item.id] || 0
    }));

    setManagingQuoteLink(true);
    try {
      await updateJob(selectedJob.id, {
        inspectionItems: updatedInspectionItems,
        totalEstimate: calculateTotal(),
        status: "Approval"  // Awaiting client approval, not Ready.
      }, user.uid, "Quote Generated");
      const issuedLink = await issueQuoteLink(selectedJob.id);
      // Keep the full job object for PDF/WhatsApp/Email
      const savedJob: Job = {
        ...selectedJob,
        inspectionItems: updatedInspectionItems,
        totalEstimate: calculateTotal(),
        status: "Approval",
      };
      setSubmittedJob(savedJob);
      setSubmittedJobId(selectedJob.id);
      setSubmittedQuoteLink(issuedLink);
      setSelectedJob(null);
      setPrices({});
      setBaseLaborCost(0);
      // Real-time listener handles refresh automatically
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar la cotización.");
    } finally {
      setManagingQuoteLink(false);
    }
  };

  const handleRegenerateQuoteLink = async (job: Job) => {
    const confirmed = window.confirm(
      "Se invalidará cualquier enlace anterior de esta cotización. ¿Deseas continuar?",
    );
    if (!confirmed) return;

    setManagingQuoteLink(true);
    try {
      const issuedLink = await issueQuoteLink(job.id);
      setSubmittedJob(job);
      setSubmittedJobId(job.id);
      setSubmittedQuoteLink(issuedLink);
      setSelectedJob(null);
      toast.success("Se generó un nuevo enlace seguro.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo regenerar el enlace.");
    } finally {
      setManagingQuoteLink(false);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedJob || !paymentAmount || paymentSubmittingRef.current) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    // Calculate current balance
    const paid = (selectedJob.payments || []).reduce((s, p) => s + p.amount, 0);
    const balance = payableTotal(selectedJob) - paid;
    if (balance <= 0) {
      toast.info("La orden ya tiene el pago completo registrado.");
      return;
    }

    let appliedAmount = amount;
    let change = 0;

    if (amount > balance + 0.01) {
      if (paymentType === "Efectivo") {
        appliedAmount = balance;
        change = amount - balance;
      } else {
        toast.error(`El monto supera el saldo (${workshopSettings?.currencySymbol || "$"}${balance.toFixed(2)}).`);
        return;
      }
    }

    paymentSubmittingRef.current = true;
    setPaymentSubmitting(true);
    try {
      const result = await registerPayment(selectedJob.id, {
        amount: appliedAmount,
        method: paymentType,
        expectedTotalPaid: paid,
      });

      // Update local state to reflect payment in real-time
      const updatedPayments = [...(selectedJob.payments || []), result.payment];

      setSelectedJob({
        ...selectedJob,
        payments: updatedPayments,
        status: result.status,
      });

      setPaymentAmount("");
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
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo registrar el pago.";
      toast.error(message);
      if (isSessionExpiredError(e)) {
        await signOut();
        router.push("/login?redirect=%2Fadvisor&reason=session-expired");
      }
    } finally {
      paymentSubmittingRef.current = false;
      setPaymentSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">{t('loadingQuotes')}</div>;
  }

  if (submittedJobId && submittedJob && submittedQuoteLink) {
    const quoteUrl = typeof window !== "undefined"
      ? buildPublicQuoteUrl(window.location.origin, submittedJobId, submittedQuoteLink.token)
      : "";
    const expiresAtLabel = new Intl.DateTimeFormat("es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(submittedQuoteLink.expiresAt));
    const hasPhone = Boolean(submittedJob.clientPhone);
    const hasRecipientEmail = Boolean(submittedJob.clientEmail?.trim());
    const emailConfigured = isEmailConfigured();
    const canSendEmail = hasRecipientEmail && emailConfigured;

    const handleSendEmail = async () => {
      if (!submittedJob.clientEmail) return;
      setSendingEmail(true);
      try {
        await sendQuoteEmail({
          clientEmail: submittedJob.clientEmail,
          clientName: submittedJob.clientId,
          vehicleId: submittedJob.vehicleId,
          quoteUrl,
          totalEstimate: submittedJob.totalEstimate,
          currencySymbol: workshopSettings?.currencySymbol || "$",
        });
        toast.success(t('emailSent'));
      } catch {
        toast.error(t('emailError'));
      } finally {
        setSendingEmail(false);
      }
    };

    const handleRevokeLink = async () => {
      const confirmed = window.confirm(
        "El cliente perderá acceso a este enlace hasta que generes uno nuevo. ¿Deseas revocarlo?",
      );
      if (!confirmed) return;

      setManagingQuoteLink(true);
      try {
        await revokeQuoteLink(submittedJobId);
        toast.success("El enlace público fue revocado.");
        setSubmittedJobId(null);
        setSubmittedJob(null);
        setSubmittedQuoteLink(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo revocar el enlace.");
      } finally {
        setManagingQuoteLink(false);
      }
    };
    
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="app-card w-full max-w-lg p-5 text-center sm:p-8">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <CheckCircle className="size-8 text-primary" />
          </div>
          <h2 className="mb-1 text-2xl font-bold">{t('quoteGenerated')}</h2>
          <p className="text-muted-foreground text-sm mb-2">{t('quoteGeneratedDesc')}</p>
          <p className="mb-6 text-xs text-muted-foreground">
            Enlace seguro y revocable. Vence el {expiresAtLabel}
          </p>
          
          {/* Quote URL Copy bar */}
          <div className="mb-6 flex items-center justify-between overflow-hidden rounded-lg border border-border bg-muted p-3">
             <span className="text-muted-foreground text-sm truncate mr-2">
               /quote/view?id={submittedJobId}#token=••••••••
             </span>
             <Button 
               size="sm" 
               variant="outline" 
               className="border-border shrink-0"
               onClick={() => {
                 navigator.clipboard.writeText(quoteUrl);
                 setCopied(true);
                 setTimeout(() => setCopied(false), 2000);
               }}
             >
               {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
             </Button>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {/* WhatsApp */}
            <Button
              className="w-full bg-[#25d366] hover:bg-[#1ebe5d] text-white font-bold h-12"
              disabled={!hasPhone}
              onClick={() => openWhatsAppQuote(
                submittedJob.clientPhone!,
                submittedJob.clientId,
                submittedJob.vehicleId,
                quoteUrl,
                submittedJob.totalEstimate,
                workshopSettings?.currencySymbol || "$",
              )}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {hasPhone ? t('sendWhatsApp') : t('sendWhatsAppNoPhone')}
            </Button>

            {/* Email */}
            <Button
              className="h-12 w-full bg-primary font-bold text-primary-foreground hover:brightness-95"
              disabled={!canSendEmail || sendingEmail}
              onClick={handleSendEmail}
            >
              <Mail className="w-4 h-4 mr-2" />
              {sendingEmail
                ? t('sendingEmail')
                : !hasRecipientEmail
                  ? t('sendEmailNoRecipient')
                  : emailConfigured
                    ? t('sendEmail')
                    : t('sendEmailNoConfig')}
            </Button>

            {/* PDF */}
            <Button
              variant="outline"
              className="h-12 w-full border-primary/50 text-primary hover:bg-primary/10"
              onClick={() => generateQuotePDF(submittedJob, 'advisor', workshopSettings)}
            >
              <Download className="w-4 h-4 mr-2" />
              {t('downloadPDF')}
            </Button>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                onClick={() => window.open(quoteUrl, "_blank", "noopener,noreferrer")}
                className="w-full bg-primary text-primary-foreground hover:brightness-95 sm:flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" /> {t('openClientView')}
              </Button>
              <Button onClick={() => { setSubmittedJobId(null); setSubmittedJob(null); setSubmittedQuoteLink(null); }} variant="ghost" className="w-full text-muted-foreground hover:text-foreground sm:flex-1">
                {t('backToDashboard')}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-red-500 hover:bg-red-500/10 hover:text-red-500"
              disabled={managingQuoteLink}
              onClick={handleRevokeLink}
            >
              <Link2Off className="mr-2 h-4 w-4" /> Revocar enlace público
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN', 'ADVISOR']}>
        <WorkflowQueueEmptyState
          icon={<FileSearch className="h-8 w-8" />}
          eyebrow="Cotizaciones · 0 órdenes pendientes"
          title="No hay presupuestos por preparar"
          description="La bandeja está vacía. Las órdenes aparecerán aquí en tiempo real cuando el técnico complete un diagnóstico o cuando un trabajo aprobado necesite seguimiento."
          steps={[
            {
              title: "El técnico completa el diagnóstico",
              description: "Los hallazgos y evidencias pasan automáticamente al constructor de cotizaciones.",
            },
            {
              title: "Cotiza y envía al cliente",
              description: "Asigna precios, genera el enlace público y continúa el seguimiento desde este módulo.",
            },
          ]}
        />
      </ProtectedRoute>
    );
  }

  // Helper: human-readable relative date
  const formatJobTime = (date: unknown): string => {
    const d = toDate(date);
    if (!d) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHrs < 24) return `Hace ${diffHrs}h ${diffMin % 60}m`;
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const STATUS_COLOR: Record<string, string> = {
    Approval: 'text-amber-400 border-amber-500/60',
    Ready: 'text-success border-primary/40',
    Approved: 'text-success border-primary/40',
    Repair: 'text-primary border-primary/50',
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'ADVISOR']}>
      <div className="flex justify-center text-foreground">
        <div className="workbench-layout max-w-7xl">
          {/* Left Sidebar: Pending Jobs (3/12 = 25%) */}
          <div className="workbench-queue">
            <header className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h1 className="page-title">{t('advisorArea')}</h1>
                <p className="text-muted-foreground text-xs">{t('advisorSubtitle')}</p>
                <div className="mt-2 text-xs font-medium text-primary">
                  {jobs.length} orden{jobs.length !== 1 ? 'es' : ''} de cotización/reparación
                </div>
              </div>
              <Link href="/help#quotes" className="tool-button" aria-label={lang === "es" ? "Ayuda de cotizaciones" : "Estimate help"}><CircleHelp size={18}/></Link>
            </header>

            <div className="queue-list">
              {jobs.length === 0 ? (
                <p className="text-muted-foreground italic text-sm">{t('noPendingQuotes')}</p>
              ) : (
                jobs.map(job => {
                  const isActive = selectedJob?.id === job.id;
                  const statusColor = STATUS_COLOR[job.status] || 'text-gray-400 border-gray-500/60';
                  return (
                    <button
                      key={job.id}
                      onClick={() => {
                        setSelectedJob(job);
                        const existingPrices: Record<string, number> = {};
                        job.inspectionItems?.forEach(item => {
                          if (item.price) existingPrices[item.id] = item.price;
                        });
                        setPrices(existingPrices);
                        const partsTotal = Object.values(existingPrices).reduce(
                          (sum, price) => sum + price,
                          0,
                        );
                        setBaseLaborCost(Math.max(0, (Number(job.totalEstimate) || 0) - partsTotal));
                      }}
                      className={`queue-item ${
                        isActive
                          ? 'queue-item-active'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <VehicleIcon type={job.vehicleType} className="w-4 h-4 text-muted-foreground shrink-0" />
                            <p className="font-semibold text-sm truncate text-foreground">{job.vehicleId}</p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{job.clientId || '-'}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] px-1.5 py-0 font-medium ${statusColor}`}
                        >
                          {t(`status${job.status}`) || job.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">{formatJobTime(job.createdAt)}</span>
                        {job.totalEstimate > 0 && (
                          <span className="text-[10px] text-muted-foreground/60">· {workshopSettings?.currencySymbol || "$"}{job.totalEstimate.toLocaleString()}</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

      {/* Right Content: Quote Builder / Operations (9/12 = 75%) */}
      <div className="workbench-detail">
        {selectedJob && selectedJob.status === "Approval" ? (
          <div className="space-y-6">
            {/* Glowing Stepper Guidance */}
            <WorkflowStepper currentStatus={selectedJob.status} />
            <Card className="app-card">
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <VehicleIcon type={selectedJob.vehicleType} className="w-5 h-5 text-muted-foreground shrink-0" />
                    {t('quoteBuilder')}
                  </CardTitle>
                  <CardDescription>{t('quoteBuilderDesc')} ({selectedJob.vehicleId})</CardDescription>
                </div>
                {workshopSettings?.demoMode && (
                  <Button
                    onClick={handleAutoQuote}
                    variant="outline"
                    aria-label={t('autoQuote')}
                    className="flex-shrink-0 border-primary/50 text-primary hover:bg-primary/10"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{t('autoQuote')}</span>
                    <span className="sm:hidden text-xs">Auto</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">{t('inspectedItems')} ({selectedJob.inspectionItems?.length || 0})</h3>
                  {(!selectedJob.inspectionItems || selectedJob.inspectionItems.length === 0) ? (
                    <p className="text-sm text-muted-foreground italic">{t('noComponentsLogged')}</p>
                  ) : (
                    selectedJob.inspectionItems.map(item => (
                      <div key={item.id} className="p-4 bg-secondary/50 dark:bg-black/40 border border-border rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium text-lg text-foreground">{item.name}</span>
                            <Badge className={`
                              ${item.status === 'Pass' ? 'bg-emerald-600' : ''}
                              ${item.status === 'Fail' ? 'bg-red-600' : ''}
                              ${item.status === 'Critical' ? 'bg-orange-600' : ''}
                              ${item.status === 'Recommended' ? 'bg-primary' : ''}
                            `}>
                              {t(`status${item.status}`) || item.status}
                            </Badge>
                          </div>
                          {item.notes && <p className="text-sm text-muted-foreground bg-secondary dark:bg-black/50 p-2 rounded border-l-2 border-border">{item.notes}</p>}
                          {item.mediaUrls && item.mediaUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {item.mediaUrls.map((url, idx) => (
                                <a href={url} target="_blank" rel="noopener noreferrer" key={idx}>
                                  <Image src={url} alt="Evidencia" width={64} height={64} unoptimized className="w-16 h-16 object-cover rounded border border-border shadow-sm hover:scale-105 transition-transform" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {(item.status !== 'Pass') && (
                          <div className="w-full md:w-48">
                            <Label htmlFor={`quote-price-${item.id}`} className="text-xs text-muted-foreground mb-1 block">
                              {t('partPrice')} ({workshopSettings?.currencySymbol || "$"})
                            </Label>
                            <Input 
                              id={`quote-price-${item.id}`}
                              type="number"
                              min="0"
                              placeholder="0.00"
                              className="border-border bg-background text-right font-mono text-primary"
                              value={prices[item.id] === undefined ? '' : prices[item.id]}
                              onChange={(e) => setPrices({...prices, [item.id]: parseFloat(e.target.value) || 0})}
                              readOnly={selectedJob.status !== 'Approval'}
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <hr className="border-border" />
                
                <div className="form-surface flex flex-col items-end justify-between gap-4 md:flex-row">
                   <div className="w-full md:w-1/3">
                      <Label htmlFor="quote-labor-cost" className="text-muted-foreground mb-1 block">
                        {t('globalLabor')} ({workshopSettings?.currencySymbol || "$"})
                      </Label>
                      <Input 
                        id="quote-labor-cost"
                        type="number" 
                        min="0"
                        className="border-border bg-background font-mono text-primary"
                        value={baseLaborCost || ''}
                        onChange={(e) => setBaseLaborCost(parseFloat(e.target.value) || 0)}
                      />
                   </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-sm mb-1">{t('estimatedTotal')}</p>
                      <p className="font-mono text-4xl font-bold text-primary">
                        {workshopSettings?.currencySymbol || "$"}{calculateTotal().toFixed(2)}
                      </p>
                      {workshopSettings && workshopSettings.taxRate > 0 && (
                        <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                          <div>Subtotal: {workshopSettings.currencySymbol}{(calculateTotal() / (1 + workshopSettings.taxRate / 100)).toFixed(2)}</div>
                          <div>{workshopSettings.taxName} ({workshopSettings.taxRate}%): {workshopSettings.currencySymbol}{(calculateTotal() - (calculateTotal() / (1 + workshopSettings.taxRate / 100))).toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                </div>

              </CardContent>
            </Card>

            <Button 
              size="lg" 
              className="h-14 w-full bg-primary font-bold text-primary-foreground hover:brightness-95"
              onClick={handleSaveQuote}
              disabled={managingQuoteLink}
            >
              {managingQuoteLink ? "Generando enlace seguro..." : t('generateQuoteBtn')}
            </Button>
          </div>
        ) : selectedJob ? (
          <div className="space-y-6">
            {/* Glowing Stepper Guidance */}
            <WorkflowStepper currentStatus={selectedJob.status} />
            <Card className="app-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <VehicleIcon type={selectedJob.vehicleType} className="w-5 h-5 text-muted-foreground shrink-0" />
                      Detalles del Servicio
                    </CardTitle>
                    <CardDescription>Vehículo: {selectedJob.vehicleId}</CardDescription>
                  </div>
                  <Badge className="bg-emerald-600">{t(`status${selectedJob.status}`) || selectedJob.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                            {/* Visualizar Total */}
                <div className="form-surface flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Monto Total Aprobado</p>
                      <p className="font-mono text-3xl font-bold text-primary">
                        {workshopSettings?.currencySymbol || "$"}{payableTotal(selectedJob).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
                      <p className="text-2xl font-mono text-amber-500 font-bold">
                        {workshopSettings?.currencySymbol || ""}{(
                          payableTotal(selectedJob) -
                          (selectedJob.payments?.reduce((acc, p) => acc + p.amount, 0) || 0)
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {workshopSettings && workshopSettings.taxRate > 0 && (
                    <div className="text-xs text-muted-foreground border-t border-border/30 pt-2 flex justify-between">
                      <span>Subtotal (Neto): {workshopSettings.currencySymbol}{(payableTotal(selectedJob) / (1 + workshopSettings.taxRate / 100)).toFixed(2)}</span>
                      <span>{workshopSettings.taxName} ({workshopSettings.taxRate}%): {workshopSettings.currencySymbol}{(payableTotal(selectedJob) - payableTotal(selectedJob) / (1 + workshopSettings.taxRate / 100)).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <hr className="border-border" />

                {/* Historial de Pagos */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Historial de Pagos</h3>
                  {(!selectedJob.payments || selectedJob.payments.length === 0) ? (
                    <p className="text-sm text-muted-foreground italic">No se han registrado pagos aún.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedJob.payments.map((p, i) => (
                        <div key={i} className="flex justify-between items-center p-3 border border-border rounded bg-secondary/30">
                          <div>
                            <p className="font-medium">{p.method}</p>
                            <p className="text-xs text-muted-foreground">{new Date(p.date).toLocaleString()}</p>
                          </div>
                          <span className="font-mono text-lg text-emerald-500">+{workshopSettings?.currencySymbol || "$"}{p.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Registrar Pago rápido */}
                <div className="form-surface mt-4">
                  <h3 className="font-semibold text-foreground mb-4">Registrar Nuevo Pago (Abono)</h3>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1">
                      <Label>Monto</Label>
                      <Input 
                        type="number" 
                        min="0"
                        placeholder={`0.00 (${workshopSettings?.currencySymbol || "$"})`}
                        className="bg-background border-border font-mono"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Método de Pago</Label>
                      <select 
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value as PaymentInput["method"])}
                      >
                        <option value="Efectivo">Efectivo 💵</option>
                        <option value="Tarjeta">Tarjeta 💳</option>
                        <option value="Transferencia">Transferencia 🏦</option>
                        <option value="Yape/Plin">Yape/Plin 📱</option>
                      </select>
                    </div>
                  </div>
                   <Button onClick={handleAddPayment} disabled={paymentSubmitting} className="mt-4 w-full bg-primary text-primary-foreground hover:brightness-95">
                    {paymentSubmitting ? "Procesando..." : "Procesar Abono"}
                  </Button>
                </div>

                {/* ── CTA Banner: Ir a Módulo de Caja ── */}
                <button
                  type="button"
                  onClick={() => router.push("/advisor/payments")}
                  className="group mt-2 flex w-full items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:border-primary/55 hover:bg-primary/10"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/25">
                    <DollarSign className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {selectedJob.status === 'Ready'
                        ? 'Vehículo listo. Ve a Caja para cerrar el cobro'
                        : selectedJob.status === 'QC'
                        ? 'En QC. Prepara el cobro en Módulo de Caja'
                        : 'Módulo de Caja / Pagos Completo'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      Historial de abonos, vuelto, recibos PDF y cierre de caja
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                </button>

                <div className="pt-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Button
                    onClick={() => void handleRegenerateQuoteLink(selectedJob)}
                    variant="outline"
                    className="flex-1 border-primary/50 text-primary"
                    disabled={managingQuoteLink}
                  >
                    <Link2 className="w-4 h-4 mr-2" /> Regenerar enlace seguro
                  </Button>
                </div>

              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="detail-placeholder">
            {t('selectVehicleQuote')}
          </div>
        )}
      </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
