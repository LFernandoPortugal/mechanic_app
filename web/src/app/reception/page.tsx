"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createJob, getJobsByVehicleId, getWorkshopSettings } from "@/lib/db";
import {
  MAX_RECEPTION_PHOTOS,
  MAX_SIGNATURE_DATA_URL_CHARS,
  MAX_SOURCE_IMAGE_BYTES,
  uploadJobImage,
} from "@/lib/storage";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { CircleHelp, Wand2, Fuel } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useLanguage } from "@/contexts/LanguageContext";
import { Job, VehicleType } from "@/types";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import VehicleTypeSelector from "@/components/ui/VehicleTypeSelector";
import { toDate } from "@/lib/dates";

export default function Reception() {
  const { t, lang } = useLanguage();
  const { user, userProfile } = useAuth();
  
  const [vehicle, setVehicle] = useState<{ vin: string; make: string; model: string; plate: string; color: string; type: VehicleType }>({ vin: "", make: "", model: "", plate: "", color: "", type: "auto" });
  const [client, setClient] = useState({ name: "", phone: "", email: "" });
  const [fluids, setFluids] = useState({ oil: "OK", coolant: "OK", brake: "OK" });
  const [valuables, setValuables] = useState({ lockNut: false, sunglasses: false, documents: false, other: "" });
  const [fuelLevel, setFuelLevel] = useState(50);
  const [odometer, setOdometer] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [pastJobs, setPastJobs] = useState<Job[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadSettings() {
      try {
        const wId = userProfile?.workshopId || null;
        if (!wId) return;
        const settings = await getWorkshopSettings(wId);
        if (settings && settings.demoMode) {
          setDemoMode(true);
        }
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    }
    loadSettings();
  }, [userProfile]);

  useEffect(() => {
    if (!vehicle.plate || vehicle.plate.trim().length < 3 || !userProfile?.workshopId) {
      setPastJobs([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setLoadingHistory(true);
      try {
        const jobs = await getJobsByVehicleId(userProfile.workshopId, vehicle.plate.trim());
        setPastJobs(jobs);
      } catch (e) {
        console.error("Error fetching vehicle history:", e);
      } finally {
        setLoadingHistory(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [vehicle.plate, userProfile?.workshopId]);

  const handleLoadPreviousInfo = () => {
    if (pastJobs.length === 0) return;
    const last = pastJobs[0];
    setVehicle((prev) => ({
      ...prev,
      vin: last.vin || prev.vin,
      make: last.make || prev.make,
      model: last.model || prev.model,
      color: last.color || prev.color,
      type: last.vehicleType || prev.type,
    }));
    setClient({
      name: last.clientId || "",
      phone: last.clientPhone || "",
      email: last.clientEmail || "",
    });
    toast.success("Información del cliente y vehículo auto-completada");
  };

  const handleAutoFill = () => {
    setVehicle({ vin: "1HGBH41JXMN109186", make: "Toyota", model: "Corolla", plate: "ABC-123", color: "Rojo", type: "auto" });
    setClient({ name: "Juan Perez", phone: "555-0102", email: "juan@example.com" });
    setFluids({ oil: "OK", coolant: "OK", brake: "LOW" });
    setValuables({ lockNut: true, sunglasses: true, documents: false, other: "" });
    setFuelLevel(75);
    setOdometer("120500");
    setSymptoms("Chirrido metálico en la rueda delantera al frenar y pérdida leve de potencia en pendientes.");
  };

  const handleSubmit = async () => {
    if (!vehicle.plate || !vehicle.make) {
      toast.warning(t('alertPlateRequired'));
      return;
    }
    if (!client.name) {
      toast.warning(t('alertClientRequired'));
      return;
    }
    if (!symptoms.trim()) {
      toast.warning(t('symptomsLabel') || "Por favor ingrese el motivo de ingreso / síntomas reportados.");
      return;
    }
    if (!signatureDataUrl) {
      toast.warning(t('alertSignatureRequired'));
      return;
    }
    if (signatureDataUrl.length > MAX_SIGNATURE_DATA_URL_CHARS) {
      toast.error("La firma es demasiado grande. Límpiala y vuelve a firmar.");
      return;
    }

    // Non-blocking warning: WhatsApp updates require phone
    if (!client.phone.trim()) {
      toast.warning(t('alertNoPhoneWhatsApp'), { duration: 4000 });
    }

    if (!userProfile?.workshopId || !user?.uid) {
      toast.error("La sesión no tiene un taller operativo asociado.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Compress photos to base64 (client-side, instant)
      const photoBase64s: string[] = [];
      if (photos.length > 0) {
        toast.info(t('uploadingPhotos') || "Procesando fotos...");
        for (const file of photos) {
          const b64 = await uploadJobImage(file, "temp", "reception");
          photoBase64s.push(b64);
        }
      }

      // 2. Create the job with everything inline — no secondary updates needed
      await createJob({
        workshopId: userProfile.workshopId,
        vehicleId: vehicle.plate,
        vin: vehicle.vin.trim() || undefined,
        make: vehicle.make.trim() || undefined,
        model: vehicle.model.trim() || undefined,
        color: vehicle.color.trim() || undefined,
        vehicleType: vehicle.type,
        clientId: client.name,
        clientPhone: client.phone.trim() || undefined,
        clientEmail: client.email.trim() || undefined,
        advisorId: user.uid,
        status: 'Reception',
        symptoms: symptoms.trim() || undefined,
        signatureBase64: signatureDataUrl,
        receptionImages: photoBase64s.length > 0 ? photoBase64s : undefined,
        fluidAudit: {
          oilLevel: fluids.oil === "OK" ? "OK" : "Low",
          coolantLevel: fluids.coolant === "OK" ? "OK" : "Low",
          brakeFluid: fluids.brake === "OK" ? "OK" : "Low",
          notes: "",
        },
        valuables: {
          lockNutKey: valuables.lockNut,
          sunglasses: valuables.sunglasses,
          documents: valuables.documents,
          other: valuables.other || "",
        },
        startingFuel: fuelLevel,
        odometer: parseInt(odometer) || 0,
        inspectionItems: [],
        declinedItems: [],
        totalEstimate: 0,
        approvedAmount: 0,
      }, user.uid);

      setCreatedJobId(vehicle.plate);
      toast.success(t('receptionComplete') || "¡Recepción completada!");
    } catch (e) {
      console.error(e);
      toast.error("Error creating job: " + e);
    } finally {
      setSubmitting(false);
    }
  };

  const fluidConfig = [
    { key: "oil", labelKey: "oilLevel" },
    { key: "coolant", labelKey: "coolantLevel" },
    { key: "brake", labelKey: "brakeLevel" },
  ];

  if (createdJobId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="app-card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Wand2 className="size-8 text-primary" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">{t('receptionComplete')}</h2>
          <p className="text-muted-foreground mb-8">{t('vehicleQueued').replace('{id}', createdJobId)}</p>
          <div className="space-y-3">
             <Button onClick={() => router.push('/technician')} className="h-12 w-full bg-primary text-primary-foreground hover:brightness-95">
                {t('goToTechnician')}
             </Button>
             <Button onClick={() => { setCreatedJobId(null); setVehicle({ vin: "", make: "", model: "", plate: "", color: "", type: "auto" }); setClient({ name: "", phone: "", email: "" }); setSignatureDataUrl(null); setOdometer(""); setFuelLevel(50); setPhotos([]); }} variant="outline" className="w-full border-border text-muted-foreground h-10">
                {t('registerAnother')}
             </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'RECEPTION']}>
      <div className="flex justify-center text-foreground">
        <div className="w-full max-w-4xl space-y-6">
          <div className="space-y-4">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">01 · Reception</p>
                  <h1 className="page-title">{t('vehicleReception')}</h1>
                  <p className="text-muted-foreground text-xs">{t('transferOfResponsibility')}</p>
                </div>
                <Link href="/help#reception" className="tool-button sm:hidden" aria-label={lang === "es" ? "Ayuda" : "Help"}><CircleHelp size={18}/></Link>
              </div>
              <div className="flex items-center gap-2"><Link href="/help#reception" className="app-button-secondary hidden gap-2 sm:inline-flex"><CircleHelp size={17}/>{lang === "es" ? "Ayuda" : "Help"}</Link>{demoMode && (
                <Button type="button" onClick={handleAutoFill} variant="outline" className="text-amber-500 dark:text-amber-400 border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 self-start sm:self-center ml-10 sm:ml-0">
                  <Wand2 className="w-4 h-4 mr-2" />
                  {t('demoAutoFill')}
                </Button>
              )}</div>
            </header>

            {/* Glowing Stepper Guidance */}
            <WorkflowStepper currentStatus="Reception" />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
            {/* Vehicle Details */}
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-lg">{t('vehicleDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-plate">{t('licensePlate')} *</Label>
                    <Input 
                      id="vehicle-plate"
                      required
                      placeholder="ABC-123" 
                      className="bg-background border-border" 
                      value={vehicle.plate}
                      onChange={(e) => setVehicle({...vehicle, plate: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-vin">{t('vinLabel')}</Label>
                    <Input id="vehicle-vin" placeholder={t('scanOrType')} value={vehicle.vin} onChange={(e) => setVehicle({...vehicle, vin: e.target.value})} className="bg-background border-border" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div className="space-y-2">
                    <Label htmlFor="vehicle-make">{t('make')} *</Label>
                    <Input id="vehicle-make" required placeholder="Toyota" value={vehicle.make} onChange={(e) => setVehicle({...vehicle, make: e.target.value})} className="bg-background border-border" />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="vehicle-model">{t('model')}</Label>
                    <Input id="vehicle-model" placeholder="Corolla" value={vehicle.model} onChange={(e) => setVehicle({...vehicle, model: e.target.value})} className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-color">{t('colorLabel')}</Label>
                    <Input id="vehicle-color" placeholder={t('colorPlaceholder')} value={vehicle.color} onChange={(e) => setVehicle({...vehicle, color: e.target.value})} className="bg-background border-border" />
                  </div>
                </div>
                {pastJobs.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLoadPreviousInfo}
                    className="mt-2 h-10 w-full gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                  >
                    <Wand2 className="size-4 text-primary" />
                    Auto-completar datos de {pastJobs[0].clientId}
                  </Button>
                )}

                <div className="pt-4 border-t border-border/40">
                  <VehicleTypeSelector
                    value={vehicle.type}
                    onChange={(type) => setVehicle({ ...vehicle, type })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-lg">{t('clientInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-name">{t('clientName')} *</Label>
                    <Input id="client-name" required placeholder={t('clientNamePlaceholder')} value={client.name} onChange={(e) => setClient({...client, name: e.target.value})} className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-phone">{t('clientPhone')}</Label>
                    <Input id="client-phone" type="tel" autoComplete="tel" placeholder="555-0102" value={client.phone} onChange={(e) => setClient({...client, phone: e.target.value})} className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-email">{t('clientEmail')}</Label>
                    <Input id="client-email" type="email" autoComplete="email" placeholder="email@ejemplo.com" value={client.email} onChange={(e) => setClient({...client, email: e.target.value})} className="bg-background border-border" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Condition - Odometer + Fuel */}
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-lg">{t('vehicleCondition')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="odometer">{t('odometer')} (km)</Label>
                      <Input 
                        id="odometer"
                        type="number" 
                        placeholder="120500" 
                        value={odometer} 
                        onChange={(e) => setOdometer(e.target.value)} 
                        className="bg-background border-border font-mono text-base" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fuel-slider">{t('fuelLevel')}: {fuelLevel}%</Label>
                      <input 
                        id="fuel-slider"
                        type="range"
                        value={fuelLevel} 
                        onChange={(e) => setFuelLevel(parseInt(e.target.value))} 
                        min={0} max={100} step={5}
                        className="mt-3 w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>E</span>
                        <span>1/4</span>
                        <span>1/2</span>
                        <span>3/4</span>
                        <span>F</span>
                      </div>
                    </div>
                  </div>

                  {/* Circular Dashboard Fuel Gauge */}
                  <div className="flex flex-col items-center justify-center p-4 border border-border/40 bg-zinc-950/5 dark:bg-black/20 rounded-2xl relative shadow-inner">
                    <div className="relative w-36 h-36">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Outer track */}
                        <circle 
                          cx="50" cy="50" r="40" 
                          fill="none" stroke="currentColor" strokeWidth="6" 
                          strokeDasharray="251.2" strokeDashoffset="0"
                          className="text-secondary" 
                        />
                        {/* Dynamic glow fill ring */}
                        <circle 
                          cx="50" cy="50" r="40" 
                          fill="none" 
                          stroke={fuelLevel <= 15 ? "#ef4444" : fuelLevel <= 40 ? "#f59e0b" : "#10b981"} 
                          strokeWidth="7" 
                          strokeDasharray="251.2" 
                          strokeDashoffset={251.2 - (251.2 * fuelLevel) / 100}
                          strokeLinecap="round"
                          className="transition-colors duration-200"
                        />
                      </svg>
                      {/* Centered Gauge display */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <Fuel className={`mb-1 size-5 ${fuelLevel <= 15 ? 'text-destructive' : fuelLevel <= 40 ? 'text-warning' : 'text-success'}`} />
                        <span className="text-2xl font-black font-mono tracking-tighter text-foreground">
                          {fuelLevel}%
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">
                          {fuelLevel <= 15 ? 'Reserva' : fuelLevel <= 40 ? 'Bajo' : 'Combustible'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Symptoms / Reason for Entry */}
            <Card className="app-card border-l-4 border-l-amber-500">
              <CardHeader>
                <CardTitle id="reception-symptoms-label" className="text-lg">{t('symptomsLabel') || "Motivo de Ingreso / Síntomas Reportados *"}</CardTitle>
                <CardDescription id="reception-symptoms-description">
                  Describe detalladamente la falla o solicitud del cliente para alimentar la IA de diagnóstico.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  id="reception-symptoms"
                  aria-labelledby="reception-symptoms-label"
                  aria-describedby="reception-symptoms-description"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder={t('symptomsPlaceholder') || "ej. El motor pierde potencia al subir pendientes o chirría al frenar..."}
                  className="w-full min-h-[100px] bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans resize-y"
                  required
                />
              </CardContent>
            </Card>

            {/* Clinical History Timeline */}
            {vehicle.plate.trim().length >= 3 && (
              <Card className="app-card border-l-4 border-l-primary transition-all">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>{t('vehicleHistory')}</span>
                      {loadingHistory && <span className="animate-spin text-primary">⏳</span>}
                    </span>
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 font-mono text-primary">
                      {vehicle.plate}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Verifica si este cliente ha ingresado previamente y por qué problemas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                      <span>{t('processing') || "Cargando historial..."}</span>
                    </div>
                  ) : pastJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 italic">{t('noPreviousRepairs')}</p>
                  ) : (
                    <div className="relative ml-3 space-y-6 border-l-2 border-primary/25 py-2 pl-5">
                      {pastJobs.map((job) => {
                        const date = toDate(job.createdAt)?.toLocaleDateString() || "N/A";
                        return (
                          <div key={job.id} className="relative">
                            {/* Dot */}
                            <div className="absolute -left-[27px] top-1.5 size-3.5 rounded-full border border-background bg-primary" />
                            
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-sm text-foreground">{date}</span>
                                <Badge className="border-primary/30 bg-primary/10 text-xs text-primary">
                                  {t(`status${job.status}`) || job.status}
                                </Badge>
                              </div>
                              {job.symptoms && (
                                <p className="text-sm text-muted-foreground bg-zinc-950/30 dark:bg-black/20 p-2 rounded border border-border/40 mt-1 italic">
                                  <strong className="mb-0.5 block text-xs font-semibold text-primary">Motivo:</strong>
                                  &ldquo;{job.symptoms}&rdquo;
                                </p>
                              )}
                              {job.inspectionItems && job.inspectionItems.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  <strong className="text-primary">Componentes: </strong>
                                  {job.inspectionItems.map(item => `${item.name} (${item.status})`).join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Existing Damages (Photos) */}
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-lg flex justify-between items-center">
                  Evidencia Visual (Daños Previos)
                  <Badge variant="outline" className="text-amber-500 border-amber-500">Legal Shield</Badge>
                </CardTitle>
                <CardDescription>Tomas fotográficas para proteger al taller de reclamos.</CardDescription>
              </CardHeader>
              <CardContent>
                <Label className="block mb-2 text-muted-foreground cursor-pointer" htmlFor="reception-camera">
                  Capturar Foto o Elegir Archivo
                </Label>
                <p className="mb-2 text-xs text-muted-foreground">Máximo 4 fotos; se comprimen antes de guardar la orden.</p>
                <Input 
                  id="reception-camera"
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  multiple 
                  onChange={(e) => {
                    if (e.target.files) {
                      const selected = Array.from(e.target.files).filter((file) => {
                        if (!file.type.startsWith("image/")) {
                          toast.warning(`${file.name}: el archivo no es una imagen.`);
                          return false;
                        }
                        if (file.size > MAX_SOURCE_IMAGE_BYTES) {
                          toast.warning(`${file.name}: supera el límite de 15 MB.`);
                          return false;
                        }
                        return true;
                      });
                      setPhotos((prev) => {
                        const available = Math.max(0, MAX_RECEPTION_PHOTOS - prev.length);
                        if (selected.length > available) {
                          toast.warning(`Puedes adjuntar como máximo ${MAX_RECEPTION_PHOTOS} fotos.`);
                        }
                        return [...prev, ...selected.slice(0, available)];
                      });
                      e.target.value = "";
                    }
                  }}
                  className="bg-background border-border"
                />
                
                {photos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-16 h-16 rounded overflow-hidden border border-border">
                        <Image src={URL.createObjectURL(p)} alt="Vista previa" fill sizes="64px" unoptimized className="object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setPhotos(photos.filter((_, index) => index !== i))}
                          aria-label={`Eliminar foto ${i + 1}`}
                          className="absolute top-1 right-1 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fluid Audit */}
            <Card className="app-card border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-lg flex justify-between items-center">
                  {t('fluidAudit')}
                  <Badge variant="outline" className="text-emerald-500 dark:text-emerald-400 border-emerald-500 dark:border-emerald-400">{t('mandatory')}</Badge>
                </CardTitle>
                <CardDescription>{t('verifyLevels')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fluidConfig.map((fluid) => (
                  <div key={fluid.key} className="flex items-center justify-between p-3 bg-secondary/50 dark:bg-zinc-950 rounded-lg border border-border">
                    <span className="font-medium text-foreground">{t(fluid.labelKey)}</span>
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        size="sm" 
                        variant={fluids[fluid.key as keyof typeof fluids] === "OK" ? "default" : "outline"}
                        aria-label={`${t(fluid.labelKey)}: OK`}
                        aria-pressed={fluids[fluid.key as keyof typeof fluids] === "OK"}
                        className={fluids[fluid.key as keyof typeof fluids] === "OK" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-border"}
                        onClick={() => setFluids({...fluids, [fluid.key]: "OK"})}
                      >
                        OK
                      </Button>
                      <Button 
                        type="button"
                        size="sm" 
                        variant={fluids[fluid.key as keyof typeof fluids] !== "OK" ? "destructive" : "outline"}
                        aria-label={`${t(fluid.labelKey)}: LOW`}
                        aria-pressed={fluids[fluid.key as keyof typeof fluids] !== "OK"}
                        className={fluids[fluid.key as keyof typeof fluids] !== "OK" ? "" : "border-border"}
                        onClick={() => setFluids({...fluids, [fluid.key]: "LOW"})}
                      >
                        LOW
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Valuables */}
            <Card className="app-card">
              <CardHeader>
                <CardTitle className="text-lg">{t('valuablesCheck')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="locknut">{t('lockNutKey')}</Label>
                  <Switch id="locknut" checked={valuables.lockNut} onCheckedChange={(c) => setValuables({...valuables, lockNut: c})} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sunglasses">{t('sunglasses')}</Label>
                  <Switch id="sunglasses" checked={valuables.sunglasses} onCheckedChange={(c) => setValuables({...valuables, sunglasses: c})} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="documents">{t('documentsInVehicle')}</Label>
                  <Switch id="documents" checked={valuables.documents} onCheckedChange={(c) => setValuables({...valuables, documents: c})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other-valuables">{t('otherValuables')}</Label>
                  <Input id="other-valuables" placeholder={t('otherValuablesPlaceholder')} value={valuables.other} onChange={(e) => setValuables({...valuables, other: e.target.value})} className="bg-background border-border" />
                </div>
              </CardContent>
            </Card>

            {/* Liability Transfer — Real Signature Canvas */}
            <Card className="app-card border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-lg">{t('liabilityTransfer')}</CardTitle>
                <CardDescription>
                  {t('clientConfirms')}{" "}
                  <span className="font-medium text-primary">Firma digital legal.</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignatureCanvas
                  onConfirm={(dataUrl) => setSignatureDataUrl(dataUrl)}
                  onClear={() => setSignatureDataUrl(null)}
                />
              </CardContent>
            </Card>

          <div className="flex justify-center pt-4">
            <Button 
              type="submit" 
              size="lg" 
              className="h-14 w-full bg-primary font-bold text-primary-foreground hover:brightness-95"
              disabled={submitting}
            >
              {submitting ? t('submitting') : t('registerAndBegin')}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
