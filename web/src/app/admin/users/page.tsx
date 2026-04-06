"use client";

import { useEffect, useState } from "react";
import { getAllUsers, updateUserRoles } from "@/lib/db";
import { toast } from "sonner";
import { UserProfile, UserRole, ROLE_META } from "@/types";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShieldCheck, Save, RefreshCw, CheckCircle2 } from "lucide-react";

const ALL_ROLES: UserRole[] = ['ADMIN', 'RECEPTION', 'TECHNICIAN', 'ADVISOR'];

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoles, setEditingRoles] = useState<Record<string, UserRole[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const fetched = await getAllUsers();
    setUsers(fetched);
    const initialRoles: Record<string, UserRole[]> = {};
    fetched.forEach((u) => {
      initialRoles[u.uid] = [...u.roles];
    });
    setEditingRoles(initialRoles);
    setLoading(false);
  };

  const toggleRole = (uid: string, role: UserRole) => {
    setEditingRoles((prev) => {
      const current = prev[uid] || [];
      if (current.includes(role)) {
        if (current.length === 1) return prev;
        return { ...prev, [uid]: current.filter((r) => r !== role) };
      } else {
        return { ...prev, [uid]: [...current, role] };
      }
    });
  };

  const handleSave = async (uid: string) => {
    const roles = editingRoles[uid];
    if (!roles || roles.length === 0) return;
    setSaving(uid);
    try {
      await updateUserRoles(uid, roles);
      setSaved(uid);
      setTimeout(() => setSaved(null), 2000);
      const updated = users.map((u) =>
        u.uid === uid ? { ...u, roles } : u
      );
      setUsers(updated);
    } catch (e) {
      toast.error("Error updating roles: " + e);
    } finally {
      setSaving(null);
    }
  };

  const hasChanges = (uid: string) => {
    const user = users.find((u) => u.uid === uid);
    if (!user) return false;
    const current = editingRoles[uid] || [];
    if (current.length !== user.roles.length) return true;
    return !current.every((r) => user.roles.includes(r));
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen page-bg text-foreground p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-950/30 rounded-xl border border-purple-500/30">
                <ShieldCheck className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-purple-500 dark:text-purple-400">{t('userManagement')}</h1>
                <p className="text-muted-foreground text-sm">{users.length} {t('registeredUsers')}</p>
              </div>
            </div>
            <Button
              onClick={fetchUsers}
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('refresh')}
            </Button>
          </div>

          {users.length === 0 ? (
            <Card className="glass-panel">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t('noUsersRegistered')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <Card key={user.uid} className="glass-panel">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground truncate">
                            {user.displayName || user.email}
                          </p>
                          {saved === user.uid && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground/60 font-mono mt-1">UID: {user.uid.slice(0, 12)}…</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {ALL_ROLES.map((role) => {
                          const meta = ROLE_META[role];
                          const isActive = (editingRoles[user.uid] || []).includes(role);
                          return (
                            <button
                              key={role}
                              onClick={() => toggleRole(user.uid, role)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                isActive
                                  ? meta.color
                                  : 'text-muted-foreground border-border bg-secondary/30 hover:border-accent'
                              }`}
                            >
                              {meta.emoji} {t(meta.labelKey)}
                            </button>
                          );
                        })}
                      </div>

                      <Button
                        size="sm"
                        disabled={!hasChanges(user.uid) || saving === user.uid}
                        onClick={() => handleSave(user.uid)}
                        className={`shrink-0 transition-all ${
                          hasChanges(user.uid)
                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                            : 'bg-secondary text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {saving === user.uid ? '...' : t('save')}
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
