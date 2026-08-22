"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateJob, assignTechnician } from "@/lib/db";
import { uploadJobImage } from "@/lib/storage";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Job, InspectionItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { CircleHelp, Wand2, MessageCircle, Mic, MicOff, Loader2, Bot, AlertTriangle, CheckCircle, Wrench } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { openWhatsAppStatusUpdate } from "@/lib/whatsapp";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useRealtimeJobs } from "@/hooks/useRealtimeJobs";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { VehicleIcon } from "@/components/ui/vehicle-icons";
import { toDate } from "@/lib/dates";
import { WorkflowQueueEmptyState } from "@/components/WorkflowQueueEmptyState";

const STATUS_MAP: Record<string, string> = {
  Pass: 'statusPass',
  Fail: 'statusFail',
  Critical: 'statusCritical',
  Recommended: 'statusRecommended',
};

export default function TechnicianDashboard() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();

  const { jobs, loading } = useRealtimeJobs({ statuses: ["Reception", "Diagnosis", "Approved", "Repair", "QC"] });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [newItemName, setNewItemName] = useState("");
  const [newItemStatus, setNewItemStatus] = useState<'Pass' | 'Fail' | 'Critical' | 'Recommended'>('Pass');
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemPhotos, setNewItemPhotos] = useState<File[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [submittedJob, setSubmittedJob] = useState<Job | null>(null);



  // ── AI Diagnosis ──────────────────────────────────────────
  const [aiDiagnosis, setAiDiagnosis] = useState<string>("");
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError, setAiError]         = useState<string | null>(null);

  // ── Voice recognition ─────────────────────────────────────
  const { transcript, isListening, isSupported: voiceSupported, error: voiceError, start: startVoice, stop: stopVoice, reset: resetVoice } = useSpeechRecognition();
  
  const router = useRouter();

  const handleAddInspection = async () => {
    if (!selectedJob || !newItemName) return;
    setIsLogging(true);
    
    try {
      const urls: string[] = [];
      if (newItemPhotos.length > 0) {
        toast.info(t('uploadingPhotos') || "Subiendo evidencia...");
        for (const file of newItemPhotos) {
          const url = await uploadJobImage(file, selectedJob.id, "evidence");
          urls.push(url);
        }
      }

      const newItem: InspectionItem = {
        id: Math.random().toString(36).substring(7),
        name: newItemName,
        status: newItemStatus,
        notes: newItemNotes,
        mediaUrls: urls
      };

      const updatedJob = {
        ...selectedJob,
        inspectionItems: [...(selectedJob.inspectionItems || []), newItem]
      };
      setSelectedJob(updatedJob);
      setNewItemName("");
      setNewItemNotes("");
      setNewItemStatus("Pass");
      setNewItemPhotos([]);
    } catch {
      toast.error("Error al subir la evidencia");
    } finally {
      setIsLogging(false);
    }
  };

  /** Runs the client-side AI diagnosis engine for the selected job's symptoms. */
  const handleAutoDiagnose = async () => {
    if (!selectedJob) return;
    setAiLoading(true);
    setAiDiagnosis("");
    setAiError(null);

    const symptoms = selectedJob.symptoms || newItemNotes || newItemName || "Inspección general del vehículo";

    try {
      const { streamDiagnosis } = await import("@/lib/diagnosis");
      const result = await streamDiagnosis(symptoms, (accumulated) => {
        setAiDiagnosis(accumulated);
      });

      // Auto-populate the form with the diagnosis result
      if (result.diagnosis) {
        setNewItemName(result.diagnosis);
        setNewItemNotes(
          [result.likelyCauses?.join(" | "), result.safetyWarning]
            .filter(Boolean).join("\n")
        );
        if (result.severity === "Crítico" || result.severity === "Alto") {
          setNewItemStatus("Critical");
        } else if (result.severity === "Medio") {
          setNewItemStatus("Fail");
        } else {
          setNewItemStatus("Recommended");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al ejecutar el diagnóstico.";
      setAiError(message);
      toast.error("Error de IA: " + message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectJob = async (job: Job) => {
    setSelectedJob(job);
    setAiDiagnosis("");
    setAiError(null);
    // Assign this technician to the job if not already assigned
    if (!job.technicianId && user) {
      try {
        await assignTechnician(job.id, user.uid);
      } catch (e) {
        console.error("Error assigning technician:", e);
      }
    }
  };

  const handleSubmitDiagnosis = async () => {
    if (!selectedJob) return;
    if (!user?.uid) {
      toast.error("La sesión no está disponible.");
      return;
    }
    
    // Safety check: block empty diagnosis submissions
    if (!selectedJob.inspectionItems || selectedJob.inspectionItems.length === 0) {
      toast.error("Validación de Taller: No puedes enviar un diagnóstico vacío. Debes registrar al menos un punto de inspección del vehículo.", {
        duration: 6000,
        style: { border: "1px solid rgba(239, 68, 68, 0.4)", background: "rgba(20, 20, 20, 0.95)" }
      });
      return;
    }

    try {
      await updateJob(selectedJob.id, {
        inspectionItems: selectedJob.inspectionItems || [],
        status: "Approval"
      }, user.uid, "Diagnóstico Enviado");
      setSubmittedJob(selectedJob);  // save for WhatsApp
      setSubmittedJobId(selectedJob.vehicleId);
      setSelectedJob(null);
      // Real-time listener handles refresh automatically
    } catch (e) {
      toast.error("Error al guardar: " + e);
    }
  };

  const handleStartRepair = async () => {
    if (!selectedJob) return;
    if (!user?.uid) {
      toast.error("La sesión no está disponible.");
      return;
    }
    try {
      await updateJob(selectedJob.id, { status: "Repair" }, user.uid, "Reparación Iniciada");
      toast.success("Reparación iniciada");
      setSelectedJob({ ...selectedJob, status: "Repair" } as Job);
      // Real-time listener handles refresh automatically
    } catch (e) {
      toast.error("Error: " + e);
    }
  };

  const handleSendToQC = async () => {
    if (!selectedJob) return;
    if (!user?.uid) {
      toast.error("La sesión no está disponible.");
      return;
    }
    try {
      await updateJob(selectedJob.id, { status: "QC" }, user.uid, "Enviado a QC");
      toast.success("Vehículo enviado a control de calidad");
      setSelectedJob(null);
      // Real-time listener handles refresh automatically
    } catch (e) {
      toast.error("Error al enviar a QC: " + e);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">{t('loadingJobs')}</div>;
  }

  if (submittedJobId) {
    const hasPhone = Boolean(submittedJob?.clientPhone);
    return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="app-card w-full max-w-md p-8 text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
              <Wand2 className="size-8 text-primary" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">{t('diagnosisSubmitted')}</h2>
            <p className="text-muted-foreground mb-8">{t('vehicleReadyForQuoting').replace('{id}', submittedJobId)}</p>
            <div className="space-y-3">
               {/* WhatsApp notification is available only when a phone is stored. */}
               {hasPhone && submittedJob && (
                 <Button
                   className="w-full bg-[#25d366] hover:bg-[#1ebe5d] text-white font-bold h-12"
                   onClick={() => openWhatsAppStatusUpdate(
                     submittedJob.clientPhone!,
                     submittedJob.clientId,
                     submittedJob.vehicleId,
                     'diagnosis'
                   )}
                 >
                   <MessageCircle className="w-4 h-4 mr-2" />
                   {t('notifyClientWhatsApp')}
                 </Button>
               )}
               <Button onClick={() => router.push('/advisor')} className="h-12 w-full bg-primary text-primary-foreground hover:brightness-95">
                  {t('goToAdvisor')}
               </Button>
               <Button onClick={() => { setSubmittedJobId(null); setSubmittedJob(null); }} variant="outline" className="w-full border-border text-muted-foreground h-10">
                  {t('inspectAnother')}
               </Button>
            </div>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  if (jobs.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']}>
        <WorkflowQueueEmptyState
          icon={<Wrench className="h-8 w-8" />}
          eyebrow="Cola técnica · 0 órdenes activas"
          title="El área técnica está al día"
          description="No hay vehículos esperando diagnóstico o reparación. La cola se actualizará automáticamente cuando Recepción registre una nueva orden o el cliente apruebe un trabajo."
          steps={[
            {
              title: "Recepción inicia la orden",
              description: "El vehículo aparecerá aquí con sus síntomas, evidencias y datos de ingreso.",
            },
            {
              title: "Selecciona y documenta el trabajo",
              description: "Registra el diagnóstico o continúa la reparación sin cambiar de módulo.",
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
    Reception: 'text-amber-400 border-amber-500/60',
    Diagnosis: 'text-primary border-primary/60',
    Approval: 'text-warning border-warning/50',
    Approved: 'text-success border-primary/40',
    Repair: 'text-primary border-primary/50',
    QC: 'text-primary border-primary/50',
    Ready: 'text-success border-primary/40',
    Delivered: 'text-gray-400 border-gray-500/60',
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']}>
      <div className="flex justify-center text-foreground">
        <div className="workbench-layout max-w-7xl">
      {/* Left Sidebar: Job List (3/12 = 25%) */}
      <div className="workbench-queue">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">{t('technicianBay')}</h1>
            <p className="text-muted-foreground text-xs">{t('assignedVehicles')}</p>
            <div className="mt-2 text-xs font-medium text-primary">
              {jobs.length} orden{jobs.length !== 1 ? 'es' : ''} activa{jobs.length !== 1 ? 's' : ''}
            </div>
          </div>
          <Link href="/help#diagnosis" className="tool-button" aria-label={lang === "es" ? "Ayuda de diagnóstico" : "Diagnosis help"}><CircleHelp size={18}/></Link>
        </header>

        <div className="queue-list">
          {jobs.length === 0 ? (
            <p className="text-muted-foreground italic text-sm">{t('noAssignedVehicles')}</p>
          ) : (
            jobs.map(job => {
              const isActive = selectedJob?.id === job.id;
              const statusColor = STATUS_COLOR[job.status] || 'text-gray-400 border-gray-500/60';
              return (
                <button
                  key={job.id}
                  onClick={() => handleSelectJob(job)}
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
                    {job.odometer > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">· {job.odometer.toLocaleString()} km</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Content: Diagnosis Panel (9/12 = 75%) */}
      <div className="workbench-detail">
        {selectedJob ? (
          <div className="space-y-6">
            {/* Glowing Stepper Guidance */}
            <WorkflowStepper currentStatus={selectedJob.status === "Reception" ? "Diagnosis" : selectedJob.status} />

            {/* Vehicle Info & Symptoms Header */}
            <Card className="app-card border-l-4 border-l-primary">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="flex items-center gap-2">
                      <VehicleIcon type={selectedJob.vehicleType} className="w-5 h-5 text-muted-foreground shrink-0" />
                      <Badge className="border border-primary/30 bg-primary/10 font-mono text-sm text-primary">
                        {selectedJob.vehicleId}
                      </Badge>
                    </span>
                    <span className="basis-full pl-7 text-sm font-semibold text-foreground break-words sm:basis-auto sm:pl-0">
                      {selectedJob.clientId}
                    </span>
                  </div>
                  {selectedJob.symptoms ? (
                    <div className="mt-2 rounded-lg border border-border bg-muted/45 p-3 text-sm text-muted-foreground">
                      <strong className="mb-1 block text-xs font-semibold text-primary">
                        {t('symptomsLabel') || "Síntomas Reportados por el Cliente / Motivo:"}
                      </strong>
                      &ldquo;{selectedJob.symptoms}&rdquo;
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic mt-1">Sin síntomas reportados en la recepción.</p>
                  )}
                </div>
                {selectedJob.clientPhone && (
                  <Badge variant="outline" className="text-muted-foreground border-border self-start md:self-center font-mono">
                    📞 {selectedJob.clientPhone}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {(selectedJob.status === 'Reception' || selectedJob.status === 'Diagnosis') && (
              <>
            <Card className="app-card">
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle>{t('diagnosisAndInspections')}</CardTitle>
                  <CardDescription>{t('addItemsToReview')}</CardDescription>
                </div>
                <Button
                  onClick={handleAutoDiagnose}
                  disabled={aiLoading || Boolean(aiDiagnosis)}
                  variant="outline"
                  className="flex-shrink-0 border-primary/40 text-primary hover:bg-primary/5"
                >
                  {aiLoading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analizando...</>
                    : aiDiagnosis
                      ? <><CheckCircle className="w-4 h-4 mr-2 text-emerald-400" /><span className="hidden sm:inline">Diagnóstico Listo</span><span className="sm:hidden text-xs">Listo</span></>
                      : <><Bot className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Diagnóstico IA</span><span className="sm:hidden text-xs">IA</span></>}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                
                  {/* AI Streaming Output Panel */}
                  {(aiLoading || aiDiagnosis || aiError) && (
                    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <Bot className="w-3.5 h-3.5" />
                        Análisis IA {aiLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      </p>
                      {aiError ? (
                        <div className="flex items-start gap-2 text-red-400 text-sm">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {aiError}
                        </div>
                      ) : (
                        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                          {aiDiagnosis || "Iniciando análisis..."}
                        </pre>
                      )}
                    </div>
                  )}

                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">{t('loggedItems')}</h3>
                  {(!selectedJob.inspectionItems || selectedJob.inspectionItems.length === 0) ? (
                    <p className="text-sm text-muted-foreground italic">{t('noItemsLogged')}</p>
                  ) : (
                    selectedJob.inspectionItems.map(item => {
                      const badgeColor =
                        item.status === 'Pass' ? 'bg-emerald-600' :
                        item.status === 'Fail' ? 'bg-red-600' :
                        item.status === 'Critical' ? 'bg-orange-600' :
                        item.status === 'Recommended' ? 'bg-primary' : '';
                      return (
                        <div key={item.id} className="p-3 bg-secondary/50 dark:bg-black/40 border border-border rounded flex justify-between items-start">
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                            {item.mediaUrls && item.mediaUrls.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {item.mediaUrls.map((url, idx) => (
                                  <Image key={idx} src={url} alt="Evidencia" width={48} height={48} unoptimized className="w-12 h-12 object-cover rounded border border-border" />
                                ))}
                              </div>
                            )}
                          </div>
                          <Badge className={badgeColor}>
                            {t(STATUS_MAP[item.status] || item.status)}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>

                <hr className="border-border" />

                <div className="form-surface space-y-4">
                  <h3 className="font-semibold text-foreground">{t('addInspectionItem')}</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="inspection-component">{t('componentDetail')}</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="inspection-component"
                        value={isListening ? (transcript || newItemName) : newItemName} 
                        onChange={e => setNewItemName(e.target.value)} 
                        className="bg-background border-border flex-1" 
                        placeholder={isListening ? "🎙️ Escuchando..." : t('enterComponentName')}
                      />
                      {voiceSupported && (
                        <Button
                          type="button"
                          size="icon"
                          variant={isListening ? "destructive" : "outline"}
                          className={`flex-shrink-0 transition-all ${isListening ? "animate-pulse" : "border-border"}`}
                          onClick={() => {
                            if (isListening) {
                              stopVoice();
                              if (transcript) setNewItemName(transcript);
                              resetVoice();
                            } else {
                              resetVoice();
                              startVoice();
                            }
                          }}
                          title={isListening ? "Detener grabación" : "Hablar síntomas"}
                        >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                    {voiceError && <p className="text-xs text-red-400">{voiceError}</p>}
                    {isListening && (
                      <p className="flex items-center gap-1.5 text-xs text-destructive">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                        Grabando... hable con claridad en español
                      </p>
                    )}
                  </div>

                  <div className="space-y-2" role="group" aria-labelledby="inspection-status-label">
                    <Label id="inspection-status-label">{t('statusTitle')}</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(['Pass', 'Recommended', 'Fail', 'Critical'] as const).map(status => (
                        <Button
                          key={status}
                          variant={newItemStatus === status ? "default" : "outline"}
                          className={`
                            ${newItemStatus === status && status === 'Pass' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                            ${newItemStatus === status && status === 'Fail' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                            ${newItemStatus === status && status === 'Critical' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                            ${newItemStatus === status && status === 'Recommended' ? 'bg-primary text-primary-foreground hover:brightness-95' : ''}
                            ${newItemStatus !== status ? 'border-border text-muted-foreground' : ''}
                          `}
                          onClick={() => setNewItemStatus(status)}
                          aria-pressed={newItemStatus === status}
                        >
                          {t(STATUS_MAP[status])}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inspection-notes">{t('technicianNotes')}</Label>
                    <Textarea 
                      id="inspection-notes"
                      value={newItemNotes} 
                      onChange={e => setNewItemNotes(e.target.value)} 
                      className="bg-background border-border"
                      placeholder={t('addDetails')}
                    />
                  </div>

                  {newItemStatus !== 'Pass' && (
                    <div className="space-y-2">
                      <Label htmlFor="inspection-evidence">Evidencia Fotográfica (Opcional)</Label>
                      <Input 
                        id="inspection-evidence"
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        multiple 
                        onChange={(e) => {
                          if (e.target.files) {
                            setNewItemPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                        className="bg-background border-border"
                      />
                      {newItemPhotos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {newItemPhotos.map((p, i) => (
                            <div key={i} className="relative w-12 h-12 rounded overflow-hidden border border-border">
                              <Image src={URL.createObjectURL(p)} alt="Vista previa" fill sizes="48px" unoptimized className="object-cover" />
                              <button 
                                type="button" 
                                onClick={() => setNewItemPhotos(newItemPhotos.filter((_, index) => index !== i))}
                                className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center text-[10px]"
                              >
                                X
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Button onClick={handleAddInspection} variant="secondary" className="w-full" disabled={isLogging}>
                    {isLogging ? t('uploadingPhotos') || "Subiendo..." : t('logItem')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Button 
              size="lg" 
              className="h-14 w-full bg-primary font-bold text-primary-foreground hover:brightness-95"
              onClick={handleSubmitDiagnosis}
            >
              {t('submitDiagnosis')}
            </Button>
            </>
            )}

            {selectedJob.status === 'Approved' && (
              <Card className="app-card space-y-4 p-5 text-center sm:p-8">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-500">Reparación Autorizada</h2>
                <p className="text-muted-foreground">El cliente ha aprobado la cotización. Haga clic para comenzar la reparación.</p>
                <Button onClick={handleStartRepair} size="lg" className="mt-4 h-14 w-full bg-primary text-primary-foreground hover:brightness-95">
                  Iniciar Reparación
                </Button>
              </Card>
            )}

            {selectedJob.status === 'Repair' && (
              <Card className="app-card space-y-4 p-5 text-center sm:p-8">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Wand2 className="size-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Reparación en curso</h2>
                <p className="text-muted-foreground font-light text-sm max-w-md mx-auto">
                  Una vez finalizadas todas las tareas y reparaciones mecánicas, envíe el vehículo al área de Control de Calidad (QC) para su inspección final.
                </p>
                <Button onClick={handleSendToQC} size="lg" className="mt-4 h-auto min-h-14 w-full whitespace-normal bg-primary py-3 text-base font-semibold text-primary-foreground hover:brightness-95 sm:text-lg">
                  Finalizar Reparación y Enviar a QC
                </Button>
              </Card>
            )}

            {selectedJob.status === 'QC' && (
              <Card className="app-card space-y-4 p-8 text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Wand2 className="size-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">En Control de Calidad (QC)</h2>
                <p className="text-muted-foreground font-light text-sm max-w-md mx-auto">
                  El vehículo ha sido enviado a Control de Calidad. Pendiente de aprobación por un inspector o administrador para poder ser facturado y entregado.
                </p>
              </Card>
            )}
          </div>
        ) : (
          <div className="detail-placeholder">
            {t('selectVehicle')}
          </div>
        )}
      </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
