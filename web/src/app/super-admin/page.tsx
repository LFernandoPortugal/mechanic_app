"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getAllWorkshops, getAllUsers, createWorkshopTester, updateWorkshopSettings, resetWorkshopData, deleteUserProfile, deleteWorkshopSettings } from "@/lib/db";
import { toast } from "sonner";
import { Crown, Building2, Users, Save, Trash2, Calendar, ShieldAlert, Plus, RefreshCw, X, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/types";

export default function SuperAdminPage() {
  const { userProfile } = useAuth();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form states for creating workshop
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);

  // States for resetting or actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadWorkshops();
    loadUsers();
  }, []);

  const loadWorkshops = async () => {
    setLoadingWorkshops(true);
    const data = await getAllWorkshops();
    setWorkshops(data);
    setLoadingWorkshops(false);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoadingUsers(false);
  };

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName || !newEmail) {
      toast.error("Por favor completa todos los campos.");
      return;
    }
    setCreating(true);
    try {
      const defaultExpiration = new Date();
      defaultExpiration.setDate(defaultExpiration.getDate() + 7); // Default 7-day trial
      const expiresAtString = defaultExpiration.toISOString();

      await createWorkshopTester(newId.trim().toLowerCase(), newName.trim(), newEmail.trim().toLowerCase(), expiresAtString);
      toast.success("Taller de prueba creado exitosamente.");
      
      setNewId("");
      setNewName("");
      setNewEmail("");
      loadWorkshops();
    } catch (err: any) {
      toast.error("Error al crear taller: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleResetPermission = async (wId: string, currentVal: boolean) => {
    setActionLoading(`reset-toggle-${wId}`);
    try {
      await updateWorkshopSettings(wId, { allowResetData: !currentVal });
      toast.success(`Permiso de restablecimiento actualizado.`);
      loadWorkshops();
    } catch (err: any) {
      toast.error("Error al actualizar permiso: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const extendTrial = async (wId: string, days: number) => {
    setActionLoading(`trial-${wId}`);
    try {
      const newExp = new Date();
      newExp.setDate(newExp.getDate() + days);
      await updateWorkshopSettings(wId, { expiresAt: newExp.toISOString() });
      toast.success(`Prueba extendida por ${days} días.`);
      loadWorkshops();
    } catch (err: any) {
      toast.error("Error al extender prueba: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const terminateTrial = async (wId: string) => {
    setActionLoading(`trial-${wId}`);
    try {
      await updateWorkshopSettings(wId, { expiresAt: new Date(0).toISOString() }); // Expirada inmediatamente
      toast.success("Prueba finalizada.");
      loadWorkshops();
    } catch (err: any) {
      toast.error("Error al finalizar prueba: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetWorkshopData = async (wId: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas restablecer TODOS los datos operativos (órdenes e inventario) del taller "${wId}"? Esta acción es irreversible.`)) {
      return;
    }
    setActionLoading(`reset-data-${wId}`);
    try {
      const res = await resetWorkshopData(wId);
      toast.success(`Datos restablecidos: ${res.jobsDeleted} órdenes, ${res.inventoryDeleted} productos.`);
    } catch (err: any) {
      toast.error("Error al restablecer datos: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWorkshop = async (wId: string) => {
    if (wId === "demo-workshop") {
      toast.error("No se puede eliminar el taller demo base.");
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el taller "${wId}"? Esto borrará su configuración.`)) {
      return;
    }
    setActionLoading(`delete-workshop-${wId}`);
    try {
      await deleteWorkshopSettings(wId);
      toast.success("Configuración de taller eliminada.");
      loadWorkshops();
    } catch (err: any) {
      toast.error("Error al eliminar taller: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (uid: string, email: string) => {
    if (uid === userProfile?.uid) {
      toast.error("No puedes eliminarte a ti mismo.");
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el perfil de "${email}" de la base de datos? Para revocar el acceso completo, también deberás eliminar su cuenta en Firebase Auth.`)) {
      return;
    }
    setActionLoading(`delete-user-${uid}`);
    try {
      await deleteUserProfile(uid);
      toast.success("Perfil de usuario eliminado.");
      loadUsers();
    } catch (err: any) {
      toast.error("Error al eliminar usuario: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 rounded-xl border border-red-500/30">
                <Crown className="w-8 h-8 text-red-500 dark:text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-red-500 dark:text-red-400">Panel del Creador (Super Admin)</h1>
                <p className="text-muted-foreground text-xs">Administración global de talleres de prueba y accesos de testers.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { loadWorkshops(); loadUsers(); }} variant="outline" className="border-border text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Workshop Card */}
            <Card className="glass-panel lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-violet-400">
                  <Plus className="w-5 h-5 text-violet-400" /> Crear Taller de Prueba
                </CardTitle>
                <CardDescription>Genera un taller aislado con trial automático de 7 días.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateWorkshop} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="w-id">Identificador Único (ID)</Label>
                    <Input
                      id="w-id"
                      value={newId}
                      onChange={(e) => setNewId(e.target.value.replace(/\s+/g, '-'))}
                      placeholder="ej. taller-sanchez"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground font-light">Este ID define la separación en la base de datos (SaaS Tenant ID).</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="w-name">Nombre del Taller</Label>
                    <Input
                      id="w-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="ej. Multiservicios Sánchez"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="w-email">Email del Tester / Administrador</Label>
                    <Input
                      id="w-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="ej. sánchez@taller.com"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground font-light">Cuando el usuario inicie sesión con este correo, se vinculará automáticamente como Admin.</p>
                  </div>
                  <Button type="submit" disabled={creating} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium">
                    {creating ? "Creando..." : "Registrar Tester"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Workshops List */}
            <Card className="glass-panel lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-400">
                  <Building2 className="w-5 h-5 text-red-400" /> Talleres Registrados ({workshops.length})
                </CardTitle>
                <CardDescription>Visualiza el estado de las suscripciones temporales.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingWorkshops ? (
                  <div className="text-center py-6 text-muted-foreground">Cargando talleres...</div>
                ) : workshops.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">No hay talleres registrados.</div>
                ) : (
                  <div className="divide-y divide-border/40 space-y-4">
                    {workshops.map((ws) => {
                      const expiration = ws.expiresAt ? new Date(ws.expiresAt) : null;
                      const isExpired = expiration ? new Date() > expiration : false;
                      return (
                        <div key={ws.id} className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{ws.workshopName || ws.name || "Sin nombre"}</span>
                              <span className="font-mono text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded text-muted-foreground">ID: {ws.id}</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-light">Admin Invitado: <span className="text-foreground">{ws.adminEmail || "Ninguno"}</span></p>
                            
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                              {expiration ? (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                  isExpired 
                                    ? 'bg-red-950/20 text-red-400 border-red-500/30' 
                                    : 'bg-emerald-950/20 text-emerald-400 border-emerald-500/30'
                                }`}>
                                  <Calendar className="w-3 h-3" />
                                  {isExpired ? "Expirado" : "Activo hasta"}: {expiration.toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-[10px] bg-secondary/30 text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                                  Sin Límite Temporal
                                </span>
                              )}

                              <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                ws.allowResetData 
                                  ? 'bg-amber-950/20 text-amber-400 border-amber-500/30' 
                                  : 'bg-secondary/30 text-muted-foreground border-border'
                              }`}>
                                <ShieldAlert className="w-3 h-3" />
                                Danger Zone: {ws.allowResetData ? "Permitido" : "Bloqueado"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {/* Action Buttons */}
                            <Button 
                              size="xs" 
                              variant="outline"
                              className="text-[10px] h-7 px-2 border-border text-muted-foreground hover:text-amber-400"
                              onClick={() => toggleResetPermission(ws.id, ws.allowResetData || false)}
                              disabled={actionLoading !== null}
                            >
                              Reset {ws.allowResetData ? "Off" : "On"}
                            </Button>

                            <Button 
                              size="xs" 
                              variant="outline"
                              className="text-[10px] h-7 px-2 border-border text-muted-foreground hover:text-emerald-400"
                              onClick={() => extendTrial(ws.id, 7)}
                              disabled={actionLoading !== null}
                            >
                              +7 Días
                            </Button>

                            {expiration && !isExpired && (
                              <Button 
                                size="xs" 
                                variant="outline"
                                className="text-[10px] h-7 px-2 border-border text-muted-foreground hover:text-red-400"
                                onClick={() => terminateTrial(ws.id)}
                                disabled={actionLoading !== null}
                              >
                                Expirar
                              </Button>
                            )}

                            <Button 
                              size="xs" 
                              variant="outline"
                              className="text-[10px] h-7 px-2 border-border text-muted-foreground hover:text-red-500"
                              onClick={() => handleResetWorkshopData(ws.id)}
                              disabled={actionLoading !== null}
                            >
                              Borrar Datos
                            </Button>

                            <Button 
                              size="xs" 
                              variant="outline"
                              className="text-[10px] h-7 px-2 border-red-500/20 text-red-500/80 hover:bg-red-950/20"
                              onClick={() => handleDeleteWorkshop(ws.id)}
                              disabled={actionLoading !== null}
                            >
                              Eliminar Taller
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* User Profiles Audit Card */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-400">
                <Users className="w-5 h-5 text-purple-400" /> Auditoría de Usuarios ({users.length})
              </CardTitle>
              <CardDescription>Control total sobre los perfiles de usuario registrados en Firestore.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-6 text-muted-foreground">Cargando perfiles...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">No hay perfiles registrados.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground">
                        <th className="py-3 px-4 font-semibold">Usuario</th>
                        <th className="py-3 px-4 font-semibold">Taller (Tenant)</th>
                        <th className="py-3 px-4 font-semibold">Roles</th>
                        <th className="py-3 px-4 font-semibold">UID</th>
                        <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {users.map((u) => (
                        <tr key={u.uid} className="hover:bg-secondary/20 transition-colors">
                          <td className="py-3 px-4 font-medium text-foreground">
                            <div>{u.displayName || "Sin nombre"}</div>
                            <div className="text-[10px] text-muted-foreground font-light">{u.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono bg-secondary/40 px-1.5 py-0.5 rounded text-[10px]">
                              {u.workshopId}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((r) => (
                                <span key={r} className={`px-1.5 py-0.5 rounded-[4px] text-[9px] border font-semibold ${
                                  r === 'SUPER_ADMIN' 
                                    ? 'bg-red-950/20 text-red-400 border-red-500/20' 
                                    : r === 'ADMIN' 
                                      ? 'bg-purple-950/20 text-purple-400 border-purple-500/20' 
                                      : 'bg-secondary/40 text-muted-foreground border-border'
                                }`}>
                                  {r}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-muted-foreground/80">
                            {u.uid.slice(0, 15)}...
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-950/10"
                              onClick={() => handleDeleteUser(u.uid, u.email)}
                              disabled={actionLoading !== null}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
