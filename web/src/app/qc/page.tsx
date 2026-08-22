"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ContextHelpLink } from "@/components/ContextHelpLink";
import { useRealtimeJobs } from "@/hooks/useRealtimeJobs";
import { submitQualityControl } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ShieldCheck,
  ClipboardCheck,
  CheckCircle2,
  Wrench,
  Search,
  MessageSquare,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Undo2,
  Check,
  ChevronRight,
  ListTodo,
} from "lucide-react";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { VehicleIcon } from "@/components/ui/vehicle-icons";
import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/lib/api-errors";
import {
  makeSessionDraftKey,
  readSessionDraft,
  removeSessionDraft,
  writeSessionDraft,
} from "@/lib/session-drafts";

const EMPTY_CHECKS = {
  symptomsResolved: false,
  torqueVerified: false,
  fluidsDoubleChecked: false,
  cleanlinessChecked: false,
  roadTestVerified: false,
};

type QcChecks = typeof EMPTY_CHECKS;

interface QcDraft {
  checks: QcChecks;
  inspectorNotes: string;
  isRejecting: boolean;
  rejectionReason: string;
}

function isQcDraft(value: unknown): value is QcDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<QcDraft>;
  const checks = draft.checks as Partial<QcChecks> | undefined;

  return Boolean(
    checks &&
    Object.keys(EMPTY_CHECKS).every((key) => typeof checks[key as keyof QcChecks] === "boolean") &&
    typeof draft.inspectorNotes === "string" && draft.inspectorNotes.length <= 2000 &&
    typeof draft.isRejecting === "boolean" &&
    typeof draft.rejectionReason === "string" && draft.rejectionReason.length <= 2000
  );
}

function isQcSelectionDraft(value: unknown): value is { jobId: string } {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as { jobId?: unknown }).jobId === "string" &&
    (value as { jobId: string }).jobId.length <= 160
  );
}

