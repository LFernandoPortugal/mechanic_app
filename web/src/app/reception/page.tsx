"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJob, updateJob } from "@/lib/db";
import { uploadJobImage } from "@/lib/storage";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { Wand2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Reception() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [vehicle, setVehicle] = useState({ vin: "", make: "", model: "", plate: "", color: "" });
  const [client, setClient] = useState({ name: "", phone: "", email: "" });
  const [fluids, setFluids] = useState({ oil: "OK", coolant: "OK", brake: "OK" });
  const [valuables, setValuables] = useState({ lockNut: false, sunglasses: false, documents: false, other: "" });
  const [fuelLevel, setFuelLevel] = useState(50);
  const [odometer, setOdometer] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [signature, setSignature] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleAutoFill = () => {
    setVehicle({ vin: "1HGBH41JXMN109186", make: "Toyota", model: "Corolla", plate: "ABC-123", color: "Rojo" });
    setClient({ name: "Juan Perez", phone: "555-0102", email: "juan@example.com" });
    setFluids({ oil: "OK", coolant: "OK", brake: "LOW" });
    setValuables({ lockNut: true, sunglasses: true, documents: false, other: "" });
    setFuelLevel(75);
    setOdometer("120500");
    setSignature(true);
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
    if (!signature) {
      toast.warning(t('alertSignatureRequired'));
      return;
    }

    // Non-blocking warning: WhatsApp updates require phone
    if (!client.phone.trim()) {
      toast.warning(t('alertNoPhoneWhatsApp'), { duration: 4000 });
    }

    setSubmitting(true);
    try {
      const jobId = await createJob({
        vehicleId: vehicle.plate,
        clientId: client.name,
        clientPhone: client.phone.trim() || undefined,
        clientEmail: client.email.trim() || undefined,
        advisorId: user?.uid || "unknown",
        status: 'Reception',
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
      }, user?.uid || "unknown");

      // 1.5 Subir las fotos si existen
      if (photos.length > 0) {
        toast.info(t('uploadingPhotos') || "Subiendo fotos...");
        const urls: string[] = [];
        for (const file of photos) {
          const url = await uploadJobImage(file, jobId, "reception");
          urls.push(url);
        }
        await updateJob(jobId, { receptionImages: urls });
      }

      setCreatedJobId(vehicle.plate);
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
      <div className="min-h-screen page-bg flex items-center justify-center p-4">
        <Card className="glass-panel text-center max-w-md w-full p-8 border-emerald-500/50">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wand2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-500 dark:text-emerald-400 mb-2">{t('receptionComplete')}</h2>
          <p className="text-muted-foreground mb-8">{t('vehicleQueued').replace('{id}', createdJobId)}</p>
          <div className="space-y-3">
             <Button onClick={() => router.push('/technician')} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg text-white">
                {t('goToTechnician')}
             </Button>
             <Button onClick={() => { setCreatedJobId(null); setVehicle({ vin: "", make: "", model: "", plate: "", color: "" }); setClient({ name: "", phone: "", email: "" }); setSignature(false); setOdometer(""); setFuelLevel(50); setPhotos([]); }} variant="outline" className="w-full border-border text-muted-foreground h-10">
                {t('registerAnother')}
             </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'RECEPTION']}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6 flex justify-center">
        <div className="w-full max-w-4xl space-y-6">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{t('vehicleReception')}</h1>
              <p className="text-muted-foreground text-sm">{t('transferOfResponsibility')}</p>
            </div>
            <Button onClick={handleAutoFill} variant="outline" className="text-amber-500 dark:text-amber-400 border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/30">
              <Wand2 className="w-4 h-4 mr-2" />
              {t('demoAutoFill')}
            </Button>
          </header>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
            {/* Vehicle Details */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-lg">{t('vehicleDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('licensePlate')} *</Label>
                    <Input 
                      placeholder="ABC-123" 
                      className="bg-background border-border" 
                      value={vehicle.plate}
                      onChange={(e) => setVehicle({...vehicle, plate: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('vinLabel')}</Label>
                    <Input placeholder={t('scanOrType')} value={vehicle.vin} onChange={(e) => setVehicle({...vehicle, vin: e.target.value})} className="bg-background border-border" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                   <div className="space-y-2">
                    <Label>{t('make')} *</Label>
                    <Input placeholder="Toyota" value={vehicle.make} onChange={(e) => setVehicle({...vehicle, make: e.target.value})} className="bg-background border-border" />
                  </div>
                   <div className="space-y-2">
                    <Label>{t('model')}</Label>
                    <Input placeholder="Corolla" value={vehicle.model} onChange={(e) => setVehicle({...vehicle, model: e.target.value})} className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('colorLabel')}</Label>
                    <Input placeholder={t('colorPlaceholder')} value={vehicle.color} onChange={(e) => setVehicle({...vehicle, color: e.target.value})} className="bg-background border-border" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-lg">{t('clientInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('clientName')} *</Label>
                    <Input placeholder={t('clientNamePlaceholder')} value={client.name} onChange={(e) => setClient({...client, name: e.target.value})} className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('clientPhone')}</Label>
                    <Input placeholder="555-0102" value={client.phone} onChange={(e) => setClient({...client, phone: e.target.value})} className="bg-background border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('clientEmail')}</Label>
                    <Input placeholder="email@ejemplo.com" value={client.email} onChange={(e) => setClient({...client, email: e.target.value})} className="bg-background border-border" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Condition - Odometer + Fuel */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-lg">{t('vehicleCondition')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('odometer')} (km)</Label>
                    <Input type="number" placeholder="120500" value={odometer} onChange={(e) => setOdometer(e.target.value)} className="bg-background border-border font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('fuelLevel')}: {fuelLevel}%</Label>
                    <input 
                      type="range"
                      value={fuelLevel} 
                      onChange={(e) => setFuelLevel(parseInt(e.target.value))} 
                      min={0} max={100} step={5}
                      className="mt-3 w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>E</span>
                      <span>1/4</span>
                      <span>1/2</span>
                      <span>3/4</span>
                      <span>F</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Damages (Photos) */}
            <Card className="glass-panel">
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
                <Input 
                  id="reception-camera"
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  multiple 
                  onChange={(e) => {
                    if (e.target.files) {
                      setPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                  className="bg-background border-border"
                />
                
                {photos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative w-16 h-16 rounded overflow-hidden border border-border">
                        <img src={URL.createObjectURL(p)} alt="preview" className="object-cover w-full h-full" />
                        <button 
                          type="button" 
                          onClick={() => setPhotos(photos.filter((_, index) => index !== i))}
                          className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs"
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
            <Card className="glass-panel border-l-4 border-l-emerald-500">
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
                        className={fluids[fluid.key as keyof typeof fluids] === "OK" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-border"}
                        onClick={() => setFluids({...fluids, [fluid.key]: "OK"})}
                      >
                        OK
                      </Button>
                      <Button 
                        type="button"
                        size="sm" 
                        variant={fluids[fluid.key as keyof typeof fluids] !== "OK" ? "destructive" : "outline"}
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
            <Card className="glass-panel">
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
                  <Label>{t('otherValuables')}</Label>
                  <Input placeholder={t('otherValuablesPlaceholder')} value={valuables.other} onChange={(e) => setValuables({...valuables, other: e.target.value})} className="bg-background border-border" />
                </div>
              </CardContent>
            </Card>

            {/* Liability Transfer */}
            <Card className="glass-panel border-t-4 border-t-blue-500">
              <CardHeader>
                <CardTitle className="text-lg">{t('liabilityTransfer')}</CardTitle>
                <CardDescription>{t('clientConfirms')}</CardDescription>
              </CardHeader>
              <CardContent>
                 <div 
                   className={`h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${signature ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "border-border hover:border-muted-foreground"}`}
                   onClick={() => setSignature(!signature)}
                 >
                   {signature ? (
                     <span className="text-emerald-500 dark:text-emerald-400 font-bold text-xl">{t('signedDigitalToken')}</span>
                   ) : (
                     <span className="text-muted-foreground">{t('tapToSign')}</span>
                   )}
                 </div>
              </CardContent>
            </Card>

          <div className="flex justify-center pt-4">
            <Button 
              type="submit" 
              size="lg" 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-14 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
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
