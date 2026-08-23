"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getAllWorkshops, getAllUsers, updateWorkshopSettings, resetWorkshopData, updateUserRoles, getActiveJobCountByWorkshop, type WorkshopListItem } from "@/lib/db";
import { authenticatedJsonRequest } from "@/lib/authenticated-api";
import { toast } from "sonner";
import {
  Crown, Building2, Users, Trash2, Calendar, ShieldAlert,
  RefreshCw, Eye, EyeOff, ChevronDown, ChevronUp,
  Copy, Check, UserPlus, Shield
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile, UserRole } from "@/types";
import { extendExpiration } from "@/lib/dates";
import { SuperAdminShell } from "@/components/shell/SuperAdminShell";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Error desconocido";

const ROLE_OPTIONS: UserRole[] = ["ADMIN", "RECEPTION", "TECHNICIAN", "ADVISOR"];
type ReconciledUser = UserProfile & {
  hasAuth: boolean;
  hasProfile: boolean;
  hasWorkshop: boolean;
  disabled: boolean;
  deletionPending: boolean;
  status: "consistent" | "auth_only" | "profile_only" | "missing_workshop";
};

function SuperAdminContent() {
  const { user, userProfile } = useAuth();
  const [workshops, setWorkshops] = useState<WorkshopListItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [reconciledUsers, setReconciledUsers] = useState<ReconciledUser[]>([]);
  const [expandedWorkshop, setExpandedWorkshop] = useState<string | null>(null);
  const [activeJobCounts, setActiveJobCounts] = useState<Record<string, number>>({});

  // Form: create workshop + admin account
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [trialDays, setTrialDays] = useState(7);
  const [creating, setCreating] = useState(false);

  // Copied credential state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadWorkshops();
    loadUsers();
    loadReconciliation();
  }, []);

  const loadWorkshops = async () => {
    setLoadingWorkshops(true);
    const data = await getAllWorkshops();
    setWorkshops(data);
    setLoadingWorkshops(false);
    // Load active job counts per workshop in background
    const counts: Record<string, number> = {};
    await Promise.all(data.map(async (ws) => {
      counts[ws.id] = await getActiveJobCountByWorkshop(ws.id);
    }));
    setActiveJobCounts(counts);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoadingUsers(false);
  };

  const loadReconciliation = async () => {
    try {
      const result = await authenticatedJsonRequest<{ users: ReconciledUser[] }>("/api/admin/users", { method: "GET" });
      setReconciledUsers(result.users);
    } catch (error) {
      toast.error("No se pudo reconciliar Authentication y Firestore: " + getErrorMessage(error));
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getUsersForWorkshop = (wId: string) =>
    users.filter((u) => u.workshopId === wId);

  const callAdminUsersApi = async (method: "POST" | "DELETE", body: unknown) => {
    if (!user) throw new Error("La sesión no está disponible.");
    const idToken = await user.getIdToken();
    const response = await fetch("/api/admin/users", {
      method,
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "La operación no pudo completarse.");
  };

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newName || !newEmail || !newPassword) {
      toast.error("Por favor completa todos los campos.");
      return;
    }
    if (newPassword.length < 12) {
      toast.error("La contraseña debe tener al menos 12 caracteres.");
      return;
    }
    setCreating(true);
    try {
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + trialDays);
      await callAdminUsersApi("POST", {
        workshopId: newId,
        workshopName: newName,
        email: newEmail,
        password: newPassword,
        expiresAt: expiration.toISOString(),
      });

      toast.success(`Taller "${newName}" y cuenta de admin creados y activados. Trial: ${trialDays} días.`);
      setNewId(""); setNewName(""); setNewEmail(""); setNewPassword(""); setTrialDays(7);
      loadWorkshops();
      loadUsers();
    } catch (err: unknown) {
      toast.error("Error: " + getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const toggleResetPermission = async (wId: string, currentVal: boolean) => {
    setActionLoading(`reset-toggle-${wId}`);
    try {
      await updateWorkshopSettings(wId, { allowResetData: !currentVal });
      toast.success("Permiso actualizado.");
      loadWorkshops();
    } catch (err: unknown) {
      toast.error("Error: " + getErrorMessage(err));
    } finally { setActionLoading(null); }
  };

  const extendTrial = async (wId: string, days: number) => {
    setActionLoading(`trial-${wId}`);
    try {
      const currentExpiration = workshops.find((workshop) => workshop.id === wId)?.expiresAt;
      const newExp = extendExpiration(currentExpiration, days);
      await updateWorkshopSettings(wId, { expiresAt: newExp.toISOString() });
      toast.success(`Trial extendido +${days} días.`);
      loadWorkshops();
    } catch (err: unknown) {
      toast.error("Error: " + getErrorMessage(err));
    } finally { setActionLoading(null); }
  };

  const terminateTrial = async (wId: string) => {
    setActionLoading(`trial-${wId}`);
    try {
      await updateWorkshopSettings(wId, { expiresAt: new Date(0).toISOString() });
      toast.success("Acceso revocado inmediatamente.");
      loadWorkshops();
    } catch (err: unknown) {
      toast.error("Error: " + getErrorMessage(err));
    } finally { setActionLoading(null); }
  };

  const handleResetWorkshopData = async (wId: string) => {
    if (!window.confirm(`¿Borrar TODOS los datos operativos del taller "${wId}"? Esta acción es irreversible.`)) return;
    setActionLoading(`reset-data-${wId}`);
    try {
      const res = await resetWorkshopData(wId);
      toast.success(`Datos borrados: ${res.jobsDeleted} OTs, ${res.inventoryDeleted} items.`);
    } catch (err: unknown) {
      toast.error("Error: " + getErrorMessage(err));
    } finally { setActionLoading(null); }
  };

  const handleDeleteWorkshop = async (wId: string) => {
    if (wId === "demo-workshop") { toast.error("No se puede eliminar el taller demo."); return; }
    if (!window.confirm(`¿Eliminar permanentemente el taller "${wId}" y todos sus usuarios y datos?`)) return;
    setActionLoading(`delete-workshop-${wId}`);
    try {
      const res = await authenticatedJsonRequest<{ deletedUsers: number; counts: Record<string, number> }>("/api/admin/workshops", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workshopId: wId }),
      });
      toast.success(`Taller eliminado por completo. Se borraron ${res.deletedUsers} cuentas y ${res.counts.jobs || 0} OTs.`);
      loadWorkshops(); loadUsers(); loadReconciliation();
    } catch (err: unknown) {
      toast.error("Error: " + getErrorMessage(err));
    } finally { setActionLoading(null); }
  };

  const handleDeleteUser = async (uid: string, email: string) => {
    if (uid === userProfile?.uid) { toast.error("No puedes eliminarte a ti mismo."); return; }
    if (!window.confirm(`¿Eliminar la cuenta "${email}" de Firebase Authentication y Firestore?`)) return;
    setActionLoading(`delete-user-${uid}`);
    try {
      await callAdminUsersApi("DELETE", { uids: [uid] });
      toast.success("Cuenta eliminada de Firebase Authentication y Firestore.");
      loadUsers();
      loadReconciliation();
    } catch (err: unknown) {
      toast.error("Error: " + getErrorMessage(err));
    } finally { setActionLoading(null); }
  };

  const handleRoleChange = async (uid: string, role: UserRole, hasRole: boolean) => {
    const user = users.find((u) => u.uid === uid);
    if (!user) return;
    const currentRoles: UserRole[] = Array.isArray(user.roles) ? user.roles : [];
    if (role === "ADMIN" && !hasRole && currentRoles.length === 1) {
      toast.error("El usuario debe tener al menos un rol.");
      return;
    }
    const newRoles: UserRole[] = hasRole
      ? (currentRoles.filter((r) => r !== role) as UserRole[])
      : ([...currentRoles, role] as UserRole[]);
    if (newRoles.length === 0) { toast.error("El usuario debe tener al menos un rol."); return; }
    setActionLoading(`role-${uid}-${role}`);
    try {
      await updateUserRoles(uid, newRoles);
      toast.success(`Roles actualizados para ${user.email}`);
      loadUsers();
    } catch (err: unknown) {
      toast.error("Error: " + getErrorMessage(err));
    } finally { setActionLoading(null); }
  };

  const globalMetrics: Array<{ label: string; value: number; icon: typeof Building2 }> = [
    { label: "Talleres", value: workshops.length, icon: Building2 },
    { label: "Trials activos", value: workshops.filter((workshop) => workshop.expiresAt && new Date(workshop.expiresAt) > new Date()).length, icon: Calendar },
    { label: "Usuarios", value: reconciledUsers.length, icon: Users },
    { label: "Requieren revisión", value: reconciledUsers.filter((profile) => profile.status !== "consistent").length, icon: ShieldAlert },
  ];

  return (
    <SuperAdminShell>
    <div className="mx-auto max-w-7xl space-y-8 pb-20 text-foreground">
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

          {/* Header */}
          <div id="overview" className="scroll-mt-36 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 rounded-xl border border-red-500/30">
                <Crown className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="eyebrow">SUPER_ADMIN</p>
                <h1 className="page-title">Consola global</h1>
                <p className="mt-1 text-sm text-muted-foreground">Estado de talleres, accesos, trials y consistencia de cuentas.</p>
              </div>
            </div>
            <Button onClick={() => { loadWorkshops(); loadUsers(); }} variant="outline" className="border-border text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-4 h-4 mr-2" /> Sincronizar
            </Button>
          </div>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Resumen global">
            {globalMetrics.map(({ label, value, icon: Icon }) => <article key={label} className="metric-card"><Icon className="mb-4 text-primary" size={20}/><strong className="block text-2xl tabular-nums">{value}</strong><span className="mt-1 block text-xs font-medium text-muted-foreground">{label}</span></article>)}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Create Workshop + Admin ── */}
            <Card id="create-workshop" className="app-card scroll-mt-36 lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold text-primary">
                  <UserPlus className="w-5 h-5" /> Nuevo Taller + Admin
                </CardTitle>
                <CardDescription>
                  Crea el taller y la cuenta del admin en un solo paso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateWorkshop} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="w-id" className="text-xs">ID del Taller</Label>
                    <Input
                      id="w-id"
                      value={newId}
                      onChange={(e) => setNewId(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                      placeholder="taller-sanchez"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">Identificador único, sin espacios (ej: taller-garcia-2024)</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="w-name" className="text-xs">Nombre del Taller</Label>
                    <Input
                      id="w-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Multiservicios Sánchez"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="w-email" className="text-xs">Email del Administrador</Label>
                    <Input
                      id="w-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="admin@taller.com"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="w-pass" className="text-xs">Contraseña Temporal</Label>
                    <div className="relative">
                      <Input
                        id="w-pass"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={12}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mín. 12 caracteres"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">El admin la cambiará desde su perfil.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="w-trial" className="text-xs">Días de Trial</Label>
                    <div className="flex gap-2">
                      {[7, 14, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setTrialDays(d)}
                          className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                            trialDays === d
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                      <Input
                        id="w-trial"
                        type="number"
                        min={1}
                        max={365}
                        value={trialDays}
                        onChange={(e) => setTrialDays(Number(e.target.value))}
                        className="w-20 text-center text-xs h-8"
                      />
                    </div>
                  </div>

                  {/* Credential preview for copy */}
                  {newEmail && newPassword && (
                    <div className="bg-secondary/30 rounded-lg p-3 space-y-1.5 border border-border/50">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Credenciales a entregar</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-foreground truncate">{newEmail}</span>
                        <button type="button" onClick={() => copyToClipboard(newEmail, "email")} className="text-muted-foreground hover:text-foreground shrink-0">
                          {copiedField === "email" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-foreground">{"•".repeat(newPassword.length)}</span>
                        <button type="button" onClick={() => copyToClipboard(newPassword, "pass")} className="text-muted-foreground hover:text-foreground shrink-0">
                          {copiedField === "pass" ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={creating} className="w-full font-medium">
                    {creating ? "Creando..." : "Crear Taller y Cuenta"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* ── Workshops List ── */}
            <Card id="workshops" className="app-card scroll-mt-36 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-400">
                  <Building2 className="w-5 h-5" /> Talleres ({workshops.length})
                </CardTitle>
                <CardDescription>Estado de suscripciones y acceso por taller.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingWorkshops ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
                ) : workshops.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No hay talleres registrados.</div>
                ) : (
                  workshops.map((ws) => {
                    const expiration = ws.expiresAt ? new Date(ws.expiresAt) : null;
                    const isExpired = expiration ? new Date() > expiration : false;
                    const wsUsers = getUsersForWorkshop(ws.id);
                    const isExpanded = expandedWorkshop === ws.id;

                    return (
                      <div key={ws.id} className="border border-border/40 rounded-xl overflow-hidden">
                        {/* Workshop header */}
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground">{ws.workshopName || ws.name || "Sin nombre"}</span>
                              <span className="font-mono text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded text-muted-foreground">
                                {ws.id}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                isExpired
                                  ? "bg-red-950/20 text-red-400 border-red-500/30"
                                  : expiration
                                    ? "bg-success/10 text-success border-success/25"
                                    : "bg-primary/10 text-primary border-primary/30"
                              }`}>
                                <Calendar className="w-3 h-3" />
                                {isExpired ? "Expirado" : expiration
                                  ? (() => {
                                      const daysLeft = Math.ceil((expiration.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                      return `Activo · ${daysLeft}d restante${daysLeft !== 1 ? 's' : ''}`;
                                    })()
                                  : "Sin límite"}
                              </span>
                              {/* Active jobs badge */}
                              {(activeJobCounts[ws.id] ?? 0) > 0 && (
                                <span className="flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                                  {activeJobCounts[ws.id]} OT activa{(activeJobCounts[ws.id] ?? 0) !== 1 ? 's' : ''}
                                </span>
                              )}
                              {ws.allowResetData && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-950/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" /> Danger On
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span>Admin: <span className="text-foreground font-mono">{ws.adminEmail || "—"}</span></span>
                              <span>·</span>
                              <button
                                onClick={() => setExpandedWorkshop(isExpanded ? null : ws.id)}
                                className="flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
                              >
                                <Users className="w-3 h-3" />
                                {wsUsers.length} usuario{wsUsers.length !== 1 ? "s" : ""}
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            <Button size="xs" variant="outline"
                              className="text-[10px] h-7 px-2 border-border text-muted-foreground hover:text-amber-400"
                              onClick={() => toggleResetPermission(ws.id, ws.allowResetData || false)}
                              disabled={actionLoading !== null}>
                              Danger {ws.allowResetData ? "Off" : "On"}
                            </Button>
                            <Button size="xs" variant="outline"
                              className="h-7 border-border px-2 text-[10px] text-muted-foreground hover:text-primary"
                              onClick={() => extendTrial(ws.id, 7)}
                              disabled={actionLoading !== null}>
                              +7d
                            </Button>
                            <Button size="xs" variant="outline"
                              className="h-7 border-border px-2 text-[10px] text-muted-foreground hover:text-primary"
                              onClick={() => extendTrial(ws.id, 30)}
                              disabled={actionLoading !== null}>
                              +30d
                            </Button>
                            {expiration && !isExpired && (
                              <Button size="xs" variant="outline"
                                className="text-[10px] h-7 px-2 border-border text-muted-foreground hover:text-red-400"
                                onClick={() => terminateTrial(ws.id)}
                                disabled={actionLoading !== null}>
                                Revocar
                              </Button>
                            )}
                            <Button size="xs" variant="outline"
                              className="text-[10px] h-7 px-2 border-border text-muted-foreground hover:text-red-500"
                              onClick={() => handleResetWorkshopData(ws.id)}
                              disabled={actionLoading !== null}>
                              Borrar Datos
                            </Button>
                            <Button size="xs" variant="outline"
                              className="text-[10px] h-7 px-2 border-red-500/20 text-red-500/70 hover:bg-red-950/20"
                              onClick={() => handleDeleteWorkshop(ws.id)}
                              disabled={actionLoading !== null}>
                              Eliminar
                            </Button>
                          </div>
                        </div>

                        {/* Expanded: users of this workshop */}
                        {isExpanded && (
                          <div className="border-t border-border/40 bg-secondary/10 p-4">
                            {wsUsers.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                No hay perfiles de usuario asociados a este taller.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> Usuarios del taller
                                </p>
                                {wsUsers.map((u) => (
                                  <div key={u.uid ?? u.email} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-border/20 last:border-0">
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-foreground truncate">{u.displayName || "Sin nombre"}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Role toggles */}
                                      {ROLE_OPTIONS.map((role) => {
                                        const userRoles: UserRole[] = Array.isArray(u.roles) ? u.roles : [];
                                        const hasRole = userRoles.includes(role);
                                        return (
                                          <button
                                            key={role}
                                            onClick={() => handleRoleChange(u.uid, role, hasRole)}
                                            disabled={actionLoading !== null || userRoles.includes("SUPER_ADMIN")}
                                            className={`text-[10px] px-2 py-0.5 rounded-[4px] border font-semibold transition-colors ${
                                              hasRole
                                                ? role === "ADMIN"
                                                  ? "bg-primary/10 text-primary border-primary/25"
                                                  : "bg-primary/10 text-primary border-primary/25"
                                                : "bg-secondary/30 text-muted-foreground/50 border-border/30 hover:text-muted-foreground"
                                            }`}
                                          >
                                            {role}
                                          </button>
                                        );
                                      })}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-950/10 rounded-lg"
                                        onClick={() => handleDeleteUser(u.uid, u.email)}
                                        disabled={actionLoading !== null || u.uid === userProfile?.uid}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── All Users Audit ── */}
          <Card id="user-audit" className="app-card scroll-mt-36">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-primary">
                <Users className="w-5 h-5" /> Auditoría Auth + Firestore ({reconciledUsers.length})
              </CardTitle>
              <CardDescription>Compara Firebase Authentication con los perfiles de Firestore; cualquier diferencia requiere revisión.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Cargando...</div>
              ) : reconciledUsers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No hay perfiles.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground">
                        <th className="py-3 px-4 font-semibold">Usuario</th>
                        <th className="py-3 px-4 font-semibold">Taller</th>
                        <th className="py-3 px-4 font-semibold">Roles</th>
                        <th className="py-3 px-4 font-semibold">UID</th>
                        <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {reconciledUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-secondary/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">{u.displayName || "Sin nombre"}</div>
                            <div className="text-[10px] text-muted-foreground">{u.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono bg-secondary/40 px-1.5 py-0.5 rounded text-[10px]">{u.workshopId}</span>
                            {u.status !== "consistent" && (
                              <div className="mt-1 text-[10px] font-semibold text-amber-500">
                                {u.status === "auth_only" ? "Solo en Auth" : u.status === "profile_only" ? "Solo en Firestore" : "Taller inexistente"}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {u.roles && u.roles.map((r) => (
                                <span key={r} className={`px-1.5 py-0.5 rounded-[4px] text-[9px] border font-semibold ${
                                  r === "SUPER_ADMIN" ? "bg-red-950/20 text-red-400 border-red-500/20"
                                  : r === "ADMIN" ? "bg-primary/10 text-primary border-primary/25"
                                  : "bg-secondary/40 text-muted-foreground border-border"
                                }`}>{r}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-muted-foreground/80">
                            {u.uid.slice(0, 14)}…
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="icon" variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-950/10"
                              onClick={() => handleDeleteUser(u.uid, u.email)}
                              disabled={actionLoading !== null || u.uid === userProfile?.uid}
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
    </SuperAdminShell>
  );
}

export default function SuperAdminPage() {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <SuperAdminContent />
    </ProtectedRoute>
  );
}