export default function QualityControlPage() {
  const router = useRouter();
  const { user, userProfile, workshopSettings, signOut } = useAuth();
  const currencySymbol = workshopSettings?.currencySymbol || "$";
  const formatMoney = (amount: number) => `${currencySymbol}${amount.toFixed(2)}`;

  // Load all jobs currently in QC status, and also recently Ready/Repair jobs for history
  const { jobs, loading, error: jobsError, retry: retryJobs } = useRealtimeJobs({ all: true });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Rejection Dialog State
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // QC Inspector Checklist States
  const [checks, setChecks] = useState<QcChecks>(EMPTY_CHECKS);
  const [inspectorNotes, setInspectorNotes] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const hydratingDraftRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<number | null>(null);

  // Filter jobs based on status and search query
  const qcPendingJobs = useMemo(() => {
    return jobs.filter(
      (job) =>
        job.status === "QC" &&
        (job.vehicleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.clientId.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [jobs, searchQuery]);

  const recentQcJobs = useMemo(() => {
    return jobs
      .filter((job) => ["Ready", "Delivered"].includes(job.status))
      .slice(0, 10);
  }, [jobs]);

  const selectedJob = useMemo(() => {
    return jobs.find((job) => job.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);
  const selectedJobStale = selectedJob !== null && selectedJob.status !== "QC";
  const draftOwner = user && userProfile?.workshopId
    ? { userId: user.uid, workshopId: userProfile.workshopId }
    : null;
  const selectionDraftKey = draftOwner
    ? makeSessionDraftKey("qc-selection", draftOwner.userId, draftOwner.workshopId, "active")
    : null;
  const currentDraftKey = draftOwner && selectedJobId
    ? makeSessionDraftKey("qc", draftOwner.userId, draftOwner.workshopId, selectedJobId)
    : null;

  // Restore only a same-user, same-workshop draft for the selected order.
  useEffect(() => {
    const draft = currentDraftKey ? readSessionDraft(currentDraftKey, isQcDraft) : null;
    hydratingDraftRef.current = true;
    setChecks(draft?.checks || EMPTY_CHECKS);
    setInspectorNotes(draft?.inspectorNotes || "");
    setIsRejecting(draft?.isRejecting || false);
    setRejectionReason(draft?.rejectionReason || "");
    setDraftRestored(Boolean(draft));
    setOperationError(null);
    setOperationStatus(null);
  }, [currentDraftKey]);

  useEffect(() => {
    if (!currentDraftKey) return;
    if (hydratingDraftRef.current) {
      hydratingDraftRef.current = false;
      return;
    }

    const hasContent = Object.values(checks).some(Boolean) ||
      inspectorNotes.trim().length > 0 ||
      isRejecting ||
      rejectionReason.trim().length > 0;

    if (!hasContent) {
      removeSessionDraft(currentDraftKey);
      return;
    }

    writeSessionDraft<QcDraft>(currentDraftKey, {
      checks,
      inspectorNotes: inspectorNotes.slice(0, 2000),
      isRejecting,
      rejectionReason: rejectionReason.slice(0, 2000),
    });
  }, [checks, currentDraftKey, inspectorNotes, isRejecting, rejectionReason]);

  // Set first job as selected by default if available
  useEffect(() => {
    if (qcPendingJobs.length > 0 && !selectedJobId) {
      const savedSelection = selectionDraftKey
        ? readSessionDraft(selectionDraftKey, isQcSelectionDraft)
        : null;
      const restoredJob = savedSelection
        ? qcPendingJobs.find((job) => job.id === savedSelection.jobId)
        : null;
      setSelectedJobId(restoredJob?.id || qcPendingJobs[0].id);
    }
  }, [qcPendingJobs, selectedJobId, selectionDraftKey]);

  useEffect(() => {
    if (!selectionDraftKey || !selectedJobId) return;
    writeSessionDraft(selectionDraftKey, { jobId: selectedJobId });
  }, [selectedJobId, selectionDraftKey]);

  const clearCurrentDraft = () => {
    removeSessionDraft(currentDraftKey);
    removeSessionDraft(selectionDraftKey);
    setDraftRestored(false);
  };

  const discardCurrentDraft = () => {
    clearCurrentDraft();
    hydratingDraftRef.current = true;
    setChecks(EMPTY_CHECKS);
    setInspectorNotes("");
    setIsRejecting(false);
    setRejectionReason("");
    setOperationError(null);
    setOperationStatus(null);
  };

  const handlePassQC = async () => {
    if (!selectedJob || submittingRef.current) return;

    const allChecked = Object.values(checks).every((val) => val === true);
    if (!allChecked) {
      toast.error("Debe validar todos los puntos del checklist de Control de Calidad.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setOperationError(null);
    setOperationStatus(null);
    try {
      const result = await submitQualityControl(selectedJob.id, {
        outcome: "pass",
        notes: inspectorNotes,
      });

      toast.success(result.status === "Delivered"
        ? `✅ Vehículo ${selectedJob.vehicleId} aprobado y entregado (pago completo)!`
        : `✅ Vehículo ${selectedJob.vehicleId} aprobado y listo para entrega!`
      );
      clearCurrentDraft();
      setSelectedJobId(null);
    } catch (error) {
      console.error("Error approving QC:", error);
      const message = error instanceof Error ? error.message : "Error al aprobar el control de calidad.";
      setOperationError(message);
      setOperationStatus(error instanceof ApiRequestError ? error.status : null);
      toast.error(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleFailQC = async () => {
    if (!selectedJob || submittingRef.current) return;
    if (!rejectionReason.trim()) {
      toast.error("Por favor, ingrese el motivo del rechazo.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setOperationError(null);
    setOperationStatus(null);
    try {
      await submitQualityControl(selectedJob.id, {
        outcome: "fail",
        notes: rejectionReason,
      });

      toast.success(`❌ Vehículo ${selectedJob.vehicleId} rechazado. Retornado a reparación.`);
      clearCurrentDraft();
      setSelectedJobId(null);
      setIsRejecting(false);
    } catch (error) {
      console.error("Error rejecting QC:", error);
      const message = error instanceof Error ? error.message : "Error al registrar el rechazo.";
      setOperationError(message);
      setOperationStatus(error instanceof ApiRequestError ? error.status : null);
      toast.error(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleReauthenticate = async () => {
    await signOut();
    router.push("/login?redirect=%2Fqc&reason=session-expired");
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "ADVISOR", "TECHNICIAN"]}>
      <div className="text-foreground">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="page-title flex items-center gap-2.5">
                  <ShieldCheck className="size-6 text-primary" />
                  Control de Calidad (QC)
                </h1>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Verificación final de reparaciones para garantizar la satisfacción y seguridad del cliente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ContextHelpLink section="qc" compact />
              <Badge variant="outline" className="gap-1.5 border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
                Auditoría Activa
              </Badge>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Job Selection Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Search Box */}
              <Card className="app-card">
                <CardContent className="p-4">
                  <div className="relative">
                    <Label htmlFor="qc-search" className="sr-only">Buscar órdenes para control de calidad</Label>
                    <Input
                      id="qc-search"
                      placeholder="Buscar por placa o cliente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-background border-border text-sm"
                    />
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </CardContent>
              </Card>

              {/* Pending List */}
              <Card className="app-card overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/45 py-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <ListTodo className="size-4 text-primary" />
                      Pendientes de Aprobación
                    </CardTitle>
                    <Badge variant="secondary" className="border-none bg-primary/10 font-bold text-primary">
                      {qcPendingJobs.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-2 max-h-[350px] overflow-y-auto space-y-1 divide-y divide-border/20">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Cargando órdenes...</p>
                    </div>
                  ) : jobsError ? (
                    <div role="alert" className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
                      <AlertTriangle className="h-8 w-8 text-rose-400" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">No se pudieron cargar las órdenes.</p>
                        <p className="mt-1 text-xs text-muted-foreground">Comprueba la conexión y vuelve a intentarlo.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={retryJobs}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Reconectar
                      </Button>
                    </div>
                  ) : qcPendingJobs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm px-4">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-60" />
                      No hay vehículos pendientes de control de calidad. Todos los trabajos están al día.
                    </div>
                  ) : (
                    qcPendingJobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`queue-item flex items-center justify-between ${
                          selectedJobId === job.id
                            ? "queue-item-active text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <VehicleIcon type={job.vehicleType} className={`size-4 shrink-0 ${selectedJobId === job.id ? 'text-primary' : 'text-muted-foreground'}`} />
                            {job.vehicleId}
                          </p>
                          <p className="text-xs truncate mt-0.5">{job.clientId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            Pendiente QC
                          </Badge>
                          <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* History List */}
              <Card className="app-card">
                <CardHeader className="py-3.5 border-b border-border/40">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    Historial Reciente de QC
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 max-h-[250px] overflow-y-auto space-y-2">
                  {recentQcJobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No hay registros recientes.</p>
                  ) : (
                    recentQcJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/35 p-2.5 text-xs"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <VehicleIcon type={job.vehicleType} className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-semibold text-foreground">{job.vehicleId}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{job.clientId}</p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            job.status === "Delivered"
                              ? "text-green-400 border-green-500/30 bg-green-950/10 text-[10px]"
                              : "text-emerald-400 border-emerald-500/30 bg-emerald-950/10 text-[10px]"
                          }
                        >
                          {job.status === "Delivered" ? "Entregado" : "Listo"}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: QC Workbench */}
            <div className="lg:col-span-8">
              {selectedJob ? (
                <div className="space-y-6">
                  {/* Glowing Stepper Guidance */}
                  <WorkflowStepper currentStatus={selectedJob.status} />

                  <Card className="app-card relative overflow-hidden border-t-4 border-t-primary">
                  
                  {/* Rejection Overlay Sub-View */}
                  {isRejecting ? (
                    <CardContent className="p-6 space-y-6">
                      <div className="flex items-center gap-3 text-rose-400 border-b border-rose-500/20 pb-4">
                        <Undo2 className="size-6" />
                        <div>
                          <h2 className="text-lg font-bold">Rechazar Control de Calidad</h2>
                          <p className="text-xs text-muted-foreground">La orden volverá al técnico para corregir los problemas indicados.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {draftRestored && (
                          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-500/30 bg-sky-950/20 px-4 py-3 text-xs text-sky-200">
                            <span>Se restauró el borrador de QC guardado en esta pestaña.</span>
                            <Button type="button" variant="ghost" size="sm" onClick={discardCurrentDraft}>
                              Descartar borrador
                            </Button>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="rejection-reason" className="text-sm font-semibold text-foreground">
                            Motivo del Rechazo / Instrucciones para el Técnico
                          </Label>
                          <Textarea
                            id="rejection-reason"
                            placeholder="Describa a detalle qué falló en la verificación (ej. El ruido en la suspensión persiste, falta limpiar la consola interior, el torque de la llanta trasera derecha no cumple)..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={6}
                            className="bg-background border-border text-sm"
                          />
                        </div>

                        {(operationError || selectedJobStale) && (
                          <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              <p className="font-semibold">
                                {operationStatus === 401 ? "Tu sesión expiró." : operationStatus === 409 || selectedJobStale ? "La orden cambió mientras la revisabas." : "No se guardó el rechazo de QC."}
                              </p>
                              <p className="mt-0.5 text-xs text-rose-200/80">{operationError || "La orden ya no está pendiente de QC. La información visible fue actualizada en tiempo real."} El motivo se conservó.</p>
                              {operationStatus === 401 && (
                                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={handleReauthenticate}>
                                  Iniciar sesión nuevamente
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 justify-end pt-4 sm:flex-row">
                          <Button
                            variant="ghost"
                            onClick={() => setIsRejecting(false)}
                            className="text-muted-foreground hover:text-foreground hover:bg-zinc-800"
                            disabled={submitting}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleFailQC}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6"
                            disabled={submitting || selectedJob.status !== "QC" || !rejectionReason.trim()}
                          >
                            {submitting ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                            ) : (
                              operationError ? "Reintentar Rechazo" : "Confirmar Rechazo y Enviar a Técnico"
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  ) : (
                    // Regular QC Checklist View
                    <>
                      <CardHeader className="border-b border-border/40 pb-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                              <VehicleIcon type={selectedJob.vehicleType} className="w-5 h-5 text-muted-foreground shrink-0" />
                              Vehículo: {selectedJob.vehicleId}
                            </CardTitle>
                            <CardDescription className="mt-1 text-sm text-muted-foreground">
                              Cliente: <span className="font-medium text-foreground">{selectedJob.clientId}</span>
                              {selectedJob.odometer && ` · Odómetro: ${selectedJob.odometer.toLocaleString()} km`}
                            </CardDescription>
                          </div>
                          
                          <Badge variant="outline" className="w-fit border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            CÓDIGO: {selectedJob.id.substring(0, 8).toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 space-y-6">
                        {draftRestored && (
                          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-500/30 bg-sky-950/20 px-4 py-3 text-xs text-sky-200">
                            <span>Se restauró el borrador de QC guardado en esta pestaña.</span>
                            <Button type="button" variant="ghost" size="sm" onClick={discardCurrentDraft}>
                              Descartar borrador
                            </Button>
                          </div>
                        )}
                        {/* Reported Symptoms */}
                        {selectedJob.symptoms && (
                          <div className="bg-zinc-950/40 border border-border/50 rounded-xl p-4 space-y-1.5">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-primary">
                              <MessageSquare className="w-3.5 h-3.5" />
                              Motivo de Entrada / Queja del Cliente
                            </h4>
                            <p className="text-sm text-muted-foreground italic">
                              &quot;{selectedJob.symptoms}&quot;
                            </p>
                          </div>
                        )}

                        {/* Approved Inspection Items (What was supposed to be repaired) */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5" />
                            Trabajos y Repuestos Aprobados
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(selectedJob.inspectionItems || [])
                              .filter((item) => item.approved)
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/35 p-2.5 text-xs"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="text-foreground font-medium truncate">{item.name}</span>
                                  {item.price && (
                                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                                      {formatMoney(item.price)}
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Technician Statement */}
                        <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-xl p-4 space-y-2.5">
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            Declaración del Técnico
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="flex items-center gap-1.5 text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Torque Ajustado
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Fluidos OK
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Limpieza OK
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Prueba Realizada
                            </div>
                          </div>
                        </div>

                        {/* Interactive QC Checklist */}
                        <div className="space-y-4 border-t border-border/40 pt-5">
                          <h4 className="flex items-center gap-1.5 text-xs font-bold text-primary">
                            <ListTodo className="w-3.5 h-3.5" />
                            Checklist de Control de Calidad (Auditoría)
                          </h4>

                          <div className="space-y-3">
                            {/* Check 1 */}
                            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/35 p-3.5 transition-colors hover:border-primary/30">
                              <div className="space-y-0.5 pr-4">
                                <Label htmlFor="qc-symptoms-resolved" className="text-sm font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                                  Síntomas Resueltos
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Verificado y confirmado que el problema reportado por el cliente ha sido solucionado por completo.
                                </p>
                              </div>
                              <Switch
                                id="qc-symptoms-resolved"
                                checked={checks.symptomsResolved}
                                onCheckedChange={(val) => setChecks({ ...checks, symptomsResolved: val })}
                              />
                            </div>

                            {/* Check 2 */}
                            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/35 p-3.5 transition-colors hover:border-primary/30">
                              <div className="space-y-0.5 pr-4">
                                <Label htmlFor="qc-torque-verified" className="text-sm font-semibold text-foreground cursor-pointer">
                                  Seguridad y Ajustes Mecánicos
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Ajustes críticos y torques de componentes de seguridad (ruedas, frenos, suspensión) confirmados correctos.
                                </p>
                              </div>
                              <Switch
                                id="qc-torque-verified"
                                checked={checks.torqueVerified}
                                onCheckedChange={(val) => setChecks({ ...checks, torqueVerified: val })}
                              />
                            </div>

                            {/* Check 3 */}
                            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/35 p-3.5 transition-colors hover:border-primary/30">
                              <div className="space-y-0.5 pr-4">
                                <Label htmlFor="qc-fluids-checked" className="text-sm font-semibold text-foreground cursor-pointer">
                                  Fluidos y Fugas
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Niveles de aceites, refrigerante y fluidos hidráulicos en su punto exacto. Cero fugas visibles.
                                </p>
                              </div>
                              <Switch
                                id="qc-fluids-checked"
                                checked={checks.fluidsDoubleChecked}
                                onCheckedChange={(val) => setChecks({ ...checks, fluidsDoubleChecked: val })}
                              />
                            </div>

                            {/* Check 4 */}
                            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/35 p-3.5 transition-colors hover:border-primary/30">
                              <div className="space-y-0.5 pr-4">
                                <Label htmlFor="qc-cleanliness-checked" className="text-sm font-semibold text-foreground cursor-pointer">
                                  Estética y Limpieza
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Vehículo libre de marcas de grasa, interior limpio, repuestos viejos colocados de manera ordenada en la maletera.
                                </p>
                              </div>
                              <Switch
                                id="qc-cleanliness-checked"
                                checked={checks.cleanlinessChecked}
                                onCheckedChange={(val) => setChecks({ ...checks, cleanlinessChecked: val })}
                              />
                            </div>

                            {/* Check 5 */}
                            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/35 p-3.5 transition-colors hover:border-primary/30">
                              <div className="space-y-0.5 pr-4">
                                <Label htmlFor="qc-road-test-verified" className="text-sm font-semibold text-foreground cursor-pointer">
                                  Prueba de Ruta Validada
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  El vehículo se maneja estable, frena sin ruidos, y no presenta alertas ni testigos activos en el tablero.
                                </p>
                              </div>
                              <Switch
                                id="qc-road-test-verified"
                                checked={checks.roadTestVerified}
                                onCheckedChange={(val) => setChecks({ ...checks, roadTestVerified: val })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Inspector Notes */}
                        <div className="space-y-2">
                          <Label htmlFor="inspector-notes" className="text-sm font-semibold text-foreground">
                            Notas del Inspector (Opcional)
                          </Label>
                          <Textarea
                            id="inspector-notes"
                            placeholder="Agregue observaciones o detalles específicos de la inspección..."
                            value={inspectorNotes}
                            onChange={(e) => setInspectorNotes(e.target.value)}
                            rows={3}
                            className="bg-background border-border text-sm"
                          />
                        </div>

                        {(operationError || selectedJobStale) && (
                          <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              <p className="font-semibold">
                                {operationStatus === 401 ? "Tu sesión expiró." : operationStatus === 409 || selectedJobStale ? "La orden cambió mientras la revisabas." : "No se guardó el control de calidad."}
                              </p>
                              <p className="mt-0.5 text-xs text-rose-200/80">{operationError || "La orden ya no está pendiente de QC. La información visible fue actualizada en tiempo real."} Tus selecciones siguen intactas.</p>
                              {operationStatus === 401 && (
                                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={handleReauthenticate}>
                                  Iniciar sesión nuevamente
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setOperationError(null);
                              setIsRejecting(true);
                            }}
                            className="border-rose-600/50 text-rose-400 hover:bg-rose-950/20 font-bold h-12 w-full sm:w-auto"
                            disabled={submitting}
                          >
                            <Undo2 className="w-4 h-4 mr-2" />
                            Rechazar y Devolver a Taller
                          </Button>
                          
                          <Button
                            onClick={handlePassQC}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 flex-1 sm:ml-auto"
                            disabled={
                              submitting ||
                              selectedJob.status !== "QC" ||
                              !Object.values(checks).every((val) => val === true)
                            }
                          >
                            {submitting ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                            ) : (
                              <><ShieldCheck className="w-4 h-4 mr-2" /> {operationError ? "Reintentar Aprobación" : "Aprobar y Marcar Listo para Entrega"}</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  )}
                  </Card>
                </div>
              ) : (
                <div className="detail-placeholder h-[500px] flex-col gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center border border-border">
                    <ShieldCheck className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Workbench de Control de Calidad</h3>
                    <p className="text-sm max-w-sm mt-1 mx-auto">
                      Selecciona un vehículo de la lista de pendientes para comenzar con la auditoría de calidad.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
