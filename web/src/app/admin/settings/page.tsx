"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getWorkshopSettings, updateWorkshopSettings, resetWorkshopData } from "@/lib/db";
import { useRouter } from "next/navigation";
import { uploadJobImage } from "@/lib/storage";
import { toast } from "sonner";
import { Building2, Save, UploadCloud, ArrowLeft, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading, refreshSettings } = useAuth();
  const [settings, setSettings] = useState({
    name: "SGA Auto",
    nit: "123456789-0",
    phone: "+1 234 567 890",
    address: "123 Mechanic St, Auto City",
    logoUrl: "",
    demoMode: false,
    currencySymbol: "S/.",
    taxRate: 18,
    taxName: "IGV",
    allowResetData: false
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Danger Zone / Reset States
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);


  useEffect(() => {
    if (authLoading) return;
    
    async function loadSettings() {
      const wId = userProfile?.workshopId || null;
      if (!wId) {
        setLoading(false);
        return;
      }

      const data = await getWorkshopSettings(wId);
      if (data) {
        setSettings({
          name: data.workshopName,
          nit: data.taxId,
          phone: data.phone || "+1 234 567 890",
          address: data.address || "123 Mechanic St, Auto City",
          logoUrl: data.logoUrl || "",
          demoMode: data.demoMode || false,
          currencySymbol: data.currencySymbol || "S/.",
          taxRate: typeof data.taxRate === 'number' ? data.taxRate : 18,
          taxName: data.taxName || "IGV",
          allowResetData: data.allowResetData || false
        });
      }
      setLoading(false);
    }
    loadSettings();
  }, [userProfile, authLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.workshopId) {
      toast.error("No se detectó el taller del usuario.");
      return;
    }
    setSaving(true);
    try {
      let urlToSave = settings.logoUrl;
      if (logoFile) {
        toast.info("Subiendo logotipo...");
        urlToSave = await uploadJobImage(logoFile, "settings", "logo");
      }
      
      const newSettings = { 
        workshopName: settings.name,
        taxId: settings.nit,
        phone: settings.phone,
        address: settings.address,
        logoUrl: urlToSave,
        demoMode: settings.demoMode,
        currencySymbol: settings.currencySymbol,
        taxRate: Number(settings.taxRate),
        taxName: settings.taxName,
      };
      
      await updateWorkshopSettings(userProfile.workshopId, newSettings);
      setSettings({
        ...settings,
        logoUrl: urlToSave
      });
      setLogoFile(null);
      await refreshSettings(); // Sync state globally in context!
      toast.success("Configuración del taller guardada exitosamente.");
    } catch (err) {
      toast.error("Error al guardar la configuración.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = async () => {
    if (!userProfile?.workshopId) {
      toast.error("No se detectó el taller del usuario.");
      return;
    }
    if (resetConfirmText.trim().toUpperCase() !== "ELIMINAR") {
      toast.error("Por favor, escribe 'ELIMINAR' para confirmar.");
      return;
    }

    setResetting(true);
    try {
      const result = await resetWorkshopData(userProfile.workshopId);
      toast.success(
        `¡Limpieza de prueba exitosa! Se eliminaron: ${result.jobsDeleted} órdenes, ${result.inventoryDeleted} productos e ${result.transactionsDeleted} transacciones.`
      );
      setShowResetConfirm(false);
      setResetConfirmText("");
    } catch (err) {
      toast.error("Error al restablecer los datos del taller.");
      console.error(err);
    } finally {
      setResetting(false);
    }
  };


  if (loading) {
    return <div className="min-h-screen p-6 text-center text-muted-foreground flex items-center justify-center">Cargando configuración...</div>;
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen page-bg text-foreground p-6 md:p-12 flex justify-center">
        <div className="max-w-3xl w-full">
          <header className="mb-8 flex flex-col gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="group self-start gap-1.5 rounded-full border border-border bg-card/45 px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-300 hover:border-violet-500/50 hover:bg-violet-950/20 hover:text-violet-400"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Inicio
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-violet-500 flex items-center gap-2">
                <Building2 className="w-8 h-8 text-violet-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)] animate-pulse" /> Configuración del Taller
              </h1>
              <p className="text-muted-foreground text-xs mt-2">
                Administre la información pública del taller. Estos datos aparecerán en los reportes y cotizaciones enviados a los clientes.
              </p>
            </div>
          </header>

          <Card className="glass-panel">
            <form onSubmit={handleSave}>
              <CardHeader>
                <CardTitle>Datos de la Empresa</CardTitle>
                <CardDescription>Información fiscal y de contacto principal.</CardDescription>
              </CardHeader>
              <CardContent className="mt-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Comercial / Razón Social</Label>
                    <Input 
                      id="name"
                      value={settings.name}
                      onChange={e => setSettings({...settings, name: e.target.value})}
                      placeholder="Ej. Taller Los Expertos S.A."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nit">NIT / RUT / Identificación Fiscal</Label>
                    <Input 
                      id="nit"
                      value={settings.nit}
                      onChange={e => setSettings({...settings, nit: e.target.value})}
                      placeholder="Ej. 12345678-9"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono de Contacto (WhatsApp)</Label>
                    <Input 
                      id="phone"
                      value={settings.phone}
                      onChange={e => setSettings({...settings, phone: e.target.value})}
                      placeholder="Ej. +57 300 123 4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección Física</Label>
                    <Input 
                      id="address"
                      value={settings.address}
                      onChange={e => setSettings({...settings, address: e.target.value})}
                      placeholder="Ej. Av. Principal 123"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-violet-400">Configuración Financiera e Impuestos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currencySymbol">Divisa / Símbolo</Label>
                      <Input 
                        id="currencySymbol"
                        value={settings.currencySymbol}
                        onChange={e => setSettings({...settings, currencySymbol: e.target.value})}
                        placeholder="Ej. S/. o $"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxName">Nombre del Impuesto</Label>
                      <Input 
                        id="taxName"
                        value={settings.taxName}
                        onChange={e => setSettings({...settings, taxName: e.target.value})}
                        placeholder="Ej. IGV, IVA"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxRate">Tasa de Impuesto (%)</Label>
                      <Input 
                        id="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={settings.taxRate}
                        onChange={e => setSettings({...settings, taxRate: parseFloat(e.target.value) || 0})}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <Label>Logotipo del Taller (PNG/JPG)</Label>
                  <div className="flex items-center gap-4">
                    {settings.logoUrl && !logoFile && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-border flex items-center justify-center p-2">
                        <Image src={settings.logoUrl} alt="Logo" width={80} height={80} unoptimized className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                    {logoFile && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-border flex items-center justify-center p-2">
                        <Image src={URL.createObjectURL(logoFile)} alt="Logo Preview" width={80} height={80} unoptimized className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <Label htmlFor="logo" className="cursor-pointer flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-lg bg-secondary/30 hover:bg-secondary transition-colors">
                        <UploadCloud className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Click para subir logo</span>
                      </Label>
                      <Input 
                        id="logo"
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setLogoFile(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border animate-fade-in">
                  <Label>Modo Demostración</Label>
                  <label className="flex items-center space-x-3 p-3 bg-secondary/30 dark:bg-black/20 rounded-lg cursor-pointer border border-border/40">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-border text-violet-500 focus:ring-violet-500 bg-background" 
                      checked={settings.demoMode} 
                      onChange={(e) => setSettings({...settings, demoMode: e.target.checked})} 
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Habilitar botones de Auto-Llenado (Demo)</p>
                      <p className="text-[10px] text-muted-foreground font-light mt-0.5">Muestra botones interactivos en Recepción y otras pantallas para pre-llenar datos ficticios en pruebas.</p>
                    </div>
                  </label>
                </div>

                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={saving}>
                  {saving ? "Guardando..." : <><Save className="w-4 h-4 mr-2" /> Guardar Configuración</>}
                </Button>
              </CardContent>
            </form>
          </Card>

          {/* Danger Zone */}
          {settings.allowResetData && (
            <Card className="glass-panel border-red-500/20 bg-red-950/5 mt-8 overflow-hidden transition-all duration-300 hover:border-red-500/30">
              <CardHeader className="border-b border-red-500/10 bg-red-950/10">
                <CardTitle className="text-red-500 flex items-center gap-2 text-lg font-bold">
                  <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                  Zona de Peligro (Restablecer SaaS / Taller)
                </CardTitle>
                <CardDescription className="text-red-400/80 text-xs">
                  Acciones irreversibles de limpieza y restauración para pruebas o inicios oficiales.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col gap-2 text-foreground">
                  <p className="text-sm font-semibold">
                    Limpiar todos los datos del Taller: <span className="font-mono text-xs bg-red-500/10 px-1.5 py-0.5 rounded text-red-400 border border-red-500/20">{userProfile?.workshopId || "sin taller asociado"}</span>
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Esta acción eliminará de forma permanente e irreversible de la base de datos:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                    <li>Todas las <strong>Órdenes de Trabajo (Jobs)</strong> registradas.</li>
                    <li>Todos los <strong>Productos del Inventario</strong>.</li>
                    <li>Todo el <strong>Historial de Movimientos de Stock (Transacciones)</strong>.</li>
                  </ul>
                  <p className="text-amber-500/90 text-xs font-semibold mt-1">
                    Nota: Tus usuarios de taller, roles, contraseñas y la configuración básica de este taller NO se verán afectados.
                  </p>
                </div>

                {!showResetConfirm ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full bg-red-600 hover:bg-red-700 hover:shadow-red-500/20 hover:shadow-md text-white font-medium transition-all duration-300"
                    onClick={() => setShowResetConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Iniciar Restablecimiento de Datos
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 border border-red-500/20 bg-black/30 rounded-lg animate-fade-in">
                    <div className="space-y-2">
                      <Label htmlFor="confirm-reset" className="text-red-400 font-semibold text-xs flex items-center gap-1.5">
                        Confirmación de Seguridad Obligatoria
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Para confirmar que entiendes que esto es irreversible y deseas borrar todo, escribe la palabra <span className="font-bold text-red-500 select-none">ELIMINAR</span> a continuación:
                      </p>
                      <Input
                        id="confirm-reset"
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value)}
                        placeholder="Escribe ELIMINAR para continuar..."
                        className="border-red-500/30 focus-visible:ring-red-500 bg-background text-red-500 font-semibold tracking-wider text-center"
                        autoFocus
                      />
                    </div>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 text-muted-foreground hover:bg-secondary border border-border"
                        onClick={() => {
                          setShowResetConfirm(false);
                          setResetConfirmText("");
                        }}
                        disabled={resetting}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                        disabled={resetConfirmText.trim().toUpperCase() !== "ELIMINAR" || resetting}
                        onClick={handleResetData}
                      >
                        {resetting ? (
                          <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Borrando...</>
                        ) : (
                          <><Trash2 className="w-4 h-4 mr-2" /> Sí, borrar todo permanentemente</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
