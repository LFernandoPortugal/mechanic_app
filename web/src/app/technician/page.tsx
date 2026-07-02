"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Wand2, MessageCircle, Mic, MicOff, Loader2, Bot, AlertTriangle, CheckCircle } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { openWhatsAppStatusUpdate } from "@/lib/whatsapp";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useRealtimeJobs } from "@/hooks/useRealtimeJobs";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { VehicleIcon } from "@/components/ui/vehicle-icons";

const STATUS_MAP: Record<string, string> = {
  Pass: 'statusPass',
  Fail: 'statusFail',
  Critical: 'statusCritical',
  Recommended: 'statusRecommended',
};

export default function TechnicianDashboard() {
  const { t } = useLanguage();
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
    } catch (e) {
      toast.error("Error uploading evidence");
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
    } catch (err: any) {
      setAiError(err.message || "Error al ejecutar el diagnóstico.");
      toast.error("Error de IA: " + (err.message || "Desconocido"));
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
      }, user?.uid || "unknown", "Diagnosis Submitted");
      setSubmittedJob(selectedJob);  // save for WhatsApp
      setSubmittedJobId(selectedJob.vehicleId);
      setSelectedJob(null);
      // Real-time listener handles refresh automatically
    } catch (e) {
      toast.error("Error saving: " + e);
    }
  };

  const handleStartRepair = async () => {
    if (!selectedJob) return;
    try {
      await updateJob(selectedJob.id, { status: "Repair" }, user?.uid || "unknown", "Repair Started");
      toast.success("Reparación iniciada");
      setSelectedJob({ ...selectedJob, status: "Repair" } as Job);
      // Real-time listener handles refresh automatically
    } catch (e) {
      toast.error("Error: " + e);
    }
  };

  const handleSendToQC = async () => {
    if (!selectedJob) return;
    try {
      await updateJob(selectedJob.id, { status: "QC" }, user?.uid || "unknown", "Sent to QC");
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
        <div className="min-h-screen page-bg flex items-center justify-center p-4">
          <Card className="glass-panel text-center max-w-md w-full p-8 border-orange-500/50">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wand2 className="w-8 h-8 text-orange-500 dark:text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-orange-500 dark:text-orange-400 mb-2">{t('diagnosisSubmitted')}</h2>
            <p className="text-muted-foreground mb-8">{t('vehicleReadyForQuoting').replace('{id}', submittedJobId)}</p>
            <div className="space-y-3">
               {/* WhatsApp notify — only if phone is stored */}
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
               <Button onClick={() => router.push('/advisor')} className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg text-white">
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

  // Helper: human-readable relative date
  const formatJobTime = (date: any): string => {
    if (!date) return '';
    const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
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
    Diagnosis: 'text-blue-400 border-blue-500/60',
    Approval: 'text-violet-400 border-violet-500/60',
    Approved: 'text-emerald-400 border-emerald-500/60',
    Repair: 'text-orange-400 border-orange-500/60',
    QC: 'text-teal-400 border-teal-500/60',
    Ready: 'text-cyan-400 border-cyan-500/60',
    Delivered: 'text-gray-400 border-gray-500/60',
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6 flex justify-center">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Sidebar: Job List (3/12 = 25%) */}
      <div className="lg:col-span-3 flex flex-col">
        <header className="mb-6 flex flex-col gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="group self-start gap-1.5 rounded-full border border-border bg-card/45 px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-300 hover:border-orange-500/50 hover:bg-orange-950/20 hover:text-orange-400"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Inicio
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-orange-500 dark:text-orange-400">{t('technicianBay')}</h1>
            <p className="text-muted-foreground text-xs">{t('assignedVehicles')}</p>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {jobs.length} orden{jobs.length !== 1 ? 'es' : ''} activa{jobs.length !== 1 ? 's' : ''}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 'calc(100vh - 160px)' }}>
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
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    isActive
                      ? 'border-orange-500 bg-orange-950/20 shadow-[0_0_12px_rgba(249,115,22,0.18)]'
                      : 'border-border bg-card/60 hover:border-accent hover:bg-accent/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <VehicleIcon type={job.vehicleType} className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="font-semibold text-sm truncate text-foreground">{job.vehicleId}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{job.clientId || '—'}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] px-1.5 py-0 font-medium ${statusColor}`}
                    >
                      {t(`status${job.status}` as any) || job.status}
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
      <div className="lg:col-span-9">
        {selectedJob ? (
          <div className="space-y-6">
            {/* Glowing Stepper Guidance */}
            <WorkflowStepper currentStatus={selectedJob.status === "Reception" ? "Diagnosis" : selectedJob.status} />

            {/* Vehicle Info & Symptoms Header */}
            <Card className="glass-panel border-l-4 border-l-orange-500">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <VehicleIcon type={selectedJob.vehicleType} className="w-5 h-5 text-muted-foreground shrink-0" />
                    <Badge className="bg-orange-950/40 text-orange-400 border border-orange-500/30 font-mono text-sm">
                      {selectedJob.vehicleId}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      {selectedJob.clientId}
                    </span>
                  </div>
                  {selectedJob.symptoms ? (
                    <div className="text-sm text-muted-foreground italic mt-2 bg-zinc-950/30 dark:bg-black/20 p-3 rounded border border-border/40">
                      <strong className="text-xs text-orange-400 not-italic block uppercase tracking-wider mb-1">
                        {t('symptomsLabel') || "Síntomas Reportados por el Cliente / Motivo:"}
                      </strong>
                      "{selectedJob.symptoms}"
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
            <Card className="glass-panel">
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle>{t('diagnosisAndInspections')}</CardTitle>
                  <CardDescription>{t('addItemsToReview')}</CardDescription>
                </div>
                <Button
                  onClick={handleAutoDiagnose}
                  disabled={aiLoading || Boolean(aiDiagnosis)}
                  variant="outline"
                  className="text-orange-500 dark:text-orange-400 border-orange-500/50 hover:bg-orange-50 dark:hover:bg-orange-950/30 flex-shrink-0"
                >
                  {aiLoading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analizando…</>
                    : aiDiagnosis
                      ? <><CheckCircle className="w-4 h-4 mr-2 text-emerald-400" /><span className="hidden sm:inline">Diagnóstico Listo</span><span className="sm:hidden text-xs">Listo</span></>
                      : <><Bot className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Diagnóstico IA</span><span className="sm:hidden text-xs">IA</span></>}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                
                  {/* AI Streaming Output Panel */}
                  {(aiLoading || aiDiagnosis || aiError) && (
                    <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-4 space-y-2">
                      <p className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" />
                        Análisis IA {aiLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      </p>
                      {aiError ? (
                        <div className="flex items-start gap-2 text-red-400 text-sm">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {aiError}
                        </div>
                      ) : (
                        <pre className="text-xs text-orange-200/80 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                          {aiDiagnosis || "Iniciando análisis…"}
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
                        item.status === 'Recommended' ? 'bg-blue-600' : '';
                      return (
                        <div key={item.id} className="p-3 bg-secondary/50 dark:bg-black/40 border border-border rounded flex justify-between items-start">
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                            {item.mediaUrls && item.mediaUrls.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {item.mediaUrls.map((url, idx) => (
                                  <img key={idx} src={url} alt="Evidencia" className="w-12 h-12 object-cover rounded border border-border" />
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

                <div className="bg-secondary/50 dark:bg-black/40 p-4 rounded-lg border border-border space-y-4">
                  <h3 className="font-semibold text-foreground">{t('addInspectionItem')}</h3>
                  
                  <div className="space-y-2">
                    <Label>{t('componentDetail')}</Label>
                    <div className="flex gap-2">
                      <Input 
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
                      <p className="text-xs text-orange-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                        Grabando... hable con claridad en español
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t('statusTitle')}</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(['Pass', 'Recommended', 'Fail', 'Critical'] as const).map(status => (
                        <Button
                          key={status}
                          variant={newItemStatus === status ? "default" : "outline"}
                          className={`
                            ${newItemStatus === status && status === 'Pass' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                            ${newItemStatus === status && status === 'Fail' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                            ${newItemStatus === status && status === 'Critical' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                            ${newItemStatus === status && status === 'Recommended' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                            ${newItemStatus !== status ? 'border-border text-muted-foreground' : ''}
                          `}
                          onClick={() => setNewItemStatus(status)}
                        >
                          {t(STATUS_MAP[status])}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('technicianNotes')}</Label>
                    <Textarea 
                      value={newItemNotes} 
                      onChange={e => setNewItemNotes(e.target.value)} 
                      className="bg-background border-border"
                      placeholder={t('addDetails')}
                    />
                  </div>

                  {newItemStatus !== 'Pass' && (
                    <div className="space-y-2">
                      <Label>Evidencia Fotográfica (Opcional)</Label>
                      <Input 
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
                              <img src={URL.createObjectURL(p)} alt="preview" className="object-cover w-full h-full" />
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
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-14"
              onClick={handleSubmitDiagnosis}
            >
              {t('submitDiagnosis')}
            </Button>
            </>
            )}

            {selectedJob.status === 'Approved' && (
              <Card className="glass-panel p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-500">Reparación Autorizada</h2>
                <p className="text-muted-foreground">El cliente ha aprobado la cotización. Haga clic para comenzar la reparación.</p>
                <Button onClick={handleStartRepair} size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4 h-14">
                  Iniciar Reparación
                </Button>
              </Card>
            )}

            {selectedJob.status === 'Repair' && (
              <Card className="glass-panel p-8 text-center space-y-4 border-orange-500/50">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-orange-500">Reparación en Curso</h2>
                <p className="text-muted-foreground font-light text-sm max-w-md mx-auto">
                  Una vez finalizadas todas las tareas y reparaciones mecánicas, envíe el vehículo al área de Control de Calidad (QC) para su inspección final.
                </p>
                <Button onClick={handleSendToQC} size="lg" className="w-full bg-orange-600 hover:bg-orange-700 text-white mt-4 h-14 font-semibold text-lg transition-all duration-300">
                  Finalizar Reparación y Enviar a QC
                </Button>
              </Card>
            )}

            {selectedJob.status === 'QC' && (
              <Card className="glass-panel p-8 text-center space-y-4 border-teal-500/30">
                <div className="w-16 h-16 bg-teal-100 dark:bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Wand2 className="w-8 h-8 text-teal-500" />
                </div>
                <h2 className="text-2xl font-bold text-teal-500">En Control de Calidad (QC)</h2>
                <p className="text-muted-foreground font-light text-sm max-w-md mx-auto">
                  El vehículo ha sido enviado a Control de Calidad. Pendiente de aprobación por un inspector o administrador para poder ser facturado y entregado.
                </p>
              </Card>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-secondary/50 dark:bg-zinc-900/50 border border-border border-dashed rounded-xl p-8 text-center text-muted-foreground">
            {t('selectVehicle')}
          </div>
        )}
      </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
