"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { getUsersByWorkshop } from "@/lib/db";
import {
  createWorkshopUser,
  deleteWorkshopUser,
  updateWorkshopUser,
} from "@/lib/workshop-users-client";
import { UserProfile, UserRole, ROLE_BADGE_CLASSES, ROLE_META } from "@/types";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

type WorkshopRole = Exclude<UserRole, "SUPER_ADMIN">;
const ALL_ROLES: WorkshopRole[] = ["ADMIN", "RECEPTION", "TECHNICIAN", "ADVISOR"];

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { userProfile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoles, setEditingRoles] = useState<Record<string, WorkshopRole[]>>({});
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [newUser, setNewUser] = useState({
    displayName: "",
    email: "",
    password: "",
    roles: ["RECEPTION"] as WorkshopRole[],
  });

  const fetchUsers = useCallback(async () => {
    if (!userProfile?.workshopId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fetched = await getUsersByWorkshop(userProfile.workshopId);
      setUsers(fetched);
      setEditingRoles(Object.fromEntries(fetched.map((user) => [
        user.uid,
        user.roles.filter((role): role is WorkshopRole => role !== "SUPER_ADMIN"),
      ])));
      setEditingNames(Object.fromEntries(fetched.map((user) => [user.uid, user.displayName || ""])));
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, [userProfile?.workshopId]);

  useEffect(() => {
    if (!authLoading && userProfile) void fetchUsers();
  }, [authLoading, fetchUsers, userProfile]);

  const toggleRole = (
    roles: WorkshopRole[],
    role: WorkshopRole,
    onChange: (next: WorkshopRole[]) => void,
  ) => {
    if (roles.includes(role)) {
      if (roles.length > 1) onChange(roles.filter((current) => current !== role));
    } else {
      onChange([...roles, role]);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setOperationError("");
    try {
      await createWorkshopUser(newUser);
      setNewUser({ displayName: "", email: "", password: "", roles: ["RECEPTION"] });
      await fetchUsers();
      toast.success(t("userCreated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
      setOperationError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (uid: string) => {
    const roles = editingRoles[uid];
    const displayName = editingNames[uid]?.trim();
    if (!roles?.length || !displayName) return;
    setSaving(uid);
    setOperationError("");
    try {
      await updateWorkshopUser(uid, { roles, displayName });
      setUsers((current) => current.map((user) =>
        user.uid === uid ? { ...user, roles, displayName } : user));
      setSaved(uid);
      window.setTimeout(() => setSaved(null), 2000);
      toast.success(t("userUpdated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el usuario.";
      setOperationError(message);
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (target: UserProfile) => {
    if (!window.confirm(`${t("deleteUserConfirmPrefix")} ${target.displayName || target.email} ${t("deleteUserConfirmSuffix")}`)) return;
    setDeleting(target.uid);
    setOperationError("");
    try {
      await deleteWorkshopUser(target.uid);
      setUsers((current) => current.filter((user) => user.uid !== target.uid));
      toast.success(t("userDeleted"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el usuario.";
      setOperationError(message);
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  const hasChanges = (uid: string) => {
    const original = users.find((user) => user.uid === uid);
    if (!original) return false;
    const roles = editingRoles[uid] || [];
    const originalRoles = original.roles.filter((role): role is WorkshopRole => role !== "SUPER_ADMIN");
    return editingNames[uid]?.trim() !== original.displayName
      || roles.length !== originalRoles.length
      || !roles.every((role) => originalRoles.includes(role));
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["ADMIN"]}>
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="min-h-screen page-bg text-foreground px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-950/30 rounded-xl border border-purple-500/30">
                <ShieldCheck className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-purple-500 dark:text-purple-400">{t("userManagement")}</h1>
                <p className="text-muted-foreground text-sm">{users.length} {t("registeredUsers")}</p>
              </div>
            </div>
            <Button onClick={fetchUsers} variant="outline" className="self-start sm:self-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t("refresh")}
            </Button>
          </div>

          <Card className="glass-panel">
            <CardContent className="p-5">
              <div className="mb-5">
                <h2 className="font-semibold text-lg">{t("addStaff")}</h2>
                <p className="text-sm text-muted-foreground">{t("addStaffDesc")}</p>
              </div>
              <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleCreate}>
                <div className="space-y-2">
                  <Label htmlFor="new-user-name">{t("nameLabel")}</Label>
                  <Input id="new-user-name" required minLength={2} maxLength={100} autoComplete="name"
                    value={newUser.displayName}
                    onChange={(event) => setNewUser((current) => ({ ...current, displayName: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-email">{t("userEmailLabel")}</Label>
                  <Input id="new-user-email" required type="email" autoComplete="off"
                    value={newUser.email}
                    onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-password">{t("temporaryPassword")}</Label>
                  <Input id="new-user-password" required type="password" minLength={12} maxLength={128} autoComplete="new-password"
                    value={newUser.password}
                    onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} />
                  <p className="text-xs text-muted-foreground">{t("temporaryPasswordHint")}</p>
                </div>
                <div className="lg:col-span-3 flex flex-wrap items-center gap-2">
                  {ALL_ROLES.map((role) => {
                    const meta = ROLE_META[role];
                    const active = newUser.roles.includes(role);
                    return (
                      <button key={role} type="button" aria-label={`${t(meta.labelKey)} ${t("forNewUser")}`} aria-pressed={active}
                        onClick={() => toggleRole(newUser.roles, role, (roles) => setNewUser((current) => ({ ...current, roles })))}
                        className={`min-h-9 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? ROLE_BADGE_CLASSES[role] : "text-muted-foreground border-border bg-secondary/30"}`}>
                        {meta.emoji} {t(meta.labelKey)}
                      </button>
                    );
                  })}
                  <Button type="submit" disabled={creating} className="ml-auto bg-purple-600 hover:bg-purple-500 text-white">
                    <Plus className="w-4 h-4 mr-1" />{creating ? t("creatingUser") : t("createUser")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {operationError && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{operationError}</div>}

          {users.length === 0 ? (
            <Card className="glass-panel"><CardContent className="py-12 text-center text-muted-foreground">{t("noUsersRegistered")}</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {users.map((managedUser) => (
                <Card key={managedUser.uid} className="glass-panel">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
                      <div className="space-y-2">
                        <Label htmlFor={`user-name-${managedUser.uid}`}>{t("nameLabel")}</Label>
                        <Input id={`user-name-${managedUser.uid}`} aria-label={`${t("nameOf")} ${managedUser.email}`}
                          value={editingNames[managedUser.uid] ?? ""}
                          onChange={(event) => setEditingNames((current) => ({ ...current, [managedUser.uid]: event.target.value }))} />
                        <p className="text-sm text-muted-foreground truncate">{managedUser.email}</p>
                        <p className="text-xs text-muted-foreground/60 font-mono">UID: {managedUser.uid.slice(0, 12)}…</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ALL_ROLES.map((role) => {
                          const meta = ROLE_META[role];
                          const active = (editingRoles[managedUser.uid] || []).includes(role);
                          const label = managedUser.displayName || managedUser.email;
                          return (
                            <button key={role} type="button" aria-label={`${t(meta.labelKey)} para ${label}`} aria-pressed={active}
                              onClick={() => toggleRole(editingRoles[managedUser.uid] || [], role, (roles) => setEditingRoles((current) => ({ ...current, [managedUser.uid]: roles })))}
                              className={`min-h-9 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? ROLE_BADGE_CLASSES[role] : "text-muted-foreground border-border bg-secondary/30"}`}>
                              {meta.emoji} {t(meta.labelKey)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button type="button" variant="outline" size="sm" disabled={managedUser.uid === userProfile?.uid || deleting === managedUser.uid}
                        aria-label={`${t("deleteUserAria")} ${managedUser.displayName || managedUser.email}`} onClick={() => handleDelete(managedUser)}
                        className="text-red-600 dark:text-red-300">
                        <Trash2 className="w-4 h-4 mr-1" />{deleting === managedUser.uid ? t("deletingUser") : t("deleteUser")}
                      </Button>
                      <Button type="button" size="sm" disabled={!hasChanges(managedUser.uid) || saving === managedUser.uid}
                        aria-label={`${t("saveUser")} ${managedUser.displayName || managedUser.email}`} onClick={() => handleSave(managedUser.uid)}
                        className="bg-purple-600 hover:bg-purple-500 text-white">
                        {saved === managedUser.uid ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                        {saving === managedUser.uid ? t("savingUser") : t("save")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
