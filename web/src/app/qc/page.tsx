"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
  ArrowLeft,
  Loader2,
  Undo2,
  Check,
  ChevronRight,
  ListTodo,
} from "lucide-react";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { VehicleIcon } from "@/components/ui/vehicle-icons";

export default function QualityControlPage() {
  const router = useRouter();

  // Load all jobs currently in QC status, and also recently Ready/Repair jobs for history
  const { jobs, loading } = useRealtimeJobs({ all: true });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Rejection Dialog State
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // QC Inspector Checklist States
  const [checks, setChecks] = useState({
    symptomsResolved: false,
    torqueVerified: false,
    fluidsDoubleChecked: false,
    cleanlinessChecked: false,
    roadTestVerified: false,
  });
  const [inspectorNotes, setInspectorNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  // Reset checklist when selected job changes
  useEffect(() => {
    setChecks({
      symptomsResolved: false,
      torqueVerified: false,
      fluidsDoubleChecked: false,
      cleanlinessChecked: false,
      roadTestVerified: false,
    });
    setInspectorNotes("");
    setIsRejecting(false);
    setRejectionReason("");
  }, [selectedJobId]);

  // Set first job as selected by default if available
  useEffect(() => {
    if (qcPendingJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(qcPendingJobs[0].id);
    }
  }, [qcPendingJobs, selectedJobId]);

  const handlePassQC = async () => {
    if (!selectedJob) return;

    const allChecked = Object.values(checks).every((val) => val === true);
    if (!allChecked) {
      toast.error("Debe validar todos los puntos del checklist de Control de Calidad.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitQualityControl(selectedJob.id, {
        outcome: "pass",
        notes: inspectorNotes,
      });

      toast.success(result.status === "Delivered"
        ? `✅ Vehículo ${selectedJob.vehicleId} aprobado y entregado (pago completo)!`
        : `✅ Vehículo ${selectedJob.vehicleId} aprobado y listo para entrega!`
      );
      setSelectedJobId(null);
    } catch (error) {
      console.error("Error approving QC:", error);
      toast.error(error instanceof Error ? error.message : "Error al aprobar el control de calidad.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFailQC = async () => {
    if (!selectedJob) return;
    if (!rejectionReason.trim()) {
      toast.error("Por favor, ingrese el motivo del rechazo.");
      return;
    }

    setSubmitting(true);
    try {
      await submitQualityControl(selectedJob.id, {
        outcome: "fail",
        notes: rejectionReason,
      });

      toast.success(`❌ Vehículo ${selectedJob.vehicleId} rechazado. Retornado a reparación.`);
      setSelectedJobId(null);
      setIsRejecting(false);
    } catch (error) {
      console.error("Error rejecting QC:", error);
      toast.error(error instanceof Error ? error.message : "Error al registrar el rechazo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "ADVISOR", "TECHNICIAN"]}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="group gap-1.5 rounded-full border border-border bg-card/45 px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-300 hover:border-pink-500/50 hover:bg-pink-950/20 hover:text-pink-400"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                Inicio
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-pink-400 flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-pulse" />
                  Control de Calidad (QC)
                </h1>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Verificación final de reparaciones para garantizar la satisfacción y seguridad del cliente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-12 sm:ml-0">
              <Badge variant="outline" className="border-pink-500/50 text-pink-400 text-xs py-1 px-3 gap-1.5 bg-pink-950/20 backdrop-blur-md">
                <span className="w-2 h-2 bg-pink-500 rounded-full animate-ping" />
                Auditoría Activa
              </Badge>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Job Selection Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Search Box */}
              <Card className="glass-panel border-pink-500/10">
                <CardContent className="p-4">
                  <div className="relative">
                    <Input
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
              <Card className="glass-panel border-pink-500/15 overflow-hidden">
                <CardHeader className="bg-pink-950/15 border-b border-pink-500/10 py-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold text-pink-300 uppercase tracking-wider flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-pink-400" />
                      Pendientes de Aprobación
                    </CardTitle>
                    <Badge variant="secondary" className="bg-pink-500/20 text-pink-300 font-bold border-none">
                      {qcPendingJobs.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-2 max-h-[350px] overflow-y-auto space-y-1 divide-y divide-border/20">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
                      <p className="text-xs text-muted-foreground">Cargando órdenes...</p>
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
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center justify-between border ${
                          selectedJobId === job.id
                            ? "bg-pink-950/30 border-pink-500/40 text-foreground shadow-[0_0_15px_rgba(244,63,94,0.06)]"
                            : "border-transparent text-muted-foreground hover:bg-zinc-800/40 hover:text-foreground"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            <VehicleIcon type={job.vehicleType} className={`w-4 h-4 shrink-0 ${selectedJobId === job.id ? 'text-pink-400' : 'text-muted-foreground'}`} />
                            {job.vehicleId}
                          </p>
                          <p className="text-xs truncate mt-0.5">{job.clientId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-pink-500/30 text-pink-400 bg-pink-950/10">
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
              <Card className="glass-panel border-pink-500/10">
                <CardHeader className="py-3.5 border-b border-border/40">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                        className="flex items-center justify-between p-2.5 bg-zinc-950/20 rounded-lg border border-border/30 text-xs"
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

                  <Card className="glass-panel border-pink-500/20 overflow-hidden relative">
                    <div className="h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500" />
                  
                  {/* Rejection Overlay Sub-View */}
                  {isRejecting ? (
                    <CardContent className="p-6 space-y-6">
                      <div className="flex items-center gap-3 text-rose-400 border-b border-rose-500/20 pb-4">
                        <Undo2 className="w-6 h-6 animate-pulse" />
                        <div>
                          <h2 className="text-lg font-bold">Rechazar Control de Calidad</h2>
                          <p className="text-xs text-muted-foreground">La orden volverá al técnico para corregir los problemas indicados.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
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

                        <div className="flex gap-3 justify-end pt-4">
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
                            disabled={submitting || !rejectionReason.trim()}
                          >
                            {submitting ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                            ) : (
                              "Confirmar Rechazo y Enviar a Técnico"
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
                          
                          <Badge variant="outline" className="w-fit border-pink-500/40 text-pink-400 bg-pink-950/20 text-xs px-2.5 py-1 font-semibold">
                            CÓDIGO: {selectedJob.id.substring(0, 8).toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="p-6 space-y-6">
                        {/* Reported Symptoms */}
                        {selectedJob.symptoms && (
                          <div className="bg-zinc-950/40 border border-border/50 rounded-xl p-4 space-y-1.5">
                            <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
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
                                  className="flex items-center gap-2 p-2.5 bg-zinc-950/20 rounded-lg border border-border/40 text-xs"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="text-foreground font-medium truncate">{item.name}</span>
                                  {item.price && (
                                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                                      ${item.price.toFixed(2)}
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
                          <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ListTodo className="w-3.5 h-3.5" />
                            Checklist de Control de Calidad (Auditoría)
                          </h4>

                          <div className="space-y-3">
                            {/* Check 1 */}
                            <div className="flex items-center justify-between p-3.5 bg-zinc-950/20 border border-border/30 rounded-xl transition-all hover:border-pink-500/30">
                              <div className="space-y-0.5 pr-4">
                                <Label className="text-sm font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                                  Síntomas Resueltos
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Verificado y confirmado que el problema reportado por el cliente ha sido solucionado por completo.
                                </p>
                              </div>
                              <Switch
                                checked={checks.symptomsResolved}
                                onCheckedChange={(val) => setChecks({ ...checks, symptomsResolved: val })}
                              />
                            </div>

                            {/* Check 2 */}
                            <div className="flex items-center justify-between p-3.5 bg-zinc-950/20 border border-border/30 rounded-xl transition-all hover:border-pink-500/30">
                              <div className="space-y-0.5 pr-4">
                                <Label className="text-sm font-semibold text-foreground cursor-pointer">
                                  Seguridad y Ajustes Mecánicos
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Ajustes críticos y torques de componentes de seguridad (ruedas, frenos, suspensión) confirmados correctos.
                                </p>
                              </div>
                              <Switch
                                checked={checks.torqueVerified}
                                onCheckedChange={(val) => setChecks({ ...checks, torqueVerified: val })}
                              />
                            </div>

                            {/* Check 3 */}
                            <div className="flex items-center justify-between p-3.5 bg-zinc-950/20 border border-border/30 rounded-xl transition-all hover:border-pink-500/30">
                              <div className="space-y-0.5 pr-4">
                                <Label className="text-sm font-semibold text-foreground cursor-pointer">
                                  Fluidos y Fugas
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Niveles de aceites, refrigerante y fluidos hidráulicos en su punto exacto. Cero fugas visibles.
                                </p>
                              </div>
                              <Switch
                                checked={checks.fluidsDoubleChecked}
                                onCheckedChange={(val) => setChecks({ ...checks, fluidsDoubleChecked: val })}
                              />
                            </div>

                            {/* Check 4 */}
                            <div className="flex items-center justify-between p-3.5 bg-zinc-950/20 border border-border/30 rounded-xl transition-all hover:border-pink-500/30">
                              <div className="space-y-0.5 pr-4">
                                <Label className="text-sm font-semibold text-foreground cursor-pointer">
                                  Estética y Limpieza
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Vehículo libre de marcas de grasa, interior limpio, repuestos viejos colocados de manera ordenada en la maletera.
                                </p>
                              </div>
                              <Switch
                                checked={checks.cleanlinessChecked}
                                onCheckedChange={(val) => setChecks({ ...checks, cleanlinessChecked: val })}
                              />
                            </div>

                            {/* Check 5 */}
                            <div className="flex items-center justify-between p-3.5 bg-zinc-950/20 border border-border/30 rounded-xl transition-all hover:border-pink-500/30">
                              <div className="space-y-0.5 pr-4">
                                <Label className="text-sm font-semibold text-foreground cursor-pointer">
                                  Prueba de Ruta Validada
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  El vehículo se maneja estable, frena sin ruidos, y no presenta alertas ni testigos activos en el tablero.
                                </p>
                              </div>
                              <Switch
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

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
                          <Button
                            variant="outline"
                            onClick={() => setIsRejecting(true)}
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
                              !Object.values(checks).every((val) => val === true)
                            }
                          >
                            {submitting ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                            ) : (
                              <><ShieldCheck className="w-4 h-4 mr-2" /> Aprobar y Marcar Listo para Entrega</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </>
                  )}
                  </Card>
                </div>
              ) : (
                <div className="h-[500px] flex flex-col items-center justify-center bg-secondary/30 dark:bg-zinc-950/20 border border-border/60 border-dashed rounded-xl p-8 text-center text-muted-foreground gap-4">
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
