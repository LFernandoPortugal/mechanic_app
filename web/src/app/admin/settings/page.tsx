"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getWorkshopSettings, updateWorkshopSettings } from "@/lib/db";
import { useRouter } from "next/navigation";
import { uploadJobImage } from "@/lib/storage";
import { toast } from "sonner";
import { Building2, Save, UploadCloud, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState({
    name: "SGA Auto",
    nit: "123456789-0",
    phone: "+1 234 567 890",
    address: "123 Mechanic St, Auto City",
    logoUrl: "",
    demoMode: false
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    async function loadSettings() {
      const wId = userProfile?.workshopId || (userProfile ? "demo-workshop" : null);
      if (!wId) {
        setLoading(false);
        return;
      }

      const data = await getWorkshopSettings(wId);
      if (data) {
        setSettings({
          name: data.name || data.workshopName || "SGA Auto",
          nit: data.nit || data.taxId || "123456789-0",
          phone: data.phone || "+1 234 567 890",
          address: data.address || "123 Mechanic St, Auto City",
          logoUrl: data.logoUrl || "",
          demoMode: data.demoMode || false
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
      
      const newSettings = { ...settings, logoUrl: urlToSave };
      await updateWorkshopSettings(userProfile.workshopId, newSettings);
      setSettings(newSettings);
      setLogoFile(null);
      toast.success("Configuración del taller guardada exitosamente.");
    } catch (err) {
      toast.error("Error al guardar la configuración.");
      console.error(err);
    } finally {
      setSaving(false);
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
              <CardContent className="space-y-6">
                
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

                <div className="space-y-2 pt-4 border-t border-border">
                  <Label>Logotipo del Taller (PNG/JPG)</Label>
                  <div className="flex items-center gap-4">
                    {settings.logoUrl && !logoFile && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-border flex items-center justify-center p-2">
                        <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                    {logoFile && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-border flex items-center justify-center p-2">
                        <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
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
        </div>
      </div>
    </ProtectedRoute>
  );
}
